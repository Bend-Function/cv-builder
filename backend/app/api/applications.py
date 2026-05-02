from datetime import UTC, datetime
from pathlib import Path
import json
import tempfile

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.ai.graph import run_workflow
from app.models.application import ApplicationRun
from app.models.documents import ApplicationDocuments
from app.services.jd_ingestion import JdIngestionService
from app.services.pdf_renderer import PdfRenderer
from app.services.storage import JsonStorage

router = APIRouter(prefix="/api/applications", tags=["applications"])
KNOWN_EXPORT_FILENAMES = {"ats_cv.pdf", "portfolio_cv.pdf", "cover_letter.pdf"}


def _url_http_client_factory() -> httpx.Client:
    return httpx.Client(timeout=20.0, follow_redirects=True)


class CreateApplicationRequest(BaseModel):
    company: str = ""
    role_title: str = ""
    location: str = ""
    mode: str = "assisted"
    jd_text: str = ""


class CreateApplicationFromUrlRequest(BaseModel):
    company: str = ""
    role_title: str = ""
    location: str = ""
    mode: str = "assisted"
    url: str


def get_storage(request: Request) -> JsonStorage:
    return request.app.state.storage


def _new_application_id() -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    return f"app_{timestamp}"


def _load_application_or_404(storage: JsonStorage, application_id: str) -> ApplicationRun:
    try:
        return storage.load_application_run(application_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="application not found") from exc


def _normalise_exports(export_paths: dict[str, str]) -> dict[str, str]:
    return {key: Path(path).name for key, path in export_paths.items()}


def _export_filename_allowed(run: ApplicationRun, filename: str) -> bool:
    return filename in KNOWN_EXPORT_FILENAMES or filename in set(run.exports.values())


def _resolve_export_path(storage: JsonStorage, application_id: str, filename: str) -> Path:
    exports_dir = (storage.application_dir(application_id) / "exports").resolve()
    export_path = (exports_dir / filename).resolve()
    if export_path.parent != exports_dir:
        raise HTTPException(status_code=404, detail="export not found")
    return export_path


def _raise_export_not_found() -> None:
    raise HTTPException(status_code=404, detail="export not found")


@router.post("")
def create_application(payload: CreateApplicationRequest, request: Request) -> ApplicationRun:
    jd_input = JdIngestionService().from_text(payload.jd_text)
    run = ApplicationRun(
        application_id=_new_application_id(),
        company=payload.company,
        role_title=payload.role_title,
        location=payload.location,
        mode=payload.mode,
        jd_input=jd_input,
    )
    get_storage(request).save_application_run(run)
    return run


@router.post("/from-file")
async def create_application_from_file(
    request: Request,
    file: UploadFile = File(...),
    company: str = Form(""),
    role_title: str = Form(""),
    location: str = Form(""),
    mode: str = Form("assisted"),
) -> ApplicationRun:
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=Path(file.filename or "jd.txt").suffix) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    try:
        jd_input = JdIngestionService().from_file(tmp_path)
        # rename source to original filename for clarity
        jd_input.source = file.filename or jd_input.source
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    run = ApplicationRun(
        application_id=_new_application_id(),
        company=company,
        role_title=role_title,
        location=location,
        mode=mode,
        jd_input=jd_input,
    )
    get_storage(request).save_application_run(run)
    return run


@router.post("/from-fixture")
async def create_application_from_fixture(
    request: Request,
    file: UploadFile = File(...),
    company: str = Form(""),
    role_title: str = Form(""),
    location: str = Form(""),
    mode: str = Form("assisted"),
) -> ApplicationRun:
    raw = await file.read()
    try:
        json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail=f"Fixture must be valid JSON: {exc}") from exc

    with tempfile.NamedTemporaryFile("wb", delete=False, suffix=".json") as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)
    try:
        jd_input = JdIngestionService().from_fixture_json(tmp_path)
        jd_input.source = file.filename or jd_input.source
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    run = ApplicationRun(
        application_id=_new_application_id(),
        company=company,
        role_title=role_title,
        location=location,
        mode=mode,
        jd_input=jd_input,
    )
    get_storage(request).save_application_run(run)
    return run


@router.post("/from-url")
def create_application_from_url(payload: CreateApplicationFromUrlRequest, request: Request) -> ApplicationRun:
    service = JdIngestionService(http_client_factory=_url_http_client_factory)
    try:
        jd_input = service.from_url(payload.url)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc}") from exc

    run = ApplicationRun(
        application_id=_new_application_id(),
        company=payload.company,
        role_title=payload.role_title,
        location=payload.location,
        mode=payload.mode,
        jd_input=jd_input,
    )
    get_storage(request).save_application_run(run)
    return run


@router.get("")
def list_applications(request: Request) -> list[ApplicationRun]:
    return get_storage(request).list_application_runs()


@router.post("/{application_id}/generate")
def generate_application(application_id: str, request: Request) -> ApplicationRun:
    storage = get_storage(request)
    master_cv = storage.load_master_cv()
    try:
        run = storage.load_application_run(application_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="application not found") from exc
    updated = run_workflow(master_cv, run)
    storage.save_application_run(updated)
    return updated


@router.post("/{application_id}/export")
def export_application(application_id: str, request: Request) -> ApplicationRun:
    storage = get_storage(request)
    run = _load_application_or_404(storage, application_id)
    documents = ApplicationDocuments.model_validate(run.generated_documents)
    output_dir = storage.application_dir(application_id) / "exports"
    export_paths = PdfRenderer().export_documents(documents, output_dir)
    run.exports = _normalise_exports(export_paths)
    storage.save_application_run(run)
    return run


@router.get("/{application_id}/exports/{filename:path}")
def get_export(application_id: str, filename: str, request: Request) -> FileResponse:
    storage = get_storage(request)
    run = _load_application_or_404(storage, application_id)
    if not _export_filename_allowed(run, filename):
        _raise_export_not_found()

    export_path = _resolve_export_path(storage, application_id, filename)
    if not export_path.is_file():
        _raise_export_not_found()
    return FileResponse(export_path, media_type="application/pdf", filename=filename)


@router.get("/{application_id}")
def get_application(application_id: str, request: Request) -> ApplicationRun:
    try:
        return get_storage(request).load_application_run(application_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="application not found") from exc

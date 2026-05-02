import io
import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection


def test_create_application_from_text(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/applications",
        json={
            "company": "Example Co",
            "role_title": "Junior AI Developer",
            "mode": "assisted",
            "jd_text": "We need Python and RAG."
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["application_id"].startswith("app_")
    assert payload["company"] == "Example Co"
    assert payload["jd_input"]["extracted_text"] == "We need Python and RAG."


def test_list_applications(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    client.post(
        "/api/applications",
        json={"company": "A", "role_title": "Developer", "jd_text": "Python"},
    )

    response = client.get("/api/applications")

    assert response.status_code == 200
    assert response.json()[0]["company"] == "A"


def test_get_single_application(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    created = client.post(
        "/api/applications",
        json={"company": "Solo", "role_title": "Engineer", "jd_text": "FastAPI"},
    ).json()

    response = client.get(f"/api/applications/{created['application_id']}")

    assert response.status_code == 200
    assert response.json()["company"] == "Solo"


def test_create_application_from_uploaded_file(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    file_content = b"Senior Engineer with FastAPI and Postgres experience."

    response = client.post(
        "/api/applications/from-file",
        data={"company": "FileCo", "role_title": "Senior Engineer", "mode": "assisted"},
        files={"file": ("jd.txt", io.BytesIO(file_content), "text/plain")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["company"] == "FileCo"
    assert "FastAPI" in payload["jd_input"]["extracted_text"]
    assert payload["jd_input"]["type"] == "file"


def test_create_application_from_fixture(tmp_path: Path):
    fixture = {
        "job": {
            "title": "Backend Developer",
            "company": "FixtureCo",
            "location": "Sydney",
            "skills": ["Python"],
            "responsibilities": ["Ship code"],
            "requirements": ["FastAPI"]
        },
        "raw": {"bodyText": "Long JD body."}
    }
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    file_content = json.dumps(fixture).encode("utf-8")

    response = client.post(
        "/api/applications/from-fixture",
        data={"company": "FixtureCo", "role_title": "Backend Developer", "mode": "auto"},
        files={"file": ("seek-job.json", io.BytesIO(file_content), "application/json")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "auto"
    assert payload["jd_input"]["type"] == "fixture_json"
    assert "Backend Developer" in payload["jd_input"]["extracted_text"]


def test_create_application_from_url(tmp_path: Path, monkeypatch):
    html = "<html><body><h1>Cloud Engineer</h1><p>Kubernetes and Terraform.</p></body></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=html)

    transport = httpx.MockTransport(handler)

    from app.api import applications as applications_module

    def fake_factory():
        return httpx.Client(transport=transport, timeout=5.0)

    monkeypatch.setattr(applications_module, "_url_http_client_factory", fake_factory)

    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/applications/from-url",
        json={
            "company": "UrlCo",
            "role_title": "Cloud Engineer",
            "mode": "assisted",
            "url": "https://example.com/job/42"
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["jd_input"]["type"] == "url"
    assert payload["jd_input"]["source"] == "https://example.com/job/42"
    assert "Cloud Engineer" in payload["jd_input"]["extracted_text"]


class FakePdfRenderer:
    def export_documents(self, documents: ApplicationDocuments, output_dir: Path) -> dict[str, str]:
        output_dir.mkdir(parents=True, exist_ok=True)
        exports = {
            "ats_cv": output_dir / "ats_cv.pdf",
            "portfolio_cv": output_dir / "portfolio_cv.pdf",
            "cover_letter": output_dir / "cover_letter.pdf",
        }
        for path in exports.values():
            path.write_bytes(b"%PDF-1.4 fake pdf")
        return {key: str(path) for key, path in exports.items()}


def _create_generated_application(client: TestClient) -> dict:
    response = client.post(
        "/api/applications",
        json={"company": "ExportCo", "role_title": "Engineer", "jd_text": "Python"},
    )
    assert response.status_code == 200
    created = response.json()
    documents = ApplicationDocuments(
        ats_cv=CvDocument(title="ATS CV", sections=[DocumentSection(heading="Summary", items=["Python developer"])]),
        portfolio_cv=CvDocument(title="Portfolio CV"),
        cover_letter="Dear hiring team,",
    )
    run = client.app.state.storage.load_application_run(created["application_id"])
    run.generated_documents = documents.model_dump(mode="json")
    client.app.state.storage.save_application_run(run)
    return created


def test_export_persists_filenames_and_downloads_file(tmp_path: Path, monkeypatch):
    from app.api import applications as applications_module

    monkeypatch.setattr(applications_module, "PdfRenderer", FakePdfRenderer)
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    created = _create_generated_application(client)

    response = client.post(f"/api/applications/{created['application_id']}/export")

    assert response.status_code == 200
    exports = response.json()["exports"]
    assert exports == {
        "ats_cv": "ats_cv.pdf",
        "portfolio_cv": "portfolio_cv.pdf",
        "cover_letter": "cover_letter.pdf",
    }
    assert all(not Path(export).is_absolute() for export in exports.values())

    download_response = client.get(f"/api/applications/{created['application_id']}/exports/ats_cv.pdf")
    assert download_response.status_code == 200
    assert download_response.content == b"%PDF-1.4 fake pdf"


def test_export_returns_404_for_missing_application(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.post("/api/applications/missing/export")

    assert response.status_code == 404
    assert response.json() == {"detail": "application not found"}


def test_download_returns_404_for_missing_application(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.get("/api/applications/missing/exports/ats_cv.pdf")

    assert response.status_code == 404
    assert response.json() == {"detail": "application not found"}


def test_download_returns_404_for_missing_or_invalid_export(tmp_path: Path, monkeypatch):
    from app.api import applications as applications_module

    monkeypatch.setattr(applications_module, "PdfRenderer", FakePdfRenderer)
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    created = _create_generated_application(client)
    export_response = client.post(f"/api/applications/{created['application_id']}/export")
    assert export_response.status_code == 200

    missing_response = client.get(f"/api/applications/{created['application_id']}/exports/missing.pdf")
    invalid_response = client.get(f"/api/applications/{created['application_id']}/exports/notes.txt")

    assert missing_response.status_code == 404
    assert invalid_response.status_code == 404


def test_download_rejects_path_traversal(tmp_path: Path, monkeypatch):
    from app.api import applications as applications_module

    monkeypatch.setattr(applications_module, "PdfRenderer", FakePdfRenderer)
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    created = _create_generated_application(client)
    export_response = client.post(f"/api/applications/{created['application_id']}/export")
    assert export_response.status_code == 200

    response = client.get(f"/api/applications/{created['application_id']}/exports/%2E%2E%2Finput.json")

    assert response.status_code == 404

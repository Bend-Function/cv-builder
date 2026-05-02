from pathlib import Path

import pytest

from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection
from app.services.pdf_renderer import PdfRenderer, PlaywrightPdfEngine


class FakePdfEngine:
    def render(self, html: str, output_path: Path) -> None:
        output_path.write_bytes(b"%PDF-1.4 fake pdf")


def test_pdf_renderer_writes_three_files(tmp_path: Path):
    docs = ApplicationDocuments(
        ats_cv=CvDocument(title="ATS CV", sections=[DocumentSection(heading="Summary", items=["Python developer"])]),
        portfolio_cv=CvDocument(title="Portfolio CV"),
        cover_letter="Dear hiring team,\n\nI am interested.",
    )
    renderer = PdfRenderer(engine=FakePdfEngine())

    exports = renderer.export_documents(docs, tmp_path)

    assert (tmp_path / "ats_cv.pdf").exists()
    assert (tmp_path / "portfolio_cv.pdf").exists()
    assert (tmp_path / "cover_letter.pdf").exists()
    assert exports["ats_cv"].endswith("ats_cv.pdf")


def test_playwright_pdf_engine_closes_browser_when_render_fails(monkeypatch, tmp_path: Path):
    closed = {"browser": False}

    class FailingPage:
        def set_content(self, html: str, wait_until: str) -> None:
            raise RuntimeError("render failed")

    class FakeBrowser:
        def new_page(self) -> FailingPage:
            return FailingPage()

        def close(self) -> None:
            closed["browser"] = True

    class FakeChromium:
        def launch(self) -> FakeBrowser:
            return FakeBrowser()

    class FakePlaywright:
        chromium = FakeChromium()

    class FakePlaywrightContext:
        def __enter__(self) -> FakePlaywright:
            return FakePlaywright()

        def __exit__(self, exc_type, exc, traceback) -> None:
            pass

    def fake_sync_playwright() -> FakePlaywrightContext:
        return FakePlaywrightContext()

    monkeypatch.setattr("playwright.sync_api.sync_playwright", fake_sync_playwright)
    engine = PlaywrightPdfEngine()

    with pytest.raises(RuntimeError, match="render failed"):
        engine.render("<html></html>", tmp_path / "out.pdf")

    assert closed["browser"] is True

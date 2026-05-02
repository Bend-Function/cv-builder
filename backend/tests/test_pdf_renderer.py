from pathlib import Path

from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection
from app.services.pdf_renderer import PdfRenderer


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

from pathlib import Path
from typing import Protocol

from jinja2 import BaseLoader, Environment, TemplateNotFound, select_autoescape

from app.models.documents import ApplicationDocuments


class PdfEngine(Protocol):
    def render(self, html: str, output_path: Path) -> None: ...


class PlaywrightPdfEngine:
    def render(self, html: str, output_path: Path) -> None:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            page.pdf(path=str(output_path), print_background=True, format="A4")
            browser.close()


class TemplateLoader(BaseLoader):
    def __init__(self, template_dir: Path):
        self.template_dir = template_dir
        self.app_dir = template_dir.parent.resolve()

    def get_source(self, environment: Environment, template: str) -> tuple[str, str, object]:
        path = (self.template_dir / template).resolve()
        if self.app_dir not in path.parents or not path.is_file():
            raise TemplateNotFound(template)
        mtime = path.stat().st_mtime
        source = path.read_text(encoding="utf-8")

        def uptodate() -> bool:
            try:
                return path.stat().st_mtime == mtime
            except OSError:
                return False

        return source, str(path), uptodate


class PdfRenderer:
    def __init__(self, engine: PdfEngine | None = None):
        self.engine = engine or PlaywrightPdfEngine()
        template_dir = Path(__file__).resolve().parents[1] / "templates"
        self.environment = Environment(
            loader=TemplateLoader(template_dir),
            autoescape=select_autoescape(["html"]),
        )

    def export_documents(self, documents: ApplicationDocuments, output_dir: Path) -> dict[str, str]:
        output_dir.mkdir(parents=True, exist_ok=True)
        files = {
            "ats_cv": ("ats_cv.html", output_dir / "ats_cv.pdf", documents.ats_cv),
            "portfolio_cv": ("portfolio_cv.html", output_dir / "portfolio_cv.pdf", documents.portfolio_cv),
            "cover_letter": ("cover_letter.html", output_dir / "cover_letter.pdf", documents.cover_letter),
        }
        exports: dict[str, str] = {}
        for key, (template_name, output_path, payload) in files.items():
            html = self.environment.get_template(template_name).render(document=payload)
            self.engine.render(html, output_path)
            exports[key] = str(output_path)
        return exports

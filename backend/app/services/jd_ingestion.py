import json
from pathlib import Path
from typing import Callable

import httpx
from bs4 import BeautifulSoup

from app.models.application import JdInput

HttpClientFactory = Callable[[], httpx.Client]


def _default_http_client_factory() -> httpx.Client:
    return httpx.Client(timeout=20.0, follow_redirects=True)


class JdIngestionService:
    def __init__(self, http_client_factory: HttpClientFactory | None = None):
        self._http_client_factory = http_client_factory or _default_http_client_factory

    def from_text(self, text: str) -> JdInput:
        return JdInput(type="text", source="manual", extracted_text=text.strip())

    def from_file(self, path: Path) -> JdInput:
        text = path.read_text(encoding="utf-8").strip()
        return JdInput(type="file", source=str(path), extracted_text=text)

    def from_url(self, url: str) -> JdInput:
        with self._http_client_factory() as client:
            response = client.get(url)
            response.raise_for_status()
            html = response.text
        soup = BeautifulSoup(html, "html.parser")
        for element in soup(["script", "style", "noscript"]):
            element.decompose()
        text = " ".join(soup.get_text(" ").split())
        return JdInput(type="url", source=url, extracted_text=text)

    def from_fixture_json(self, path: Path) -> JdInput:
        payload = json.loads(path.read_text(encoding="utf-8"))
        job = payload.get("job", {})
        raw = payload.get("raw", {})
        parts = [
            job.get("title", ""),
            job.get("company", ""),
            job.get("location", ""),
            "Skills: " + ", ".join(job.get("skills", [])),
            "Responsibilities: " + " ".join(job.get("responsibilities", [])),
            "Requirements: " + " ".join(job.get("requirements", [])),
            raw.get("bodyText", ""),
        ]
        extracted_text = "\n".join(part for part in parts if part).strip()
        return JdInput(type="fixture_json", source=str(path), extracted_text=extracted_text)

import json
from pathlib import Path

from app.services.jd_ingestion import JdIngestionService


def test_ingest_text_jd():
    service = JdIngestionService()

    result = service.from_text("We need Python, FastAPI, RAG experience.")

    assert result.type == "text"
    assert result.source == "manual"
    assert "FastAPI" in result.extracted_text


def test_ingest_seek_fixture(tmp_path: Path):
    fixture = {
        "job": {
            "title": "Junior AI Developer",
            "company": "Example Co",
            "location": "Auckland",
            "skills": ["Python", "RAG"],
            "responsibilities": ["Build APIs"],
            "requirements": ["FastAPI"]
        },
        "raw": {"bodyText": "Full JD body mentioning vector search."}
    }
    fixture_path = tmp_path / "seek-job.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
    service = JdIngestionService()

    result = service.from_fixture_json(fixture_path)

    assert result.type == "fixture_json"
    assert result.source == str(fixture_path)
    assert "Junior AI Developer" in result.extracted_text
    assert "vector search" in result.extracted_text


def test_ingest_file_jd(tmp_path: Path):
    file_path = tmp_path / "jd.txt"
    file_path.write_text("Looking for a Senior Python Developer with cloud experience.", encoding="utf-8")
    service = JdIngestionService()

    result = service.from_file(file_path)

    assert result.type == "file"
    assert result.source == str(file_path)
    assert "Senior Python Developer" in result.extracted_text


def test_ingest_url_jd_strips_html_with_fake_transport():
    import httpx

    html = """<html><head><script>alert(1)</script></head><body><h1>Senior Engineer</h1><p>Python and Django.</p></body></html>"""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=html)

    transport = httpx.MockTransport(handler)
    service = JdIngestionService(http_client_factory=lambda: httpx.Client(transport=transport, timeout=5.0))

    result = service.from_url("https://example.com/job")

    assert result.type == "url"
    assert result.source == "https://example.com/job"
    assert "Senior Engineer" in result.extracted_text
    assert "alert(1)" not in result.extracted_text

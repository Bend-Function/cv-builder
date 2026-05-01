import io
import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


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

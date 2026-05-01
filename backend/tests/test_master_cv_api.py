from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_get_master_cv_returns_default(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.get("/api/master-cv")

    assert response.status_code == 200
    assert response.json()["profile"]["full_name"] == ""


def test_put_master_cv_persists_profile_links(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    payload = client.get("/api/master-cv").json()
    payload["profile"]["full_name"] = "Alex Chen"
    payload["profile"]["github_url"] = "https://github.com/alexchen"
    payload["profile"]["linkedin_url"] = "https://linkedin.com/in/alexchen"

    response = client.put("/api/master-cv", json=payload)
    reloaded = client.get("/api/master-cv")

    assert response.status_code == 200
    assert reloaded.json()["profile"]["full_name"] == "Alex Chen"
    assert reloaded.json()["profile"]["github_url"] == "https://github.com/alexchen"

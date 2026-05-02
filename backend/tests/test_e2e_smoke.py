from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_local_application_smoke_path(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["profile"]["github_url"] = "https://github.com/alexchen"
    cv["projects"] = [
        {
            "id": "project_001",
            "name": "StudyMate RAG",
            "type": "academic",
            "technologies": ["Python", "FastAPI", "RAG"],
            "tier": "A",
            "narrative": "Built a retrieval assistant with cited answers."
        }
    ]
    assert client.put("/api/master-cv", json=cv).status_code == 200

    run = client.post(
        "/api/applications",
        json={
            "company": "Example Co",
            "role_title": "Junior AI Developer",
            "mode": "assisted",
            "jd_text": "We need Python, FastAPI, and RAG experience."
        },
    ).json()

    generated = client.post(f"/api/applications/{run['application_id']}/generate").json()

    assert generated["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert generated["generated_documents"]["portfolio_cv"]["title"] == "Portfolio CV"
    assert generated["review_result"]["passed"] is True

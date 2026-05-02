from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_generate_runs_workflow_and_persists_documents(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["projects"] = [{"id": "project_001", "name": "StudyMate RAG", "tier": "A", "technologies": ["Python", "RAG"]}]
    client.put("/api/master-cv", json=cv)
    created = client.post(
        "/api/applications",
        json={"company": "Example Co", "role_title": "Junior AI Developer", "jd_text": "Python RAG"},
    ).json()

    response = client.post(f"/api/applications/{created['application_id']}/generate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert payload["review_result"]["passed"] is True

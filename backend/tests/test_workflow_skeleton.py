from app.ai.graph import run_workflow
from app.models.application import ApplicationRun, JdInput
from app.models.master_cv import MasterCv, Profile, Project


def test_workflow_generates_docs_and_review_without_network():
    cv = MasterCv(
        profile=Profile(full_name="Alex Chen", email="alex@example.com"),
        projects=[Project(id="project_001", name="StudyMate RAG", technologies=["Python", "RAG"], tier="A")],
    )
    run = ApplicationRun(
        application_id="app_001",
        company="Example Co",
        role_title="Junior AI Developer",
        jd_input=JdInput(type="text", source="manual", extracted_text="Python RAG FastAPI"),
    )

    result = run_workflow(cv, run)

    assert result.generated_documents["ats_cv"]["title"] == "ATS CV"
    assert result.review_result["passed"] is True

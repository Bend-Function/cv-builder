from pathlib import Path

from app.models.application import ApplicationRun, JdInput
from app.services.storage import JsonStorage


def test_create_application_run(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    run = ApplicationRun(
        application_id="app_001",
        company="Example Co",
        role_title="Junior AI Developer",
        mode="assisted",
        jd_input=JdInput(type="text", source="manual", extracted_text="We need Python and RAG."),
    )

    storage.save_application_run(run)
    loaded = storage.load_application_run("app_001")

    assert loaded.company == "Example Co"
    assert loaded.jd_input.extracted_text == "We need Python and RAG."
    assert (tmp_path / "applications" / "app_001" / "input.json").exists()


def test_list_application_runs(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    storage.save_application_run(ApplicationRun(application_id="app_001", company="A"))
    storage.save_application_run(ApplicationRun(application_id="app_002", company="B"))

    runs = storage.list_application_runs()

    assert [run.application_id for run in runs] == ["app_001", "app_002"]

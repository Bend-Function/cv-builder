from pathlib import Path

from app.models.master_cv import MasterCv, Profile, Project, WorkExperience
from app.services.storage import JsonStorage


def test_master_cv_round_trip(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    cv = MasterCv(
        profile=Profile(
            full_name="Alex Chen",
            email="alex@example.com",
            github_url="https://github.com/alexchen",
            linkedin_url="https://linkedin.com/in/alexchen",
        ),
        work_experience=[
            WorkExperience(
                id="work_001",
                company="Fictional AI Studio",
                title="AI Developer Intern",
                narrative="Built retrieval prototypes and evaluation scripts for internal demos.",
            )
        ],
        projects=[
            Project(
                id="project_001",
                name="StudyMate RAG",
                type="academic",
                technologies=["Python", "FastAPI", "PostgreSQL", "pgvector"],
                narrative="Designed a RAG study assistant with document ingestion and cited answers.",
                tier="A",
            )
        ],
    )

    storage.save_master_cv(cv)
    loaded = storage.load_master_cv()

    assert loaded.profile.full_name == "Alex Chen"
    assert loaded.profile.github_url == "https://github.com/alexchen"
    assert loaded.work_experience[0].narrative.startswith("Built retrieval")
    assert loaded.projects[0].tier == "A"


def test_load_master_cv_creates_default_when_missing(tmp_path: Path):
    storage = JsonStorage(tmp_path)

    loaded = storage.load_master_cv()

    assert loaded.profile.full_name == ""
    assert (tmp_path / "master_cv.json").exists()

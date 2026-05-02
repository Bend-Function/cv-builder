from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_get_settings_returns_defaults_when_no_file(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.get("/api/settings")

    assert response.status_code == 200
    data = response.json()
    assert data["ai_model"] == "gpt-5.4"
    assert data["default_mode"] == "assisted"
    assert data["gap_questions_enabled"] is True
    assert data["max_revision_loops"] == 2
    assert data["ai_provider"] == "openai"
    assert data["openai_api_key_env"] == "OPENAI_API_KEY"
    assert data["data_dir"] == str(tmp_path)


def test_put_settings_persists_editable_fields(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": False,
            "max_revision_loops": 1,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["default_mode"] == "auto"
    assert data["gap_questions_enabled"] is False
    assert data["max_revision_loops"] == 1
    assert data["ai_provider"] == "openai"


def test_get_settings_returns_persisted_values_after_put(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": False,
            "max_revision_loops": 3,
        },
    )

    response = client.get("/api/settings")

    assert response.status_code == 200
    data = response.json()
    assert data["default_mode"] == "auto"
    assert data["gap_questions_enabled"] is False
    assert data["max_revision_loops"] == 3


def test_put_settings_rejects_out_of_range_revision_loops(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "assisted",
            "gap_questions_enabled": True,
            "max_revision_loops": 99,
        },
    )

    assert response.status_code == 422


def test_put_settings_rejects_invalid_default_mode(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "supersonic",
            "gap_questions_enabled": True,
            "max_revision_loops": 2,
        },
    )

    assert response.status_code == 422


def test_put_settings_ignores_readonly_fields(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": True,
            "max_revision_loops": 2,
            "ai_provider": "anthropic",  # should be ignored
            "data_dir": "/evil/path",  # should be ignored
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ai_provider"] == "openai"  # not "anthropic"
    assert data["data_dir"] == str(tmp_path)  # not "/evil/path"

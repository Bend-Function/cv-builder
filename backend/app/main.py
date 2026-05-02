from fastapi import FastAPI

from app.api import applications, master_cv, settings as settings_api
from app.config import Settings, get_settings
from app.services.storage import JsonStorage


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title="CV Builder", version="0.1.0")
    app.state.settings = resolved_settings
    app.state.storage = JsonStorage(resolved_settings.data_dir)
    app.include_router(master_cv.router)
    app.include_router(applications.router)
    app.include_router(settings_api.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

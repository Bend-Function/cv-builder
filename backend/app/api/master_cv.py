from fastapi import APIRouter, Request

from app.models.master_cv import MasterCv
from app.services.storage import JsonStorage

router = APIRouter(prefix="/api/master-cv", tags=["master-cv"])


def get_storage(request: Request) -> JsonStorage:
    return request.app.state.storage


@router.get("")
def get_master_cv(request: Request) -> MasterCv:
    return get_storage(request).load_master_cv()


@router.put("")
def put_master_cv(cv: MasterCv, request: Request) -> MasterCv:
    get_storage(request).save_master_cv(cv)
    return cv


@router.post("/validate")
def validate_master_cv(cv: MasterCv) -> dict[str, bool]:
    return {"valid": True}

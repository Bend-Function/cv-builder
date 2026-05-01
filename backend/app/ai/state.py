from typing import TypedDict

from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv


class WorkflowState(TypedDict):
    master_cv: MasterCv
    application: ApplicationRun

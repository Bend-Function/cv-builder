from app.ai.state import WorkflowState
from app.models.application import EvidenceMapItem


def positioning_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    master_cv = state["master_cv"]
    selected_projects = [project.id for project in master_cv.projects if project.tier in {"A", "B"}]
    application.candidate_positioning.selected_project_ids = selected_projects
    application.candidate_positioning.positioning_statement = (
        "Position around strongest relevant project evidence."
    )
    application.candidate_positioning.evidence_map = [
        EvidenceMapItem(
            jd_signal="Python",
            cv_source_id=selected_projects[0] if selected_projects else "",
            evidence_summary="Selected project includes Python evidence.",
            strength="strong" if selected_projects else "missing",
        )
    ]
    return state

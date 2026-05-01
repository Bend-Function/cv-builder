from app.ai.state import WorkflowState
from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection


def writer_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    master_cv = state["master_cv"]
    docs = ApplicationDocuments(
        ats_cv=CvDocument(
            title="ATS CV",
            contact_header=f"{master_cv.profile.full_name} | {master_cv.profile.email}",
            sections=[
                DocumentSection(
                    heading="Summary",
                    items=[application.candidate_positioning.positioning_statement],
                ),
                DocumentSection(
                    heading="Technical Skills",
                    items=application.jd_analysis.must_have,
                ),
            ],
        ),
        portfolio_cv=CvDocument(
            title="Portfolio CV",
            contact_header=f"{master_cv.profile.full_name} | {master_cv.profile.email}",
            sections=[
                DocumentSection(
                    heading="Selected Projects",
                    items=application.candidate_positioning.selected_project_ids,
                )
            ],
        ),
        cover_letter=(
            f"Dear hiring team,\n\nI am interested in the {application.role_title} role "
            f"at {application.company}."
        ),
    )
    application.generated_documents = docs.model_dump(mode="json")
    return state

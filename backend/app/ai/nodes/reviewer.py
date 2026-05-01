from app.ai.state import WorkflowState
from app.models.review import ReviewResult, ReviewScores


def reviewer_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    has_documents = bool(application.generated_documents)
    review = ReviewResult(
        passed=has_documents,
        overall_score=80 if has_documents else 0,
        scores=ReviewScores(
            truthfulness=80 if has_documents else 0,
            jd_alignment=80 if has_documents else 0,
            evidence_strength=75 if has_documents else 0,
            ats_safety=85 if has_documents else 0,
            layout_and_length=80 if has_documents else 0,
            impact_and_quantification=70 if has_documents else 0,
            nz_au_convention_fit=85 if has_documents else 0,
            cover_letter_quality=80 if has_documents else 0,
        ),
    )
    application.review_result = review.model_dump(mode="json")
    return state

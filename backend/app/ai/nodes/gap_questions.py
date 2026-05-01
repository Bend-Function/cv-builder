from app.ai.state import WorkflowState
from app.models.application import GapQuestion


def gap_questions_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    text = application.jd_input.extracted_text.lower()
    has_rag_evidence = any(
        "rag" in item.evidence_summary.lower()
        for item in application.candidate_positioning.evidence_map
    )
    if "rag" in text and not has_rag_evidence:
        application.gap_questions = [
            GapQuestion(
                question=(
                    "The JD emphasises RAG. Have you used embeddings, vector databases, "
                    "retrieval pipelines, or RAG evaluation?"
                ),
                why_asking=(
                    "RAG is present in the JD but not strongly evidenced in the selected CV sources."
                ),
                suggested_fields_to_update=["projects.project_001.technical_depth"],
            )
        ]
    return state

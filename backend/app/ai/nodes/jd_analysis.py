from app.ai.state import WorkflowState


def jd_analysis_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    text = application.jd_input.extracted_text
    application.jd_analysis.must_have = [
        word for word in ["Python", "FastAPI", "RAG"] if word.lower() in text.lower()
    ]
    application.jd_analysis.ideal_candidate_profile = "Candidate with relevant Python project evidence."
    return state

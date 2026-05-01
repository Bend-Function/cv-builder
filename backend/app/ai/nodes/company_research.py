from app.ai.state import WorkflowState


def company_research_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    application.company_research.company_summary = f"Research summary for {application.company}".strip()
    application.company_research.sources = []
    return state

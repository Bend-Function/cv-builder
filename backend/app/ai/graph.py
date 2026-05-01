from app.ai.nodes.company_research import company_research_node
from app.ai.nodes.gap_questions import gap_questions_node
from app.ai.nodes.jd_analysis import jd_analysis_node
from app.ai.nodes.jd_extract import jd_extract_node
from app.ai.nodes.positioning import positioning_node
from app.ai.nodes.reviewer import reviewer_node
from app.ai.nodes.writer import writer_node
from app.ai.state import WorkflowState
from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv


def run_workflow(master_cv: MasterCv, application: ApplicationRun) -> ApplicationRun:
    state: WorkflowState = {"master_cv": master_cv, "application": application}
    for node in [
        jd_extract_node,
        company_research_node,
        jd_analysis_node,
        positioning_node,
        gap_questions_node,
        writer_node,
        reviewer_node,
    ]:
        state = node(state)
    return state["application"]

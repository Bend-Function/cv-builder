from typing import Literal

from pydantic import BaseModel, Field


class JdInput(BaseModel):
    type: Literal["text", "file", "url", "fixture_json"] | str = "text"
    source: str = ""
    extracted_text: str = ""


class ResearchSource(BaseModel):
    title: str = ""
    url: str = ""
    summary: str = ""
    used_for: str = ""


class CompanyResearch(BaseModel):
    company_summary: str = ""
    products_services: list[str] = Field(default_factory=list)
    business_model: str = ""
    industry: str = ""
    likely_team_context: str = ""
    technology_signals: list[str] = Field(default_factory=list)
    sources: list[ResearchSource] = Field(default_factory=list)
    needs_user_confirmation: list[str] = Field(default_factory=list)


class JdAnalysis(BaseModel):
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    domain_signals: list[str] = Field(default_factory=list)
    seniority_signals: list[str] = Field(default_factory=list)
    keywords_by_priority: dict[str, list[str]] = Field(default_factory=lambda: {"high": [], "medium": [], "low": []})
    ideal_candidate_profile: str = ""
    hiring_manager_priorities: list[str] = Field(default_factory=list)
    risk_factors_for_candidate: list[str] = Field(default_factory=list)
    evidence_needed: list[str] = Field(default_factory=list)


class EvidenceMapItem(BaseModel):
    jd_signal: str = ""
    cv_source_id: str = ""
    evidence_summary: str = ""
    strength: Literal["strong", "medium", "weak", "missing"] | str = "missing"


class CandidatePositioning(BaseModel):
    positioning_statement: str = ""
    selected_work_experience_ids: list[str] = Field(default_factory=list)
    selected_project_ids: list[str] = Field(default_factory=list)
    selected_skills: list[str] = Field(default_factory=list)
    evidence_map: list[EvidenceMapItem] = Field(default_factory=list)
    omit_or_deemphasize: list[str] = Field(default_factory=list)


class GapQuestion(BaseModel):
    question: str = ""
    why_asking: str = ""
    suggested_fields_to_update: list[str] = Field(default_factory=list)
    answer_type: str = "free_text"


class GapAnswer(BaseModel):
    question: str = ""
    answer: str = ""
    save_to_master_cv: bool = False


class ApplicationRun(BaseModel):
    application_id: str
    company: str = ""
    role_title: str = ""
    location: str = ""
    mode: Literal["assisted", "auto"] | str = "assisted"
    jd_input: JdInput = Field(default_factory=JdInput)
    company_research: CompanyResearch = Field(default_factory=CompanyResearch)
    jd_analysis: JdAnalysis = Field(default_factory=JdAnalysis)
    candidate_positioning: CandidatePositioning = Field(default_factory=CandidatePositioning)
    gap_questions: list[GapQuestion] = Field(default_factory=list)
    user_gap_answers: list[GapAnswer] = Field(default_factory=list)
    generated_documents: dict = Field(default_factory=dict)
    review_result: dict = Field(default_factory=dict)
    exports: dict[str, str] = Field(default_factory=dict)

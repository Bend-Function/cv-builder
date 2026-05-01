from pydantic import BaseModel, Field


class ReviewScores(BaseModel):
    truthfulness: int = 0
    jd_alignment: int = 0
    evidence_strength: int = 0
    ats_safety: int = 0
    layout_and_length: int = 0
    impact_and_quantification: int = 0
    nz_au_convention_fit: int = 0
    cover_letter_quality: int = 0


class SourceTraceCheck(BaseModel):
    claim: str = ""
    source_id: str = ""
    passed: bool = False
    message: str = ""


class ReviewResult(BaseModel):
    passed: bool = False
    overall_score: int = 0
    scores: ReviewScores = Field(default_factory=ReviewScores)
    blocking_issues: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggested_revisions: list[str] = Field(default_factory=list)
    missing_user_information: list[str] = Field(default_factory=list)
    source_trace_checks: list[SourceTraceCheck] = Field(default_factory=list)

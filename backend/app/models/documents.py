from pydantic import BaseModel, Field


class SourceTrace(BaseModel):
    claim: str = ""
    source_id: str = ""
    source_type: str = "master_cv"


class DocumentSection(BaseModel):
    heading: str = ""
    items: list[str] = Field(default_factory=list)


class CvDocument(BaseModel):
    title: str = ""
    contact_header: str = ""
    sections: list[DocumentSection] = Field(default_factory=list)
    source_traces: list[SourceTrace] = Field(default_factory=list)


class ApplicationDocuments(BaseModel):
    ats_cv: CvDocument = Field(default_factory=CvDocument)
    portfolio_cv: CvDocument = Field(default_factory=CvDocument)
    cover_letter: str = ""

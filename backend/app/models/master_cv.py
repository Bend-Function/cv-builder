from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Confidence(BaseModel):
    facts_verified: bool = True
    needs_user_review: list[str] = Field(default_factory=list)


class Link(BaseModel):
    label: str = ""
    url: HttpUrl | str = ""


class Profile(BaseModel):
    full_name: str = ""
    preferred_name: str = ""
    headline: str = ""
    location: str = ""
    phone: str = ""
    email: str = ""
    github_url: HttpUrl | str = ""
    linkedin_url: HttpUrl | str = ""
    portfolio_url: HttpUrl | str = ""
    personal_website_url: HttpUrl | str = ""
    target_roles: list[str] = Field(default_factory=list)
    summary_source: str = ""
    work_authorisation: str = ""
    referees: str = "available_on_request"


class GitHubPresence(BaseModel):
    url: HttpUrl | str = ""
    profile_readme_summary: str = ""
    pinned_projects: list[Link] = Field(default_factory=list)


class LinkedInPresence(BaseModel):
    url: HttpUrl | str = ""
    headline: str = ""
    summary: str = ""


class PortfolioPresence(BaseModel):
    url: HttpUrl | str = ""
    featured_links: list[Link] = Field(default_factory=list)


class OnlinePresence(BaseModel):
    github: GitHubPresence = Field(default_factory=GitHubPresence)
    linkedin: LinkedInPresence = Field(default_factory=LinkedInPresence)
    portfolio: PortfolioPresence = Field(default_factory=PortfolioPresence)
    other_links: list[Link] = Field(default_factory=list)


class Education(BaseModel):
    institution: str = ""
    qualification: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    highlights: list[str] = Field(default_factory=list)


class Skills(BaseModel):
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    cloud_devops: list[str] = Field(default_factory=list)
    ai_data: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)


class Certification(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: HttpUrl | str = ""


class WorkExperience(BaseModel):
    id: str
    company: str = ""
    title: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    employment_type: str = ""
    technologies: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    collaboration: list[str] = Field(default_factory=list)
    evidence_links: list[Link] = Field(default_factory=list)
    narrative: str = ""
    confidence: Confidence = Field(default_factory=Confidence)


class Project(BaseModel):
    id: str
    name: str = ""
    type: Literal["commercial", "academic", "personal", "open_source"] | str = "personal"
    status: str = ""
    role: str = ""
    technologies: list[str] = Field(default_factory=list)
    problem: str = ""
    solution: str = ""
    features: list[str] = Field(default_factory=list)
    technical_depth: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    tier: Literal["A", "B", "C"] | str = "B"
    narrative: str = ""
    confidence: Confidence = Field(default_factory=Confidence)


class Preferences(BaseModel):
    target_locations: list[str] = Field(default_factory=list)
    target_roles: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    default_cv_variant: str = "ats"


class MasterCv(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    online_presence: OnlinePresence = Field(default_factory=OnlinePresence)
    education: list[Education] = Field(default_factory=list)
    skills: Skills = Field(default_factory=Skills)
    certifications: list[Certification] = Field(default_factory=list)
    work_experience: list[WorkExperience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    preferences: Preferences = Field(default_factory=Preferences)

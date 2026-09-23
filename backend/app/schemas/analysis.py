from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=100_000)
    job_description: str = Field(min_length=20, max_length=50_000)


class ScoreBreakdown(BaseModel):
    ats_compatibility: int
    keyword_match: int
    skill_match: int
    experience_relevance: int
    project_quality: int
    readability: int
    formatting: int
    section_completeness: int


class AnalysisResponse(BaseModel):
    overall_score: int
    scores: ScoreBreakdown
    matched_keywords: list[str]
    missing_keywords: list[str]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    recruiter_view: str

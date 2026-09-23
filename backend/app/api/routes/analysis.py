import re
from collections import Counter

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analysis import AnalysisResponse, AnalyzeRequest, ScoreBreakdown

router = APIRouter(prefix="/analysis", tags=["analysis"])

STOP_WORDS = {
    "about", "after", "also", "been", "being", "from", "have", "into", "more",
    "must", "need", "our", "that", "their", "this", "with", "will", "work", "your",
    "years", "using", "such", "role", "team", "skills", "experience", "and", "the",
    "for", "you", "are", "has", "who", "all", "can", "should", "job", "join",
}


def terms(text: str) -> set[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}", text.lower())
    return {word.strip(".-") for word in words if len(word) > 2 and word not in STOP_WORDS}


def contains_any(text: str, values: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(value in lowered for value in values)


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(payload: AnalyzeRequest, _: User = Depends(get_current_user)) -> AnalysisResponse:
    resume_terms = terms(payload.resume_text)
    job_terms = terms(payload.job_description)
    matched = sorted(resume_terms & job_terms)
    missing = sorted(job_terms - resume_terms)
    keyword_score = round((len(matched) / len(job_terms)) * 100) if job_terms else 0

    sections = {
        "summary": contains_any(payload.resume_text, ("summary", "objective", "profile")),
        "skills": contains_any(payload.resume_text, ("skills", "technologies", "technical skills")),
        "experience": contains_any(payload.resume_text, ("experience", "employment", "work history")),
        "education": contains_any(payload.resume_text, ("education", "university", "college")),
        "projects": contains_any(payload.resume_text, ("projects", "portfolio")),
    }
    completeness = round(sum(sections.values()) / len(sections) * 100)
    formatting = 85 if not contains_any(payload.resume_text, ("table", "column", "image")) else 65
    readability = max(40, min(100, 100 - max(0, len(payload.resume_text.split()) - 900) // 30))
    experience = min(100, 55 + len(re.findall(r"\b(20\d\d|19\d\d)\b", payload.resume_text)) * 8)
    skill_score = min(100, keyword_score + (10 if sections["skills"] else 0))
    project_quality = 80 if sections["projects"] else 50
    ats = round((formatting + completeness + readability) / 3)
    overall = round(ats * .15 + keyword_score * .30 + skill_score * .20 + experience * .15 + project_quality * .10 + readability * .10)

    strengths = []
    weaknesses = []
    recommendations = []
    if matched:
        strengths.append(f"Matches {len(matched)} job-related terms.")
    if sections["projects"]:
        strengths.append("Includes a projects section that can demonstrate practical ability.")
    if sections["skills"]:
        strengths.append("Includes a dedicated skills section for ATS parsing.")
    if not matched:
        weaknesses.append("Very few job-description terms were found in the resume.")
    if missing:
        weaknesses.append(f"Missing important terms such as {', '.join(missing[:5])}.")
        recommendations.append("Add missing keywords only where they accurately describe your experience.")
    if not sections["summary"]:
        weaknesses.append("No clear professional summary or objective was detected.")
        recommendations.append("Add a concise role-targeted summary at the top of the resume.")
    if not sections["projects"]:
        weaknesses.append("No projects section was detected.")
        recommendations.append("Add two or three projects with technologies and measurable outcomes.")
    if not any(char.isdigit() for char in payload.resume_text):
        recommendations.append("Quantify achievements with users, percentages, time saved, or performance improvements.")
    if not strengths:
        strengths.append("The resume text was successfully parsed and is ready for improvement.")
    if not weaknesses:
        weaknesses.append("No major structural weaknesses were detected by the baseline analyzer.")

    recruiter_view = (
        "Potential shortlist: the resume shows relevant overlap, but tailor the missing skills and quantify achievements."
        if overall >= 70 else
        "Needs improvement before shortlisting: align experience and skills more closely with the target role."
    )
    return AnalysisResponse(
        overall_score=max(0, min(100, overall)),
        scores=ScoreBreakdown(
            ats_compatibility=ats,
            keyword_match=keyword_score,
            skill_match=skill_score,
            experience_relevance=experience,
            project_quality=project_quality,
            readability=readability,
            formatting=formatting,
            section_completeness=completeness,
        ),
        matched_keywords=matched,
        missing_keywords=missing,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
        recruiter_view=recruiter_view,
    )

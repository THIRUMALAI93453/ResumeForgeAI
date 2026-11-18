// Deterministic, explainable ATS analyzer. Mirrors backend/app/services/analyzer.py.

export interface ScoreBreakdown {
  ats_compatibility: number;
  keyword_match: number;
  skill_match: number;
  experience_relevance: number;
  project_quality: number;
  readability: number;
  formatting: number;
  section_completeness: number;
}

export interface AnalysisResult {
  overall_score: number;
  scores: ScoreBreakdown;
  matched_keywords: string[];
  missing_keywords: string[];
  matched_skills: string[];
  missing_skills: string[];
  sections: Record<string, boolean>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recruiter_view: string;
  ai_powered: boolean;
}

const STOP_WORDS = new Set(
  `about above after again also among and any are around because been before being below best between both but can
  candidate candidates company could daily degree did does doing during each etc ever every experience field from
  further good great have having help her here high highly his how ideal including into its job join just keen
  knowledge least like looking make many may more most must need needs new not now off one only open opportunity
  other our out over own part per plus position preferred productive provide quality really related required
  requirements responsibilities role same see should since skills some strong such than that the their them then
  there these they this those through time under until upon using very want was way well were what when where which
  while who why will with within without work working would year years you your yours ability able across ensure
  team teams environment etc.`.split(/\s+/).filter(Boolean),
);

const SKILLS = [
  "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "kotlin", "swift", "php", "ruby", "sql",
  "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask", "fastapi", "spring", "spring boot",
  "html", "css", "tailwind", "redux", "graphql", "rest", "api", "microservices",
  "postgresql", "mysql", "mongodb", "redis", "sqlite", "dynamodb", "firebase",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "jenkins", "github actions", "linux", "git",
  "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
  "data analysis", "power bi", "tableau", "excel", "statistics", "spark", "hadoop",
  "agile", "scrum", "jira", "testing", "jest", "pytest", "selenium", "unit testing",
  "communication", "leadership", "problem solving", "teamwork", "figma",
];

const SECTION_PATTERNS: Record<string, string[]> = {
  summary: ["summary", "objective", "profile", "about me"],
  skills: ["skills", "technologies", "tech stack", "technical skills"],
  experience: ["experience", "employment", "work history", "internship"],
  education: ["education", "university", "college", "b.tech", "bachelor", "degree"],
  projects: ["projects", "portfolio"],
};

const ACTION_VERBS = [
  "built", "developed", "designed", "led", "implemented", "created", "improved", "optimized", "launched",
  "automated", "reduced", "increased", "delivered", "managed", "architected", "deployed", "analyzed",
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function terms(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#./-]{1,}/g) ?? [];
  const out = new Set<string>();
  for (const raw of words) {
    const w = raw.replace(/^[.\-/]+|[.\-/]+$/g, "");
    if (w.length > 2 && !STOP_WORDS.has(w)) out.add(w);
  }
  return out;
}

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^a-z0-9+#])${escape(phrase)}($|[^a-z0-9+#])`, "i").test(text);
}

function containsAny(text: string, values: string[]): boolean {
  return values.some((v) => hasPhrase(text, v));
}

export function analyzeResume(resumeText: string, jobDescription: string): AnalysisResult {
  const resume = resumeText.toLowerCase();
  const job = jobDescription.toLowerCase();

  const resumeTerms = terms(resume);
  const jobTerms = terms(job);
  const matched = [...jobTerms].filter((t) => resumeTerms.has(t)).sort();
  const missing = [...jobTerms].filter((t) => !resumeTerms.has(t)).sort();
  const keywordScore = jobTerms.size ? clamp((matched.length / jobTerms.size) * 100) : 0;

  const jobSkills = SKILLS.filter((s) => hasPhrase(job, s));
  const matchedSkills = jobSkills.filter((s) => hasPhrase(resume, s));
  const missingSkills = jobSkills.filter((s) => !hasPhrase(resume, s));

  const sections = Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([name, pats]) => [name, containsAny(resume, pats)]),
  ) as Record<string, boolean>;
  const completeness = clamp((Object.values(sections).filter(Boolean).length / 5) * 100);

  const wordCount = resume.split(/\s+/).filter(Boolean).length;
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(resumeText);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(resumeText);
  const bulletLines = resumeText.split("\n").filter((l) => /^\s*([•\-*▪●]|\d+\.)\s+/.test(l)).length;

  let formatting = 70;
  if (hasEmail) formatting += 10;
  if (hasPhone) formatting += 5;
  if (bulletLines >= 3) formatting += 15;
  if (containsAny(resume, ["table", "text box", "image"])) formatting -= 15;
  formatting = clamp(formatting);

  let readability = 100;
  if (wordCount < 150) readability -= 25;
  if (wordCount > 900) readability -= Math.floor((wordCount - 900) / 30);
  readability = Math.max(40, clamp(readability));

  const quantified = (resumeText.match(/\b\d+(\.\d+)?\s?(%|percent|x|\+|k|users|ms|hours|days)/gi) ?? []).length;
  const actionVerbs = ACTION_VERBS.filter((v) => hasPhrase(resume, v)).length;
  const years = (resumeText.match(/\b(19|20)\d\d\b/g) ?? []).length;

  const experience = clamp(
    40 + (sections.experience ? 20 : 0) + Math.min(years, 5) * 5 + Math.min(actionVerbs, 6) * 3,
  );
  const skillScore = jobSkills.length
    ? clamp((matchedSkills.length / jobSkills.length) * 90 + (sections.skills ? 10 : 0))
    : clamp(keywordScore + (sections.skills ? 10 : 0));
  const projectQuality = clamp(
    (sections.projects ? 60 : 35) + Math.min(quantified, 5) * 6 + Math.min(actionVerbs, 5) * 2,
  );
  const ats = clamp((formatting + completeness + readability) / 3);

  const overall = clamp(
    ats * 0.15 + keywordScore * 0.25 + skillScore * 0.25 + experience * 0.15 + projectQuality * 0.1 + readability * 0.1,
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (matchedSkills.length) strengths.push(`Covers ${matchedSkills.length} of ${jobSkills.length} skills named in the job description.`);
  if (keywordScore >= 50) strengths.push(`Strong keyword overlap (${keywordScore}%) with the job description.`);
  if (sections.projects) strengths.push("Includes a projects section that demonstrates practical ability.");
  if (sections.skills) strengths.push("Has a dedicated skills section that ATS parsers can read.");
  if (quantified >= 2) strengths.push("Uses quantified achievements, which recruiters value.");
  if (hasEmail && hasPhone) strengths.push("Contact information is easy to find.");

  if (missingSkills.length) {
    weaknesses.push(`Missing required skills: ${missingSkills.slice(0, 6).join(", ")}.`);
    recommendations.push(
      `If you have experience with ${missingSkills.slice(0, 4).join(", ")}, add it to your skills and show it in a project or role.`,
    );
  }
  if (keywordScore < 40) {
    weaknesses.push("Low keyword overlap with the job description.");
    recommendations.push("Mirror the exact wording of the job description where it truthfully describes your work.");
  }
  if (!sections.summary) {
    weaknesses.push("No professional summary or objective detected.");
    recommendations.push("Add a 2–3 line summary at the top targeted at this role.");
  }
  if (!sections.projects) {
    weaknesses.push("No projects section detected.");
    recommendations.push("Add 2–3 projects with the tech stack used and a measurable outcome.");
  }
  if (!sections.education) weaknesses.push("No education section detected.");
  if (quantified < 2) {
    weaknesses.push("Few quantified achievements.");
    recommendations.push("Quantify impact: users served, % improvement, time saved, or performance gains.");
  }
  if (actionVerbs < 3) recommendations.push("Start bullet points with strong action verbs such as Built, Led, Optimized or Automated.");
  if (!hasEmail) recommendations.push("Add a professional email address in the header.");
  if (wordCount > 900) recommendations.push("Trim the resume to one or two pages; focus on the most relevant work.");
  if (!strengths.length) strengths.push("The resume was parsed successfully and is ready to improve.");
  if (!weaknesses.length) weaknesses.push("No major structural weaknesses detected.");

  const recruiter_view =
    overall >= 80
      ? "Likely shortlist: the profile aligns well with the role. Prepare to discuss your projects in depth."
      : overall >= 65
        ? "Possible shortlist: relevant overlap, but close the skill gaps and quantify achievements to stand out."
        : overall >= 45
          ? "Borderline: a recruiter skimming for 6–8 seconds may pass. Tailor skills and keywords to this role."
          : "Unlikely shortlist as-is: the resume does not yet reflect this role's requirements.";

  return {
    overall_score: overall,
    scores: {
      ats_compatibility: ats,
      keyword_match: keywordScore,
      skill_match: skillScore,
      experience_relevance: experience,
      project_quality: projectQuality,
      readability,
      formatting,
      section_completeness: completeness,
    },
    matched_keywords: matched.slice(0, 60),
    missing_keywords: missing.slice(0, 60),
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    sections,
    strengths,
    weaknesses,
    recommendations,
    recruiter_view,
    ai_powered: false,
  };
}

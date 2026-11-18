import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from "./analyzer.js";

// Served through Netlify AI Gateway (no API key needed on Netlify).
const MODEL = "gemini-flash-latest";
let client: GoogleGenAI | null = null;

interface AiInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recruiter_view: string;
}

// Enriches the deterministic analysis with Gemini insights. Falls back to the baseline on any failure.
export async function enrichWithGemini(resume: string, job: string, base: AnalysisResult): Promise<AnalysisResult> {
  try {
    client ??= new GoogleGenAI({});
    const baseline = JSON.stringify({
      overall_score: base.overall_score,
      scores: base.scores,
      matched_skills: base.matched_skills,
      missing_skills: base.missing_skills,
      sections: base.sections,
    });
    const prompt = [
      "You are an expert technical recruiter and ATS specialist reviewing a resume from a student or early-career candidate.",
      `Baseline ATS analysis (deterministic; treat these numbers as fact): ${baseline}`,
      "Give specific, honest, actionable feedback grounded in the resume text. Never suggest inventing experience.",
      "Return 3-5 strengths, 3-5 weaknesses, 4-6 recommendations (include concrete bullet rewrites where useful),",
      "and a 2-3 sentence recruiter_view simulating what a recruiter thinks after a 30-second skim.",
      "",
      "JOB DESCRIPTION:",
      job.slice(0, 12000),
      "",
      "RESUME:",
      resume.slice(0, 20000),
    ].join("\n");

    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        abortSignal: AbortSignal.timeout(15000),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            recruiter_view: { type: Type.STRING },
          },
          required: ["strengths", "weaknesses", "recommendations", "recruiter_view"],
        },
      },
    });
    const ai = JSON.parse(response.text ?? "{}") as Partial<AiInsights>;
    if (!ai.recommendations?.length || !ai.recruiter_view) return base;
    return {
      ...base,
      strengths: ai.strengths?.length ? ai.strengths : base.strengths,
      weaknesses: ai.weaknesses?.length ? ai.weaknesses : base.weaknesses,
      recommendations: ai.recommendations,
      recruiter_view: ai.recruiter_view,
      ai_powered: true,
    };
  } catch (err) {
    console.error("Gemini enrichment failed; using baseline analysis:", (err as Error).message);
    return base;
  }
}

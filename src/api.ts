export interface User { id: number; email: string; full_name: string }
export interface AuthResponse { access_token: string; token_type: string; user: User }

export interface Scores {
  ats_compatibility: number;
  keyword_match: number;
  skill_match: number;
  experience_relevance: number;
  project_quality: number;
  readability: number;
  formatting: number;
  section_completeness: number;
}

export interface Analysis {
  id: number;
  job_title: string;
  created_at: string;
  overall_score: number;
  scores: Scores;
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

export interface HistoryItem { id: number; job_title: string; overall_score: number; created_at: string }

const TOKEN_KEY = "resumeforge_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  register: (email: string, full_name: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, full_name, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ filename: string; characters: number; text: string }>("/resumes/upload", { method: "POST", body });
  },
  analyze: (resume_text: string, job_description: string, job_title: string, use_ai: boolean) =>
    request<Analysis>("/analysis/analyze", {
      method: "POST",
      body: JSON.stringify({ resume_text, job_description, job_title, use_ai }),
    }),
  history: () => request<HistoryItem[]>("/analysis/history"),
  get: (id: number) => request<Analysis>(`/analysis/${id}`),
  remove: (id: number) => request<void>(`/analysis/${id}`, { method: "DELETE" }),
};

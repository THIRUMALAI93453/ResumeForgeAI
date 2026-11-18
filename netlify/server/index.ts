// ResumeForge AI API on Netlify. Mirrors the FastAPI routes in backend/ under /api/v1.
import { Hono, type Context } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { analyses, users } from "../../db/schema.js";
import { analyzeResume, type AnalysisResult } from "../../server/analyzer.js";
import { enrichWithGemini } from "../../server/ai.js";
import { createSession, deleteSession, hashPassword, userFromToken, verifyPassword } from "../../server/auth.js";
import { ALLOWED_EXTENSIONS, extensionOf, extractResumeText } from "../../server/extract.js";

type User = { id: number; email: string; fullName: string };
type Env = { Variables: { user: User } };

const MAX_UPLOAD_MB = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = new Hono<Env>().basePath("/api/v1");

const fail = (c: Context, status: 400 | 401 | 404 | 409 | 413 | 415 | 422, detail: string) =>
  c.json({ detail }, status);

const userJson = (u: User) => ({ id: u.id, email: u.email, full_name: u.fullName });

const bearer = (c: Context) => {
  const h = c.req.header("authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : undefined;
};

async function readJson(c: Context): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

const requireUser = async (c: Context<Env>, next: () => Promise<void>) => {
  const user = await userFromToken(bearer(c));
  if (!user) return fail(c, 401, "Invalid or missing authentication token");
  c.set("user", user);
  await next();
};

app.onError((err, c) => {
  console.error(err);
  return c.json({ detail: "Internal server error" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok", service: "resumeforge-api" }));

// ---------- Auth ----------
app.post("/auth/register", async (c) => {
  const body = await readJson(c);
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? "").trim();
  const password = String(body.password ?? "");
  if (!EMAIL_RE.test(email)) return fail(c, 422, "Enter a valid email address");
  if (fullName.length < 2 || fullName.length > 120) return fail(c, 422, "Full name must be 2–120 characters");
  if (password.length < 8 || password.length > 128) return fail(c, 422, "Password must be 8–128 characters");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return fail(c, 409, "Email is already registered");

  const [user] = await db
    .insert(users)
    .values({ email, fullName, passwordHash: await hashPassword(password) })
    .returning({ id: users.id, email: users.email, fullName: users.fullName });
  const token = await createSession(user.id);
  return c.json({ access_token: token, token_type: "bearer", user: userJson(user) }, 201);
});

app.post("/auth/login", async (c) => {
  const body = await readJson(c);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail(c, 401, "Invalid email or password");
  }
  const token = await createSession(user.id);
  return c.json({ access_token: token, token_type: "bearer", user: userJson(user) });
});

app.get("/auth/me", requireUser, (c) => c.json(userJson(c.get("user"))));

app.post("/auth/logout", async (c) => {
  const token = bearer(c);
  if (token) await deleteSession(token);
  return c.body(null, 204);
});

// ---------- Resumes ----------
app.post("/resumes/upload", requireUser, async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return fail(c, 400, "Attach a resume file in the 'file' field");
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return fail(c, 415, "Only PDF, DOCX, and TXT files are supported");
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return fail(c, 413, `File must be smaller than ${MAX_UPLOAD_MB} MB`);

  let text: string;
  try {
    text = await extractResumeText(file.name, await file.arrayBuffer());
  } catch {
    return fail(c, 422, "Unable to extract text from this file");
  }
  if (!text) return fail(c, 422, "No readable text was found in this resume");
  return c.json({ filename: file.name, characters: text.length, text }, 201);
});

// ---------- Analysis ----------
app.post("/analysis/analyze", requireUser, async (c) => {
  const body = await readJson(c);
  const resume = String(body.resume_text ?? "").trim();
  const job = String(body.job_description ?? "").trim();
  const jobTitle = String(body.job_title ?? "").trim().slice(0, 200) || "Untitled role";
  if (resume.length < 20 || resume.length > 100_000) return fail(c, 422, "Resume text must be 20–100,000 characters");
  if (job.length < 20 || job.length > 50_000) return fail(c, 422, "Job description must be 20–50,000 characters");

  const base = analyzeResume(resume, job);
  const useAi = body.use_ai !== false;
  const result: AnalysisResult = useAi ? await enrichWithGemini(resume, job, base) : base;

  const [row] = await db
    .insert(analyses)
    .values({ userId: c.get("user").id, jobTitle, overallScore: result.overall_score, result })
    .returning({ id: analyses.id, createdAt: analyses.createdAt });
  return c.json({ id: row.id, job_title: jobTitle, created_at: row.createdAt, ...result });
});

app.get("/analysis/history", requireUser, async (c) => {
  const rows = await db
    .select({
      id: analyses.id,
      job_title: analyses.jobTitle,
      overall_score: analyses.overallScore,
      created_at: analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, c.get("user").id))
    .orderBy(desc(analyses.createdAt))
    .limit(50);
  return c.json(rows);
});

app.get("/analysis/:id", requireUser, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return fail(c, 404, "Analysis not found");
  const [row] = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, c.get("user").id)))
    .limit(1);
  if (!row) return fail(c, 404, "Analysis not found");
  return c.json({ id: row.id, job_title: row.jobTitle, created_at: row.createdAt, ...(row.result as AnalysisResult) });
});

app.delete("/analysis/:id", requireUser, async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isInteger(id)) {
    await db.delete(analyses).where(and(eq(analyses.id, id), eq(analyses.userId, c.get("user").id)));
  }
  return c.body(null, 204);
});

app.notFound((c) => c.json({ detail: "Not found" }, 404));

export const config = { path: "/api/*" };

export default app;

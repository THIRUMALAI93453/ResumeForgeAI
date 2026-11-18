import { useEffect, useRef, useState, type DragEvent } from "react";
import { api, type Analysis, type HistoryItem, type User } from "../api";
import Logo from "./Logo";
import Results from "./Results";

const scoreColor = (n: number) => (n >= 75 ? "text-good" : n >= 50 ? "text-warn" : "text-bad");

export default function Workspace({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => api.history().then(setHistory).catch(() => undefined);
  useEffect(() => { loadHistory(); }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await api.upload(file);
      setResumeText(res.text);
      setFileName(`${res.filename} · ${res.characters.toLocaleString()} characters extracted`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    setError("");
    if (resumeText.trim().length < 20) return setError("Add your resume first (upload a file or paste the text).");
    if (jobDescription.trim().length < 20) return setError("Paste the job description you are targeting.");
    setAnalyzing(true);
    try {
      const res = await api.analyze(resumeText, jobDescription, jobTitle, useAi);
      setResult(res);
      loadHistory();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const openHistory = async (id: number) => {
    setError("");
    try {
      setResult(await api.get(id));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeHistory = async (id: number) => {
    await api.remove(id).catch(() => undefined);
    if (result?.id === id) setResult(null);
    loadHistory();
  };

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{user.full_name}</span>
            <button className="btn-ghost py-1.5" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8">
          <section className="no-print rise">
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Forge a sharper resume, <span className="text-ember">{user.full_name.split(" ")[0]}</span>.
            </h1>
            <p className="mt-2 text-muted">Upload your resume, paste a job description, and get an explainable ATS report.</p>
          </section>

          <section className="no-print grid gap-5 md:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="label mb-0">1 · Your resume</span>
                {resumeText && (
                  <button className="text-xs font-semibold text-muted hover:text-ink" onClick={() => { setResumeText(""); setFileName(""); }}>
                    Clear
                  </button>
                )}
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
                className={`mb-3 cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                  dragOver ? "border-ember bg-ember/5" : "border-line hover:border-ink"
                }`}
              >
                <p className="text-sm font-semibold">{uploading ? "Extracting text…" : "Drop a PDF, DOCX or TXT — or click to browse"}</p>
                <p className="mt-1 text-xs text-muted">{fileName || "Max 5 MB. Text is extracted on the server."}</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              <textarea
                className="input h-56 resize-y font-mono text-xs leading-relaxed"
                placeholder="…or paste your resume text here"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>

            <div className="card flex flex-col p-5">
              <span className="label mb-3">2 · Target job</span>
              <input
                className="input mb-3"
                placeholder="Job title (e.g. Junior Backend Developer)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={200}
              />
              <textarea
                className="input min-h-56 flex-1 resize-y text-sm leading-relaxed"
                placeholder="Paste the full job description here"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </section>

          <section className="no-print flex flex-wrap items-center gap-4">
            <button className="btn-primary px-6 py-3 text-base" onClick={analyze} disabled={analyzing || uploading}>
              {analyzing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                  Analyzing…
                </>
              ) : (
                "Analyze resume →"
              )}
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="h-4 w-4 accent-[#e8590c]" />
              Gemini-powered recommendations
            </label>
            {error && <p role="alert" className="w-full rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
          </section>

          <div ref={resultsRef} className="scroll-mt-20">
            {result ? (
              <Results analysis={result} />
            ) : (
              <div className="no-print card grain grid place-items-center px-6 py-16 text-center">
                <p className="font-display text-xl font-bold">Your report appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Scores, keyword gaps, missing skills, recommendations and a recruiter's first impression.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="no-print lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <p className="label">History</p>
            {history.length === 0 ? (
              <p className="py-3 text-sm text-muted">No analyses yet.</p>
            ) : (
              <ul className="-mx-1 max-h-[60vh] space-y-1 overflow-auto">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-center gap-2">
                    <button
                      onClick={() => openHistory(h.id)}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-paper ${
                        result?.id === h.id ? "bg-paper" : ""
                      }`}
                    >
                      <span className={`font-mono text-lg font-semibold ${scoreColor(h.overall_score)}`}>{h.overall_score}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{h.job_title}</span>
                        <span className="block text-xs text-muted">{new Date(h.created_at).toLocaleString()}</span>
                      </span>
                    </button>
                    <button
                      aria-label="Delete analysis"
                      onClick={() => removeHistory(h.id)}
                      className="px-1 text-muted opacity-0 transition hover:text-bad group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

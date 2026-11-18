import { useState, type FormEvent } from "react";
import { api, type User } from "../api";
import Logo from "./Logo";

const FEATURES = [
  ["Explainable ATS score", "Eight weighted sub-scores so you know exactly what to fix."],
  ["Keyword & skill gaps", "See which job-description terms and skills your resume is missing."],
  ["Gemini recommendations", "Concrete, honest rewrites — never invented experience."],
  ["Recruiter simulation", "What a recruiter thinks after a 30-second skim."],
];

export default function AuthScreen({ onAuthed }: { onAuthed: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = mode === "register" ? await api.register(email, name, password) : await api.login(email, password);
      onAuthed(res.access_token, res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="grain relative flex flex-col justify-between overflow-hidden bg-ink p-8 text-paper sm:p-12">
        <Logo light />
        <div className="rise my-16 max-w-xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-ember">Resume intelligence for early careers</p>
          <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
            Beat the ATS.
            <br />
            Impress Recruiters.
            <br />
            <span className="text-ember">Get More Interviews.</span>
          </h1>
          <p className="mt-6 max-w-md text-paper/70">
            Upload your resume, paste a job description, and get an explainable score with the exact gaps holding you back.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(([title, body], i) => (
            <li key={title} className="rise border-t border-paper/15 pt-4" style={{ animationDelay: `${150 + i * 80}ms` }}>
              <p className="font-display font-bold">{title}</p>
              <p className="mt-1 text-sm text-paper/60">{body}</p>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ember/25 blur-3xl" />
      </section>

      <section className="flex items-center justify-center p-8 sm:p-12">
        <form onSubmit={submit} className="rise w-full max-w-sm">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {mode === "register" ? "Free. Your analyses are saved to your history." : "Sign in to continue forging."}
          </p>

          <div className="mt-8 space-y-4">
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder={mode === "register" ? "At least 8 characters" : ""}
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

          <button className="btn-primary mt-6 w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
          <p className="mt-6 text-center text-sm text-muted">
            {mode === "register" ? "Already have an account?" : "New to ResumeForge?"}{" "}
            <button
              type="button"
              className="font-semibold text-ink underline decoration-ember decoration-2 underline-offset-4"
              onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
            >
              {mode === "register" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

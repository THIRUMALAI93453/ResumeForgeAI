import type { Analysis, Scores } from "../api";

const LABELS: Record<keyof Scores, [string, number]> = {
  keyword_match: ["Keyword match", 25],
  skill_match: ["Skill match", 25],
  ats_compatibility: ["ATS compatibility", 15],
  experience_relevance: ["Experience relevance", 15],
  project_quality: ["Project quality", 10],
  readability: ["Readability", 10],
  formatting: ["Formatting", 0],
  section_completeness: ["Section completeness", 0],
};

const tone = (n: number) => (n >= 75 ? "#2f7d4f" : n >= 50 ? "#b7791f" : "#c53030");
const verdict = (n: number) => (n >= 80 ? "Excellent match" : n >= 65 ? "Good match" : n >= 45 ? "Needs work" : "Weak match");

function Gauge({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90" role="img" aria-label={`Overall score ${value} out of 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e3dccd" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={tone(value)}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

function Chips({ items, kind }: { items: string[]; kind: "good" | "bad" }) {
  if (!items.length) return <p className="text-sm text-muted">None found.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span
          key={k}
          className={`rounded-md px-2 py-0.5 font-mono text-xs ${
            kind === "good" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
          }`}
        >
          {k}
        </span>
      ))}
    </div>
  );
}

function List({ title, items, marker, color }: { title: string; items: string[]; marker: string; color: string }) {
  return (
    <div className="card p-5">
      <p className="label">{title}</p>
      <ul className="space-y-2.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className={`mt-0.5 font-mono text-xs font-semibold ${color}`}>{marker}</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Results({ analysis: a }: { analysis: Analysis }) {
  return (
    <section className="rise space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label mb-0">Analysis report</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{a.job_title}</h2>
          <p className="text-xs text-muted">
            {new Date(a.created_at).toLocaleString()} · {a.ai_powered ? "Gemini-enhanced insights" : "Baseline analyzer"}
          </p>
        </div>
        <button className="btn-ghost no-print" onClick={() => window.print()}>Export PDF</button>
      </div>

      <div className="card grid gap-6 p-6 md:grid-cols-[auto_1fr]">
        <div className="relative mx-auto grid place-items-center">
          <Gauge value={a.overall_score} />
          <div className="absolute text-center">
            <p className="font-mono text-4xl font-semibold" style={{ color: tone(a.overall_score) }}>{a.overall_score}</p>
            <p className="text-xs text-muted">/ 100</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold" style={{ color: tone(a.overall_score) }}>{verdict(a.overall_score)}</p>
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {(Object.keys(LABELS) as (keyof Scores)[]).map((key) => {
              const v = a.scores[key];
              const [label, weight] = LABELS[key];
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">
                      {label}
                      {weight > 0 && <span className="ml-1 text-muted">· {weight}%</span>}
                    </span>
                    <span className="font-mono font-semibold">{v}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: tone(v) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card relative overflow-hidden bg-ink p-6 text-paper">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ember">Recruiter simulation</p>
        <p className="font-display text-lg leading-snug">“{a.recruiter_view}”</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <p className="label">Skills found ({a.matched_skills.length})</p>
          <Chips items={a.matched_skills} kind="good" />
        </div>
        <div className="card p-5">
          <p className="label">Missing skills ({a.missing_skills.length})</p>
          <Chips items={a.missing_skills} kind="bad" />
        </div>
        <div className="card p-5">
          <p className="label">Matched keywords ({a.matched_keywords.length})</p>
          <Chips items={a.matched_keywords} kind="good" />
        </div>
        <div className="card p-5">
          <p className="label">Keyword gaps ({a.missing_keywords.length})</p>
          <Chips items={a.missing_keywords} kind="bad" />
        </div>
      </div>

      <div className="card p-5">
        <p className="label">Sections detected</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(a.sections).map(([name, ok]) => (
            <span
              key={name}
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                ok ? "border-good/30 bg-good/10 text-good" : "border-line text-muted line-through"
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <List title="Strengths" items={a.strengths} marker="+" color="text-good" />
        <List title="Weaknesses" items={a.weaknesses} marker="−" color="text-bad" />
      </div>
      <List
        title="Recommendations"
        items={a.recommendations}
        marker="→"
        color="text-ember"
      />
    </section>
  );
}

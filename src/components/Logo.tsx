export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#e8590c" />
        <path
          d="M9 23V9h8a4 4 0 010 8h-8m7 0l5 6"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? "text-paper" : "text-ink"}`}>
        ResumeForge<span className="text-ember"> AI</span>
      </span>
    </div>
  );
}

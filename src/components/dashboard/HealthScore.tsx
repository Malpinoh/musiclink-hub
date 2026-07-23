import { motion } from "framer-motion";

interface HealthScoreProps {
  score: number; // 0-100
  breakdown: { label: string; ok: boolean; hint?: string }[];
}

const HealthScore = ({ score, breakdown }: HealthScoreProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;
  const tone =
    clamped >= 75 ? "hsl(var(--success))" :
    clamped >= 45 ? "hsl(var(--warning))" :
    "hsl(var(--destructive))";
  const label =
    clamped >= 75 ? "Excellent" :
    clamped >= 45 ? "Getting there" :
    "Needs love";

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-[var(--shadow-md)] h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tone }} />
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Campaign Health
        </h3>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
            <motion.circle
              cx="64" cy="64" r={radius} fill="none" stroke={tone}
              strokeWidth="10" strokeLinecap="round" strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold">{clamped}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">score</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-semibold mb-2" style={{ color: tone }}>{label}</p>
          <ul className="space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.label} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.ok ? "bg-success" : "bg-muted-foreground/40"}`} />
                <span className={b.ok ? "text-foreground" : "text-muted-foreground"}>
                  {b.label}
                  {!b.ok && b.hint && <span className="text-muted-foreground/70"> — {b.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthScore;

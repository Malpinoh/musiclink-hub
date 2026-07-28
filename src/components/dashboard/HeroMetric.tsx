import { LucideIcon } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

interface HeroMetricProps {
  label: string;
  value: number;
  suffix?: string;
  delta?: { value: number; label: string }; // signed number, e.g. +12
  icon: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning";
}

const toneMap = {
  primary: "text-primary bg-primary/15 shadow-[0_0_32px_hsl(var(--primary)/0.25)]",
  accent: "text-accent bg-accent/15 shadow-[0_0_32px_hsl(var(--accent)/0.25)]",
  success: "text-success bg-success/15",
  warning: "text-warning bg-warning/15",
};

const HeroMetric = ({ label, value, suffix, delta, icon: Icon, tone = "primary" }: HeroMetricProps) => {
  const deltaPositive = (delta?.value ?? 0) >= 0;
  return (
    <div className="relative group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3.5 sm:p-5 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
      {/* sheen */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
           style={{ background: "var(--gradient-sheen)" }} />
      <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toneMap[tone]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {delta && (
          <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${deltaPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {deltaPositive ? "▲" : "▼"} {Math.abs(delta.value)}%
          </span>
        )}
      </div>
      <p className="text-[9px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 truncate">{label}</p>
      <p className="font-display text-2xl sm:text-3xl font-bold leading-none">
        <AnimatedCounter value={value} />
        {suffix && <span className="text-base sm:text-xl text-muted-foreground ml-1">{suffix}</span>}
      </p>
      {delta && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2 truncate">{delta.label}</p>}
    </div>
  );
};

export default HeroMetric;

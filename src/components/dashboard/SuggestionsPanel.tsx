import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export type Suggestion = {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  tone: "primary" | "accent" | "success" | "warning";
};

const toneClasses: Record<Suggestion["tone"], string> = {
  primary: "from-primary/20 to-primary/5 border-primary/30",
  accent: "from-accent/20 to-accent/5 border-accent/30",
  success: "from-success/20 to-success/5 border-success/30",
  warning: "from-warning/20 to-warning/5 border-warning/30",
};

const SuggestionsPanel = ({ suggestions }: { suggestions: Suggestion[] }) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Suggested next moves
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={s.href}
              className={`group block rounded-2xl border bg-gradient-to-br ${toneClasses[s.tone]} p-4 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]`}
            >
              <h4 className="font-display font-semibold mb-1">{s.title}</h4>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{s.body}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/90 group-hover:gap-2 transition-all">
                {s.cta} <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SuggestionsPanel;

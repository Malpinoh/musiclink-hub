import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WizardStep = {
  id: string;
  label: string;
  hint?: string;
};

interface WizardShellProps {
  title: ReactNode;
  subtitle?: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  canProceed: boolean;
  onNext: () => void | Promise<void>;
  onBack?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  children: ReactNode;
  preview?: ReactNode;
  exitTo?: string;
}

const WizardShell = ({
  title,
  subtitle,
  steps,
  currentStep,
  onStepChange,
  canProceed,
  onNext,
  onBack,
  submitLabel = "Publish",
  submitting = false,
  children,
  preview,
  exitTo = "/dashboard",
}: WizardShellProps) => {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{ background: "var(--gradient-mesh)" }} />

      {/* Top bar */}
      <header
        className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/50"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(exitTo)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>

          <div className="flex-1 max-w-md">
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span className="text-foreground/80 font-medium">{steps[currentStep]?.label}</span>
            </div>
          </div>

          {preview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewOpen((v) => !v)}
              className="lg:hidden"
            >
              {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-32 relative">
        {/* Title */}
        <div className="max-w-2xl mb-8">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
        </div>

        <div className={cn("grid gap-6", preview ? "lg:grid-cols-[1fr_minmax(320px,420px)]" : "")}>
          {/* Left: stepper + content */}
          <div className="space-y-6 min-w-0">
            {/* Stepper rail */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {steps.map((s, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <button
                    key={s.id}
                    disabled={i > currentStep}
                    onClick={() => onStepChange?.(i)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                      active && "bg-primary text-primary-foreground border-primary shadow-[0_0_24px_hsl(var(--primary)/0.35)]",
                      done && "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
                      !active && !done && "bg-secondary/50 text-muted-foreground border-border/50",
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      active ? "bg-primary-foreground/20" : done ? "bg-primary/30" : "bg-border/50"
                    )}>
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="min-w-0"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: preview (desktop) */}
          {preview && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                {preview}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Mobile preview drawer */}
      {preview && (
        <AnimatePresence>
          {previewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden bg-background/80 backdrop-blur-xl"
              onClick={() => setPreviewOpen(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute inset-x-0 bottom-0 bg-card border-t border-border rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 rounded-full bg-border mx-auto mb-4" />
                {preview}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Sticky footer */}
      <footer
        className="fixed bottom-0 inset-x-0 z-30 bg-background/85 backdrop-blur-xl border-t border-border/50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (currentStep === 0 ? navigate(exitTo) : onBack?.())}
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>

          <Button
            variant="hero"
            size="lg"
            onClick={onNext}
            disabled={!canProceed || submitting}
            className="min-w-[140px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Working…
              </>
            ) : isLast ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {submitLabel}
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default WizardShell;

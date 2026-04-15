import { CheckCircle2, Circle, Clock } from "lucide-react";

interface TimelineStep {
  label: string;
  description: string;
  status: "done" | "current" | "upcoming";
}

interface CampaignTimelineProps {
  steps: TimelineStep[];
}

const CampaignTimeline = ({ steps }: CampaignTimelineProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-lg mb-4">Campaign Timeline</h3>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5">
              {step.status === "done" ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : step.status === "current" ? (
                <Clock className="w-5 h-5 text-accent" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="absolute left-[18px] top-6 w-0.5 h-4 bg-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export type { TimelineStep };
export default CampaignTimeline;

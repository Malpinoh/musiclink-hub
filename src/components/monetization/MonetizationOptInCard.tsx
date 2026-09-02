import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useMonetization } from "@/hooks/useMonetization";
import MonetizationStatusBadge from "./MonetizationStatusBadge";
import { formatCents } from "@/lib/money";

const MonetizationOptInCard = ({ compact = false }: { compact?: boolean }) => {
  const { summary, apply, withdraw } = useMonetization();
  const s = summary.data;

  if (summary.isLoading || !s) return null;

  const approved = s.status === "approved";

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">Link Monetization</h3>
        </div>
        <MonetizationStatusBadge status={s.status} earlyAccess={s.early_access} />
      </div>

      {approved ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Your link pages are monetized. You keep {s.artist_share_percent}% of all revenue they generate.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-xl font-bold">{formatCents(s.available_cents)}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
            <div>
              <div className="text-xl font-bold">{formatCents(s.lifetime_artist_cents)}</div>
              <div className="text-xs text-muted-foreground">Lifetime earned</div>
            </div>
          </div>
          {compact && (
            <Button variant="outline" asChild className="w-full">
              <Link to="/artist/revenue">
                <TrendingUp className="w-4 h-4 mr-2" />
                View earnings
              </Link>
            </Button>
          )}
        </>
      ) : s.status === "pending" ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            You're on the waitlist. We review new artists weekly and will email you once your monetization
            zone is ready.
          </p>
          <Button variant="outline" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>
            Withdraw application
          </Button>
        </>
      ) : s.status === "suspended" || s.status === "rejected" ? (
        <p className="text-sm text-muted-foreground">
          Monetization isn't active on your account. Contact support if you think this is a mistake.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Earn {s.artist_share_percent}% of the ad revenue your fanlinks, pre-saves and bio page generate.
            No setup — we handle everything.
          </p>
          {s.early_access_slots_left > 0 && (
            <p className="text-xs text-primary mb-4">
              Early access: {s.early_access_slots_left} instant-approval slots left.
            </p>
          )}
          <Button variant="hero" onClick={() => apply.mutate()} disabled={apply.isPending} className="w-full sm:w-auto">
            {apply.isPending ? "Submitting…" : "Enable monetization"}
          </Button>
        </>
      )}
    </Card>
  );
};

export default MonetizationOptInCard;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { DollarSign, Eye, MousePointerClick, Wallet } from "lucide-react";
import Header from "@/components/Header";

interface Revenue {
  total_impressions: number;
  total_clicks: number;
  total_earned_cents: number;
  total_paid_cents: number;
  share_percent: number;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const RevenueDashboard = () => {
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ad_revenue_shares")
        .select("total_impressions,total_clicks,total_earned_cents,total_paid_cents,share_percent")
        .eq("artist_user_id", user.id)
        .maybeSingle();
      setRevenue(
        data ?? {
          total_impressions: 0,
          total_clicks: 0,
          total_earned_cents: 0,
          total_paid_cents: 0,
          share_percent: 50,
        },
      );
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!revenue) return null;

  const pending = revenue.total_earned_cents - revenue.total_paid_cents;

  const tiles = [
    { label: "Impressions", value: revenue.total_impressions.toLocaleString(), Icon: Eye },
    { label: "Clicks", value: revenue.total_clicks.toLocaleString(), Icon: MousePointerClick },
    { label: "Total earned", value: fmt(revenue.total_earned_cents), Icon: DollarSign },
    { label: "Pending payout", value: fmt(pending), Icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">Ad Revenue</h1>
          <p className="text-sm text-muted-foreground">
            You earn {revenue.share_percent}% of every ad served on your pre-save and link pages.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map(({ label, value, Icon }) => (
            <Card key={label} className="p-4">
              <Icon className="w-4 h-4 text-primary mb-2" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
        <Card className="p-6 mt-6 text-sm text-muted-foreground">
          <p className="mb-2">
            <strong className="text-foreground">Payouts</strong> are processed when your pending balance
            exceeds $10. We'll email you when a payout is sent.
          </p>
          <p>
            Want better rates? Reach top-tier ad partners by growing your fan base — campaigns with
            higher engagement unlock premium CPMs.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default RevenueDashboard;

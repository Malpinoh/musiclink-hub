import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Eye, MousePointerClick, Wallet, Coins, Clock, BadgeCheck } from "lucide-react";
import Header from "@/components/Header";
import { formatCents } from "@/lib/money";
import { useMonetization } from "@/hooks/useMonetization";
import MonetizationOptInCard from "@/components/monetization/MonetizationOptInCard";
import EarningsTable from "@/components/monetization/EarningsTable";

interface Revenue {
  total_impressions: number;
  total_clicks: number;
  total_earned_cents: number;
  total_paid_cents: number;
  share_percent: number;
}

const RevenueDashboard = () => {
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const { summary, earnings } = useMonetization();

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

  const pending = revenue ? revenue.total_earned_cents - revenue.total_paid_cents : 0;
  const s = summary.data;

  const houseTiles = revenue
    ? [
        { label: "Impressions", value: revenue.total_impressions.toLocaleString(), Icon: Eye },
        { label: "Clicks", value: revenue.total_clicks.toLocaleString(), Icon: MousePointerClick },
        { label: "Total earned", value: formatCents(revenue.total_earned_cents), Icon: DollarSign },
        { label: "Pending payout", value: formatCents(pending), Icon: Wallet },
      ]
    : [];

  const linkTiles = s
    ? [
        { label: "Available", value: formatCents(s.available_cents), Icon: Wallet },
        { label: "Pending", value: formatCents(s.pending_cents), Icon: Clock },
        { label: "Lifetime earned", value: formatCents(s.lifetime_artist_cents), Icon: Coins },
        { label: "Paid out", value: formatCents(s.paid_cents), Icon: BadgeCheck },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 pt-20 pb-10 md:pt-24">
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">Earnings</h1>
          <p className="text-sm text-muted-foreground">
            Everything your links make, in one place.
          </p>
        </div>

        <Tabs defaultValue="links">
          <TabsList className="mb-5">
            <TabsTrigger value="links">Link Monetization</TabsTrigger>
            <TabsTrigger value="house">House Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-5">
            <MonetizationOptInCard />

            {s?.status === "approved" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {linkTiles.map(({ label, value, Icon }) => (
                    <Card key={label} className="p-4">
                      <Icon className="w-4 h-4 text-primary mb-2" />
                      <div className="text-xl md:text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-5 md:p-6">
                  <h2 className="font-display font-semibold mb-3">Weekly history</h2>
                  {earnings.isLoading ? (
                    <div className="text-sm text-muted-foreground py-6">Loading…</div>
                  ) : (
                    <EarningsTable rows={earnings.data ?? []} />
                  )}
                </Card>

                <Card className="p-5 md:p-6 text-sm text-muted-foreground">
                  Revenue is imported every Friday night for the previous Saturday–Friday week. Payouts are
                  coming soon — your available balance keeps accruing until then.
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="house" className="space-y-5">
            {loading ? (
              <div className="text-sm text-muted-foreground py-6">Loading…</div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You earn {revenue?.share_percent}% of every house ad served on your pre-save and link pages.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {houseTiles.map(({ label, value, Icon }) => (
                    <Card key={label} className="p-4">
                      <Icon className="w-4 h-4 text-primary mb-2" />
                      <div className="text-xl md:text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </Card>
                  ))}
                </div>
                <Card className="p-5 md:p-6 text-sm text-muted-foreground">
                  <p className="mb-2">
                    <strong className="text-foreground">Payouts</strong> are processed when your pending
                    balance exceeds $10. We'll email you when a payout is sent.
                  </p>
                  <p>
                    Want better rates? Grow your fan base — campaigns with higher engagement unlock premium
                    CPMs.
                  </p>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default RevenueDashboard;

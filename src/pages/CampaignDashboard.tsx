import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Users, Music2, TrendingUp, Globe, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DateRangeFilter, { DateRange, getDateFromRange } from "@/components/DateRangeFilter";
import PerformanceChart, { ChartDataPoint } from "@/components/PerformanceChart";
import CampaignTable, { CampaignRow } from "@/components/CampaignTable";
import TopPlatformsCard from "@/components/TopPlatformsCard";
import TopCountriesCard from "@/components/TopCountriesCard";
import CampaignDashboardSkeleton from "@/components/CampaignDashboardSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Link } from "react-router-dom";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: "spring" as const, stiffness: 260, damping: 24 },
  }),
};

const cardHover = {
  y: -4,
  scale: 1.02,
  boxShadow: "0 12px 32px -8px hsl(var(--primary) / 0.15)",
  transition: { duration: 0.2 },
};

const CampaignDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [totalClicks, setTotalClicks] = useState(0);
  const [totalFans, setTotalFans] = useState(0);
  const [totalPresaves, setTotalPresaves] = useState(0);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [platforms, setPlatforms] = useState<{ name: string; count: number }[]>([]);
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const startDate = getDateFromRange(dateRange);
    const startISO = startDate ? startDate.toISOString() : "1970-01-01T00:00:00Z";
    const db = supabase as any;

    // All queries in parallel — RPCs return aggregated counts (no 1000-row cap).
    const [
      totalsRes,
      dimsRes,
      seriesRes,
      fanlinkBreakdownRes,
      presaveBreakdownRes,
      fanlinksRes,
      presavesRes,
    ] = await Promise.all([
      db.rpc("get_campaign_totals", { _user_id: user.id, _start: startISO }),
      db.rpc("get_click_dimensions", { _user_id: user.id, _start: startISO }),
      db.rpc("get_campaign_timeseries", { _user_id: user.id, _start: startISO }),
      db.rpc("get_fanlink_breakdown", { _user_id: user.id, _start: startISO }),
      db.rpc("get_presave_breakdown", { _user_id: user.id, _start: startISO }),
      supabase.from("fanlinks").select("id, title, artist, created_at, is_published, expires_at").eq("user_id", user.id),
      supabase.from("pre_saves").select("id, title, artist, created_at, is_active").eq("user_id", user.id),
    ]);

    const totals = (totalsRes.data?.[0] as any) || { total_clicks: 0, total_fans: 0, total_presaves: 0 };
    setTotalClicks(Number(totals.total_clicks) || 0);
    setTotalFans(Number(totals.total_fans) || 0);
    setTotalPresaves(Number(totals.total_presaves) || 0);

    const dims = (dimsRes.data as any[]) || [];
    const plats = dims.filter((d) => d.dimension === "platform").map((d) => ({ name: d.value, count: Number(d.count) })).sort((a, b) => b.count - a.count);
    const ctrys = dims.filter((d) => d.dimension === "country").map((d) => ({ name: d.value, count: Number(d.count) })).sort((a, b) => b.count - a.count);
    setPlatforms(plats);
    setCountries(ctrys);

    const series = ((seriesRes.data as any[]) || []).map((r) => ({
      date: new Date(r.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clicks: Number(r.clicks),
      fans: Number(r.fans),
      presaves: Number(r.presaves),
    }));
    setChartData(series);

    const fanlinkMap = new Map<string, { clicks: number; fans: number }>();
    ((fanlinkBreakdownRes.data as any[]) || []).forEach((r) => fanlinkMap.set(r.fanlink_id, { clicks: Number(r.clicks), fans: Number(r.fans) }));
    const presaveMap = new Map<string, number>();
    ((presaveBreakdownRes.data as any[]) || []).forEach((r) => presaveMap.set(r.pre_save_id, Number(r.actions)));

    const rows: CampaignRow[] = [];
    (fanlinksRes.data || []).forEach((f: any) => {
      const b = fanlinkMap.get(f.id) || { clicks: 0, fans: 0 };
      const isExpired = f.expires_at && new Date(f.expires_at) < new Date();
      rows.push({
        id: f.id,
        name: `${f.title} — ${f.artist}`,
        type: "fanlink",
        clicks: b.clicks,
        fans: b.fans,
        presaves: 0,
        conversionRate: b.clicks > 0 ? (b.fans / b.clicks) * 100 : 0,
        createdAt: f.created_at,
        status: isExpired ? "expired" : f.is_published ? "active" : "disabled",
      });
    });
    (presavesRes.data || []).forEach((p: any) => {
      rows.push({
        id: p.id,
        name: `${p.title} — ${p.artist}`,
        type: "presave",
        clicks: 0,
        fans: 0,
        presaves: presaveMap.get(p.id) || 0,
        conversionRate: 0,
        createdAt: p.created_at,
        status: p.is_active ? "active" : "inactive",
      });
    });
    setCampaigns(rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }, [user, dateRange]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [authLoading, user, navigate]);
  useEffect(() => { if (user) { fetchData(); trackEvent("campaign_dashboard_viewed"); } }, [user, fetchData]);

  const conversionRate = useMemo(
    () => (totalClicks > 0 ? (totalFans / totalClicks) * 100 : 0),
    [totalClicks, totalFans]
  );
  const topPlatform = platforms[0]?.name || "—";
  const topCountry = countries[0]?.name || "—";

  const handleExport = () => {
    const header = "Campaign,Type,Clicks,Fans,Pre-saves,Conversion Rate,Status,Created\n";
    const csv = campaigns.map((c) => `"${c.name}",${c.type},${c.clicks},${c.fans},${c.presaves},${c.conversionRate.toFixed(1)}%,${c.status},${c.createdAt}`).join("\n");
    const blob = new Blob([header + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("campaign_report_exported");
  };

  if (authLoading || loading) return <CampaignDashboardSkeleton />;

  const stats = [
    { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: BarChart3, color: "text-primary", bg: "bg-primary/15" },
    { label: "Fans Collected", value: totalFans.toLocaleString(), icon: Users, color: "text-accent", bg: "bg-accent/15" },
    { label: "Pre-saves", value: totalPresaves.toLocaleString(), icon: Music2, color: "text-green-500", bg: "bg-green-500/15" },
    { label: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp, color: "text-yellow-500", bg: "bg-yellow-500/15" },
    { label: "Top Platform", value: topPlatform, icon: Headphones, color: "text-primary", bg: "bg-primary/15" },
    { label: "Top Country", value: topCountry, icon: Globe, color: "text-accent", bg: "bg-accent/15" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">
          <motion.div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" custom={0} variants={sectionVariants} initial="hidden" animate="visible">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">Campaign Dashboard</h1>
              <p className="text-muted-foreground">Real-time marketing performance</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-2xl" asChild><Link to="/artist/campaigns/list">My Campaigns</Link></Button>
              <Button variant="hero" className="rounded-2xl" asChild><Link to="/artist/campaigns/create">Create Campaign</Link></Button>
            </div>
          </motion.div>

          <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <DateRangeFilter value={dateRange} onChange={(r) => { setDateRange(r); trackEvent("campaign_filtered", { range: r }); }} />
          </motion.div>

          <motion.section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6" custom={2} variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="font-display text-lg font-semibold mb-4 text-muted-foreground">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.map((s) => (
                <motion.div key={s.label} className="rounded-2xl border border-border/40 bg-background/60 p-4 cursor-default" whileHover={cardHover}>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold truncate max-w-full">{s.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6" custom={3} variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="font-display text-lg font-semibold mb-4 text-muted-foreground">Performance</h2>
            <PerformanceChart data={chartData} />
          </motion.section>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" custom={4} variants={sectionVariants} initial="hidden" animate="visible">
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
              <TopPlatformsCard platforms={platforms} />
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
              <TopCountriesCard countries={countries} />
            </div>
          </motion.div>

          <motion.section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6" custom={5} variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="font-display text-lg font-semibold mb-4 text-muted-foreground">All Campaigns</h2>
            <CampaignTable campaigns={campaigns} onExport={handleExport} />
          </motion.section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CampaignDashboard;

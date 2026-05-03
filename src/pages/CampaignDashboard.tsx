import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Users, Music2, TrendingUp, Globe, Headphones, Download } from "lucide-react";
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
  const [conversionRate, setConversionRate] = useState(0);
  const [topPlatform, setTopPlatform] = useState("—");
  const [topCountry, setTopCountry] = useState("—");

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [platforms, setPlatforms] = useState<{ name: string; count: number }[]>([]);
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const startDate = getDateFromRange(dateRange);
    const startISO = startDate ? startDate.toISOString() : "1970-01-01T00:00:00Z";

    const { data: fanlinks } = await supabase.from("fanlinks").select("id, title, artist, created_at, is_published, expires_at").eq("user_id", user.id);
    const { data: presaves } = await supabase.from("pre_saves").select("id, title, artist, created_at, is_active").eq("user_id", user.id);

    const fanlinkIds = (fanlinks || []).map((f) => f.id);
    const presaveIds = (presaves || []).map((p) => p.id);

    let clicksQuery = supabase.from("clicks").select("id, platform_name, country, clicked_at, fanlink_id").gte("clicked_at", startISO);
    if (fanlinkIds.length > 0) clicksQuery = clicksQuery.in("fanlink_id", fanlinkIds);
    else clicksQuery = clicksQuery.eq("fanlink_id", "00000000-0000-0000-0000-000000000000");
    const { data: clicks } = await clicksQuery;

    let fansQuery = supabase.from("fan_contacts").select("id, link_id, collected_at").gte("collected_at", startISO);
    if (fanlinkIds.length > 0) fansQuery = fansQuery.in("link_id", fanlinkIds);
    else fansQuery = fansQuery.eq("link_id", "00000000-0000-0000-0000-000000000000");
    const { data: fans } = await fansQuery;

    let actionsQuery = supabase.from("pre_save_actions").select("id, pre_save_id, created_at").gte("created_at", startISO);
    if (presaveIds.length > 0) actionsQuery = actionsQuery.in("pre_save_id", presaveIds);
    else actionsQuery = actionsQuery.eq("pre_save_id", "00000000-0000-0000-0000-000000000000");
    const { data: actions } = await actionsQuery;

    const clicksArr = clicks || [];
    const fansArr = fans || [];
    const actionsArr = actions || [];

    setTotalClicks(clicksArr.length);
    setTotalFans(fansArr.length);
    setTotalPresaves(actionsArr.length);
    setConversionRate(clicksArr.length > 0 ? (fansArr.length / clicksArr.length) * 100 : 0);

    const platCounts: Record<string, number> = {};
    clicksArr.forEach((c) => { const p = c.platform_name || "Unknown"; platCounts[p] = (platCounts[p] || 0) + 1; });
    const sortedPlats = Object.entries(platCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    setPlatforms(sortedPlats);
    setTopPlatform(sortedPlats[0]?.name || "—");

    const countryCounts: Record<string, number> = {};
    clicksArr.forEach((c) => { const co = c.country || "Unknown"; countryCounts[co] = (countryCounts[co] || 0) + 1; });
    const sortedCountries = Object.entries(countryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    setCountries(sortedCountries);
    setTopCountry(sortedCountries[0]?.name || "—");

    const dateMap: Record<string, { clicks: number; fans: number; presaves: number }> = {};
    clicksArr.forEach((c) => { const d = new Date(c.clicked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); if (!dateMap[d]) dateMap[d] = { clicks: 0, fans: 0, presaves: 0 }; dateMap[d].clicks++; });
    fansArr.forEach((f) => { const d = new Date(f.collected_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); if (!dateMap[d]) dateMap[d] = { clicks: 0, fans: 0, presaves: 0 }; dateMap[d].fans++; });
    actionsArr.forEach((a) => { const d = new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); if (!dateMap[d]) dateMap[d] = { clicks: 0, fans: 0, presaves: 0 }; dateMap[d].presaves++; });
    setChartData(Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals })).slice(-30));

    const rows: CampaignRow[] = [];
    (fanlinks || []).forEach((f) => {
      const fClicks = clicksArr.filter((c) => c.fanlink_id === f.id).length;
      const fFans = fansArr.filter((c) => c.link_id === f.id).length;
      const isExpired = f.expires_at && new Date(f.expires_at) < new Date();
      rows.push({ id: f.id, name: `${f.title} — ${f.artist}`, type: "fanlink", clicks: fClicks, fans: fFans, presaves: 0, conversionRate: fClicks > 0 ? (fFans / fClicks) * 100 : 0, createdAt: f.created_at, status: isExpired ? "expired" : f.is_published ? "active" : "disabled" });
    });
    (presaves || []).forEach((p) => {
      const pActions = actionsArr.filter((a) => a.pre_save_id === p.id).length;
      rows.push({ id: p.id, name: `${p.title} — ${p.artist}`, type: "presave", clicks: 0, fans: 0, presaves: pActions, conversionRate: 0, createdAt: p.created_at, status: p.is_active ? "active" : "inactive" });
    });
    setCampaigns(rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }, [user, dateRange]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [authLoading, user, navigate]);
  useEffect(() => { if (user) { fetchData(); trackEvent("campaign_dashboard_viewed"); } }, [user, fetchData]);

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
          {/* Header */}
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

          {/* Date filter */}
          <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <DateRangeFilter value={dateRange} onChange={(r) => { setDateRange(r); trackEvent("campaign_filtered", { range: r }); }} />
          </motion.div>

          {/* Section 1: Top Stats Grid (6 cards max) */}
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

          {/* Section 2: Performance Chart (full-width) */}
          <motion.section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6" custom={3} variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="font-display text-lg font-semibold mb-4 text-muted-foreground">Performance</h2>
            <PerformanceChart data={chartData} />
          </motion.section>

          {/* Section 3: Platforms + Countries */}
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" custom={4} variants={sectionVariants} initial="hidden" animate="visible">
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
              <TopPlatformsCard platforms={platforms} />
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
              <TopCountriesCard countries={countries} />
            </div>
          </motion.div>

          {/* Section 4: Campaign Table (bottom) */}
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

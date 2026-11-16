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
import { fetchAllRows } from "@/lib/fetchAllRows";

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

interface SpotifyReportRow {
  id: string; campaignName: string; tiktokCampaignName: string; artist: string; song: string; link: string;
  pageViews: number; spotifyClicks: number; otherPlatformClicks: number; ctr: number;
}

const CampaignDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [totalClicks, setTotalClicks] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalPlatformClicks, setTotalPlatformClicks] = useState(0);
  const [totalFans, setTotalFans] = useState(0);
  const [totalPresaves, setTotalPresaves] = useState(0);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [platforms, setPlatforms] = useState<{ name: string; count: number }[]>([]);
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [spotifyReport, setSpotifyReport] = useState<SpotifyReportRow[]>([]);

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
      campaignRecordsRes,
    ] = await Promise.all([
      db.rpc("get_campaign_totals", { _user_id: user.id, _start: startISO }),
      db.rpc("get_click_dimensions", { _user_id: user.id, _start: startISO }),
      db.rpc("get_campaign_timeseries", { _user_id: user.id, _start: startISO }),
      db.rpc("get_fanlink_breakdown", { _user_id: user.id, _start: startISO }),
      db.rpc("get_presave_breakdown", { _user_id: user.id, _start: startISO }),
      supabase.from("fanlinks").select("id, title, artist, artist_slug, slug, created_at, is_published, expires_at").eq("user_id", user.id),
      supabase.from("pre_saves").select("id, title, artist, created_at, is_active").eq("user_id", user.id),
      supabase.from("campaigns").select("id, campaign_name, artist_name, fanlink_id, metadata, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const totals = (totalsRes.data?.[0] as any) || {};
    setTotalClicks(Number(totals.total_clicks) || 0);
    setTotalViews(Number(totals.total_views) || 0);
    setTotalPlatformClicks(Number(totals.total_platform_clicks) || 0);
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
      views: Number(r.views ?? 0),
      platformClicks: Number(r.platform_clicks ?? 0),
      fans: Number(r.fans),
      presaves: Number(r.presaves),
    }));
    setChartData(series);

    const fanlinkMap = new Map<string, { clicks: number; views: number; platformClicks: number; fans: number }>();
    ((fanlinkBreakdownRes.data as any[]) || []).forEach((r) =>
      fanlinkMap.set(r.fanlink_id, {
        clicks: Number(r.clicks),
        views: Number(r.views ?? 0),
        platformClicks: Number(r.platform_clicks ?? 0),
        fans: Number(r.fans),
      })
    );
    const presaveMap = new Map<string, number>();
    ((presaveBreakdownRes.data as any[]) || []).forEach((r) => presaveMap.set(r.pre_save_id, Number(r.actions)));

    const rows: CampaignRow[] = [];
    (fanlinksRes.data || []).forEach((f: any) => {
      const b = fanlinkMap.get(f.id) || { clicks: 0, views: 0, platformClicks: 0, fans: 0 };
      const isExpired = f.expires_at && new Date(f.expires_at) < new Date();
      rows.push({
        id: f.id,
        name: `${f.title} — ${f.artist}`,
        type: "fanlink",
        clicks: b.clicks,
        views: b.views,
        platformClicks: b.platformClicks,
        fans: b.fans,
        presaves: 0,
        // Conversion = platform clicks per page view (did the visitor go stream it?)
        conversionRate: b.views > 0 ? (b.platformClicks / b.views) * 100 : 0,
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
        views: 0,
        platformClicks: 0,
        fans: 0,
        presaves: presaveMap.get(p.id) || 0,
        conversionRate: 0,
        createdAt: p.created_at,
        status: p.is_active ? "active" : "inactive",
      });
    });
    setCampaigns(rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    // Spotify outbound clicks are handoff attempts, not confirmed Spotify streams.
    const ownedFanlinks = (fanlinksRes.data || []) as any[];
    const fanlinkIds = ownedFanlinks.map((f) => f.id);
    const clickRows = fanlinkIds.length
      ? await fetchAllRows<{ fanlink_id: string; platform_name: string | null; clicked_at: string }>(
          () => supabase.from("clicks").select("fanlink_id, platform_name, clicked_at").in("fanlink_id", fanlinkIds).gte("clicked_at", startISO)
        )
      : [];
    const clickCounts = new Map<string, { views: number; spotify: number; other: number }>();
    clickRows.forEach((click) => {
      const counts = clickCounts.get(click.fanlink_id) || { views: 0, spotify: 0, other: 0 };
      if (!click.platform_name) counts.views += 1;
      else if (click.platform_name.toLowerCase() === "spotify") counts.spotify += 1;
      else counts.other += 1;
      clickCounts.set(click.fanlink_id, counts);
    });
    const campaignByFanlink = new Map<string, any>();
    ((campaignRecordsRes.data || []) as any[]).forEach((campaign) => {
      if (campaign.fanlink_id && !campaignByFanlink.has(campaign.fanlink_id)) campaignByFanlink.set(campaign.fanlink_id, campaign);
    });
    const reportRows: SpotifyReportRow[] = ownedFanlinks.map((fanlink) => {
      const counts = clickCounts.get(fanlink.id) || { views: 0, spotify: 0, other: 0 };
      const campaign = campaignByFanlink.get(fanlink.id);
      const metadata = campaign?.metadata && typeof campaign.metadata === "object" ? campaign.metadata as Record<string, unknown> : {};
      return {
        id: fanlink.id,
        campaignName: campaign?.campaign_name || "Direct fan-link promotion",
        tiktokCampaignName: typeof metadata.tiktok_campaign_name === "string" && metadata.tiktok_campaign_name.trim() ? metadata.tiktok_campaign_name.trim() : "Not specified",
        artist: fanlink.artist || campaign?.artist_name || "—",
        song: fanlink.title || "—",
        link: `/${fanlink.artist_slug}/${fanlink.slug}`,
        pageViews: counts.views,
        spotifyClicks: counts.spotify,
        otherPlatformClicks: counts.other,
        ctr: counts.views > 0 ? (counts.spotify / counts.views) * 100 : 0,
      };
    }).sort((a, b) => b.spotifyClicks - a.spotifyClicks || b.pageViews - a.pageViews);
    setSpotifyReport(reportRows);
    setLoading(false);
  }, [user, dateRange]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [authLoading, user, navigate]);
  useEffect(() => { if (user) { fetchData(); trackEvent("campaign_dashboard_viewed"); } }, [user, fetchData]);

  // Streaming CTR: how many page views turned into an actual platform click
  const streamingCtr = useMemo(
    () => (totalViews > 0 ? (totalPlatformClicks / totalViews) * 100 : 0),
    [totalViews, totalPlatformClicks]
  );
  const topPlatform = platforms[0]?.name || "—";
  const topCountry = countries[0]?.name || "—";

  const handleExport = () => {
    const header = "Campaign,Type,Page Views,Platform Clicks,Fans,Pre-saves,Streaming CTR,Status,Created\n";
    const csv = campaigns.map((c) => `"${c.name}",${c.type},${c.views},${c.platformClicks},${c.fans},${c.presaves},${c.conversionRate.toFixed(1)}%,${c.status},${c.createdAt}`).join("\n");
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
    { label: "Page Views", value: totalViews.toLocaleString(), icon: BarChart3, color: "text-primary", bg: "bg-primary/15" },
    { label: "Platform Clicks", value: totalPlatformClicks.toLocaleString(), icon: Headphones, color: "text-primary", bg: "bg-primary/15" },
    { label: "Streaming CTR", value: `${streamingCtr.toFixed(1)}%`, icon: TrendingUp, color: "text-yellow-500", bg: "bg-yellow-500/15" },
    { label: "Fans Collected", value: totalFans.toLocaleString(), icon: Users, color: "text-accent", bg: "bg-accent/15" },
    { label: "Pre-saves", value: totalPresaves.toLocaleString(), icon: Music2, color: "text-green-500", bg: "bg-green-500/15" },
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h2 className="font-display text-lg font-semibold text-muted-foreground">Spotify Traffic Report</h2>
              <span className="text-xs text-muted-foreground">Ranked by Spotify outbound clicks</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Compare artist, song, MDistro campaign and fan-link performance. Add the exact TikTok Ads campaign name when creating a campaign. Spotify clicks are handoff attempts, not verified streams.
            </p>
            {spotifyReport.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Your report will appear after visitors use your fan links.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-3 pr-4">Campaign / Artist / Song</th><th className="py-3 pr-4">TikTok Ads campaign</th>
                    <th className="py-3 pr-4 text-right">Views</th><th className="py-3 pr-4 text-right">Spotify clicks</th>
                    <th className="py-3 pr-4 text-right">Spotify CTR</th><th className="py-3 text-right">Link</th>
                  </tr></thead>
                  <tbody>{spotifyReport.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 min-w-[180px]"><p className="font-medium">{row.campaignName}</p><p className="text-xs text-muted-foreground">{row.artist} — {row.song}</p></td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground min-w-[140px]">{row.tiktokCampaignName}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{row.pageViews.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right tabular-nums font-semibold">{row.spotifyClicks.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{row.ctr.toFixed(1)}%</td>
                      <td className="py-3 text-right"><a href={row.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </motion.section>

          <motion.section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6" custom={6} variants={sectionVariants} initial="hidden" animate="visible">
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

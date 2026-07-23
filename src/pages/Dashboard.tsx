import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Plus, Search, Link2, BarChart3, ExternalLink, Trash2, Music2,
  Clock, Calendar, Edit, User, Mail, MailCheck, MailX, TrendingUp, Users,
  Copy, MousePointerClick,
} from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import PerformanceChart, { ChartDataPoint } from "@/components/PerformanceChart";
import HeroMetric from "@/components/dashboard/HeroMetric";
import HealthScore from "@/components/dashboard/HealthScore";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import SuggestionsPanel, { Suggestion } from "@/components/dashboard/SuggestionsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import MobileStickyBar from "@/components/MobileStickyBar";

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  created_at: string;
  is_published: boolean | null;
  expires_at: string | null;
}

interface PreSave {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  release_date: string | null;
  is_released: boolean;
  created_at: string;
}

interface PreSaveStats {
  fanSignups: number;
  notificationsSent: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [fanlinks, setFanlinks] = useState<Fanlink[]>([]);
  const [preSaves, setPreSaves] = useState<PreSave[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [fanContactCounts, setFanContactCounts] = useState<Record<string, number>>({});
  const [preSaveStats, setPreSaveStats] = useState<Record<string, PreSaveStats>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fanlinks");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [weekClicks, setWeekClicks] = useState({ current: 0, previous: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [fanlinkRes, presaveRes, profileRes] = await Promise.all([
        supabase.from("fanlinks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("pre_saves").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);

      const fls = fanlinkRes.data || [];
      const pss = presaveRes.data || [];
      setFanlinks(fls);
      setPreSaves(pss);
      setDisplayName(profileRes.data?.full_name || user.email?.split("@")[0] || "artist");

      if (fls.length > 0) {
        const fanlinkIds = fls.map((f) => f.id);
        const perLinkResults = await Promise.all(
          fanlinkIds.map(async (id) => {
            const [clicksCount, fansCount] = await Promise.all([
              supabase.from("clicks").select("*", { count: "exact", head: true }).eq("fanlink_id", id),
              supabase.from("fan_contacts").select("*", { count: "exact", head: true }).eq("link_id", id),
            ]);
            return { id, clicks: clicksCount.count || 0, fans: fansCount.count || 0 };
          })
        );
        const cc: Record<string, number> = {};
        const fc: Record<string, number> = {};
        perLinkResults.forEach((r) => { cc[r.id] = r.clicks; fc[r.id] = r.fans; });
        setClickCounts(cc);
        setFanContactCounts(fc);

        // Week-over-week clicks (exact counts, no row cap).
        const now = Date.now();
        const week = 7 * 86400000;
        const [curr, prev] = await Promise.all([
          supabase.from("clicks").select("*", { count: "exact", head: true })
            .in("fanlink_id", fanlinkIds).gte("clicked_at", new Date(now - week).toISOString()),
          supabase.from("clicks").select("*", { count: "exact", head: true })
            .in("fanlink_id", fanlinkIds)
            .gte("clicked_at", new Date(now - 2 * week).toISOString())
            .lt("clicked_at", new Date(now - week).toISOString()),
        ]);
        setWeekClicks({ current: curr.count || 0, previous: prev.count || 0 });

        // Chart series (last 30 days, paginated).
        const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
        const dateMap: Record<string, { clicks: number; fans: number; presaves: number }> = {};
        let from = 0;
        const PAGE = 1000;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: chunk, error } = await supabase
            .from("clicks")
            .select("clicked_at")
            .in("fanlink_id", fanlinkIds)
            .gte("clicked_at", thirtyDaysAgo)
            .order("clicked_at", { ascending: true })
            .range(from, from + PAGE - 1);
          if (error || !chunk || chunk.length === 0) break;
          chunk.forEach((c) => {
            const d = new Date(c.clicked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!dateMap[d]) dateMap[d] = { clicks: 0, fans: 0, presaves: 0 };
            dateMap[d].clicks++;
          });
          if (chunk.length < PAGE) break;
          from += PAGE;
        }
        setChartData(Object.entries(dateMap).map(([date, v]) => ({ date, ...v })).slice(-30));
      }

      if (pss.length > 0) {
        const stats: Record<string, PreSaveStats> = {};
        await Promise.all(
          pss.map(async (ps) => {
            const [fanRes, notifRes] = await Promise.all([
              supabase.from("presave_fans").select("*", { count: "exact", head: true }).eq("pre_save_id", ps.id),
              supabase.from("presave_notifications").select("*", { count: "exact", head: true }).eq("pre_save_id", ps.id).eq("status", "sent"),
            ]);
            stats[ps.id] = { fanSignups: fanRes.count || 0, notificationsSent: notifRes.count || 0 };
          })
        );
        setPreSaveStats(stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Realtime totals refresh (cheap — activity feed handles its own live inserts).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-totals-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fan_contacts" }, () => fetchData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "presave_fans" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const handleDeleteFanlink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fanlink?")) return;
    try {
      const { error } = await supabase.from("fanlinks").delete().eq("id", id);
      if (error) throw error;
      setFanlinks(fanlinks.filter((f) => f.id !== id));
      toast.success("Fanlink deleted");
    } catch { toast.error("Failed to delete fanlink"); }
  };

  const handleDeletePreSave = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pre-save?")) return;
    try {
      const { error } = await supabase.from("pre_saves").delete().eq("id", id);
      if (error) throw error;
      setPreSaves(preSaves.filter((p) => p.id !== id));
      toast.success("Pre-save deleted");
    } catch { toast.error("Failed to delete pre-save"); }
  };

  const getFanlinkUrl = (artistSlug: string, slug: string) => `${window.location.origin}/${artistSlug}/${slug}`;
  const getPreSaveUrl = (artistSlug: string, slug: string) => `${window.location.origin}/pre/${artistSlug}-${slug}`;
  const isExpired = (link: Fanlink) => link.expires_at && new Date(link.expires_at) < new Date();
  const isActive = (link: Fanlink) => link.is_published !== false && !isExpired(link);

  const filteredFanlinks = fanlinks.filter(
    (l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPreSaves = preSaves.filter(
    (ps) => ps.title.toLowerCase().includes(searchQuery.toLowerCase()) || ps.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = Object.values(clickCounts).reduce((s, c) => s + c, 0);
  const totalFans = Object.values(fanContactCounts).reduce((s, c) => s + c, 0);
  const totalPreSaveSignups = Object.values(preSaveStats).reduce((s, st) => s + st.fanSignups, 0);
  const conversionRate = totalClicks > 0 ? (totalFans / totalClicks) * 100 : 0;

  const weekDelta = weekClicks.previous > 0
    ? Math.round(((weekClicks.current - weekClicks.previous) / weekClicks.previous) * 100)
    : (weekClicks.current > 0 ? 100 : 0);

  const handleCopyLatest = () => {
    const latest = fanlinks[0];
    if (!latest) { toast.info("No fanlinks yet"); return; }
    navigator.clipboard.writeText(getFanlinkUrl(latest.artist_slug, latest.slug));
    toast.success("Latest link copied!");
  };

  // Health score
  const healthBreakdown = useMemo(() => {
    const hasLink = fanlinks.length > 0;
    const hasPresave = preSaves.length > 0;
    const hasClicks = totalClicks >= 10;
    const hasFans = totalFans >= 1;
    const hasConversion = conversionRate >= 3;
    return [
      { label: "First fanlink created", ok: hasLink, hint: "Ship a link" },
      { label: "First pre-save live", ok: hasPresave, hint: "Set up a release" },
      { label: "10+ clicks landed", ok: hasClicks, hint: "Share on social" },
      { label: "1+ fan collected", ok: hasFans, hint: "Turn on fan gate" },
      { label: "≥3% conversion rate", ok: hasConversion, hint: "Tune your CTA" },
    ];
  }, [fanlinks.length, preSaves.length, totalClicks, totalFans, conversionRate]);
  const healthScore = Math.round((healthBreakdown.filter((b) => b.ok).length / healthBreakdown.length) * 100);

  const linkNames = useMemo(() => {
    const m: Record<string, string> = {};
    fanlinks.forEach((f) => { m[f.id] = f.title; });
    return m;
  }, [fanlinks]);
  const presaveNames = useMemo(() => {
    const m: Record<string, string> = {};
    preSaves.forEach((p) => { m[p.id] = p.title; });
    return m;
  }, [preSaves]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    if (fanlinks.length === 0) out.push({ id: "s1", title: "Create your first fanlink", body: "Route every listener to the platform of their choice from one URL.", cta: "Create fanlink", href: "/create", tone: "primary" });
    if (preSaves.length === 0) out.push({ id: "s2", title: "Launch a pre-save campaign", body: "Convert fans before release day with automated Spotify saves.", cta: "New pre-save", href: "/presave/create", tone: "accent" });
    if (conversionRate < 3 && totalClicks >= 20) out.push({ id: "s3", title: "Boost your conversion rate", body: `You're at ${conversionRate.toFixed(1)}%. Try a stronger CTA or fan gate.`, cta: "Edit your links", href: "/artist/campaigns/list", tone: "warning" });
    if (totalFans >= 10 && preSaves.length === 0) out.push({ id: "s4", title: "Turn fans into pre-saves", body: `${totalFans} fans are waiting. Announce your next release.`, cta: "Announce release", href: "/presave/create", tone: "success" });
    if (fanlinks.length > 0 && totalClicks < 5) out.push({ id: "s5", title: "Share your link on socials", body: "Zero clicks so far. Drop your link on IG, TikTok, or X to get moving.", cta: "Copy latest link", href: "#", tone: "primary" });
    if (fanlinks.length > 0 && preSaves.length > 0) out.push({ id: "s6", title: "Level up with campaigns", body: "Bundle assets, timelines, and analytics into one release story.", cta: "Open campaigns", href: "/artist/campaigns", tone: "accent" });
    return out.slice(0, 3);
  }, [fanlinks.length, preSaves.length, conversionRate, totalClicks, totalFans]);

  if (authLoading || loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient gradient mesh */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: "var(--gradient-mesh)" }}
        aria-hidden
      />

      <Header />
      <main className="pt-24 pb-12 px-4 relative">
        <div className="container mx-auto max-w-6xl space-y-6">

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
            className="relative rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-6 md:p-8 overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary/80 mb-2 font-semibold">Command Center</p>
                <h1 className="font-display text-3xl md:text-5xl font-bold mb-2 leading-[1.1]">
                  Welcome back, <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">{displayName}</span>
                </h1>
                <p className="text-muted-foreground max-w-lg">
                  You've collected <b className="text-foreground">{totalFans.toLocaleString()}</b> fans and driven{" "}
                  <b className="text-foreground">{totalClicks.toLocaleString()}</b> clicks across your catalogue.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" size="lg" asChild><Link to="/create"><Plus className="w-4 h-4 mr-2" />New Fanlink</Link></Button>
                <Button variant="glass" size="lg" asChild><Link to="/presave/create"><Music2 className="w-4 h-4 mr-2" />New Pre-save</Link></Button>
                <Button variant="ghost" size="lg" onClick={handleCopyLatest}><Copy className="w-4 h-4 mr-2" />Copy link</Button>
              </div>
            </div>
          </motion.div>

          {/* ── Hero metrics ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroMetric label="Total Clicks" value={totalClicks} icon={MousePointerClick} tone="primary"
              delta={weekClicks.previous > 0 || weekClicks.current > 0 ? { value: weekDelta, label: `${weekClicks.current} this week` } : undefined} />
            <HeroMetric label="Fans Collected" value={totalFans} icon={Users} tone="accent" />
            <HeroMetric label="Pre-save Signups" value={totalPreSaveSignups} icon={Music2} tone="success" />
            <HeroMetric label="Conversion" value={Number(conversionRate.toFixed(1))} suffix="%" icon={TrendingUp} tone="warning" />
          </div>

          {/* ── Health + Live Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HealthScore score={healthScore} breakdown={healthBreakdown} />
            <LiveActivityFeed
              userId={user!.id}
              fanlinkIds={fanlinks.map((f) => f.id)}
              presaveIds={preSaves.map((p) => p.id)}
              linkNames={linkNames}
              presaveNames={presaveNames}
            />
          </div>

          {/* ── Suggestions ── */}
          <SuggestionsPanel suggestions={suggestions} />

          {/* ── Performance chart ── */}
          {chartData.length > 0 && (
            <motion.section
              className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-[var(--shadow-md)]"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Performance — 30 days</h2>
                <Button variant="ghost" size="sm" asChild><Link to="/artist/campaigns"><BarChart3 className="w-4 h-4 mr-2" />Deep dive</Link></Button>
              </div>
              <PerformanceChart data={chartData} />
            </motion.section>
          )}

          {/* ── Links & Pre-saves ── */}
          <motion.section
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-[var(--shadow-md)]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Catalogue</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild><Link to="/artist/campaigns"><BarChart3 className="w-4 h-4 mr-2" />Campaigns</Link></Button>
                <Button variant="ghost" size="sm" asChild><Link to="/artist-bio/edit"><User className="w-4 h-4 mr-2" />Artist Bio</Link></Button>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search links..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 rounded-2xl bg-background/60" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="fanlinks" className="flex items-center gap-2"><Link2 className="w-4 h-4" />Fanlinks ({fanlinks.length})</TabsTrigger>
                <TabsTrigger value="presaves" className="flex items-center gap-2"><Clock className="w-4 h-4" />Pre-Saves ({preSaves.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="fanlinks">
                <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {filteredFanlinks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 p-12 text-center">
                      <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-display text-xl font-semibold mb-2">No fanlinks found</h3>
                      <p className="text-muted-foreground mb-6">{searchQuery ? "Try a different search" : "Create your first fanlink"}</p>
                      {!searchQuery && (
                        <Button variant="hero" asChild><Link to="/create"><Plus className="w-5 h-5 mr-2" />Create Fanlink</Link></Button>
                      )}
                    </div>
                  ) : (
                    filteredFanlinks.map((link, i) => (
                      <motion.div
                        key={link.id}
                        className="rounded-2xl border border-border/40 bg-background/40 hover:bg-background/60 p-4 transition-all"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-border/40">
                            {link.artwork_url ? <img src={link.artwork_url} alt={link.title} className="w-full h-full object-cover" /> : <Music2 className="w-7 h-7 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold truncate">{link.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{link.artist}</p>
                          </div>
                          <div className="hidden md:flex items-center gap-6">
                            {(fanContactCounts[link.id] || 0) > 0 && (
                              <div className="text-right">
                                <p className="font-display font-semibold">{fanContactCounts[link.id].toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">fans</p>
                              </div>
                            )}
                            <div className="text-right">
                              <p className="font-display font-semibold">{(clickCounts[link.id] || 0).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">clicks</p>
                            </div>
                          </div>
                          {!isActive(link) && (
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired(link) ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>
                              {isExpired(link) ? "Expired" : "Disabled"}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild title="Analytics"><Link to={`/analytics/fanlink/${link.id}`}><BarChart3 className="w-4 h-4" /></Link></Button>
                            <Button variant="ghost" size="icon" asChild title="Edit"><Link to={`/edit/fanlink/${link.id}`}><Edit className="w-4 h-4" /></Link></Button>
                            <Button variant="ghost" size="icon" asChild title="View"><Link to={`/${link.artist_slug}/${link.slug}`} target="_blank"><ExternalLink className="w-4 h-4" /></Link></Button>
                            <ShareButtons url={getFanlinkUrl(link.artist_slug, link.slug)} title={link.title} artist={link.artist} compact />
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteFanlink(link.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="presaves">
                <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {filteredPreSaves.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 p-12 text-center">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-display text-xl font-semibold mb-2">No pre-saves found</h3>
                      <p className="text-muted-foreground mb-6">{searchQuery ? "Try a different search" : "Create a pre-save for upcoming releases"}</p>
                      {!searchQuery && (
                        <Button variant="hero" asChild><Link to="/presave/create"><Clock className="w-5 h-5 mr-2" />Create Pre-Save</Link></Button>
                      )}
                    </div>
                  ) : (
                    filteredPreSaves.map((ps, i) => (
                      <motion.div
                        key={ps.id}
                        className="rounded-2xl border border-border/40 bg-background/40 hover:bg-background/60 p-4 transition-all"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden relative flex-shrink-0 ring-1 ring-border/40">
                            {ps.artwork_url ? <img src={ps.artwork_url} alt={ps.title} className="w-full h-full object-cover" /> : <Music2 className="w-7 h-7 text-muted-foreground" />}
                            {!ps.is_released && <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-[10px] text-center py-0.5 font-semibold text-primary-foreground">PRE-SAVE</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold truncate">{ps.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{ps.artist}</p>
                            {ps.release_date && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{ps.release_date}</p>
                            )}
                          </div>
                          <div className="hidden md:flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-display font-semibold">{(preSaveStats[ps.id]?.fanSignups || 0).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">fans</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${ps.is_released ? "bg-success/20 text-success" : "bg-primary/20 text-primary"}`}>
                              {ps.is_released ? "Released" : "Upcoming"}
                            </div>
                            {ps.is_released && (preSaveStats[ps.id]?.fanSignups || 0) > 0 && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                (preSaveStats[ps.id]?.notificationsSent || 0) >= (preSaveStats[ps.id]?.fanSignups || 0)
                                  ? "bg-success/20 text-success"
                                  : (preSaveStats[ps.id]?.notificationsSent || 0) > 0 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"
                              }`}>
                                {(preSaveStats[ps.id]?.notificationsSent || 0) >= (preSaveStats[ps.id]?.fanSignups || 0)
                                  ? <><MailCheck className="w-3 h-3" /> All sent</>
                                  : (preSaveStats[ps.id]?.notificationsSent || 0) > 0 ? <><Mail className="w-3 h-3" /> Partial</> : <><MailX className="w-3 h-3" /> Not sent</>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild title="Analytics"><Link to={`/analytics/presave/${ps.id}`}><BarChart3 className="w-4 h-4" /></Link></Button>
                            <Button variant="ghost" size="icon" asChild title="Edit"><Link to={`/edit/presave/${ps.id}`}><Edit className="w-4 h-4" /></Link></Button>
                            <Button variant="ghost" size="icon" asChild title="View"><Link to={ps.is_released ? `/listen/${ps.artist_slug}-${ps.slug}` : `/pre/${ps.artist_slug}-${ps.slug}`} target="_blank"><ExternalLink className="w-4 h-4" /></Link></Button>
                            <ShareButtons url={getPreSaveUrl(ps.artist_slug, ps.slug)} title={ps.title} artist={ps.artist} compact />
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePreSave(ps.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.section>
        </div>
      </main>
      <Footer />
      <MobileStickyBar />
    </div>
  );
};

export default Dashboard;

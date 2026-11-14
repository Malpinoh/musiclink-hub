import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity as ActivityIcon, Clock, Filter, Link2, Music2, Radio, Search, UserPlus, RefreshCw, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileStickyBar from "@/components/MobileStickyBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type ActivityKind = "click" | "fan" | "presave" | "spotify";
type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  meta?: string;
  at: string;
  href: string;
};

const PAGE_SIZE = 50;
const maskEmail = (email?: string | null) => email ? email.replace(/^(.{2}).*(@.*)$/, "$1•••$2") : "";
const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
const kindIcon = {
  click: Link2,
  fan: UserPlus,
  presave: Music2,
  spotify: Radio,
};

const Activity = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fanlinkIds, setFanlinkIds] = useState<string[]>([]);
  const [presaveIds, setPresaveIds] = useState<string[]>([]);
  const [linkNames, setLinkNames] = useState<Record<string, string>>({});
  const [presaveNames, setPresaveNames] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [mode, setMode] = useState<"live" | "history">("live");
  const [kind, setKind] = useState("all");
  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [links, presaves] = await Promise.all([
        supabase.from("fanlinks").select("id,title").eq("user_id", user.id),
        supabase.from("pre_saves").select("id,title").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const linkRows = links.data || [];
      const presaveRows = presaves.data || [];
      setFanlinkIds(linkRows.map(x => x.id));
      setPresaveIds(presaveRows.map(x => x.id));
      setLinkNames(Object.fromEntries(linkRows.map(x => [x.id, x.title])));
      setPresaveNames(Object.fromEntries(presaveRows.map(x => [x.id, x.title])));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const loadEvents = useCallback(async (pageOffset = 0, append = false) => {
    if (!user) return;
    if (append) setLoadingMore(true); else setLoading(true);
    const now = Date.now();
    const liveBoundary = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const historyBoundary = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const historyStart = period === "all" ? null : new Date(now - Number(period) * 86400000).toISOString();
    const build = (query: any, column: string) => {
      let q = query.order(column, { ascending: false }).range(pageOffset, pageOffset + PAGE_SIZE - 1);
      if (mode === "live") q = q.gte(column, liveBoundary);
      else {
        q = q.lt(column, historyBoundary);
        if (historyStart) q = q.gte(column, historyStart);
      }
      return q;
    };
    try {
      const requests: Array<PromiseLike<any>> = [];
      if (fanlinkIds.length) {
        requests.push(build(supabase.from("clicks").select("id,fanlink_id,platform_name,clicked_at,country,city,device_type").in("fanlink_id", fanlinkIds), "clicked_at"));
        requests.push(build(supabase.from("fan_contacts").select("id,link_id,email,collected_at,country").in("link_id", fanlinkIds), "collected_at"));
      } else requests.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
      if (presaveIds.length) {
        requests.push(build(supabase.from("presave_fans").select("id,pre_save_id,created_at").in("pre_save_id", presaveIds), "created_at"));
        requests.push(build(supabase.from("pre_save_actions").select("id,pre_save_id,action_type,completed,created_at,country,city").in("pre_save_id", presaveIds), "created_at"));
      } else requests.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
      const [clicks, fans, signups, actions] = await Promise.all(requests);
      [clicks, fans, signups, actions].forEach((result: any) => { if (result.error) console.error("Activity query failed:", result.error); });
      const next: ActivityEvent[] = [];
      (clicks.data || []).forEach((x: any) => next.push({
        id: `click-${x.id}`, kind: "click", title: `Someone opened ${linkNames[x.fanlink_id] || "your fanlink"}`,
        description: "Fanlink visit", meta: [x.platform_name, x.device_type, x.city, x.country].filter(Boolean).join(" · "),
        at: x.clicked_at, href: `/analytics/fanlink/${x.fanlink_id}`,
      }));
      (fans.data || []).forEach((x: any) => next.push({
        id: `fan-${x.id}`, kind: "fan", title: `A new fan joined through ${linkNames[x.link_id] || "your fanlink"}`,
        description: "Fan contact collected", meta: [maskEmail(x.email), x.country].filter(Boolean).join(" · "),
        at: x.collected_at, href: `/analytics/fanlink/${x.link_id}`,
      }));
      (signups.data || []).forEach((x: any) => next.push({
        id: `presave-${x.id}`, kind: "presave", title: `New pre-save signup for ${presaveNames[x.pre_save_id] || "your release"}`,
        description: "Fan joined the pre-save campaign", at: x.created_at, href: `/analytics/presave/${x.pre_save_id}`,
      }));
      (actions.data || []).forEach((x: any) => next.push({
        id: `spotify-${x.id}`, kind: "spotify", title: `${x.completed ? "Completed" : "Started"} ${(x.action_type || "Spotify").replaceAll("_", " ")} for ${presaveNames[x.pre_save_id] || "your release"}`,
        description: "Pre-save platform action", meta: [x.city, x.country].filter(Boolean).join(" · "),
        at: x.created_at, href: `/analytics/presave/${x.pre_save_id}`,
      }));
      next.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setEvents(prev => {
        const merged = append ? [...prev, ...next] : next;
        return Array.from(new Map(merged.map(e => [e.id, e])).values())
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      });
      setOffset(pageOffset + PAGE_SIZE);
      setHasMore([clicks, fans, signups, actions].some(r => (r.data || []).length === PAGE_SIZE));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, fanlinkIds, presaveIds, linkNames, presaveNames, mode, period]);

  useEffect(() => {
    if (!user || (fanlinkIds.length === 0 && presaveIds.length === 0)) {
      if (user) { setEvents([]); setLoading(false); }
      return;
    }
    setOffset(0);
    loadEvents(0, false);
  }, [user, fanlinkIds, presaveIds, mode, period, loadEvents]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`activity-center-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clicks" }, () => loadEvents(0, false))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fan_contacts" }, () => loadEvents(0, false))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "presave_fans" }, () => loadEvents(0, false))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pre_save_actions" }, () => loadEvents(0, false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadEvents]);

  const visibleEvents = useMemo(() => events.filter(e => {
    const matchesKind = kind === "all" || e.kind === kind;
    const haystack = `${e.title} ${e.description} ${e.meta || ""}`.toLowerCase();
    return matchesKind && haystack.includes(search.toLowerCase());
  }), [events, kind, search]);

  const totalLoaded = visibleEvents.length;
  if (authLoading || (loading && !events.length)) return <div className="min-h-screen bg-background"><Header /><div className="pt-28 text-center text-muted-foreground">Loading activity…</div></div>;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-60" style={{ background: "var(--gradient-mesh)" }} aria-hidden />
      <Header />
      <main className="pt-24 pb-28 md:pb-12 px-3 sm:px-4 relative">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-2">Your audience, in real time</p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold">Activity Center</h1>
              <p className="text-sm text-muted-foreground mt-2">Track fanlink visits, new fans, pre-save signups and Spotify save actions.</p>
            </div>
            <Button variant="outline" onClick={() => loadEvents(0, false)} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "live" | "history")}>
                <TabsList className="grid grid-cols-2 w-full sm:w-[280px]">
                  <TabsTrigger value="live" className="gap-2"><Radio className="w-4 h-4" />Live activity</TabsTrigger>
                  <TabsTrigger value="history" className="gap-2"><Clock className="w-4 h-4" />Past activity</TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "history" && (
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Date range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity, release or platform..." className="pl-9" /></div>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="All activity types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activity types</SelectItem>
                  <SelectItem value="click">Fanlink visits</SelectItem>
                  <SelectItem value="fan">New fans</SelectItem>
                  <SelectItem value="presave">Pre-save signups</SelectItem>
                  <SelectItem value="spotify">Spotify save actions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{mode === "live" ? "Showing activity from the last 24 hours. New events appear automatically." : period === "all" ? "Showing older activity across all available dates." : `Showing older activity from the last ${period} days.`}</span>
              <span>{totalLoaded.toLocaleString()} events</span>
            </div>
          </div>

          <section className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3 sm:p-5">
            {visibleEvents.length === 0 ? (
              <div className="py-16 text-center">
                <ActivityIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-display text-lg font-semibold">{loading ? "Loading activity…" : "No activity found"}</h2>
                <p className="text-sm text-muted-foreground mt-1">{search || kind !== "all" ? "Try changing your filters." : mode === "live" ? "New audience activity will appear here as it happens." : "Your older activity will appear here once available."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleEvents.map((event, index) => {
                  const Icon = kindIcon[event.kind];
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.015, 0.2) }}>
                      <Link to={event.href} className="group flex items-center gap-3 sm:gap-4 rounded-xl border border-border/30 bg-background/40 hover:bg-background/70 p-3 sm:p-4 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${event.kind === "click" ? "bg-primary/15 text-primary" : event.kind === "fan" ? "bg-accent/15 text-accent" : event.kind === "presave" ? "bg-success/15 text-success" : "bg-secondary text-foreground"}`}><Icon className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.description}{event.meta ? ` · ${event.meta}` : ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-foreground/80">{relativeTime(event.at)}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(event.at).toLocaleDateString()}</p>
                        </div>
                        <ArrowUpRight className="hidden sm:block w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {hasMore && visibleEvents.length > 0 && (
              <div className="pt-5 text-center"><Button variant="outline" onClick={() => loadEvents(offset, true)} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more activity"}</Button></div>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <MobileStickyBar />
    </div>
  );
};

export default Activity;

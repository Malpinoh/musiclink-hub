import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { 
  Plus, Search, Link2, BarChart3, ExternalLink, Trash2, Music2, Loader2,
  Clock, Calendar, Edit, User, Mail, MailCheck, MailX, TrendingUp, Users, 
  Copy, Rocket, Eye
} from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import PerformanceChart, { ChartDataPoint } from "@/components/PerformanceChart";
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

const statCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }
  }),
};

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [fanlinkRes, presaveRes] = await Promise.all([
        supabase.from("fanlinks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("pre_saves").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const fls = fanlinkRes.data || [];
      const pss = presaveRes.data || [];
      setFanlinks(fls);
      setPreSaves(pss);

      // Fetch counts in parallel
      if (fls.length > 0) {
        const fanlinkIds = fls.map(f => f.id);
        const [clicksRes, fansRes] = await Promise.all([
          supabase.from("clicks").select("fanlink_id, clicked_at").in("fanlink_id", fanlinkIds),
          supabase.from("fan_contacts").select("link_id").in("link_id", fanlinkIds),
        ]);

        const cc: Record<string, number> = {};
        const fc: Record<string, number> = {};
        fanlinkIds.forEach(id => { cc[id] = 0; fc[id] = 0; });
        (clicksRes.data || []).forEach(c => { cc[c.fanlink_id] = (cc[c.fanlink_id] || 0) + 1; });
        (fansRes.data || []).forEach(f => { fc[f.link_id] = (fc[f.link_id] || 0) + 1; });
        setClickCounts(cc);
        setFanContactCounts(fc);

        // Build chart data from clicks (last 30 days)
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;
        const dateMap: Record<string, { clicks: number; fans: number; presaves: number }> = {};
        (clicksRes.data || []).forEach(c => {
          const ts = new Date(c.clicked_at).getTime();
          if (ts >= thirtyDaysAgo) {
            const d = new Date(c.clicked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!dateMap[d]) dateMap[d] = { clicks: 0, fans: 0, presaves: 0 };
            dateMap[d].clicks++;
          }
        });
        setChartData(Object.entries(dateMap).map(([date, v]) => ({ date, ...v })).slice(-30));
      }

      if (pss.length > 0) {
        const stats: Record<string, PreSaveStats> = {};
        await Promise.all(pss.map(async ps => {
          const [fanRes, notifRes] = await Promise.all([
            supabase.from("presave_fans").select("*", { count: "exact", head: true }).eq("pre_save_id", ps.id),
            supabase.from("presave_notifications").select("*", { count: "exact", head: true }).eq("pre_save_id", ps.id).eq("status", "sent"),
          ]);
          stats[ps.id] = { fanSignups: fanRes.count || 0, notificationsSent: notifRes.count || 0 };
        }));
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

  const handleDeleteFanlink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fanlink?")) return;
    try {
      const { error } = await supabase.from("fanlinks").delete().eq("id", id);
      if (error) throw error;
      setFanlinks(fanlinks.filter(f => f.id !== id));
      toast.success("Fanlink deleted");
    } catch { toast.error("Failed to delete fanlink"); }
  };

  const handleDeletePreSave = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pre-save?")) return;
    try {
      const { error } = await supabase.from("pre_saves").delete().eq("id", id);
      if (error) throw error;
      setPreSaves(preSaves.filter(p => p.id !== id));
      toast.success("Pre-save deleted");
    } catch { toast.error("Failed to delete pre-save"); }
  };

  const getFanlinkUrl = (artistSlug: string, slug: string) => `${window.location.origin}/${artistSlug}/${slug}`;
  const getPreSaveUrl = (artistSlug: string, slug: string) => `${window.location.origin}/pre/${artistSlug}-${slug}`;
  const isExpired = (link: Fanlink) => link.expires_at && new Date(link.expires_at) < new Date();
  const isActive = (link: Fanlink) => link.is_published !== false && !isExpired(link);

  const filteredFanlinks = fanlinks.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPreSaves = preSaves.filter(ps => ps.title.toLowerCase().includes(searchQuery.toLowerCase()) || ps.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalClicks = Object.values(clickCounts).reduce((s, c) => s + c, 0);
  const totalFans = Object.values(fanContactCounts).reduce((s, c) => s + c, 0);
  const totalPreSaveSignups = Object.values(preSaveStats).reduce((s, st) => s + st.fanSignups, 0);
  const conversionRate = totalClicks > 0 ? ((totalFans / totalClicks) * 100).toFixed(1) : "0.0";

  const handleCopyLatest = () => {
    const latest = fanlinks[0];
    if (!latest) { toast.info("No fanlinks yet"); return; }
    navigator.clipboard.writeText(getFanlinkUrl(latest.artist_slug, latest.slug));
    toast.success("Latest link copied!");
  };

  if (authLoading || loading) return <DashboardSkeleton />;

  const stats = [
    { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: BarChart3, color: "text-primary", bg: "bg-primary/15" },
    { label: "Fans Collected", value: totalFans.toLocaleString(), icon: Users, color: "text-accent", bg: "bg-accent/15" },
    { label: "Pre-save Signups", value: totalPreSaveSignups.toLocaleString(), icon: Music2, color: "text-green-500", bg: "bg-green-500/15" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-yellow-500", bg: "bg-yellow-500/15" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <motion.div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="glass" asChild>
                <Link to="/artist/campaigns"><BarChart3 className="w-4 h-4 mr-2" />Campaigns</Link>
              </Button>
              <Button variant="glass" asChild>
                <Link to="/artist-bio/edit"><User className="w-4 h-4 mr-2" />Artist Bio</Link>
              </Button>
            </div>
          </motion.div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={statCardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card p-5 rounded-2xl cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="font-display text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Button variant="hero" size="lg" className="rounded-2xl py-6" asChild>
              <Link to="/artist/campaigns/create"><Rocket className="w-5 h-5 mr-2" />Create Campaign</Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-2xl py-6" asChild>
              <Link to="/artist/campaigns"><Eye className="w-5 h-5 mr-2" />View Campaigns</Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-2xl py-6" onClick={handleCopyLatest}>
              <Copy className="w-5 h-5 mr-2" />Copy Latest Link
            </Button>
          </motion.div>

          {/* Performance Chart */}
          {chartData.length > 0 && (
            <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <PerformanceChart data={chartData} />
            </motion.div>
          )}

          {/* Search */}
          <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search links..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12" />
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="fanlinks" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />Fanlinks ({fanlinks.length})
              </TabsTrigger>
              <TabsTrigger value="presaves" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />Pre-Saves ({preSaves.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fanlinks">
              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filteredFanlinks.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-2xl">
                    <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No fanlinks found</h3>
                    <p className="text-muted-foreground mb-6">{searchQuery ? "Try a different search" : "Create your first fanlink"}</p>
                    {!searchQuery && <Button variant="hero" asChild><Link to="/create"><Plus className="w-5 h-5 mr-2" />Create Fanlink</Link></Button>}
                  </div>
                ) : (
                  filteredFanlinks.map((link, i) => (
                    <motion.div
                      key={link.id}
                      className="glass-card p-4 rounded-2xl hover:border-primary/30 transition-all duration-300"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {link.artwork_url ? (
                            <img src={link.artwork_url} alt={link.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-7 h-7 text-muted-foreground" />
                          )}
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
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired(link) ? 'bg-yellow-500/20 text-yellow-400' : 'bg-destructive/20 text-destructive'}`}>
                            {isExpired(link) ? 'Expired' : 'Disabled'}
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
                  <div className="glass-card p-12 text-center rounded-2xl">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No pre-saves found</h3>
                    <p className="text-muted-foreground mb-6">{searchQuery ? "Try a different search" : "Create a pre-save for upcoming releases"}</p>
                    {!searchQuery && <Button variant="hero" asChild><Link to="/presave/create"><Clock className="w-5 h-5 mr-2" />Create Pre-Save</Link></Button>}
                  </div>
                ) : (
                  filteredPreSaves.map((ps, i) => (
                    <motion.div
                      key={ps.id}
                      className="glass-card p-4 rounded-2xl hover:border-primary/30 transition-all duration-300"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative flex-shrink-0">
                          {ps.artwork_url ? (
                            <img src={ps.artwork_url} alt={ps.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-7 h-7 text-muted-foreground" />
                          )}
                          {!ps.is_released && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-[10px] text-center py-0.5 font-semibold">PRE-SAVE</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold truncate">{ps.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{ps.artist}</p>
                          {ps.release_date && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{ps.release_date}
                            </p>
                          )}
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-display font-semibold">{(preSaveStats[ps.id]?.fanSignups || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">fans</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${ps.is_released ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                            {ps.is_released ? 'Released' : 'Upcoming'}
                          </div>
                          {ps.is_released && (preSaveStats[ps.id]?.fanSignups || 0) > 0 && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              (preSaveStats[ps.id]?.notificationsSent || 0) >= (preSaveStats[ps.id]?.fanSignups || 0)
                                ? 'bg-green-500/20 text-green-400'
                                : (preSaveStats[ps.id]?.notificationsSent || 0) > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-destructive/20 text-destructive'
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
        </div>
      </main>
      <Footer />
      <MobileStickyBar />
    </div>
  );
};

export default Dashboard;

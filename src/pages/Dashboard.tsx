import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Link2, 
  BarChart3, 
  ExternalLink, 
  Copy, 
  Trash2,
  Music2,
  Loader2,
  Clock,
  Calendar,
  Edit
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  created_at: string;
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

interface ClickCount {
  fanlink_id: string;
  count: number;
}

interface PreSaveStats {
  totalActions: number;
  librarySaves: number;
  artistFollows: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [fanlinks, setFanlinks] = useState<Fanlink[]>([]);
  const [preSaves, setPreSaves] = useState<PreSave[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [preSaveStats, setPreSaveStats] = useState<Record<string, PreSaveStats>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fanlinks");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFanlinks();
      fetchPreSaves();
    }
  }, [user]);

  const fetchFanlinks = async () => {
    try {
      const { data: fanlinksData, error: fanlinksError } = await supabase
        .from("fanlinks")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (fanlinksError) throw fanlinksError;

      setFanlinks(fanlinksData || []);

      // Fetch click counts for each fanlink
      if (fanlinksData && fanlinksData.length > 0) {
        const counts: Record<string, number> = {};
        for (const fanlink of fanlinksData) {
          const { count } = await supabase
            .from("clicks")
            .select("*", { count: "exact", head: true })
            .eq("fanlink_id", fanlink.id);
          counts[fanlink.id] = count || 0;
        }
        setClickCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching fanlinks:", error);
      toast.error("Failed to load fanlinks");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreSaves = async () => {
    try {
      const { data, error } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreSaves(data || []);

      // Fetch pre-save action stats for each pre-save
      if (data && data.length > 0) {
        const stats: Record<string, PreSaveStats> = {};
        for (const ps of data) {
          const { data: actions } = await supabase
            .from("pre_save_actions")
            .select("action_type, library_saved")
            .eq("pre_save_id", ps.id);
          
          const totalActions = actions?.length || 0;
          const librarySaves = actions?.filter(a => a.library_saved).length || 0;
          const artistFollows = actions?.filter(a => a.action_type === "follow").length || 0;
          
          stats[ps.id] = { totalActions, librarySaves, artistFollows };
        }
        setPreSaveStats(stats);
      }
    } catch (error) {
      console.error("Error fetching pre-saves:", error);
    }
  };

  const handleDeleteFanlink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fanlink?")) return;

    try {
      const { error } = await supabase.from("fanlinks").delete().eq("id", id);
      if (error) throw error;
      setFanlinks(fanlinks.filter(f => f.id !== id));
      toast.success("Fanlink deleted");
    } catch (error) {
      console.error("Error deleting fanlink:", error);
      toast.error("Failed to delete fanlink");
    }
  };

  const handleDeletePreSave = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pre-save?")) return;

    try {
      const { error } = await supabase.from("pre_saves").delete().eq("id", id);
      if (error) throw error;
      setPreSaves(preSaves.filter(p => p.id !== id));
      toast.success("Pre-save deleted");
    } catch (error) {
      console.error("Error deleting pre-save:", error);
      toast.error("Failed to delete pre-save");
    }
  };

  const handleCopyFanlinkUrl = async (artistSlug: string, slug: string) => {
    const url = `${window.location.origin}/${artistSlug}/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleCopyPreSaveUrl = async (artistSlug: string, slug: string) => {
    const url = `${window.location.origin}/presave/${artistSlug}/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const filteredFanlinks = fanlinks.filter(
    (link) =>
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPreSaves = preSaves.filter(
    (ps) =>
      ps.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ps.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = Object.values(clickCounts).reduce((sum, count) => sum + count, 0);
  const totalPreSaveActions = Object.values(preSaveStats).reduce((sum, s) => sum + s.totalActions, 0);
  const totalLibrarySaves = Object.values(preSaveStats).reduce((sum, s) => sum + s.librarySaves, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Dashboard Header */}
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Manage your fanlinks and pre-saves</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/presave/create">
                  <Clock className="w-5 h-5 mr-2" />
                  Pre-Save
                </Link>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/create">
                  <Plus className="w-5 h-5 mr-2" />
                  Fanlink
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fanlinks</p>
                  <p className="font-display text-2xl font-bold">{fanlinks.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fan Pre-Saves</p>
                  <p className="font-display text-2xl font-bold">{totalPreSaveActions.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-spotify/20 flex items-center justify-center">
                  <Music2 className="w-6 h-6 text-spotify" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Library Saves</p>
                  <p className="font-display text-2xl font-bold">{totalLibrarySaves.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="font-display text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search fanlinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>
          </motion.div>

          {/* Tabs for Fanlinks and Pre-saves */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="fanlinks" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Fanlinks ({fanlinks.length})
              </TabsTrigger>
              <TabsTrigger value="presaves" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pre-Saves ({preSaves.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fanlinks">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {filteredFanlinks.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No fanlinks found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery ? "Try a different search term" : "Create your first fanlink to get started"}
                    </p>
                    {!searchQuery && (
                      <Button variant="hero" asChild>
                        <Link to="/create">
                          <Plus className="w-5 h-5 mr-2" />
                          Create Fanlink
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredFanlinks.map((link, index) => (
                    <motion.div
                      key={link.id}
                      className="glass-card p-4 hover:border-primary/30 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                          {link.artwork_url ? (
                            <img src={link.artwork_url} alt={link.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold truncate">{link.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{link.artist}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">/{link.artist_slug}/{link.slug}</p>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-display font-semibold">{(clickCounts[link.id] || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">clicks</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" asChild title="Analytics">
                            <Link to={`/analytics/fanlink/${link.id}`}>
                              <BarChart3 className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link to={`/edit/fanlink/${link.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link to={`/${link.artist_slug}/${link.slug}`} target="_blank">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyFanlinkUrl(link.artist_slug, link.slug)} title="Copy Link">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteFanlink(link.id)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="presaves">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {filteredPreSaves.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No pre-saves found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery ? "Try a different search term" : "Create a pre-save link for upcoming releases"}
                    </p>
                    {!searchQuery && (
                      <Button variant="hero" asChild>
                        <Link to="/presave/create">
                          <Clock className="w-5 h-5 mr-2" />
                          Create Pre-Save
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredPreSaves.map((ps, index) => (
                    <motion.div
                      key={ps.id}
                      className="glass-card p-4 hover:border-primary/30 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative">
                          {ps.artwork_url ? (
                            <img src={ps.artwork_url} alt={ps.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-8 h-8 text-muted-foreground" />
                          )}
                          {!ps.is_released && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-[10px] text-center py-0.5 font-semibold">
                              PRE-SAVE
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold truncate">{ps.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{ps.artist}</p>
                          {ps.release_date && (
                            <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {ps.release_date}
                            </p>
                          )}
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-display font-semibold">{(preSaveStats[ps.id]?.totalActions || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">pre-saves</p>
                          </div>
                          <div className="text-right">
                            <p className="font-display font-semibold">{(preSaveStats[ps.id]?.librarySaves || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">saved</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${ps.is_released ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                            {ps.is_released ? 'Released' : 'Upcoming'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" asChild title="Analytics">
                            <Link to={`/analytics/presave/${ps.id}`}>
                              <BarChart3 className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link to={`/edit/presave/${ps.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link to={`/presave/${ps.artist_slug}/${ps.slug}`} target="_blank">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyPreSaveUrl(ps.artist_slug, ps.slug)} title="Copy Link">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePreSave(ps.id)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </div>
  );
};

export default Dashboard;

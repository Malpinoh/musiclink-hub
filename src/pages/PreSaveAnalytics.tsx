import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Music2, ExternalLink, TrendingUp, Users, Library, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface PreSave {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  release_date: string | null;
  is_released: boolean;
}

interface DailyAction {
  date: string;
  count: number;
}

interface ActionBreakdown {
  name: string;
  value: number;
}

const PreSaveAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [preSave, setPreSave] = useState<PreSave | null>(null);
  const [dailyActions, setDailyActions] = useState<DailyAction[]>([]);
  const [actionBreakdown, setActionBreakdown] = useState<ActionBreakdown[]>([]);
  const [totalActions, setTotalActions] = useState(0);
  const [librarySaves, setLibrarySaves] = useState(0);
  const [artistFollows, setArtistFollows] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchAnalytics();
    }
  }, [user, id]);

  const fetchAnalytics = async () => {
    try {
      // Fetch pre-save details
      const { data: preSaveData, error: preSaveError } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (preSaveError) throw preSaveError;
      if (!preSaveData) {
        navigate("/dashboard");
        return;
      }
      setPreSave(preSaveData);

      // Fetch all actions for this pre-save
      const { data: actions, error: actionsError } = await supabase
        .from("pre_save_actions")
        .select("*")
        .eq("pre_save_id", id);

      if (actionsError) throw actionsError;

      const actionsData = actions || [];
      setTotalActions(actionsData.length);

      // Count library saves and follows
      const saved = actionsData.filter((a) => a.library_saved).length;
      const follows = actionsData.filter((a) => a.action_type === "follow").length;
      setLibrarySaves(saved);
      setArtistFollows(follows);

      // Conversion rate (library saves / total pre-saves)
      const rate = actionsData.length > 0 ? (saved / actionsData.length) * 100 : 0;
      setConversionRate(rate);

      // Daily aggregation
      const dailyMap: Record<string, number> = {};
      actionsData.forEach((action) => {
        const date = new Date(action.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });

      // Get last 14 days
      const last14Days: DailyAction[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        last14Days.push({ date: dateStr, count: dailyMap[dateStr] || 0 });
      }
      setDailyActions(last14Days);

      // Action type breakdown
      const saveAndFollow = actionsData.filter(
        (a) => a.action_type === "save_and_follow"
      ).length;
      const saveOnly = actionsData.filter((a) => a.action_type === "save").length;
      const followOnly = actionsData.filter((a) => a.action_type === "follow").length;

      setActionBreakdown([
        { name: "Save & Follow", value: saveAndFollow },
        { name: "Save Only", value: saveOnly },
        { name: "Follow Only", value: followOnly },
      ].filter((a) => a.value > 0));
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!preSave) return null;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142, 76%, 36%)"];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Back Button & Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative">
                {preSave.artwork_url ? (
                  <img src={preSave.artwork_url} alt={preSave.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-10 h-10 text-muted-foreground" />
                )}
                {!preSave.is_released && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-[10px] text-center py-0.5 font-semibold">
                    PRE-SAVE
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">{preSave.title}</h1>
                <p className="text-muted-foreground">{preSave.artist}</p>
                {preSave.release_date && (
                  <p className="text-sm text-muted-foreground/60">Release: {preSave.release_date}</p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${preSave.is_released ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                  {preSave.is_released ? 'Released' : 'Upcoming'}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/presave/${preSave.artist_slug}/${preSave.slug}`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Link
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">Fan Pre-Saves</p>
              </div>
              <p className="font-display text-3xl font-bold">{totalActions.toLocaleString()}</p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <Library className="w-5 h-5 text-spotify" />
                <p className="text-sm text-muted-foreground">Library Saves</p>
              </div>
              <p className="font-display text-3xl font-bold">{librarySaves.toLocaleString()}</p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus className="w-5 h-5 text-accent" />
                <p className="text-sm text-muted-foreground">New Followers</p>
              </div>
              <p className="font-display text-3xl font-bold">{artistFollows.toLocaleString()}</p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
              <p className="font-display text-3xl font-bold">{conversionRate.toFixed(1)}%</p>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Pre-Saves Chart */}
            <motion.div
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Pre-Saves (Last 14 Days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActions}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Action Type Distribution */}
            <motion.div
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-display text-lg font-semibold mb-4">Action Type Breakdown</h3>
              {actionBreakdown.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {actionBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No pre-save data yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Conversion Funnel */}
          <motion.div
            className="glass-card p-6 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-display text-lg font-semibold mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Fan Pre-Saves</span>
                  <span className="font-semibold">{totalActions}</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Library Saves (on release)</span>
                  <span className="font-semibold">{librarySaves}</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-spotify rounded-full transition-all"
                    style={{ width: totalActions > 0 ? `${(librarySaves / totalActions) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Artist Follows</span>
                  <span className="font-semibold">{artistFollows}</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: totalActions > 0 ? `${(artistFollows / totalActions) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PreSaveAnalytics;

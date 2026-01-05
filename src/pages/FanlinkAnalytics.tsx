import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Music2, ExternalLink, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
}

interface PlatformClick {
  platform_name: string;
  count: number;
}

interface DailyClick {
  date: string;
  count: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  Spotify: "#1DB954",
  "Apple Music": "#FA2D48",
  Deezer: "#FEAA2D",
  Tidal: "#000000",
  "YouTube Music": "#FF0000",
  "Amazon Music": "#FF9900",
  Audiomack: "#FFA500",
  Boomplay: "#E21A22",
  Other: "#6B7280",
};

const FanlinkAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fanlink, setFanlink] = useState<Fanlink | null>(null);
  const [platformClicks, setPlatformClicks] = useState<PlatformClick[]>([]);
  const [dailyClicks, setDailyClicks] = useState<DailyClick[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
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
      // Fetch fanlink details
      const { data: fanlinkData, error: fanlinkError } = await supabase
        .from("fanlinks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (fanlinkError) throw fanlinkError;
      if (!fanlinkData) {
        navigate("/dashboard");
        return;
      }
      setFanlink(fanlinkData);

      // Fetch all clicks for this fanlink
      const { data: clicks, error: clicksError } = await supabase
        .from("clicks")
        .select("platform_name, clicked_at")
        .eq("fanlink_id", id);

      if (clicksError) throw clicksError;

      // Aggregate by platform
      const platformMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};

      (clicks || []).forEach((click) => {
        const platform = click.platform_name || "Other";
        platformMap[platform] = (platformMap[platform] || 0) + 1;

        const date = new Date(click.clicked_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });

      const platformData = Object.entries(platformMap)
        .map(([platform_name, count]) => ({ platform_name, count }))
        .sort((a, b) => b.count - a.count);

      // Get last 14 days
      const last14Days: DailyClick[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        last14Days.push({ date: dateStr, count: dailyMap[dateStr] || 0 });
      }

      setPlatformClicks(platformData);
      setDailyClicks(last14Days);
      setTotalClicks(clicks?.length || 0);
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

  if (!fanlink) return null;

  const topPlatform = platformClicks[0];

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
              <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                {fanlink.artwork_url ? (
                  <img src={fanlink.artwork_url} alt={fanlink.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">{fanlink.title}</h1>
                <p className="text-muted-foreground">{fanlink.artist}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link to={`/${fanlink.artist_slug}/${fanlink.slug}`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Link
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
              <p className="font-display text-3xl font-bold">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-sm text-muted-foreground mb-1">Platforms Used</p>
              <p className="font-display text-3xl font-bold">{platformClicks.length}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-sm text-muted-foreground mb-1">Top Platform</p>
              <p className="font-display text-3xl font-bold">{topPlatform?.platform_name || "—"}</p>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Clicks Chart */}
            <motion.div
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Clicks (Last 14 Days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyClicks}>
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

            {/* Platform Distribution */}
            <motion.div
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-display text-lg font-semibold mb-4">Platform Distribution</h3>
              {platformClicks.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformClicks}
                        dataKey="count"
                        nameKey="platform_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ platform_name, percent }) =>
                          `${platform_name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {platformClicks.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PLATFORM_COLORS[entry.platform_name] || PLATFORM_COLORS.Other}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No click data yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Platform Breakdown Table */}
          <motion.div
            className="glass-card p-6 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-display text-lg font-semibold mb-4">Platform Breakdown</h3>
            <div className="space-y-3">
              {platformClicks.map((platform) => (
                <div key={platform.platform_name} className="flex items-center gap-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[platform.platform_name] || PLATFORM_COLORS.Other }}
                  />
                  <span className="flex-1">{platform.platform_name}</span>
                  <span className="font-semibold">{platform.count.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm w-16 text-right">
                    {totalClicks > 0 ? `${((platform.count / totalClicks) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
              ))}
              {platformClicks.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No clicks recorded yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FanlinkAnalytics;

import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Music2, ExternalLink, TrendingUp, RefreshCw, Globe, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface GeoData {
  name: string;
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
  const [countryData, setCountryData] = useState<GeoData[]>([]);
  const [cityData, setCityData] = useState<GeoData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const processClicks = useCallback((clicks: { platform_name: string | null; clicked_at: string; country: string | null; city: string | null }[]) => {
    const platformMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};

    clicks.forEach((click) => {
      const platform = click.platform_name || "Other";
      platformMap[platform] = (platformMap[platform] || 0) + 1;

      const date = new Date(click.clicked_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyMap[date] = (dailyMap[date] || 0) + 1;

      if (click.country) {
        countryMap[click.country] = (countryMap[click.country] || 0) + 1;
      }
      if (click.city) {
        cityMap[click.city] = (cityMap[click.city] || 0) + 1;
      }
    });

    const platformData = Object.entries(platformMap)
      .map(([platform_name, count]) => ({ platform_name, count }))
      .sort((a, b) => b.count - a.count);

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

    const countries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setPlatformClicks(platformData);
    setDailyClicks(last14Days);
    setCountryData(countries);
    setCityData(cities);
    setTotalClicks(clicks.length);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !id) return;
    
    try {
      const { data: fanlinkData, error: fanlinkError } = await supabase
        .from("fanlinks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fanlinkError) throw fanlinkError;
      if (!fanlinkData) {
        navigate("/dashboard");
        return;
      }
      setFanlink(fanlinkData);

      const { data: clicks, error: clicksError } = await supabase
        .from("clicks")
        .select("platform_name, clicked_at, country, city")
        .eq("fanlink_id", id);

      if (clicksError) throw clicksError;
      processClicks(clicks || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [user, id, navigate, processClicks]);

  useEffect(() => {
    if (user && id) {
      fetchAnalytics();
    }
  }, [user, id, fetchAnalytics]);

  // Real-time subscription for clicks
  useEffect(() => {
    if (!id || !isLive) return;

    const channel = supabase
      .channel(`clicks-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clicks',
          filter: `fanlink_id=eq.${id}`,
        },
        () => {
          // Refetch all data on new click
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isLive, fetchAnalytics]);

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

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {fanlink.artwork_url ? (
                  <img src={fanlink.artwork_url} alt={fanlink.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">{fanlink.title}</h1>
                <p className="text-muted-foreground text-sm sm:text-base">{fanlink.artist}</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant={isLive ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setIsLive(!isLive)}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLive ? 'animate-spin' : ''}`} />
                  {isLive ? 'Live' : 'Paused'}
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                  <Link to={`/${fanlink.artist_slug}/${fanlink.slug}`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">View Link</span>
                    <span className="sm:hidden">View</span>
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Clicks</p>
              <p className="font-display text-xl sm:text-3xl font-bold">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="glass-card p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Platforms</p>
              <p className="font-display text-xl sm:text-3xl font-bold">{platformClicks.length}</p>
            </div>
            <div className="glass-card p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Top Platform</p>
              <p className="font-display text-lg sm:text-3xl font-bold truncate">{topPlatform?.platform_name || "—"}</p>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Daily Clicks Chart */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Clicks (Last 14 Days)
              </h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyClicks}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                      interval={isMobile ? 2 : 0}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} stroke="hsl(var(--muted-foreground))" width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: isMobile ? 12 : 14,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Platform Distribution */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4">Platform Distribution</h3>
              {platformClicks.length > 0 ? (
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformClicks}
                        dataKey="count"
                        nameKey="platform_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        label={isMobile ? false : ({ platform_name, percent }) =>
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
                      <Legend 
                        wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                        layout={isMobile ? "horizontal" : "vertical"}
                        align={isMobile ? "center" : "right"}
                        verticalAlign={isMobile ? "bottom" : "middle"}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No click data yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Platform Breakdown Table */}
          <motion.div
            className="glass-card p-4 sm:p-6 mt-4 sm:mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-display text-base sm:text-lg font-semibold mb-4">Platform Breakdown</h3>
            <div className="space-y-2 sm:space-y-3">
              {platformClicks.map((platform) => (
                <div key={platform.platform_name} className="flex items-center gap-2 sm:gap-4">
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PLATFORM_COLORS[platform.platform_name] || PLATFORM_COLORS.Other }}
                  />
                  <span className="flex-1 text-sm sm:text-base truncate">{platform.platform_name}</span>
                  <span className="font-semibold text-sm sm:text-base">{platform.count.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm w-12 sm:w-16 text-right">
                    {totalClicks > 0 ? `${((platform.count / totalClicks) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
              ))}
              {platformClicks.length === 0 && (
                <p className="text-muted-foreground text-center py-4 text-sm">No clicks recorded yet</p>
              )}
            </div>
          </motion.div>
          {/* Geographic Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
            {/* Countries */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Top Countries
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {countryData.length > 0 ? (
                  countryData.map((country, index) => (
                    <div key={country.name} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground w-4">{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm sm:text-base truncate">{country.name}</span>
                          <span className="font-semibold text-sm sm:text-base ml-2">{country.count}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(country.count / (countryData[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">No geographic data yet</p>
                )}
              </div>
            </motion.div>

            {/* Cities */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                Top Cities
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {cityData.length > 0 ? (
                  cityData.map((city, index) => (
                    <div key={city.name} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground w-4">{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm sm:text-base truncate">{city.name}</span>
                          <span className="font-semibold text-sm sm:text-base ml-2">{city.count}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${(city.count / (cityData[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">No geographic data yet</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FanlinkAnalytics;

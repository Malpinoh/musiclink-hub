import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FanLocationMap from "@/components/FanLocationMap";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Music2, ExternalLink, TrendingUp, Users, Library, UserPlus, RefreshCw, Globe, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/malpinohdistro/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface GeoData {
  name: string;
  count: number;
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
  const [countryData, setCountryData] = useState<GeoData[]>([]);
  const [cityData, setCityData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const processActions = useCallback((actionsData: any[]) => {
    setTotalActions(actionsData.length);

    const saved = actionsData.filter((a) => a.library_saved).length;
    const follows = actionsData.filter((a) => a.action_type === "follow" || a.action_type === "save_and_follow").length;
    setLibrarySaves(saved);
    setArtistFollows(follows);

    const rate = actionsData.length > 0 ? (saved / actionsData.length) * 100 : 0;
    setConversionRate(rate);

    const dailyMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};

    actionsData.forEach((action) => {
      const date = new Date(action.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyMap[date] = (dailyMap[date] || 0) + 1;

      if (action.country) {
        countryMap[action.country] = (countryMap[action.country] || 0) + 1;
      }
      if (action.city) {
        cityMap[action.city] = (cityMap[action.city] || 0) + 1;
      }
    });

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

    const countries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setCountryData(countries);
    setCityData(cities);

    const saveAndFollow = actionsData.filter((a) => a.action_type === "save_and_follow").length;
    const saveOnly = actionsData.filter((a) => a.action_type === "save").length;
    const followOnly = actionsData.filter((a) => a.action_type === "follow").length;

    setActionBreakdown([
      { name: "Save & Follow", value: saveAndFollow },
      { name: "Save Only", value: saveOnly },
      { name: "Follow Only", value: followOnly },
    ].filter((a) => a.value > 0));
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !id) return;

    try {
      const { data: preSaveData, error: preSaveError } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (preSaveError) throw preSaveError;
      if (!preSaveData) {
        navigate("/dashboard");
        return;
      }
      setPreSave(preSaveData);

      const { data: actions, error: actionsError } = await supabase
        .from("pre_save_actions")
        .select("*")
        .eq("pre_save_id", id);

      if (actionsError) throw actionsError;
      processActions(actions || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [user, id, navigate, processActions]);

  useEffect(() => {
    if (user && id) {
      fetchAnalytics();
    }
  }, [user, id, fetchAnalytics]);

  // Real-time subscription for pre-save actions
  useEffect(() => {
    if (!id || !isLive) return;

    const channel = supabase
      .channel(`presave-actions-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pre_save_actions',
          filter: `pre_save_id=eq.${id}`,
        },
        () => {
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative flex-shrink-0">
                {preSave.artwork_url ? (
                  <img src={preSave.artwork_url} alt={preSave.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                )}
                {!preSave.is_released && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-[8px] sm:text-[10px] text-center py-0.5 font-semibold">
                    PRE-SAVE
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">{preSave.title}</h1>
                <p className="text-muted-foreground text-sm sm:text-base">{preSave.artist}</p>
                {preSave.release_date && (
                  <p className="text-xs sm:text-sm text-muted-foreground/60">Release: {preSave.release_date}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${preSave.is_released ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                  {preSave.is_released ? 'Released' : 'Upcoming'}
                </div>
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
                  <Link to={`/presave/${preSave.artist_slug}/${preSave.slug}`} target="_blank">
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
            className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">Pre-Saves</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold">{totalActions.toLocaleString()}</p>
            </div>
            <div className="glass-card p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Library className="w-4 h-4 sm:w-5 sm:h-5 text-spotify" />
                <p className="text-xs sm:text-sm text-muted-foreground">Library Saves</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold">{librarySaves.toLocaleString()}</p>
            </div>
            <div className="glass-card p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                <p className="text-xs sm:text-sm text-muted-foreground">Followers</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold">{artistFollows.toLocaleString()}</p>
            </div>
            <div className="glass-card p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <p className="text-xs sm:text-sm text-muted-foreground">Conversion</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold">{conversionRate.toFixed(1)}%</p>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Daily Pre-Saves Chart */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Pre-Saves (Last 14 Days)
              </h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActions}>
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

            {/* Action Type Distribution */}
            <motion.div
              className="glass-card p-4 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-display text-base sm:text-lg font-semibold mb-4">Action Type Breakdown</h3>
              {actionBreakdown.length > 0 ? (
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        label={isMobile ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {actionBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                  No pre-save data yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Conversion Funnel */}
          <motion.div
            className="glass-card p-4 sm:p-6 mt-4 sm:mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-display text-base sm:text-lg font-semibold mb-4">Conversion Funnel</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>Fan Pre-Saves</span>
                  <span className="font-semibold">{totalActions}</span>
                </div>
                <div className="h-2 sm:h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>Library Saves</span>
                  <span className="font-semibold">{librarySaves}</span>
                </div>
                <div className="h-2 sm:h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-spotify rounded-full transition-all"
                    style={{ width: totalActions > 0 ? `${(librarySaves / totalActions) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>Artist Follows</span>
                  <span className="font-semibold">{artistFollows}</span>
                </div>
                <div className="h-2 sm:h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: totalActions > 0 ? `${(artistFollows / totalActions) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* World Map Visualization */}
          <FanLocationMap countryData={countryData} title="Fan Locations Worldwide" />

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

export default PreSaveAnalytics;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: string;
  campaign_name: string;
  artist_name: string | null;
  artwork_url: string | null;
  status: string;
  release_date: string | null;
  created_at: string;
  template_name?: string;
}

const CampaignList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("campaigns")
        .select("*, campaign_templates(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setCampaigns(
          data.map((c: any) => ({
            ...c,
            template_name: c.campaign_templates?.name || "Custom",
          }))
        );
      }
      setLoading(false);
    };
    if (user) fetch();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">My Campaigns</h1>
              <p className="text-muted-foreground text-sm">{campaigns.length} campaigns</p>
            </div>
            <Button variant="hero" asChild>
              <Link to="/artist/campaigns/create">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </motion.div>

          {campaigns.length === 0 ? (
            <motion.div
              className="glass-card p-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-6">Create your first campaign to start promoting your music</p>
              <Button variant="hero" asChild>
                <Link to="/artist/campaigns/create">Create Campaign</Link>
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c, i) => (
                <motion.div
                  key={c.id}
                  className="glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {c.artwork_url ? (
                    <img src={c.artwork_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{c.campaign_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.artist_name} • {c.template_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.release_date && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(c.release_date).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CampaignList;

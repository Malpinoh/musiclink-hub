import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { motion } from "framer-motion";
import { 
  Save, 
  Loader2, 
  Music2,
  ArrowLeft,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/malpinohdistro/client";

interface PreSave {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  upc: string | null;
  isrc: string | null;
  release_date: string | null;
  album_title: string | null;
  spotify_uri: string | null;
  spotify_album_id: string | null;
  spotify_artist_id: string | null;
  is_active: boolean | null;
  is_released: boolean | null;
}

const EditPreSave = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preSave, setPreSave] = useState<PreSave | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchPreSave();
    }
  }, [user, id]);

  const fetchPreSave = async () => {
    try {
      const { data, error } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setPreSave(data);
    } catch (error) {
      console.error("Error fetching pre-save:", error);
      toast.error("Pre-save not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preSave) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("pre_saves")
        .update({
          title: preSave.title,
          artist: preSave.artist,
          artwork_url: preSave.artwork_url,
          release_date: preSave.release_date,
          album_title: preSave.album_title,
          upc: preSave.upc,
          isrc: preSave.isrc,
          spotify_uri: preSave.spotify_uri,
          spotify_album_id: preSave.spotify_album_id,
          spotify_artist_id: preSave.spotify_artist_id,
          is_active: preSave.is_active,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Pre-save updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving pre-save:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Header */}
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                Edit <span className="gradient-text">Pre-Save</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                /presave/{preSave.artist_slug}/{preSave.slug}
              </p>
            </div>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </motion.div>

          {/* Release Info */}
          <motion.div
            className="glass-card p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">Release Information</h2>
            
            <div className="flex gap-6">
              {/* Artwork */}
              <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 relative">
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

              <div className="flex-1 space-y-4">
                <div>
                  <Label>Track/Album Title</Label>
                  <Input
                    value={preSave.title}
                    onChange={(e) => setPreSave({ ...preSave, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Artist Name</Label>
                  <Input
                    value={preSave.artist}
                    onChange={(e) => setPreSave({ ...preSave, artist: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Album Title (Optional)</Label>
                  <Input
                    value={preSave.album_title || ""}
                    onChange={(e) => setPreSave({ ...preSave, album_title: e.target.value || null })}
                    placeholder="If different from release title"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Release Details */}
          <motion.div
            className="glass-card p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">Release Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Release Date
                </Label>
                <Input
                  type="date"
                  value={preSave.release_date || ""}
                  onChange={(e) => setPreSave({ ...preSave, release_date: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className={`h-10 rounded-md border border-input px-3 flex items-center ${preSave.is_released ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                  {preSave.is_released ? 'Released' : 'Upcoming'}
                </div>
              </div>
              <div>
                <Label>UPC</Label>
                <Input
                  value={preSave.upc || ""}
                  onChange={(e) => setPreSave({ ...preSave, upc: e.target.value || null })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>ISRC</Label>
                <Input
                  value={preSave.isrc || ""}
                  onChange={(e) => setPreSave({ ...preSave, isrc: e.target.value || null })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </motion.div>

          {/* Spotify Details */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">Spotify Integration</h2>
            
            <div className="space-y-4">
              <div>
                <Label>Spotify URI</Label>
                <Input
                  value={preSave.spotify_uri || ""}
                  onChange={(e) => setPreSave({ ...preSave, spotify_uri: e.target.value || null })}
                  placeholder="spotify:album:..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Spotify Album ID</Label>
                  <Input
                    value={preSave.spotify_album_id || ""}
                    onChange={(e) => setPreSave({ ...preSave, spotify_album_id: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Spotify Artist ID</Label>
                  <Input
                    value={preSave.spotify_artist_id || ""}
                    onChange={(e) => setPreSave({ ...preSave, spotify_artist_id: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <Label>Artwork URL</Label>
                <Input
                  value={preSave.artwork_url || ""}
                  onChange={(e) => setPreSave({ ...preSave, artwork_url: e.target.value || null })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default EditPreSave;

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AudioPreviewUploader from "@/components/AudioPreviewUploader";
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
  Calendar,
  Link2,
  RefreshCw,
  Plus,
  Trash2,
  Mail,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  links_resolved: boolean | null;
  preview_audio_url: string | null;
  preview_start: number | null;
  preview_end: number | null;
  waveform_data: number[] | null;
}

interface StreamingLink {
  id?: string;
  platform_name: string;
  platform_url: string;
  display_order: number;
}

const EditPreSave = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preSave, setPreSave] = useState<PreSave | null>(null);
  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [resolvingLinks, setResolvingLinks] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

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
      setPreSave({
        ...data,
        waveform_data: Array.isArray(data.waveform_data) ? data.waveform_data as number[] : null,
      });

      // Fetch streaming links
      const { data: links } = await supabase
        .from("presave_streaming_links")
        .select("*")
        .eq("pre_save_id", id!)
        .order("display_order");
      setStreamingLinks(links || []);

      // Fetch fan/notification counts
      const { count: fc } = await supabase
        .from("presave_fans")
        .select("*", { count: "exact", head: true })
        .eq("pre_save_id", id!);
      setFanCount(fc || 0);

      const { count: nc } = await supabase
        .from("presave_notifications")
        .select("*", { count: "exact", head: true })
        .eq("pre_save_id", id!)
        .eq("status", "sent");
      setNotifCount(nc || 0);
    } catch (error) {
      console.error("Error fetching pre-save:", error);
      toast.error("Pre-save not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveLinks = async () => {
    if (!preSave) return;
    setResolvingLinks(true);
    try {
      const { error } = await supabase.functions.invoke("resolve-presave-streaming-links", {
        body: { pre_save_id: preSave.id },
      });
      if (error) throw error;
      toast.success("Streaming links resolved!");
      // Refetch
      const { data: links } = await supabase
        .from("presave_streaming_links")
        .select("*")
        .eq("pre_save_id", preSave.id)
        .order("display_order");
      setStreamingLinks(links || []);
    } catch (error) {
      console.error("Error resolving links:", error);
      toast.error("Failed to resolve streaming links");
    } finally {
      setResolvingLinks(false);
    }
  };

  const handleAddLink = () => {
    setStreamingLinks([...streamingLinks, { platform_name: "", platform_url: "", display_order: streamingLinks.length + 1 }]);
  };

  const handleRemoveLink = async (index: number) => {
    const link = streamingLinks[index];
    if (link.id) {
      await supabase.from("presave_streaming_links").delete().eq("id", link.id);
    }
    setStreamingLinks(streamingLinks.filter((_, i) => i !== index));
  };

  const handleUpdateLink = (index: number, field: keyof StreamingLink, value: string) => {
    const updated = [...streamingLinks];
    (updated[index] as any)[field] = value;
    setStreamingLinks(updated);
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

      // Save streaming links
      for (const link of streamingLinks) {
        if (!link.platform_name || !link.platform_url) continue;
        if (link.id) {
          await supabase.from("presave_streaming_links").update({
            platform_name: link.platform_name,
            platform_url: link.platform_url,
            display_order: link.display_order,
          }).eq("id", link.id);
        } else {
          await supabase.from("presave_streaming_links").insert({
            pre_save_id: preSave.id,
            platform_name: link.platform_name,
            platform_url: link.platform_url,
            display_order: link.display_order,
          });
        }
      }

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

          {/* Streaming Links */}
          <motion.div
            className="glass-card p-6 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Streaming Links
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResolveLinks}
                  disabled={resolvingLinks || (!preSave.upc && !preSave.isrc)}
                >
                  {resolvingLinks ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Auto-Generate
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddLink}>
                  <Plus className="w-4 h-4 mr-1" /> Add Link
                </Button>
              </div>
            </div>

            {streamingLinks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No streaming links yet. Click "Auto-Generate" to resolve links from UPC/ISRC, or add manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {streamingLinks.map((link, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="w-40">
                      <Label className="text-xs">Platform</Label>
                      <Input
                        value={link.platform_name}
                        onChange={(e) => handleUpdateLink(index, "platform_name", e.target.value)}
                        placeholder="e.g. Spotify"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={link.platform_url}
                        onChange={(e) => handleUpdateLink(index, "platform_url", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(index)} className="shrink-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {preSave.is_released && streamingLinks.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <p className="text-primary font-medium">🎧 Listen page live at:</p>
                <a
                  href={`/listen/${preSave.artist_slug}-${preSave.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs"
                >
                  md.malpinohdistro.com.ng/listen/{preSave.artist_slug}-{preSave.slug}
                </a>
              </div>
            )}
          </motion.div>

          {/* Notification Controls */}
          <motion.div
            className="glass-card p-6 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5" />
              Fan Notifications
            </h2>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-2xl font-bold font-display">{fanCount}</p>
                <p className="text-xs text-muted-foreground">fan signups</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{notifCount}</p>
                <p className="text-xs text-muted-foreground">emails sent</p>
              </div>
            </div>
            {fanCount > 0 && (
              <Button
                variant="hero"
                onClick={async () => {
                  setSendingNotifications(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("send-presave-notification", {
                      body: { pre_save_id: preSave.id },
                    });
                    if (error) throw error;
                    toast.success(`Notifications processed: ${data?.sent || 0} sent, ${data?.errors || 0} errors, ${data?.skipped || 0} skipped`);
                    // Refresh counts
                    const { count: nc } = await supabase
                      .from("presave_notifications")
                      .select("*", { count: "exact", head: true })
                      .eq("pre_save_id", preSave.id)
                      .eq("status", "sent");
                    setNotifCount(nc || 0);
                  } catch (error) {
                    console.error("Error sending notifications:", error);
                    toast.error("Failed to send notifications");
                  } finally {
                    setSendingNotifications(false);
                  }
                }}
                disabled={sendingNotifications}
              >
                {sendingNotifications ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Release Notifications
              </Button>
            )}
            {fanCount === 0 && (
              <p className="text-sm text-muted-foreground">No fans have signed up for this pre-save yet.</p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default EditPreSave;

import { useState, useEffect } from "react";
import ThemeCustomizer, { type LinkTheme } from "@/components/ThemeCustomizer";
import ThemePreview from "@/components/ThemePreview";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Header from "@/components/Header";
import ShareButtons from "@/components/ShareButtons";
import ImageCropper from "@/components/ImageCropper";
import { motion } from "framer-motion";
import { 
  Save, 
  Loader2, 
  Music2,
  ArrowLeft,
  Trash2,
  Plus,
  GripVertical,
  Crop,
  Calendar,
  Download,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeIcon,
  AudiomackIcon,
  BoomplayIcon,
  DeezerIcon,
  TidalIcon,
  AmazonMusicIcon,
  SoundCloudIcon,
  ShazamIcon,
  getPlatformIcon,
  getPlatformDisplayName
} from "@/components/icons/PlatformIcons";

interface PlatformLink {
  id: string;
  platform_name: string;
  platform_url: string;
  display_order: number;
  is_active: boolean;
}

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  upc: string | null;
  isrc: string | null;
  release_date: string | null;
  release_type: string | null;
  is_published: boolean | null;
  expires_at: string | null;
  collect_email: boolean | null;
  collect_phone: boolean | null;
  require_contact: boolean | null;
}

interface FanContact {
  id: string;
  email: string | null;
  phone: string | null;
  collected_at: string;
}

const platformOptions = [
  { key: "spotify", name: "Spotify", icon: SpotifyIcon, color: "#1DB954" },
  { key: "apple_music", name: "Apple Music", icon: AppleMusicIcon, color: "#FA243C" },
  { key: "youtube", name: "YouTube Music", icon: YouTubeIcon, color: "#FF0000" },
  { key: "deezer", name: "Deezer", icon: DeezerIcon, color: "#FEAA2D" },
  { key: "audiomack", name: "Audiomack", icon: AudiomackIcon, color: "#FFA500" },
  { key: "boomplay", name: "Boomplay", icon: BoomplayIcon, color: "#E72A3A" },
  { key: "tidal", name: "Tidal", icon: TidalIcon, color: "#000000" },
  { key: "amazon", name: "Amazon Music", icon: AmazonMusicIcon, color: "#25D1DA" },
  { key: "soundcloud", name: "SoundCloud", icon: SoundCloudIcon, color: "#FF5500" },
  { key: "shazam", name: "Shazam", icon: ShazamIcon, color: "#0088FF" },
];

const EditFanlink = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fanlink, setFanlink] = useState<Fanlink | null>(null);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [newPlatform, setNewPlatform] = useState("");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Partial<LinkTheme>>({});
  const [cropperOpen, setCropperOpen] = useState(false);
  const [platformClickCounts, setPlatformClickCounts] = useState<Record<string, number>>({});
  const [fanContacts, setFanContacts] = useState<FanContact[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchFanlink();
    }
  }, [user, id]);

  const fetchFanlink = async () => {
    try {
      const { data: fanlinkData, error: fanlinkError } = await supabase
        .from("fanlinks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (fanlinkError) throw fanlinkError;
      setFanlink(fanlinkData);

      const { data: linksData, error: linksError } = await supabase
        .from("platform_links")
        .select("*")
        .eq("fanlink_id", id)
        .order("display_order", { ascending: true });

      if (linksError) throw linksError;
      setPlatformLinks(linksData || []);

      // Fetch per-platform click counts
      if (linksData && linksData.length > 0) {
        const { data: clicksData } = await supabase
          .from("clicks")
          .select("platform_name")
          .eq("fanlink_id", id!)
          .not("platform_name", "is", null);

        if (clicksData) {
          const counts: Record<string, number> = {};
          clicksData.forEach((c) => {
            const pn = c.platform_name || "";
            counts[pn] = (counts[pn] || 0) + 1;
          });
          setPlatformClickCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error fetching fanlink:", error);
      toast.error("Fanlink not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    setDraggedItem(linkId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, linkId: string) => {
    e.preventDefault();
    if (linkId !== draggedItem) {
      setDragOverItem(linkId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = platformLinks.findIndex(l => l.id === draggedItem);
    const targetIndex = platformLinks.findIndex(l => l.id === targetId);

    const newLinks = [...platformLinks];
    const [removed] = newLinks.splice(draggedIndex, 1);
    newLinks.splice(targetIndex, 0, removed);

    // Update display_order for all items
    const updatedLinks = newLinks.map((link, index) => ({
      ...link,
      display_order: index,
    }));

    setPlatformLinks(updatedLinks);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleSave = async () => {
    if (!fanlink) return;

    setSaving(true);
    try {
      const { error: fanlinkError } = await supabase
        .from("fanlinks")
        .update({
          title: fanlink.title,
          artist: fanlink.artist,
          artwork_url: fanlink.artwork_url,
          release_date: fanlink.release_date,
          upc: fanlink.upc,
          isrc: fanlink.isrc,
          is_published: fanlink.is_published,
          expires_at: fanlink.expires_at,
        })
        .eq("id", id);

      if (fanlinkError) throw fanlinkError;

      for (const link of platformLinks) {
        const { error } = await supabase
          .from("platform_links")
          .update({
            platform_url: link.platform_url,
            display_order: link.display_order,
            is_active: link.is_active,
          })
          .eq("id", link.id);

        if (error) throw error;
      }

      toast.success("Fanlink updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving fanlink:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlatform = async () => {
    if (!newPlatform || !newPlatformUrl || !id) return;

    try {
      const { data, error } = await supabase
        .from("platform_links")
        .insert({
          fanlink_id: id,
          platform_name: newPlatform,
          platform_url: newPlatformUrl,
          display_order: platformLinks.length,
        })
        .select()
        .single();

      if (error) throw error;

      setPlatformLinks([...platformLinks, data]);
      setNewPlatform("");
      setNewPlatformUrl("");
      toast.success("Platform added!");
    } catch (error) {
      console.error("Error adding platform:", error);
      toast.error("Failed to add platform");
    }
  };

  const handleDeletePlatform = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("platform_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setPlatformLinks(platformLinks.filter(l => l.id !== linkId));
      toast.success("Platform removed");
    } catch (error) {
      console.error("Error deleting platform:", error);
      toast.error("Failed to remove platform");
    }
  };

  const updatePlatformUrl = (linkId: string, url: string) => {
    setPlatformLinks(platformLinks.map(l => 
      l.id === linkId ? { ...l, platform_url: url } : l
    ));
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!fanlink || !id) return;
    try {
      const fileName = `${id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("artwork")
        .upload(fileName, croppedBlob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("artwork").getPublicUrl(data.path);
      setFanlink({ ...fanlink, artwork_url: publicUrl });
      toast.success("Artwork cropped and uploaded!");
    } catch (error) {
      console.error("Error uploading cropped image:", error);
      toast.error("Failed to upload cropped artwork");
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
                Edit <span className="gradient-text">Fanlink</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                /{fanlink.artist_slug}/{fanlink.slug}
              </p>
            </div>
            <ShareButtons
              url={`${window.location.origin}/${fanlink.artist_slug}/${fanlink.slug}`}
              title={fanlink.title}
              artist={fanlink.artist}
              compact
            />
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </motion.div>

          {/* Track Info */}
          <motion.div
            className="glass-card p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">Track Information</h2>
            
            <div className="flex gap-6">
              <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 relative group">
                {fanlink.artwork_url ? (
                  <img src={fanlink.artwork_url} alt={fanlink.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-10 h-10 text-muted-foreground" />
                )}
                {fanlink.artwork_url && (
                  <button
                    onClick={() => setCropperOpen(true)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                  >
                    <Crop className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Label>Track Title</Label>
                  <Input
                    value={fanlink.title}
                    onChange={(e) => setFanlink({ ...fanlink, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Artist Name</Label>
                  <Input
                    value={fanlink.artist}
                    onChange={(e) => setFanlink({ ...fanlink, artist: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>UPC</Label>
                    <Input
                      value={fanlink.upc || ""}
                      onChange={(e) => setFanlink({ ...fanlink, upc: e.target.value || null })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>ISRC</Label>
                    <Input
                      value={fanlink.isrc || ""}
                      onChange={(e) => setFanlink({ ...fanlink, isrc: e.target.value || null })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div>
                  <Label>Artwork URL</Label>
                  <Input
                    value={fanlink.artwork_url || ""}
                    onChange={(e) => setFanlink({ ...fanlink, artwork_url: e.target.value || null })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Platform Links */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">
              Platform Links ({platformLinks.length})
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Drag to reorder platforms
            </p>
            
            <div className="space-y-3 mb-6">
              {platformLinks.map((link) => {
                const PlatformIcon = getPlatformIcon(link.platform_name);
                const isDragging = draggedItem === link.id;
                const isDragOver = dragOverItem === link.id;
                
                return (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, link.id)}
                    onDragOver={(e) => handleDragOver(e, link.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, link.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                      isDragging ? 'opacity-50 bg-secondary' : ''
                    } ${isDragOver ? 'border-2 border-primary border-dashed' : 'border-2 border-transparent'}`}
                  >
                    <div className="cursor-grab active:cursor-grabbing touch-none">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <PlatformIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-muted-foreground">
                          {getPlatformDisplayName(link.platform_name)}
                        </p>
                        {(platformClickCounts[link.platform_name] || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
                            {platformClickCounts[link.platform_name].toLocaleString()} clicks
                          </span>
                        )}
                      </div>
                      <Input
                        value={link.platform_url}
                        onChange={(e) => updatePlatformUrl(link.id, e.target.value)}
                        placeholder="Enter URL..."
                        className="h-9"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => handleDeletePlatform(link.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add New Platform */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium mb-3">Add Platform</h3>
              <div className="flex gap-2">
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select platform...</option>
                  {platformOptions
                    .filter(p => !platformLinks.some(l => l.platform_name === p.key))
                    .map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))
                  }
                </select>
                <Input
                  value={newPlatformUrl}
                  onChange={(e) => setNewPlatformUrl(e.target.value)}
                  placeholder="Enter URL..."
                  className="flex-1"
                />
                <Button
                  onClick={handleAddPlatform}
                  disabled={!newPlatform || !newPlatformUrl}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Link Visibility & Expiry */}
          <motion.div
            className="glass-card p-6 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="font-display font-semibold text-lg mb-4">Link Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Published</Label>
                  <p className="text-xs text-muted-foreground">When disabled, the link returns a "not found" page</p>
                </div>
                <Switch
                  checked={fanlink.is_published !== false}
                  onCheckedChange={(checked) => setFanlink({ ...fanlink, is_published: checked })}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expires At (optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={fanlink.expires_at ? new Date(fanlink.expires_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setFanlink({ ...fanlink, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {fanlink.expires_at && new Date(fanlink.expires_at) < new Date()
                    ? "⚠️ This link has expired and is no longer accessible"
                    : "Leave empty for no expiration"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Theme Customization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <ThemeCustomizer linkId={id!} onChange={setCurrentTheme} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <ThemePreview
                theme={currentTheme}
                title={fanlink.title}
                artist={fanlink.artist}
                artworkUrl={fanlink.artwork_url}
              />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Image Cropper Dialog */}
      {fanlink.artwork_url && (
        <ImageCropper
          imageUrl={fanlink.artwork_url}
          open={cropperOpen}
          onClose={() => setCropperOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default EditFanlink;
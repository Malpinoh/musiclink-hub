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
  Trash2,
  Plus,
  GripVertical
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
}

interface SortablePlatformItemProps {
  link: PlatformLink;
  onUpdateUrl: (id: string, url: string) => void;
  onDelete: (id: string) => void;
}

const SortablePlatformItem = ({ link, onUpdateUrl, onDelete }: SortablePlatformItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const PlatformIcon = getPlatformIcon(link.platform_name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <PlatformIcon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">
          {getPlatformDisplayName(link.platform_name)}
        </p>
        <Input
          value={link.platform_url}
          onChange={(e) => onUpdateUrl(link.id, e.target.value)}
          placeholder="Enter URL..."
          className="h-9"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive shrink-0"
        onClick={() => onDelete(link.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPlatformLinks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update display_order for all items
        return newItems.map((item, index) => ({
          ...item,
          display_order: index,
        }));
      });
    }
  };

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
      // Fetch fanlink
      const { data: fanlinkData, error: fanlinkError } = await supabase
        .from("fanlinks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (fanlinkError) throw fanlinkError;
      setFanlink(fanlinkData);

      // Fetch platform links
      const { data: linksData, error: linksError } = await supabase
        .from("platform_links")
        .select("*")
        .eq("fanlink_id", id)
        .order("display_order", { ascending: true });

      if (linksError) throw linksError;
      setPlatformLinks(linksData || []);
    } catch (error) {
      console.error("Error fetching fanlink:", error);
      toast.error("Fanlink not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fanlink) return;

    setSaving(true);
    try {
      // Update fanlink
      const { error: fanlinkError } = await supabase
        .from("fanlinks")
        .update({
          title: fanlink.title,
          artist: fanlink.artist,
          artwork_url: fanlink.artwork_url,
          release_date: fanlink.release_date,
          upc: fanlink.upc,
          isrc: fanlink.isrc,
        })
        .eq("id", id);

      if (fanlinkError) throw fanlinkError;

      // Update platform links
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
              {/* Artwork */}
              <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {fanlink.artwork_url ? (
                  <img src={fanlink.artwork_url} alt={fanlink.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-10 h-10 text-muted-foreground" />
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
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={platformLinks.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 mb-6">
                  {platformLinks.map((link) => (
                    <SortablePlatformItem
                      key={link.id}
                      link={link}
                      onUpdateUrl={updatePlatformUrl}
                      onDelete={handleDeletePlatform}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

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
        </div>
      </main>
    </div>
  );
};

export default EditFanlink;

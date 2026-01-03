import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Music2, 
  Search, 
  Loader2, 
  Calendar,
  User,
  Disc3,
  CheckCircle,
  ArrowRight,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

interface PreSaveMetadata {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  releaseDate: string;
  spotifyUri: string;
  spotifyAlbumId: string;
  spotifyArtistId: string;
  isrc: string;
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const CreatePreSave = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [metadata, setMetadata] = useState<PreSaveMetadata | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{12,14}$/.test(trimmed)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(trimmed.toUpperCase())) return "ISRC";
    if (trimmed.includes("spotify.com") || trimmed.includes("open.spotify")) return "Spotify Link";
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setInputType(detectInputType(value));
  };

  const handleFetch = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a Spotify URL, UPC, or ISRC");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-link', {
        body: { input: inputValue.trim() }
      });

      if (error) throw error;

      // generate-link can return a "not found" payload with suggestions (HTTP 200)
      if (data?.error) {
        toast.error(data.error, {
          description: Array.isArray((data as any).suggestions)
            ? (data as any).suggestions.join(" • ")
            : undefined,
        });
        return;
      }
      
      if (!data) {
        toast.error("Could not find release information");
        return;
      }

      // Handle the response structure from generate-link
      const metadata = data.metadata || data;
      
      setMetadata({
        title: metadata.title || '',
        artist: metadata.artist || '',
        album: metadata.album || metadata.title || '',
        artworkUrl: metadata.artwork?.large || metadata.artwork?.medium || '',
        releaseDate: metadata.release_date || '',
        spotifyUri: metadata.spotify_track_url ? `spotify:track:${metadata.spotify_track_url.split('/').pop()}` : '',
        spotifyAlbumId: metadata.album_id || '',
        spotifyArtistId: metadata.artist_id || '',
        isrc: metadata.isrc || ''
      });

      toast.success("Release metadata fetched!");
    } catch (error: any) {
      console.error("Error fetching metadata:", error);
      // Try to parse a more helpful error message
      if (error.message?.includes('No track found')) {
        toast.error("Release not found. It may not be distributed to Spotify yet.");
      } else {
        toast.error("Failed to fetch metadata. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!metadata || !user) return;

    setCreating(true);
    try {
      const artistSlug = slugify(metadata.artist);
      const titleSlug = slugify(metadata.title);

      const { data, error } = await supabase
        .from("pre_saves")
        .insert({
          user_id: user.id,
          title: metadata.title,
          artist: metadata.artist,
          slug: titleSlug,
          artist_slug: artistSlug,
          artwork_url: metadata.artworkUrl,
          release_date: metadata.releaseDate,
          spotify_uri: metadata.spotifyUri,
          spotify_album_id: metadata.spotifyAlbumId,
          spotify_artist_id: metadata.spotifyArtistId,
          isrc: metadata.isrc,
          album_title: metadata.album
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Pre-save link created!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating pre-save:", error);
      if (error.code === "23505") {
        toast.error("A pre-save for this release already exists");
      } else {
        toast.error("Failed to create pre-save link");
      }
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold mb-2">
            Create <span className="gradient-text">Pre-Save Link</span>
          </h1>
          <p className="text-muted-foreground">
            Build hype before your release drops. Let fans pre-save to their library.
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold">Release Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="input">Spotify URL, UPC, or ISRC</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="input"
                    placeholder="Paste Spotify album/track URL, UPC, or ISRC..."
                    value={inputValue}
                    onChange={handleInputChange}
                    className="pr-24"
                  />
                  {inputType && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      {inputType}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleFetch}
                  disabled={loading || !inputValue.trim()}
                  className="min-w-[100px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a Spotify album or track link for upcoming releases
              </p>
            </div>
          </div>
        </motion.div>

        {/* Metadata Preview */}
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Disc3 className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold">Release Preview</h2>
            </div>

            <div className="flex gap-6">
              {/* Artwork */}
              {metadata.artworkUrl && (
                <div className="relative flex-shrink-0">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl rounded-xl" />
                  <img
                    src={metadata.artworkUrl}
                    alt={metadata.title}
                    className="relative w-40 h-40 rounded-xl object-cover shadow-xl"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-display font-semibold text-lg">{metadata.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Artist</p>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {metadata.artist}
                  </p>
                </div>
                {metadata.album && metadata.album !== metadata.title && (
                  <div>
                    <p className="text-sm text-muted-foreground">Album</p>
                    <p className="flex items-center gap-2">
                      <Disc3 className="w-4 h-4 text-primary" />
                      {metadata.album}
                    </p>
                  </div>
                )}
                {metadata.releaseDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Release Date</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {metadata.releaseDate}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pre-save Link Preview */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Pre-Save Link Preview</p>
              <code className="text-sm text-primary">
                https://md.malpinohdistro.com.ng/presave/{slugify(metadata.artist)}/{slugify(metadata.title)}
              </code>
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Save to Spotify Library
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Follow Artist
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Release Day Notification
              </div>
            </div>
          </motion.div>
        )}

        {/* Create Button */}
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <Button
              onClick={handleCreate}
              disabled={creating}
              size="lg"
              variant="hero"
            >
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              Create Pre-Save Link
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default CreatePreSave;

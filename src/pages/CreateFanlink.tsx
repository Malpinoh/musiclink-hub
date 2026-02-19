import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccuracyScore from "@/components/AccuracyScore";
import { motion } from "framer-motion";
import { 
  Search, 
  ArrowRight, 
  Loader2, 
  Music2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Edit3,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/malpinohdistro/client";
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
} from "@/components/icons/PlatformIcons";

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

interface LinkMetadata {
  title: string;
  artist: string;
  album: string;
  album_id: string;
  artist_id: string;
  isrc: string | null;
  upc: string | null;
  release_date: string | null;
  artwork: {
    large: string | null;
    medium: string | null;
    small: string | null;
  };
  spotify_track_url: string | null;
  spotify_artist_url: string | null;
  spotify_album_url: string | null;
}

interface AccuracyBreakdown {
  isrc_match: boolean;
  upc_match: boolean;
  artist_similarity: number;
  title_similarity: number;
  album_match: boolean;
}

const CreateFanlink = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});
  const [accuracyScore, setAccuracyScore] = useState<number>(0);
  const [accuracyBreakdown, setAccuracyBreakdown] = useState<AccuracyBreakdown | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string) => {
    const trimmed = input.trim();
    
    if (/^\d{12,13}$/.test(trimmed)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(trimmed)) return "ISRC";
    if (trimmed.includes("spotify.com")) return "Spotify Link";
    if (trimmed.includes("music.apple.com") || trimmed.includes("itunes.apple.com")) return "Apple Music Link";
    if (trimmed.includes("deezer.com")) return "Deezer Link";
    
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const type = detectInputType(value);
    setDetectedType(type);
    setFetchError(null);
  };

  const handleFetch = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a link, UPC, or ISRC");
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setMetadata(null);
    setAccuracyScore(0);
    setAccuracyBreakdown(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-link", {
        body: { input: inputValue.trim() },
      });

      if (error) throw error;

      if (data.error) {
        setFetchError(data.error);
        toast.error(data.error);
        return;
      }

      setMetadata(data.metadata);
      setPlatformUrls(data.streaming_links || {});
      setAccuracyScore(data.accuracy_score || 0);
      setAccuracyBreakdown(data.accuracy_breakdown || null);
      
      toast.success(`Track found with ${data.accuracy_score}% accuracy!`);
    } catch (error: unknown) {
      console.error("Error fetching metadata:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch track data";
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!metadata?.title || !metadata?.artist) {
      toast.error("Please fill in the track title and artist name");
      return;
    }

    setIsCreating(true);

    try {
      const artistSlug = slugify(metadata.artist);
      const slug = slugify(metadata.title);

      // Create fanlink
      const { data: fanlink, error: fanlinkError } = await supabase
        .from("fanlinks")
        .insert({
          user_id: user?.id,
          title: metadata.title,
          artist: metadata.artist,
          artwork_url: metadata.artwork?.large || metadata.artwork?.medium || null,
          release_date: metadata.release_date,
          release_type: "Single",
          upc: metadata.upc,
          isrc: metadata.isrc,
          slug,
          artist_slug: artistSlug,
        })
        .select()
        .single();

      if (fanlinkError) throw fanlinkError;

      // Create platform links
      const platformLinks = Object.entries(platformUrls)
        .filter(([_, url]) => url)
        .map(([name, url], index) => ({
          fanlink_id: fanlink.id,
          platform_name: name,
          platform_url: url,
          display_order: index,
        }));

      if (platformLinks.length > 0) {
        const { error: platformError } = await supabase
          .from("platform_links")
          .insert(platformLinks);

        if (platformError) throw platformError;
      }

      toast.success("Fanlink created successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Error creating fanlink:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create fanlink";
      if (errorMessage.includes("duplicate")) {
        toast.error("A fanlink with this title already exists for this artist");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const platforms = [
    { key: "spotify", name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954" },
    { key: "apple_music", name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C" },
    { key: "youtube", name: "YouTube Music", icon: <YouTubeIcon />, color: "#FF0000" },
    { key: "deezer", name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D" },
    { key: "audiomack", name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500" },
    { key: "boomplay", name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00" },
    { key: "tidal", name: "Tidal", icon: <TidalIcon />, color: "#00FFFF" },
    { key: "amazon", name: "Amazon Music", icon: <AmazonMusicIcon />, color: "#FF9900" },
    { key: "soundcloud", name: "SoundCloud", icon: <SoundCloudIcon />, color: "#FF5500" },
    { key: "shazam", name: "Shazam", icon: <ShazamIcon />, color: "#0088FF" },
  ];

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

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Create New <span className="gradient-text">Fanlink</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Paste a Spotify link, UPC, or ISRC to auto-fetch metadata
            </p>
          </motion.div>

          {/* Input Section */}
          <motion.div
            className="glass-card p-6 md:p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Paste Spotify link, UPC, or ISRC..."
                  value={inputValue}
                  onChange={handleInputChange}
                  className="pl-12 h-14 text-lg"
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                />
              </div>

              {detectedType && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-primary"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Detected: {detectedType}</span>
                </motion.div>
              )}

              <Button
                variant="hero"
                size="xl"
                onClick={handleFetch}
                disabled={isLoading || !inputValue.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching Spotify...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Fetch Metadata
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Results */}
          {metadata && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Accuracy Score */}
              {accuracyBreakdown && (
                <AccuracyScore score={accuracyScore} breakdown={accuracyBreakdown} />
              )}

              {/* Track Info Card */}
              <div className="glass-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold">Track Information</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? "Done" : "Edit"}
                  </Button>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Artwork */}
                  {metadata.artwork?.large || metadata.artwork?.medium ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={metadata.artwork.large || metadata.artwork.medium || ""} 
                        alt="Album artwork"
                        className="w-40 h-40 rounded-xl object-cover shadow-lg"
                      />
                      {metadata.spotify_album_url && (
                        <a
                          href={metadata.spotify_album_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        >
                          <ExternalLink className="w-6 h-6 text-white" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Music2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Track Title *</label>
                          <Input 
                            value={metadata.title} 
                            onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                            placeholder="Enter track title"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Artist Name *</label>
                          <Input 
                            value={metadata.artist} 
                            onChange={(e) => setMetadata({...metadata, artist: e.target.value})}
                            placeholder="Enter artist name"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h3 className="font-display text-2xl font-bold">{metadata.title}</h3>
                          <p className="text-lg text-muted-foreground">{metadata.artist}</p>
                        </div>
                        {metadata.album && (
                          <p className="text-sm text-muted-foreground">
                            Album: {metadata.album}
                          </p>
                        )}
                      </>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {metadata.isrc && (
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                          ISRC: {metadata.isrc}
                        </span>
                      )}
                      {metadata.upc && (
                        <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                          UPC: {metadata.upc}
                        </span>
                      )}
                      {metadata.release_date && (
                        <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-sm">
                          {metadata.release_date}
                        </span>
                      )}
                    </div>

                    {/* Spotify Links */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {metadata.spotify_track_url && (
                        <a
                          href={metadata.spotify_track_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#1DB954] hover:underline"
                        >
                          <SpotifyIcon />
                          Track
                        </a>
                      )}
                      {metadata.spotify_artist_url && (
                        <a
                          href={metadata.spotify_artist_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#1DB954] hover:underline"
                        >
                          <SpotifyIcon />
                          Artist
                        </a>
                      )}
                      {metadata.spotify_album_url && (
                        <a
                          href={metadata.spotify_album_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#1DB954] hover:underline"
                        >
                          <SpotifyIcon />
                          Album
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Links */}
              <div className="glass-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Streaming Links</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {Object.keys(platformUrls).filter(k => platformUrls[k]).length} platforms
                  </span>
                </div>
                
                <div className="space-y-3">
                  {platforms.map((platform) => (
                    <div key={platform.key} className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0"
                        style={{ color: platform.color }}
                      >
                        {platform.icon}
                      </div>
                      <Input
                        placeholder={`${platform.name} URL`}
                        value={platformUrls[platform.key] || ""}
                        onChange={(e) => setPlatformUrls({...platformUrls, [platform.key]: e.target.value})}
                        className="flex-1"
                      />
                      {platformUrls[platform.key] ? (
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* URL Preview */}
              <div className="glass-card p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold mb-4">Your Fanlink URL</h2>
                <div className="bg-secondary/50 rounded-xl p-4 font-mono text-sm break-all">
                  <span className="text-muted-foreground">md.malpinohdistro.com.ng/</span>
                  {slugify(metadata.artist || "artist")}/{slugify(metadata.title || "track")}
                </div>
              </div>

              {/* Create Button */}
              <Button
                variant="hero"
                size="xl"
                onClick={handleCreate}
                disabled={isCreating || !metadata.title || !metadata.artist}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Fanlink
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Help Text */}
          {!metadata && !fetchError && (
            <motion.div
              className="text-center text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="mb-4">Best results with:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Spotify Link", "ISRC", "UPC"].map((item) => (
                  <span key={item} className="px-3 py-1 rounded-full bg-secondary text-sm">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm">
                Powered by official Spotify Web API for accurate metadata
              </p>
            </motion.div>
          )}

          {fetchError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border-destructive/50"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{fetchError}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try using a direct Spotify track URL or valid ISRC code for best results.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateFanlink;

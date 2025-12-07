import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { 
  Search, 
  ArrowRight, 
  Loader2, 
  Music2,
  CheckCircle,
  AlertCircle,
  Sparkles
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
} from "@/components/icons/PlatformIcons";

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

interface FetchedMetadata {
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  release_type: string | null;
  upc: string | null;
  isrc: string | null;
}

const CreateFanlink = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<FetchedMetadata | null>(null);
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) return "YouTube Link";
    if (trimmed.includes("audiomack.com")) return "Audiomack Link";
    if (trimmed.includes("boomplay.com")) return "Boomplay Link";
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
    
    try {
      const { data, error } = await supabase.functions.invoke("fetch-music-metadata", {
        body: { input: inputValue.trim(), type: detectedType },
      });

      if (error) throw error;

      if (data.error) {
        setFetchError(data.error);
        toast.error(data.error);
        // Still allow manual entry
        setFetchedData({
          title: "",
          artist: "",
          artwork_url: null,
          release_date: null,
          release_type: "Single",
          upc: null,
          isrc: null,
        });
        setPlatformUrls({});
        return;
      }

      const metadata = data.metadata;
      setFetchedData({
        title: metadata.title || "",
        artist: metadata.artist || "",
        artwork_url: metadata.artwork_url,
        release_date: metadata.release_date,
        release_type: metadata.release_type || "Single",
        upc: metadata.upc,
        isrc: metadata.isrc,
      });
      
      // Convert platform URLs to our format
      setPlatformUrls(metadata.platforms || {});
      
      if (metadata.title && metadata.artist) {
        toast.success("Track found! Review the details below.");
      } else {
        toast.info("Partial data found. Please complete the missing fields.");
      }
    } catch (error: any) {
      console.error("Error fetching metadata:", error);
      setFetchError("Failed to fetch track data. You can enter details manually.");
      toast.error("Failed to fetch track data");
      // Still allow manual entry
      setFetchedData({
        title: "",
        artist: "",
        artwork_url: null,
        release_date: null,
        release_type: "Single",
        upc: null,
        isrc: null,
      });
      setPlatformUrls({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!fetchedData.title || !fetchedData.artist) {
      toast.error("Please fill in the track title and artist name");
      return;
    }

    setIsCreating(true);

    try {
      const artistSlug = slugify(fetchedData.artist);
      const slug = slugify(fetchedData.title);

      // Create fanlink
      const { data: fanlink, error: fanlinkError } = await supabase
        .from("fanlinks")
        .insert({
          user_id: user?.id,
          title: fetchedData.title,
          artist: fetchedData.artist,
          artwork_url: fetchedData.artwork_url || null,
          release_date: fetchedData.release_date,
          release_type: fetchedData.release_type,
          upc: fetchedData.upc,
          isrc: fetchedData.isrc,
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
    } catch (error: any) {
      console.error("Error creating fanlink:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("A fanlink with this title already exists for this artist");
      } else {
        toast.error("Failed to create fanlink");
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
              Paste any streaming link, UPC, or ISRC to get started
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
                  placeholder="Paste Spotify link, Apple Music link, UPC, or ISRC..."
                  value={inputValue}
                  onChange={handleInputChange}
                  className="pl-12 h-14 text-lg"
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
                    Processing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Continue
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Fetched Data Form */}
          {fetchedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Auto-fetch notice */}
              {Object.keys(platformUrls).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Auto-generated links!</span> We found streaming links for {Object.keys(platformUrls).filter(k => platformUrls[k]).length} platforms. Review and edit as needed.
                  </p>
                </motion.div>
              )}

              {/* Track Info Card */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-6">Track Information</h2>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {fetchedData.artwork_url ? (
                    <img 
                      src={fetchedData.artwork_url} 
                      alt="Album artwork"
                      className="w-32 h-32 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Music2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Track Title *</label>
                      <Input 
                        value={fetchedData.title} 
                        onChange={(e) => setFetchedData({...fetchedData, title: e.target.value})}
                        placeholder="Enter track title"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Artist Name *</label>
                      <Input 
                        value={fetchedData.artist} 
                        onChange={(e) => setFetchedData({...fetchedData, artist: e.target.value})}
                        placeholder="Enter artist name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">UPC</label>
                        <Input 
                          value={fetchedData.upc || ""} 
                          onChange={(e) => setFetchedData({...fetchedData, upc: e.target.value})}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">ISRC</label>
                        <Input 
                          value={fetchedData.isrc || ""} 
                          onChange={(e) => setFetchedData({...fetchedData, isrc: e.target.value})}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Links */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-6">Streaming Links</h2>
                
                <div className="space-y-4">
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
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-4">Your Fanlink URL</h2>
                <div className="bg-secondary/50 rounded-xl p-4 font-mono text-sm break-all">
                  /{slugify(fetchedData.artist || "artist")}/{slugify(fetchedData.title || "track")}
                </div>
              </div>

              {/* Create Button */}
              <Button
                variant="hero"
                size="xl"
                onClick={handleCreate}
                disabled={isCreating || !fetchedData.title || !fetchedData.artist}
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
          {!fetchedData && (
            <motion.div
              className="text-center text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="mb-4">Supported inputs:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Spotify", "Apple Music", "YouTube", "Audiomack", "Boomplay", "Deezer", "UPC", "ISRC"].map((item) => (
                  <span key={item} className="px-3 py-1 rounded-full bg-secondary text-sm">
                    {item}
                  </span>
                ))}
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

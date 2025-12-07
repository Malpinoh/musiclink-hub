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
  AlertCircle
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
} from "@/components/icons/PlatformIcons";

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const CreateFanlink = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string) => {
    const trimmed = input.trim();
    
    if (/^\d{12,13}$/.test(trimmed)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(trimmed.toUpperCase())) return "ISRC";
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
  };

  const handleFetch = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a link, UPC, or ISRC");
      return;
    }

    setIsLoading(true);
    
    // For now, simulate fetching - in production this would call edge functions
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock fetched data
    setFetchedData({
      title: "New Release",
      artist: "Artist Name",
      artwork_url: "",
      releaseDate: "2024",
      type: "Single",
      upc: "123456789012",
      isrc: "USRC12345678",
    });
    
    setPlatformUrls({
      spotify: inputValue.includes("spotify") ? inputValue : "",
      apple_music: inputValue.includes("apple") ? inputValue : "",
      youtube: inputValue.includes("youtube") ? inputValue : "",
      audiomack: inputValue.includes("audiomack") ? inputValue : "",
      boomplay: "",
      deezer: inputValue.includes("deezer") ? inputValue : "",
    });
    
    setIsLoading(false);
    toast.success("Enter track details to continue");
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
          release_date: fetchedData.releaseDate,
          release_type: fetchedData.type,
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
    { key: "audiomack", name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500" },
    { key: "boomplay", name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00" },
    { key: "deezer", name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D" },
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
              {/* Track Info Card */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-6">Track Information</h2>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Music2 className="w-12 h-12 text-muted-foreground" />
                  </div>
                  
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

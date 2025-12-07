import { useState } from "react";
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
import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeIcon,
  AudiomackIcon,
  BoomplayIcon,
  DeezerIcon,
} from "@/components/icons/PlatformIcons";

const CreateFanlink = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<any>(null);

  const detectInputType = (input: string) => {
    const trimmed = input.trim();
    
    if (/^\d{12,13}$/.test(trimmed)) {
      return "UPC";
    }
    if (/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(trimmed.toUpperCase())) {
      return "ISRC";
    }
    if (trimmed.includes("spotify.com")) {
      return "Spotify Link";
    }
    if (trimmed.includes("music.apple.com") || trimmed.includes("itunes.apple.com")) {
      return "Apple Music Link";
    }
    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
      return "YouTube Link";
    }
    if (trimmed.includes("audiomack.com")) {
      return "Audiomack Link";
    }
    if (trimmed.includes("boomplay.com")) {
      return "Boomplay Link";
    }
    if (trimmed.includes("deezer.com")) {
      return "Deezer Link";
    }
    
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
    
    // Simulate API fetch - in production this would call your edge functions
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock fetched data
    setFetchedData({
      title: "Amazing Track",
      artist: "Great Artist",
      artwork: "https://placehold.co/300x300",
      releaseDate: "2024",
      type: "Single",
      upc: "123456789012",
      isrc: "USRC12345678",
    });
    
    setIsLoading(false);
    toast.success("Metadata fetched successfully!");
  };

  const handleCreate = () => {
    toast.success("Fanlink created successfully!");
    navigate("/dashboard");
  };

  const platforms = [
    { name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954", detected: true },
    { name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C", detected: true },
    { name: "YouTube Music", icon: <YouTubeIcon />, color: "#FF0000", detected: true },
    { name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500", detected: true },
    { name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00", detected: false },
    { name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D", detected: true },
  ];

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
              Paste any streaming link, UPC, or ISRC to auto-generate your fanlink
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
                    Fetching Metadata...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Fetch & Generate Links
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Fetched Data Preview */}
          {fetchedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Track Info Card */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-6">Track Information</h2>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center">
                    <Music2 className="w-12 h-12 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Track Title</label>
                      <Input value={fetchedData.title} onChange={() => {}} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Artist Name</label>
                      <Input value={fetchedData.artist} onChange={() => {}} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">UPC</label>
                        <Input value={fetchedData.upc} readOnly className="text-muted-foreground" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">ISRC</label>
                        <Input value={fetchedData.isrc} readOnly className="text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected Platforms */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-6">Detected Streaming Links</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platforms.map((platform) => (
                    <div
                      key={platform.name}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        platform.detected 
                          ? "border-primary/30 bg-primary/5" 
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      <span style={{ color: platform.color }}>{platform.icon}</span>
                      <span className="flex-1 font-medium">{platform.name}</span>
                      {platform.detected ? (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* URL Preview */}
              <div className="glass-card p-6 md:p-8 mb-8">
                <h2 className="font-display text-xl font-semibold mb-4">Your Fanlink URL</h2>
                <div className="bg-secondary/50 rounded-xl p-4 font-mono text-sm break-all">
                  md.malpinohdistro.com.ng/great-artist/amazing-track
                </div>
              </div>

              {/* Create Button */}
              <Button
                variant="hero"
                size="xl"
                onClick={handleCreate}
                className="w-full"
              >
                Create Fanlink
                <ArrowRight className="w-5 h-5" />
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

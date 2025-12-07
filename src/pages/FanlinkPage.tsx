import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Music2, Share2, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import demoArtwork from "@/assets/demo-artwork.jpg";
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

const platformConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  spotify: { icon: <SpotifyIcon />, color: "#1DB954" },
  apple_music: { icon: <AppleMusicIcon />, color: "#FA243C" },
  youtube: { icon: <YouTubeIcon />, color: "#FF0000" },
  audiomack: { icon: <AudiomackIcon />, color: "#FFA500" },
  boomplay: { icon: <BoomplayIcon />, color: "#FFCC00" },
  deezer: { icon: <DeezerIcon />, color: "#FEAA2D" },
  tidal: { icon: <TidalIcon />, color: "#00FFFF" },
  amazon: { icon: <AmazonMusicIcon />, color: "#FF9900" },
  soundcloud: { icon: <SoundCloudIcon />, color: "#FF5500" },
  shazam: { icon: <ShazamIcon />, color: "#0088FF" },
};

const formatPlatformName = (key: string) => {
  const names: Record<string, string> = {
    spotify: "Spotify",
    apple_music: "Apple Music",
    youtube: "YouTube Music",
    audiomack: "Audiomack",
    boomplay: "Boomplay",
    deezer: "Deezer",
    tidal: "Tidal",
    amazon: "Amazon Music",
    soundcloud: "SoundCloud",
    shazam: "Shazam",
  };
  return names[key] || key;
};

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  release_type: string | null;
}

interface PlatformLink {
  id: string;
  platform_name: string;
  platform_url: string;
  display_order: number;
}

const FanlinkPage = () => {
  const { artist, song, id } = useParams();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fanlink, setFanlink] = useState<Fanlink | null>(null);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [notFound, setNotFound] = useState(false);

  const currentUrl = window.location.href;

  useEffect(() => {
    fetchFanlink();
  }, [artist, song, id]);

  const fetchFanlink = async () => {
    try {
      let query = supabase.from("fanlinks").select("*");
      
      if (id) {
        query = query.eq("id", id);
      } else if (artist && song) {
        query = query.eq("artist_slug", artist).eq("slug", song);
      }

      const { data: fanlinkData, error: fanlinkError } = await query.maybeSingle();

      if (fanlinkError) throw fanlinkError;
      
      if (!fanlinkData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setFanlink(fanlinkData);

      // Fetch platform links
      const { data: linksData, error: linksError } = await supabase
        .from("platform_links")
        .select("*")
        .eq("fanlink_id", fanlinkData.id)
        .eq("is_active", true)
        .order("display_order");

      if (linksError) throw linksError;
      setPlatformLinks(linksData || []);

      // Log click
      await supabase.from("clicks").insert({
        fanlink_id: fanlinkData.id,
        user_agent: navigator.userAgent,
        device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });

    } catch (error) {
      console.error("Error fetching fanlink:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformClick = async (platformName: string) => {
    if (fanlink) {
      await supabase.from("clicks").insert({
        fanlink_id: fanlink.id,
        platform_name: platformName,
        user_agent: navigator.userAgent,
        device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && fanlink) {
      try {
        await navigator.share({
          title: `${fanlink.title} by ${fanlink.artist}`,
          text: `Listen to ${fanlink.title} on all platforms`,
          url: currentUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !fanlink) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Fanlink Not Found</h1>
        <p className="text-muted-foreground mb-6">This link doesn't exist or has been removed.</p>
        <Button variant="hero" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with artwork blur */}
      <div className="absolute inset-0 z-0">
        <img
          src={fanlink.artwork_url || demoArtwork}
          alt=""
          className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Music2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sm">MDistro Link</span>
          </Link>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowQR(!showQR)}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 2h-2v4h2v-4zm2-2h-2v2h2v-2zm2 0h-2v2h2v-2zm0 4h-2v2h2v-2zm-4 2h-2v2h2v-2zm-4 0h-2v2h2v-2zm4-6h2v2h-2v-2zm-4 0h2v2h-2v-2z"/>
              </svg>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyLink}>
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* QR Code Modal */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 right-4 z-50 glass-card p-4"
          >
            <QRCodeSVG
              value={currentUrl}
              size={150}
              bgColor="transparent"
              fgColor="white"
              level="H"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">Scan to open</p>
          </motion.div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <motion.div
            className="w-full max-w-md mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Artwork */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl rounded-full opacity-50" />
              <img
                src={fanlink.artwork_url || demoArtwork}
                alt={`${fanlink.title} artwork`}
                className="relative w-56 h-56 md:w-64 md:h-64 mx-auto rounded-2xl shadow-2xl object-cover"
              />
            </motion.div>

            {/* Track Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {fanlink.title}
              </h1>
              <p className="text-lg text-muted-foreground">{fanlink.artist}</p>
              {fanlink.release_type && fanlink.release_date && (
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {fanlink.release_type} • {fanlink.release_date}
                </p>
              )}
            </motion.div>

            {/* Platform Links */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {platformLinks.length > 0 ? (
                platformLinks.map((link, index) => {
                  const config = platformConfig[link.platform_name] || { 
                    icon: <Music2 className="w-6 h-6" />, 
                    color: "#888" 
                  };
                  
                  return (
                    <motion.a
                      key={link.id}
                      href={link.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handlePlatformClick(link.platform_name)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 backdrop-blur-sm border border-border/30 hover:bg-secondary/70 hover:border-primary/30 transition-all duration-300 group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ borderLeftColor: config.color, borderLeftWidth: "3px" }}
                    >
                      <span className="w-8 h-8 flex items-center justify-center" style={{ color: config.color }}>
                        {config.icon}
                      </span>
                      <span className="flex-1 text-left font-medium">
                        Listen on {formatPlatformName(link.platform_name)}
                      </span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </motion.a>
                  );
                })
              ) : (
                <p className="text-muted-foreground">No streaming links available yet.</p>
              )}
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Music2 className="w-4 h-4" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default FanlinkPage;

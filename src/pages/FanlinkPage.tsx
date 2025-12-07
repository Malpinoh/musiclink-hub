import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Music2, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

// Demo data - in production this would come from API
const demoTrack = {
  title: "Afro Love",
  artist: "Demo Artist",
  artwork: demoArtwork,
  releaseDate: "2024",
  type: "Single",
  platforms: [
    { name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954", url: "https://spotify.com" },
    { name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C", url: "https://music.apple.com" },
    { name: "YouTube Music", icon: <YouTubeIcon />, color: "#FF0000", url: "https://music.youtube.com" },
    { name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500", url: "https://audiomack.com" },
    { name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00", url: "https://boomplay.com" },
    { name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D", url: "https://deezer.com" },
    { name: "Tidal", icon: <TidalIcon />, color: "#00FFFF", url: "https://tidal.com" },
    { name: "Amazon Music", icon: <AmazonMusicIcon />, color: "#FF9900", url: "https://music.amazon.com" },
    { name: "SoundCloud", icon: <SoundCloudIcon />, color: "#FF5500", url: "https://soundcloud.com" },
    { name: "Shazam", icon: <ShazamIcon />, color: "#0088FF", url: "https://shazam.com" },
  ],
};

const FanlinkPage = () => {
  const { artist, song } = useParams();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const currentUrl = window.location.href;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${demoTrack.title} by ${demoTrack.artist}`,
          text: `Listen to ${demoTrack.title} on all platforms`,
          url: currentUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with artwork blur */}
      <div className="absolute inset-0 z-0">
        <img
          src={demoTrack.artwork}
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
                src={demoTrack.artwork}
                alt={`${demoTrack.title} artwork`}
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
                {demoTrack.title}
              </h1>
              <p className="text-lg text-muted-foreground">{demoTrack.artist}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {demoTrack.type} • {demoTrack.releaseDate}
              </p>
            </motion.div>

            {/* Platform Links */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {demoTrack.platforms.map((platform, index) => (
                <motion.a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 backdrop-blur-sm border border-border/30 hover:bg-secondary/70 hover:border-primary/30 transition-all duration-300 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ borderLeftColor: platform.color, borderLeftWidth: "3px" }}
                >
                  <span className="w-8 h-8 flex items-center justify-center" style={{ color: platform.color }}>
                    {platform.icon}
                  </span>
                  <span className="flex-1 text-left font-medium">Listen on {platform.name}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </motion.a>
              ))}
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

import { useState } from "react";
import { motion } from "framer-motion";
import { Disc3, ExternalLink, Copy, Check, Share2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

interface AlbumLaunchPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
  };
}

const platforms = [
  { name: "Spotify", icon: "🎵", color: "from-green-600 to-green-700" },
  { name: "Apple Music", icon: "🍎", color: "from-pink-500 to-pink-600" },
  { name: "Boomplay", icon: "🎶", color: "from-yellow-500 to-yellow-600" },
  { name: "Audiomack", icon: "🎧", color: "from-orange-500 to-orange-600" },
  { name: "YouTube Music", icon: "▶️", color: "from-red-500 to-red-600" },
  { name: "Deezer", icon: "🎹", color: "from-slate-500 to-slate-600" },
];

const AlbumLaunchPage = ({ campaign }: AlbumLaunchPageProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // GRID-BASED layout — platforms visible at once
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-background to-background" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6 flex justify-between items-center">
          <Link to="/" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-2xl" />
          </Link>
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="rounded-2xl" onClick={handleCopy}>
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigator.share?.({ url: window.location.href })}>
                <Share2 className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
          {/* Two-column hero on desktop: artwork + info side by side */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
            <motion.div
              className="flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
            >
              {campaign.artwork_url ? (
                <img src={campaign.artwork_url} alt={campaign.campaign_name} className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl object-cover" />
              ) : (
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-secondary flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              className="text-center md:text-left md:pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Album</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{campaign.campaign_name}</h1>
              <p className="text-xl text-muted-foreground">{campaign.artist_name}</p>
            </motion.div>
          </div>

          {/* Platform GRID — all visible at once */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Listen on</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {platforms.map((p, i) => (
                <motion.button
                  key={p.name}
                  className={`bg-gradient-to-br ${p.color} text-white rounded-2xl p-5 flex flex-col items-center gap-3 transition-all`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  whileHover={{ y: -6, scale: 1.03, boxShadow: "0 16px 40px -8px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-3xl">{p.icon}</span>
                  <span className="text-sm font-semibold">{p.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Tracklist */}
          <motion.div
            className="mt-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-primary" />
              Tracklist
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="italic">Tracklist coming soon</p>
            </div>
          </motion.div>
        </main>

        <footer className="p-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <img src={logo} alt="" className="w-4 h-4 rounded-lg" />
            Powered by MDistro Link
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default AlbumLaunchPage;

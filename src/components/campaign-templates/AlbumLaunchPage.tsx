import { useState } from "react";
import { motion } from "framer-motion";
import { Disc3, ExternalLink, Copy, Check, Share2 } from "lucide-react";
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
  { name: "Spotify", icon: "🎵", color: "bg-[hsl(141,73%,42%)]" },
  { name: "Apple Music", icon: "🍎", color: "bg-[hsl(350,100%,60%)]" },
  { name: "Boomplay", icon: "🎶", color: "bg-[hsl(45,100%,50%)]" },
  { name: "Audiomack", icon: "🎧", color: "bg-[hsl(32,100%,50%)]" },
  { name: "YouTube Music", icon: "▶️", color: "bg-[hsl(0,100%,50%)]" },
  { name: "Deezer", icon: "🎹", color: "bg-muted" },
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
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 to-background" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-lg" />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigator.share?.({ url: window.location.href })}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center px-4 py-8">
          {/* Album artwork */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {campaign.artwork_url ? (
              <img src={campaign.artwork_url} alt={campaign.campaign_name} className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl object-cover" />
            ) : (
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-secondary flex items-center justify-center">
                <Disc3 className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </motion.div>

          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">{campaign.campaign_name}</h1>
            <p className="text-lg text-muted-foreground">{campaign.artist_name}</p>
          </motion.div>

          {/* Platform grid */}
          <motion.div
            className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {platforms.map((p, i) => (
              <motion.button
                key={p.name}
                className={`${p.color} text-white rounded-2xl p-5 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="text-sm font-medium">{p.name}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </motion.button>
            ))}
          </motion.div>

          {/* Tracklist placeholder */}
          <motion.div
            className="mt-8 w-full max-w-lg glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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

        <footer className="p-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <img src={logo} alt="" className="w-4 h-4 rounded" />
            Powered by MDistro Link
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default AlbumLaunchPage;

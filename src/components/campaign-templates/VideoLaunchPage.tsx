import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

interface VideoLaunchPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
  };
}

const VideoLaunchPage = ({ campaign }: VideoLaunchPageProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { name: "YouTube", color: "bg-red-600" },
    { name: "Apple Music", color: "bg-pink-600" },
    { name: "Spotify", color: "bg-green-600" },
  ];

  return (
    // DARK THEME ONLY — full-width layout, large video at top
    <div className="min-h-screen bg-black text-white">
      {/* Full-bleed background */}
      {campaign.artwork_url && (
        <div className="fixed inset-0 z-0">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover opacity-15 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black" />
        </div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Minimal header */}
        <header className="p-6 flex justify-between items-center">
          <Link to="/" className="opacity-50 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-2xl" />
          </Link>
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white rounded-2xl" onClick={handleCopy}>
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white rounded-2xl" onClick={() => navigator.share?.({ url: window.location.href })}>
                <Share2 className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </header>

        {/* FULL-WIDTH video player area at TOP */}
        <main className="flex-1 flex flex-col">
          <motion.div
            className="relative w-full max-w-4xl mx-auto aspect-video cursor-pointer group"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            {campaign.artwork_url ? (
              <img src={campaign.artwork_url} alt={campaign.campaign_name} className="w-full h-full object-cover rounded-none md:rounded-2xl" />
            ) : (
              <div className="w-full h-full bg-white/5" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors md:rounded-2xl">
              <motion.div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
                whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
              </motion.div>
            </div>
          </motion.div>

          {/* Content below video */}
          <div className="max-w-xl mx-auto w-full px-6 py-10 space-y-8">
            <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Official Music Video</p>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-2 leading-tight">{campaign.campaign_name}</h1>
              <p className="text-xl text-white/50">{campaign.artist_name}</p>
            </motion.div>

            {/* Platform links — stacked full-width */}
            <motion.div className="space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {platforms.map((p, i) => (
                <motion.button
                  key={p.name}
                  className={`w-full ${p.color} hover:opacity-90 text-white rounded-2xl py-5 px-6 font-semibold flex items-center justify-between transition-opacity text-lg`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{p.name}</span>
                  <ExternalLink className="w-5 h-5 opacity-60" />
                </motion.button>
              ))}
            </motion.div>
          </div>
        </main>

        <footer className="p-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors">
            <img src={logo} alt="" className="w-4 h-4 rounded-lg" />
            Powered by MDistro Link
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default VideoLaunchPage;

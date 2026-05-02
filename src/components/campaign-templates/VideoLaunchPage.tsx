import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Share2, Copy, Check, ExternalLink } from "lucide-react";
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
  const [playClicked, setPlayClicked] = useState(false);

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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Cinematic dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />

      {/* Background artwork */}
      {campaign.artwork_url && (
        <div className="absolute inset-0">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black" />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-lg" />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-white/80" onClick={handleCopy}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-white/80" onClick={() => navigator.share?.({ url: window.location.href })}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          {/* Video player area */}
          <motion.div
            className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden mb-8 cursor-pointer group"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
            onClick={() => setPlayClicked(true)}
          >
            {campaign.artwork_url ? (
              <img src={campaign.artwork_url} alt={campaign.campaign_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
              <motion.div
                className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-8 h-8 text-white ml-1" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{campaign.campaign_name}</h1>
            <p className="text-lg text-white/60">{campaign.artist_name}</p>
            <p className="text-sm text-white/40 mt-2">Official Music Video</p>
          </motion.div>

          {/* Platform links */}
          <motion.div className="w-full max-w-sm space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {platforms.map((p) => (
              <motion.button
                key={p.name}
                className={`w-full ${p.color} hover:opacity-90 text-white rounded-xl py-4 px-6 font-medium flex items-center justify-between transition-opacity`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{p.name}</span>
                <ExternalLink className="w-4 h-4" />
              </motion.button>
            ))}
          </motion.div>
        </main>

        <footer className="p-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors">
            <img src={logo} alt="" className="w-4 h-4 rounded" />
            Powered by MDistro Link
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default VideoLaunchPage;

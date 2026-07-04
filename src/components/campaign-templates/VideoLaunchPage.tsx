import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, Film, Eye, Heart, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import StreamingPlatforms from "@/components/StreamingPlatforms";

interface VideoLaunchPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
  };
}

const REACTIONS = [
  { emoji: "🔥", label: "Fire", icon: Flame },
  { emoji: "❤️", label: "Love", icon: Heart },
  { emoji: "✨", label: "Magic", icon: Sparkles },
  { emoji: "👀", label: "Eyes", icon: Eye },
];

// Extract YouTube/Vimeo embed URL
const toEmbedUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

const VideoLaunchPage = ({ campaign }: VideoLaunchPageProps) => {
  const meta = campaign.metadata || {};
  const videoUrl = meta.video_url as string | undefined;
  const embedUrl = useMemo(() => toEmbedUrl(videoUrl), [videoUrl]);

  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({ "🔥": 0, "❤️": 0, "✨": 0, "👀": 0 });
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [views, setViews] = useState(0);

  useEffect(() => {
    // Simulated live view counter
    setViews(Math.floor(Math.random() * 5000) + 1200);
    const id = setInterval(() => setViews((v) => v + Math.floor(Math.random() * 3)), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!campaign.release_date) return;
    const tick = () => {
      const diff = new Date(campaign.release_date!).getTime() - Date.now();
      if (diff <= 0) return setCountdown(null);
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [campaign.release_date]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const react = (emoji: string) => {
    setReactions((r) => ({ ...r, [emoji]: (r[emoji] || 0) + 1 }));
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Cinematic vignette + film grain */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/40 to-black" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* Top bar — cinema style */}
      <header className="relative z-20 flex justify-between items-center px-6 py-4 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <img src={logo} alt="MDistro" className="w-7 h-7 rounded-lg" width={28} height={28} />
          <span className="text-xs uppercase tracking-[0.3em] font-light">Now Playing</span>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="rounded-full text-white hover:bg-white/10">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10" onClick={() => navigator.share?.({ url: window.location.href })}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Letterboxed video hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-8">
        <motion.div
          className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-950 ring-1 ring-white/10 shadow-[0_0_120px_-20px_rgba(239,68,68,0.4)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={campaign.campaign_name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {campaign.artwork_url && (
                <img src={campaign.artwork_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <Film className="relative w-16 h-16 text-red-500 opacity-80" />
              <p className="relative text-sm text-white/60 uppercase tracking-[0.3em]">Video premieres soon</p>
            </div>
          )}
        </motion.div>

        {/* Live view counter */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <motion.span
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <p className="text-xs uppercase tracking-widest text-white/60">
            {views.toLocaleString()} watching now
          </p>
        </div>
      </section>

      {/* Title block */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-10 text-center">
        <motion.p
          className="text-[11px] uppercase tracking-[0.4em] text-red-500/80 mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Music Video
        </motion.p>
        <motion.h1
          className="font-display text-4xl md:text-6xl font-black tracking-tight mb-3 bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {campaign.campaign_name}
        </motion.h1>
        <motion.p
          className="text-lg text-white/70 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {campaign.artist_name}
        </motion.p>
        {campaign.description && (
          <motion.p
            className="mt-6 text-sm text-white/50 max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {campaign.description}
          </motion.p>
        )}
      </section>

      {/* Premiere countdown */}
      {countdown && (
        <section className="relative z-10 max-w-2xl mx-auto px-6 mb-12">
          <p className="text-center text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">Premiere in</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ v: countdown.d, l: "Days" }, { v: countdown.h, l: "Hours" }, { v: countdown.m, l: "Min" }, { v: countdown.s, l: "Sec" }].map((i) => (
              <div key={i.l} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 text-center">
                <div className="font-display text-3xl md:text-4xl font-black text-white tabular-nums">{String(i.v).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{i.l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fan reactions */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 mb-12">
        <p className="text-center text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">Drop a reaction</p>
        <div className="flex justify-center gap-3">
          {REACTIONS.map((r) => (
            <motion.button
              key={r.emoji}
              onClick={() => react(r.emoji)}
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.85 }}
              className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-colors flex items-center justify-center text-2xl"
            >
              {r.emoji}
              <AnimatePresence>
                {reactions[r.emoji] > 0 && (
                  <motion.span
                    key={reactions[r.emoji]}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
                    initial={{ scale: 0, y: 0 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0 }}
                  >
                    {reactions[r.emoji]}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Share toolkit */}
      <section className="relative z-10 max-w-md mx-auto px-6 mb-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <input
            readOnly
            value={typeof window !== "undefined" ? window.location.href : ""}
            className="flex-1 bg-transparent text-xs text-white/60 truncate outline-none"
          />
          <Button onClick={handleCopy} size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </section>

      <footer className="relative z-10 py-8 text-center border-t border-white/5 mt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white/70">
          <img src={logo} alt="" className="w-3 h-3 rounded" width={12} height={12} />
          MDistro Link
        </Link>
      </footer>
    </div>
  );
};

export default VideoLaunchPage;

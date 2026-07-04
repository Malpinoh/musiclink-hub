import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Share2, Copy, Check, Music2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import AudioPreviewPlayer from "@/components/AudioPreviewPlayer";
import StreamingPlatforms from "@/components/StreamingPlatforms";

interface SongReleasePageProps {
  campaign: {
    id: string;
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
    preview_audio_url?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
    created_at?: string;
  };
}

const PLATFORMS = [
  { name: "Spotify" },
  { name: "Apple Music" },
  { name: "YouTube Music" },
  { name: "Deezer" },
  { name: "Tidal" },
  { name: "Boomplay" },
  { name: "Audiomack" },
  { name: "Amazon Music" },
];

const SongReleasePage = ({ campaign }: SongReleasePageProps) => {
  const [copied, setCopied] = useState(false);
  const [fanName, setFanName] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

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

  // Release progress: created_at -> release_date
  const progress = useMemo(() => {
    if (!campaign.release_date || !campaign.created_at) return 0;
    const start = new Date(campaign.created_at).getTime();
    const end = new Date(campaign.release_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }, [campaign.release_date, campaign.created_at]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated gradient bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.25),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.2),transparent_60%)]" />
      {campaign.artwork_url && (
        <div className="absolute inset-0 opacity-30">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-2xl" width={32} height={32} />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopy} className="rounded-2xl">
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigator.share?.({ url: window.location.href })}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center px-6 py-4 max-w-md mx-auto w-full">
          {/* Hero artwork with rotating glow */}
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
          >
            <motion.div
              className="absolute -inset-10 bg-gradient-to-tr from-primary via-accent to-primary blur-3xl rounded-full opacity-40"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            {campaign.artwork_url ? (
              <img
                src={campaign.artwork_url}
                alt={campaign.campaign_name}
                width={256}
                height={256}
                fetchPriority="high"
                className="relative w-56 h-56 md:w-64 md:h-64 rounded-3xl shadow-2xl object-cover"
              />
            ) : (
              <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-3xl bg-secondary flex items-center justify-center">
                <Music2 className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <motion.div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-xs font-bold text-primary-foreground tracking-wider">NEW SINGLE</span>
            </motion.div>
          </motion.div>

          <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">{campaign.campaign_name}</h1>
            <p className="text-lg text-muted-foreground">{campaign.artist_name}</p>
            {campaign.description && (
              <p className="text-sm text-muted-foreground/80 mt-3 italic">"{campaign.description}"</p>
            )}
          </motion.div>

          {countdown && (
            <motion.div className="mb-6 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-3">Drops in</p>
              <div className="flex justify-center gap-3">
                {[{ v: countdown.d, l: "Days" }, { v: countdown.h, l: "Hrs" }, { v: countdown.m, l: "Min" }, { v: countdown.s, l: "Sec" }].map((i) => (
                  <div key={i.l} className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 flex items-center justify-center backdrop-blur">
                      <span className="font-display text-xl font-bold text-primary tabular-nums">{String(i.v).padStart(2, "0")}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{i.l}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Release progress tracker */}
          {progress > 0 && campaign.release_date && (
            <motion.div className="w-full mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Campaign progress</span>
                <span className="text-primary font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {campaign.preview_audio_url && (
            <div className="w-full">
              <AudioPreviewPlayer
                audioUrl={campaign.preview_audio_url}
                artworkUrl={campaign.artwork_url || undefined}
                title={campaign.campaign_name}
                artist={campaign.artist_name}
              />
            </div>
          )}

          {/* Streaming platform cards */}
          <motion.div className="w-full grid grid-cols-3 gap-2 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            {PLATFORMS.map((p) => (
              <motion.div
                key={p.name}
                className={`bg-gradient-to-br ${p.color} rounded-xl p-3 text-center cursor-pointer`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <p className="text-[10px] font-bold text-white uppercase tracking-wide">{p.name}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="w-full" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {submitted ? (
              <div className="rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-sm p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">You're on the list 🎉</h3>
                <p className="text-sm text-muted-foreground">We'll notify you the moment it drops.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
                <div className="text-center">
                  <h3 className="font-display font-semibold text-lg">Get notified on release day</h3>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input placeholder="Your name" value={fanName} onChange={(e) => setFanName(e.target.value)} className="mt-1 rounded-2xl" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@email.com" value={fanEmail} onChange={(e) => setFanEmail(e.target.value)} className="mt-1 rounded-2xl" />
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    if (!fanName || !fanEmail) return toast.error("Please fill in all fields");
                    setSubmitted(true);
                    toast.success("You're on the list!");
                  }}
                >
                  <Bell className="w-4 h-4 mr-2" /> Pre-Save Now
                </Button>
              </div>
            )}
          </motion.div>
        </main>

        <footer className="p-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <img src={logo} alt="" className="w-4 h-4 rounded-lg" width={16} height={16} />
            Powered by MDistro Link
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default SongReleasePage;

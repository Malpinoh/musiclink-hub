import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Share2, Copy, Check, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const AudioPreviewPlayer = lazy(() => import("@/components/AudioPreviewPlayer"));

interface SongReleasePageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
    preview_audio_url?: string | null;
  };
}

const SongReleasePage = ({ campaign }: SongReleasePageProps) => {
  const [copied, setCopied] = useState(false);
  const [fanName, setFanName] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!campaign.release_date) return;
    const tick = () => {
      const diff = new Date(campaign.release_date!).getTime() - Date.now();
      if (diff <= 0) { setCountdown(null); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [campaign.release_date]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Centered layout with gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      {campaign.artwork_url && (
        <div className="absolute inset-0">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover opacity-10 blur-3xl scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro" className="w-8 h-8 rounded-2xl" />
          </Link>
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="rounded-2xl">
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

        {/* Centered single-column layout */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto w-full">
          {/* Hero artwork with strong glow */}
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="absolute -inset-8 bg-gradient-to-r from-primary/40 to-accent/40 blur-3xl rounded-full opacity-50 animate-pulse-glow" />
            {campaign.artwork_url ? (
              <img src={campaign.artwork_url} alt={campaign.campaign_name} className="relative w-56 h-56 md:w-64 md:h-64 rounded-2xl shadow-2xl object-cover" />
            ) : (
              <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-2xl bg-secondary flex items-center justify-center">
                <Music2 className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full">
              <span className="text-xs font-bold text-primary-foreground">PRE-SAVE</span>
            </div>
          </motion.div>

          {/* Track info */}
          <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">{campaign.campaign_name}</h1>
            <p className="text-lg text-muted-foreground">{campaign.artist_name}</p>
          </motion.div>

          {/* Countdown */}
          {countdown && (
            <motion.div className="mb-6 w-full" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-3">Drops in</p>
              <div className="flex justify-center gap-4">
                {[{ v: countdown.days, l: "Days" }, { v: countdown.hours, l: "Hours" }, { v: countdown.minutes, l: "Min" }].map((i) => (
                  <div key={i.l} className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center">
                      <span className="font-display text-2xl font-bold text-primary">{i.v}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{i.l}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Audio Preview — lazy loaded */}
          {campaign.preview_audio_url && (
            <Suspense fallback={<Skeleton className="h-20 w-full rounded-2xl mt-4" />}>
              <AudioPreviewPlayer audioUrl={campaign.preview_audio_url} />
            </Suspense>
          )}

          {/* Strong CTA / Fan form */}
          <motion.div className="w-full mt-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {submitted ? (
              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">You're on the list! 🎉</h3>
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
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full animate-pulse-glow rounded-2xl"
                    onClick={() => {
                      if (!fanName || !fanEmail) { toast.error("Please fill in all fields"); return; }
                      setSubmitted(true);
                      toast.success("You're on the list!");
                    }}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Pre-Save Now
                  </Button>
                </motion.div>
              </div>
            )}
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

export default SongReleasePage;

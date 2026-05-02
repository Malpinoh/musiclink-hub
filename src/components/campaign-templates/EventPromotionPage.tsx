import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Ticket, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

interface EventPromotionPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
  };
}

const EventPromotionPage = ({ campaign }: EventPromotionPageProps) => {
  const [copied, setCopied] = useState(false);
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

  const formatDate = (d: string | null) => {
    if (!d) return "TBD";
    return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Poster-style bg */}
      {campaign.artwork_url && (
        <div className="absolute inset-0">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
        </div>
      )}
      {!campaign.artwork_url && <div className="absolute inset-0 bg-gradient-to-br from-background to-secondary" />}

      <div className="relative z-10 min-h-screen flex flex-col text-white">
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

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
          {/* Event title */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Live Event</p>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">{campaign.campaign_name}</h1>
            <p className="text-xl text-white/70">{campaign.artist_name}</p>
          </motion.div>

          {/* Details */}
          <motion.div
            className="w-full space-y-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {[
              { icon: Calendar, label: formatDate(campaign.release_date) },
              { icon: Clock, label: "Doors open at 7:00 PM" },
              { icon: MapPin, label: "Venue details coming soon" },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Countdown */}
          {countdown && (
            <motion.div className="mb-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Event starts in</p>
              <div className="flex justify-center gap-4">
                {[{ v: countdown.days, l: "Days" }, { v: countdown.hours, l: "Hours" }, { v: countdown.minutes, l: "Min" }].map((i) => (
                  <div key={i.l} className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <span className="font-display text-2xl font-bold">{i.v}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/50 mt-1">{i.l}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-6 rounded-2xl glow-effect"
              >
                <Ticket className="w-5 h-5 mr-2" />
                Get Tickets
              </Button>
            </motion.div>
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

export default EventPromotionPage;

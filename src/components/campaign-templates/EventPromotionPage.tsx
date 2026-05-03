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
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!campaign.release_date) return;
    const tick = () => {
      const diff = new Date(campaign.release_date!).getTime() - Date.now();
      if (diff <= 0) { setCountdown(null); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
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

  const formatDate = (d: string | null) => {
    if (!d) return "TBD";
    return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  return (
    // POSTER-STYLE layout — event info first, CTA at bottom
    <div className="min-h-screen relative overflow-hidden">
      {/* Full poster background */}
      {campaign.artwork_url ? (
        <div className="fixed inset-0">
          <img src={campaign.artwork_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/95" />
        </div>
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-black" />
      )}

      <div className="relative z-10 min-h-screen flex flex-col text-white">
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

        <main className="flex-1 flex flex-col justify-between px-6 py-8 max-w-lg mx-auto w-full">
          {/* EVENT INFO FIRST — poster style */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div className="text-center mb-10" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 150 }}>
              <motion.p
                className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Live Event
              </motion.p>
              <h1 className="font-display text-4xl md:text-6xl font-black mb-4 leading-[1.1]">{campaign.campaign_name}</h1>
              <p className="text-2xl text-white/60 font-light">{campaign.artist_name}</p>
            </motion.div>

            {/* Event details — stacked info cards */}
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
                  className="flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.1 }}
                  whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Countdown with seconds */}
            {countdown && (
              <motion.div className="text-center mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Event starts in</p>
                <div className="flex justify-center gap-3">
                  {[
                    { v: countdown.days, l: "Days" },
                    { v: countdown.hours, l: "Hours" },
                    { v: countdown.minutes, l: "Min" },
                    { v: countdown.seconds, l: "Sec" },
                  ].map((i) => (
                    <div key={i.l} className="flex flex-col items-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                        <span className="font-display text-xl md:text-2xl font-bold">{i.v}</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 mt-1">{i.l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* CTA SECOND — at the bottom */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-7 rounded-2xl"
              >
                <Ticket className="w-5 h-5 mr-2" />
                Get Tickets
              </Button>
            </motion.div>
          </motion.div>
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

export default EventPromotionPage;

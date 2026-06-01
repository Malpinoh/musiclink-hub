import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Ticket, Copy, Check, Share2, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

interface EventPromotionPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
  };
}

const EventPromotionPage = ({ campaign }: EventPromotionPageProps) => {
  const meta = campaign.metadata || {};
  const venue = meta.venue as string | undefined;
  const city = meta.city as string | undefined;
  const ticketUrl = meta.ticket_url as string | undefined;
  const eventName = (meta.event_name as string) || campaign.campaign_name;
  const lineup: string[] = Array.isArray(meta.lineup) ? meta.lineup : [];
  const schedule: { time: string; item: string }[] = Array.isArray(meta.schedule) ? meta.schedule : [];

  const address = [venue, city].filter(Boolean).join(", ");
  const mapEmbed = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  const [copied, setCopied] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [rsvpDone, setRsvpDone] = useState(false);
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

  const eventDate = useMemo(() => {
    if (!campaign.release_date) return null;
    const d = new Date(campaign.release_date);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "long" }),
      date: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  }, [campaign.release_date]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-950 via-purple-950 to-indigo-950 text-white">
      {/* Poster header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100">
          <img src={logo} alt="MDistro" className="w-7 h-7 rounded-lg" width={28} height={28} />
          <span className="text-[10px] uppercase tracking-[0.3em]">Live Event</span>
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

      {/* Concert poster hero */}
      <section className="relative px-6 py-10 md:py-16 max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_20px_80px_-20px_rgba(236,72,153,0.5)]">
          {campaign.artwork_url && (
            <>
              <img
                src={campaign.artwork_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-fuchsia-900/40 to-black/80" />
            </>
          )}
          {!campaign.artwork_url && (
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600" />
          )}

          <div className="relative p-8 md:p-14 min-h-[420px] flex flex-col justify-end">
            <motion.p
              className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-fuchsia-300 mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Live in Concert
            </motion.p>
            <motion.h1
              className="font-display text-4xl md:text-7xl font-black uppercase leading-[0.9] tracking-tight mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
            >
              {eventName}
            </motion.h1>
            <motion.p
              className="font-display text-xl md:text-2xl text-white/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {campaign.artist_name}
            </motion.p>

            {eventDate && (
              <motion.div
                className="mt-8 flex flex-wrap gap-4 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-fuchsia-300" /> {eventDate.date}</span>
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-fuchsia-300" /> {eventDate.time}</span>
                {venue && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-fuchsia-300" /> {venue}</span>}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Countdown */}
      {countdown && (
        <section className="max-w-3xl mx-auto px-6 mb-12">
          <p className="text-center text-[11px] uppercase tracking-[0.4em] text-fuchsia-300/70 mb-4">Doors open in</p>
          <div className="grid grid-cols-4 gap-3">
            {[{ v: countdown.d, l: "Days" }, { v: countdown.h, l: "Hours" }, { v: countdown.m, l: "Min" }, { v: countdown.s, l: "Sec" }].map((i) => (
              <div key={i.l} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 text-center">
                <div className="font-display text-3xl md:text-5xl font-black tabular-nums bg-gradient-to-b from-white to-fuchsia-300 bg-clip-text text-transparent">{String(i.v).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60 mt-1">{i.l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ticket CTA */}
      {ticketUrl && (
        <section className="max-w-2xl mx-auto px-6 mb-12">
          <motion.a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="block bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-center font-display text-2xl font-black uppercase tracking-wide py-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(236,72,153,0.6)]"
          >
            <Ticket className="inline w-6 h-6 mr-2" /> Buy Tickets
          </motion.a>
        </section>
      )}

      {/* Two-column: venue map + lineup */}
      <section className="max-w-5xl mx-auto px-6 mb-12 grid md:grid-cols-2 gap-6">
        {mapEmbed && (
          <div className="rounded-2xl overflow-hidden border border-white/20 bg-white/5">
            <div className="aspect-video">
              <iframe
                src={mapEmbed}
                title="Venue map"
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-fuchsia-300/70 mb-1">Venue</p>
              <p className="font-semibold">{venue}</p>
              {city && <p className="text-sm text-white/60">{city}</p>}
            </div>
          </div>
        )}

        {lineup.length > 0 && (
          <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-300/70 mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> Lineup</p>
            <ul className="space-y-3">
              {lineup.map((a, i) => (
                <li key={i} className="font-display text-xl md:text-2xl font-bold">{a}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Schedule */}
      {schedule.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 mb-12">
          <p className="text-[11px] uppercase tracking-[0.4em] text-fuchsia-300/70 mb-4">Schedule</p>
          <div className="rounded-2xl border border-white/20 bg-white/5 divide-y divide-white/10">
            {schedule.map((s, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <span className="font-display font-bold text-fuchsia-300 tabular-nums w-20">{s.time}</span>
                <span>{s.item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {campaign.description && (
        <section className="max-w-2xl mx-auto px-6 mb-12 text-center">
          <p className="text-white/80 leading-relaxed">{campaign.description}</p>
        </section>
      )}

      {/* RSVP */}
      <section className="max-w-md mx-auto px-6 mb-16">
        {rsvpDone ? (
          <div className="rounded-2xl border border-fuchsia-400/40 bg-white/10 p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-fuchsia-500/30 flex items-center justify-center mb-3">
              <Check className="w-7 h-7 text-fuchsia-200" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1">You're on the guest list</h3>
            <p className="text-sm text-white/60">We'll send event updates to your email.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold text-center">RSVP for updates</h3>
            <div>
              <Label className="text-white/70">Name</Label>
              <Input value={rsvpName} onChange={(e) => setRsvpName(e.target.value)} placeholder="Your name" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
            </div>
            <div>
              <Label className="text-white/70">Email</Label>
              <Input type="email" value={rsvpEmail} onChange={(e) => setRsvpEmail(e.target.value)} placeholder="you@email.com" className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 rounded-xl font-bold"
              onClick={() => {
                if (!rsvpName || !rsvpEmail) return toast.error("Please fill in all fields");
                setRsvpDone(true);
                toast.success("RSVP confirmed!");
              }}
            >
              <Mail className="w-4 h-4 mr-2" /> Confirm RSVP
            </Button>
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 py-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white/70">
          <img src={logo} alt="" className="w-3 h-3 rounded" width={12} height={12} />
          MDistro Link
        </Link>
      </footer>
    </div>
  );
};

export default EventPromotionPage;

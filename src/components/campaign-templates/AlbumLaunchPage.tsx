import { useState } from "react";
import { motion } from "framer-motion";
import { Disc3, Copy, Check, Share2, Music, Play, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import StreamingPlatforms from "@/components/StreamingPlatforms";

interface AlbumLaunchPageProps {
  campaign: {
    campaign_name: string;
    artist_name: string;
    artwork_url: string | null;
    release_date: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
  };
}

const STREAM_PLATFORMS = [
  { name: "Spotify", color: "bg-emerald-600" },
  { name: "Apple Music", color: "bg-rose-500" },
  { name: "Boomplay", color: "bg-amber-500" },
  { name: "Audiomack", color: "bg-orange-500" },
  { name: "YouTube Music", color: "bg-red-600" },
  { name: "Deezer", color: "bg-fuchsia-600" },
];

const AlbumLaunchPage = ({ campaign }: AlbumLaunchPageProps) => {
  const meta = campaign.metadata || {};
  const totalTracks = Number(meta.total_tracks) || 0;
  const label = meta.label as string | undefined;
  const albumTitle = (meta.album_title as string) || campaign.campaign_name;
  const tracklist: string[] = Array.isArray(meta.tracklist) ? meta.tracklist : [];
  const collaborators: string[] = Array.isArray(meta.collaborators) ? meta.collaborators : [];
  const credits = meta.credits as string | undefined;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const releaseDateStr = campaign.release_date
    ? new Date(campaign.release_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "TBA";

  return (
    <div className="min-h-screen bg-[#0a0908] text-amber-50">
      {/* Editorial magazine layout */}
      <header className="border-b border-amber-50/10 px-6 md:px-12 py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100">
          <img src={logo} alt="MDistro" className="w-7 h-7 rounded-lg" width={28} height={28} />
          <span className="text-[10px] uppercase tracking-[0.3em] font-serif italic">Album Edition</span>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="text-amber-50 hover:bg-amber-50/10 rounded-full">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-amber-50 hover:bg-amber-50/10 rounded-full" onClick={() => navigator.share?.({ url: window.location.href })}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Magazine masthead */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-12 gap-8 md:gap-12 items-center">
        <motion.div
          className="md:col-span-5 relative"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full" />
          {campaign.artwork_url ? (
            <img
              src={campaign.artwork_url}
              alt={albumTitle}
              width={520}
              height={520}
              fetchPriority="high"
              className="relative w-full aspect-square object-cover rounded-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-amber-50/10"
            />
          ) : (
            <div className="relative w-full aspect-square bg-zinc-900 rounded-sm flex items-center justify-center">
              <Disc3 className="w-20 h-20 text-amber-50/30" />
            </div>
          )}
        </motion.div>

        <motion.div
          className="md:col-span-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="font-serif italic text-amber-500/80 text-sm tracking-wide mb-3">{meta.template_type === "album_launch" ? "An album by" : "A release by"}</p>
          <p className="font-display text-2xl text-amber-50/80 mb-4">{campaign.artist_name}</p>
          <h1 className="font-display text-5xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6 text-amber-50">
            {albumTitle}
          </h1>
          <div className="h-px w-24 bg-amber-500 mb-6" />
          <div className="grid grid-cols-3 gap-4 max-w-md text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-50/40 mb-1">Release</p>
              <p className="font-serif">{releaseDateStr}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-50/40 mb-1">Tracks</p>
              <p className="font-serif">{totalTracks || tracklist.length || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-50/40 mb-1">Label</p>
              <p className="font-serif">{label || "Independent"}</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Album story */}
      {campaign.description && (
        <section className="max-w-3xl mx-auto px-6 md:px-12 py-12 border-t border-amber-50/10">
          <p className="text-[11px] uppercase tracking-[0.4em] text-amber-500 mb-4">The Story</p>
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-amber-50/90 first-letter:text-5xl first-letter:font-bold first-letter:mr-2 first-letter:float-left first-letter:leading-none first-letter:text-amber-500">
            {campaign.description}
          </p>
        </section>
      )}

      {/* Tracklist */}
      <section className="max-w-4xl mx-auto px-6 md:px-12 py-12 border-t border-amber-50/10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-3xl font-bold">Tracklist</h2>
          <p className="text-xs uppercase tracking-widest text-amber-50/40">{tracklist.length || totalTracks} Tracks</p>
        </div>
        {tracklist.length > 0 ? (
          <ol className="divide-y divide-amber-50/10">
            {tracklist.map((track, i) => (
              <motion.li
                key={i}
                className="py-4 flex items-center gap-4 group cursor-default"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="font-display text-2xl font-bold text-amber-500/60 tabular-nums w-10">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 font-serif text-lg">{track}</span>
                <Play className="w-4 h-4 text-amber-50/30 group-hover:text-amber-500 transition-colors" />
              </motion.li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-amber-50/50 font-serif italic">Tracklist revealed on release day.</p>
        )}
      </section>

      {/* Credits + Collaborators */}
      {(credits || collaborators.length > 0) && (
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-12 border-t border-amber-50/10 grid md:grid-cols-2 gap-12">
          {collaborators.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-amber-500 mb-4 flex items-center gap-2"><Users className="w-3 h-3" /> Featured</p>
              <ul className="space-y-2 font-serif text-lg">
                {collaborators.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {credits && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-amber-500 mb-4 flex items-center gap-2"><Award className="w-3 h-3" /> Credits</p>
              <p className="font-serif text-sm leading-relaxed text-amber-50/70 whitespace-pre-line">{credits}</p>
            </div>
          )}
        </section>
      )}

      {/* Streaming platforms */}
      <section className="max-w-4xl mx-auto px-6 md:px-12 py-12 border-t border-amber-50/10">
        <p className="text-[11px] uppercase tracking-[0.4em] text-amber-500 mb-6 text-center">Listen on every platform</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STREAM_PLATFORMS.map((p) => (
            <motion.button
              key={p.name}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`${p.color} text-white rounded-sm py-4 font-display font-bold tracking-wide uppercase text-sm`}
            >
              {p.name}
            </motion.button>
          ))}
        </div>
      </section>

      <footer className="border-t border-amber-50/10 py-8 text-center mt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-50/30 hover:text-amber-50/60 font-serif italic">
          <img src={logo} alt="" className="w-3 h-3 rounded" width={12} height={12} />
          MDistro Link Editorial
        </Link>
      </footer>
    </div>
  );
};

export default AlbumLaunchPage;

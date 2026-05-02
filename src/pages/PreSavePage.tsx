import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Bell, Loader2, Calendar, Share2, Copy, Check, Mail, User, Disc3 } from "lucide-react";
import AudioPreviewPlayer from "@/components/AudioPreviewPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import demoArtwork from "@/assets/demo-artwork.jpg";
import SEOHead from "@/components/SEOHead";
import { getShareablePresaveUrl } from "@/lib/shareUrl";
import logo from "@/assets/logo.png";

interface PreSaveData {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  spotify_uri: string | null;
  spotify_album_id: string | null;
  spotify_artist_id: string | null;
  album_title: string | null;
  is_released: boolean;
  apple_music_url: string | null;
  description: string | null;
  slug: string;
  artist_slug: string;
  preview_audio_url: string | null;
}

/**
 * Resolves a combined slug like "artist-name-song-title" to artist_slug and slug
 * by querying active pre-saves.
 */
const useCombinedSlugLookup = (combinedSlug: string | undefined) => {
  const [resolved, setResolved] = useState<{ artist: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(!!combinedSlug);

  useEffect(() => {
    if (!combinedSlug) return;
    (async () => {
      const { data } = await supabase
        .from("pre_saves")
        .select("artist_slug, slug")
        .eq("is_active", true);
      
      if (!data || data.length === 0) { setLoading(false); return; }

      let match = data.find((ps) => `${ps.artist_slug}-${ps.slug}` === combinedSlug);
      if (!match) match = data.find((ps) => ps.slug === combinedSlug);
      if (!match) {
        match = data.find((ps) => {
          const prefix = ps.artist_slug + "-";
          return combinedSlug.startsWith(prefix) && combinedSlug.slice(prefix.length) === ps.slug;
        });
      }

      if (match) setResolved({ artist: match.artist_slug, slug: match.slug });
      setLoading(false);
    })();
  }, [combinedSlug]);

  return { resolved, loading };
};

const PreSaveCampaignPage = () => {
  const { slug: combinedSlug } = useParams<{ slug: string }>();
  const { resolved, loading: resolving } = useCombinedSlugLookup(combinedSlug);

  if (resolving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-muted-foreground mb-6">This pre-save link doesn't exist.</p>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  return <PreSaveContent artistParam={resolved.artist} slugParam={resolved.slug} />;
};

export { PreSaveContent };
export default PreSaveCampaignPage;

function PreSaveContent({ artistParam, slugParam }: { artistParam?: string; slugParam?: string }) {
  const routeParams = useParams<{ artist: string; slug: string }>();
  const navigate = useNavigate();
  const artist = artistParam || routeParams.artist;
  const slug = slugParam || routeParams.slug;

  const [loading, setLoading] = useState(true);
  const [preSave, setPreSave] = useState<PreSaveData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fan form
  const [fanName, setFanName] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [spotifyEmail, setSpotifyEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareableUrl = artist && slug ? getShareablePresaveUrl(artist, slug) : currentUrl;

  useEffect(() => {
    if (!artist || !slug) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("pre_saves")
          .select("*")
          .eq("artist_slug", artist)
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        if (!data) { setNotFound(true); return; }
        // If released, redirect to listen page
        if (data.is_released) {
          navigate(`/listen/${data.artist_slug}-${data.slug}`, { replace: true });
          return;
        }
        setPreSave(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [artist, slug]);

  const handleFanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preSave || !fanName.trim() || !fanEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fanEmail.trim())) { toast.error("Please enter a valid email"); return; }
    if (spotifyEmail.trim() && !emailRegex.test(spotifyEmail.trim())) { toast.error("Please enter a valid Spotify email"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("presave_fans").insert({
        pre_save_id: preSave.id,
        name: fanName.trim(),
        email: fanEmail.trim().toLowerCase(),
        spotify_email: spotifyEmail.trim().toLowerCase() || null,
      });

      if (error) {
        if (error.code === "23505") { toast.info("You're already signed up!"); setSubmitted(true); return; }
        throw error;
      }
      trackEvent("fan_collected", { pre_save_id: preSave.id });
      setSubmitted(true);
      toast.success("You're on the list! We'll notify you when it drops.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCountdown = () => {
    if (!preSave?.release_date) return null;
    const diff = new Date(preSave.release_date).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
    };
  };

  const formatReleaseDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    trackEvent("share_clicked", { type: "presave", pre_save_id: preSave?.id });
    if (navigator.share && preSave) {
      try { await navigator.share({ title: `${preSave.title} by ${preSave.artist}`, text: `${preSave.title} is dropping soon!`, url: shareableUrl }); } catch { handleCopyLink(); }
    } else { handleCopyLink(); }
  };

  const countdown = preSave ? getCountdown() : null;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (notFound || !preSave) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Pre-Save Not Found</h1>
        <p className="text-muted-foreground mb-6">This pre-save link doesn't exist or has been removed.</p>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead title={preSave.title} artist={preSave.artist} imageUrl={preSave.artwork_url || undefined} pageUrl={currentUrl} albumTitle={preSave.album_title || undefined} type="presave" />

      <div className="absolute inset-0 z-0">
        <img src={preSave.artwork_url || demoArtwork} alt="" className="w-full h-full object-cover opacity-20 blur-3xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro Link" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-semibold text-sm">MDistro Link</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}><Share2 className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={handleCopyLink}>{copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}</Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <motion.div className="w-full max-w-md mx-auto text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Artwork */}
            <motion.div className="relative mb-8" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl rounded-full opacity-50 animate-pulse-glow" />
              <img src={preSave.artwork_url || demoArtwork} alt={`${preSave.title} artwork`} className="relative w-56 h-56 md:w-64 md:h-64 mx-auto rounded-2xl shadow-2xl object-cover" />
              {!preSave.is_released && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full">
                  <span className="text-xs font-semibold text-primary-foreground">PRE-SAVE</span>
                </div>
              )}
            </motion.div>

            {/* Audio Preview */}
            {preSave.preview_audio_url && (
              <AudioPreviewPlayer audioUrl={preSave.preview_audio_url} />
            )}


            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{preSave.title}</h1>
              <p className="text-lg text-muted-foreground">{preSave.artist}</p>
              {preSave.description && <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">{preSave.description}</p>}
              {preSave.release_date && !preSave.is_released && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Dropping {formatReleaseDate(preSave.release_date)}</span>
                </div>
              )}
            </motion.div>

            {/* Countdown */}
            {countdown && !preSave.is_released && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="mb-8">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Drops in</p>
                <div className="flex justify-center gap-4">
                  {[{ value: countdown.days, label: "Days" }, { value: countdown.hours, label: "Hours" }, { value: countdown.minutes, label: "Min" }].map((item) => (
                    <div key={item.label} className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-xl bg-secondary/80 border border-border/50 flex items-center justify-center">
                        <span className="font-display text-2xl font-bold text-primary">{item.value}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Fan Notification Form */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {submitted ? (
                <div className="glass-card p-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">You're on the list! 🎉</h3>
                  <p className="text-sm text-muted-foreground">We'll send you a notification as soon as <strong>{preSave.title}</strong> drops.</p>
                </div>
              ) : (
                <form onSubmit={handleFanSubmit} className="glass-card p-6 text-left space-y-4">
                  <div className="text-center mb-2">
                    <h3 className="font-display font-semibold text-lg">Get notified when it drops</h3>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to listen on release day</p>
                  </div>
                  <div>
                    <Label htmlFor="fan-name" className="flex items-center gap-1.5 mb-1"><User className="w-3.5 h-3.5" /> Name</Label>
                    <Input id="fan-name" placeholder="Your name" value={fanName} onChange={(e) => setFanName(e.target.value)} required maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="fan-email" className="flex items-center gap-1.5 mb-1"><Mail className="w-3.5 h-3.5" /> Email</Label>
                    <Input id="fan-email" type="email" placeholder="you@email.com" value={fanEmail} onChange={(e) => setFanEmail(e.target.value)} required maxLength={255} />
                  </div>
                  <div>
                    <Label htmlFor="spotify-email" className="flex items-center gap-1.5 mb-1"><Disc3 className="w-3.5 h-3.5" /> Spotify Email (optional)</Label>
                    <Input id="spotify-email" type="email" placeholder="your-spotify@email.com" value={spotifyEmail} onChange={(e) => setSpotifyEmail(e.target.value)} maxLength={255} />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                    Notify me when it drops
                  </Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        </main>

        <footer className="p-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <img src={logo} alt="MDistro Link" className="w-4 h-4 rounded" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}

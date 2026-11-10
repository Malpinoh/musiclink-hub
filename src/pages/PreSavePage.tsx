import { getCurrentShareUrl, PUBLIC_SITE_URL } from "@/lib/shareUrl";
import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Bell, Loader2, Calendar, Share2, Copy, Check, Mail, User, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { logApiError } from "@/lib/apiLogger";
import AudioPreviewPlayer from "@/components/AudioPreviewPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import demoArtwork from "@/assets/demo-artwork.jpg";
import MetaTags from "@/components/MetaTags";
import { buildPresaveMeta } from "@/lib/seoMeta";
import { getShareablePresaveUrl } from "@/lib/shareUrl";
import logo from "@/assets/logo.png";
import { buildSpotifyAuthorizeUrl, getPresaveRedirectUri } from "@/lib/spotifyAuth";
import HouseAdSlot from "@/components/HouseAdSlot";
import { RetargetingPixels } from "@/components/RetargetingPixels";
import { SpotifyIcon, AppleMusicIcon, YouTubeIcon, DeezerIcon } from "@/components/icons/PlatformIcons";

interface PreSaveData {
  id: string;
  user_id: string;
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
  preview_start: number | null;
  preview_end: number | null;
  waveform_data: number[] | null;
  theme_bg_color?: string | null;
  theme_text_color?: string | null;
  theme_accent_color?: string | null;
  theme_button_color?: string | null;
  theme_button_text_color?: string | null;
  theme_font_family?: string | null;
  theme_bg_image_url?: string | null;
  theme_hero_image_url?: string | null;
  theme_cta_text?: string | null;
  theme_countdown_enabled?: boolean | null;
  theme_layout?: string | null;
  meta_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  google_analytics_id?: string | null;
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
  const [platformLinks, setPlatformLinks] = useState<Array<{ id: string; platform_name: string; platform_url: string; action_type: "presave" | "preadd" | "listen" | "notify" }>>([]);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fan form
  const [fanName, setFanName] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [futureEmail, setFutureEmail] = useState("");
  const [futureConsent, setFutureConsent] = useState(false);
  const [futureSubmitting, setFutureSubmitting] = useState(false);
  const [futureSubscribed, setFutureSubscribed] = useState(false);
  // Persist the completed Spotify pre-save state on this browser across reloads.
  const [spotifyPresaved, setSpotifyPresaved] = useState(false);
  // Debug / error surfacing for the Spotify pre-save flow.
  const [failureStep, setFailureStep] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [failureDetail, setFailureDetail] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const debugEnabled =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).has("debug") ||
      window.location.hostname.includes("lovable.app"));

  const currentUrl = getCurrentShareUrl();
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
        // Once the release is live, send visitors to its fan link.
        const dropped = data.release_date && new Date(data.release_date).getTime() <= Date.now();
        if (data.is_released || (dropped && data.target_fanlink_id)) {
          navigate(`/listen/${data.artist_slug}-${data.slug}`, { replace: true });
          return;
        }

        try {
          setSpotifyPresaved(localStorage.getItem(`mdistro_presaved_${data.id}`) === "true");
        } catch {
          // Storage can be unavailable in private browsing; the page still works.
        }
        setPreSave({
          ...data,
          waveform_data: Array.isArray(data.waveform_data) ? data.waveform_data as number[] : null,
        });

        // Campaign destinations are not the same as released fanlink destinations.
        const { data: destinations, error: destinationsError } = await supabase
          .from("presave_streaming_links")
          .select("id, platform_name, platform_url, action_type")
          .eq("pre_save_id", data.id)
          .order("display_order");
        if (destinationsError) {
          // A campaign must remain viewable even if the optional DSP-action
          // migration has not reached the database yet.
          console.warn("Could not load optional pre-save DSP destinations:", destinationsError);
          setPlatformLinks([]);
        } else {
          setPlatformLinks((destinations || []).map((item) => ({
            ...item,
            action_type: item.action_type || "listen",
          })));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [artist, slug]);

  // Count one pre-save landing-page visit per browser session.
  useEffect(() => {
    if (!preSave) return;
    try {
      const key = "mdistro_presave_visitor_" + preSave.id;
      let visitorId = sessionStorage.getItem(key);
      if (!visitorId) { visitorId = crypto.randomUUID(); sessionStorage.setItem(key, visitorId); }
      void supabase.from("presave_page_views").upsert({ pre_save_id: preSave.id, visitor_id: visitorId }, { onConflict: "pre_save_id,visitor_id", ignoreDuplicates: true });
    } catch (error) { console.warn("Could not record pre-save page view", error); }
  }, [preSave]);

  const handleFutureArtistUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preSave || !futureConsent || !emailRegex.test(futureEmail.trim())) { toast.error("Enter a valid email and tick the consent box to subscribe."); return; }
    setFutureSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("subscribe-artist-updates", { body: { preSaveId: preSave.id, email: futureEmail.trim().toLowerCase(), name: fanName.trim() } });
      if (error) throw error;
      setFutureSubscribed(true);
      toast.success("You are subscribed to this artist’s future release updates.");
    } catch (error) { console.error("Artist email subscription failed", error); toast.error("We could not subscribe you. Please try again."); }
    finally { setFutureSubmitting(false); }
  };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validateForm = (): boolean => {
    if (!fanName.trim()) { toast.error("Please enter your name"); return false; }
    if (!emailRegex.test(fanEmail.trim())) { toast.error("Please enter a valid email"); return false; }
    return true;
  };
  // Email is optional for Spotify pre-save; only validate if the fan typed one.
  const validateOptional = (): boolean => {
    const e = fanEmail.trim();
    if (e && !emailRegex.test(e)) { toast.error("Please enter a valid email or leave it empty"); return false; }
    return true;
  };

  const recordFailure = (step: string, message: string, detail: Record<string, unknown> = {}) => {
    setFailureStep(step);
    setFailureMessage(message);
    setFailureDetail(detail);
    setShowDebug(true);
  };

  const clearFailure = () => {
    setFailureStep(null);
    setFailureMessage(null);
    setFailureDetail(null);
  };

  // Insert fan signup, return fan id. Routes through the edge function so we
  // get a uniform error surface (including server-side api_logs entries).
  const upsertFan = (preSaveId: string) => upsertFanWith(preSaveId, fanName.trim());
  const upsertFanWith = async (preSaveId: string, name: string): Promise<string | null> => {
    const email = fanEmail.trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke("create-presave-fan", {
      body: { preSaveId, name, email },
    });
    if (error) {
      const payload = (data as { error?: string; step?: string } | null) ?? null;
      const step = payload?.step ?? "fan_invoke_failed";
      const message = payload?.error ?? error.message ?? "Fan signup request failed";
      recordFailure(step, message, { invokeError: error.message, response: payload });
      await logApiError({
        category: "presave_fan_upsert",
        step,
        message,
        preSaveId,
        context: { invokeError: error.message, response: payload },
      });
      throw new Error(message);
    }
    const fanId = (data as { fanId?: string } | null)?.fanId ?? null;
    if (!fanId) {
      const payload = data as { error?: string; step?: string } | null;
      const step = payload?.step ?? "fan_no_id";
      const message = payload?.error ?? "Fan signup did not return an id";
      recordFailure(step, message, { response: payload });
      await logApiError({
        category: "presave_fan_upsert",
        step,
        message,
        preSaveId,
        context: { response: payload },
      });
      throw new Error(message);
    }
    return fanId;
  };

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preSave || !validateForm()) return;
    setSubmitting(true);
    clearFailure();
    try {
      const fanId = await upsertFan(preSave.id);
      if (!fanId) throw new Error("Could not create signup");
      trackEvent("fan_collected", { pre_save_id: preSave.id });
      setSubmitted(true);
      toast.success("You're on the list! We'll notify you when it drops.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpotifyPresave = async () => {
    if (!preSave || !validateOptional()) return;
    setSubmitting(true);
    clearFailure();
    try {
      let fanId: string | null = null;
      if (fanEmail.trim()) {
        if (!fanName.trim()) setFanName(fanEmail.split("@")[0]);
        fanId = await upsertFanWith(preSave.id, fanName.trim() || fanEmail.split("@")[0]).catch(() => null);
        if (fanId) trackEvent("fan_collected", { pre_save_id: preSave.id });
      }
      trackEvent("spotify_presave_started", { pre_save_id: preSave.id });

      const redirectUri = getPresaveRedirectUri();
      const authorizeUrl = await buildSpotifyAuthorizeUrl({
        preSaveId: preSave.id,
        fanId,
        action: "save_and_follow",
        redirectUri,
        returnUrl: window.location.pathname,
      });
      if (!authorizeUrl) {
        const step = "spotify_client_id_missing";
        const message = "Spotify client id is not configured for this environment.";
        recordFailure(step, message, { redirectUri, origin: window.location.origin });
        await logApiError({
          category: "spotify_config",
          step,
          message,
          preSaveId: preSave.id,
          fanId,
          context: { redirectUri, origin: window.location.origin },
        });
        toast.error("Spotify integration is not configured.");
        return;
      }
      sessionStorage.setItem(
        `presave_fan_${preSave.id}`,
        JSON.stringify({ fanId, name: fanName.trim(), email: fanEmail.trim().toLowerCase() }),
      );
      window.location.href = authorizeUrl;
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Could not start Spotify pre-save.";
      // recordFailure was already called inside upsertFan for the fan path;
      // ensure we surface something for unexpected errors too.
      if (!failureStep) {
        recordFailure("spotify_presave_unknown", message, {});
        await logApiError({
          category: "spotify_oauth",
          step: "spotify_presave_unknown",
          message,
          preSaveId: preSave.id,
          context: { origin: window.location.origin },
        });
      }
      toast.error("Could not start Spotify pre-save.");
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

  if (loading) return (
    <div className="min-h-screen bg-background px-3 pt-3">
      <div className="mx-auto w-full max-w-md"><HouseAdSlot reserveSpace /></div>
      <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </div>
  );

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
    <div
      className="mdistro-presave-page min-h-screen bg-background relative overflow-hidden"
      style={{
        backgroundColor: preSave.theme_bg_color || undefined,
        color: preSave.theme_text_color || undefined,
        fontFamily: preSave.theme_font_family || undefined,
      }}
    >
      <RetargetingPixels
        metaPixelId={preSave.meta_pixel_id}
        tiktokPixelId={preSave.tiktok_pixel_id}
        googleAnalyticsId={preSave.google_analytics_id}
      />
      <MetaTags
        meta={buildPresaveMeta({
          title: preSave.title,
          artist: preSave.artist,
          artistSlug: preSave.artist_slug,
          slug: preSave.slug,
          artworkUrl: preSave.artwork_url,
          heroImageUrl: preSave.theme_hero_image_url,
          albumTitle: preSave.album_title,
          releaseDate: preSave.release_date,
          description: preSave.description,
          isReleased: preSave.is_released,
        })}
      />

      <div className="absolute inset-0 z-0">
        <img
          src={preSave.theme_bg_image_url || preSave.artwork_url || demoArtwork}
          alt=""
          className={preSave.theme_bg_image_url ? "w-full h-full object-cover opacity-40" : "w-full h-full object-cover opacity-20 blur-3xl scale-110"}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/90 to-background" />
        {!preSave.theme_bg_color && <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-mesh)" }} />}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
          <motion.div
            className="w-full max-w-[390px] mx-auto text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative mx-auto mb-5 w-[min(78vw,190px)] aspect-square">
              <div className="absolute -inset-8 rounded-full bg-cyan-400/15 blur-3xl" />
              <img
                src={preSave.theme_hero_image_url || preSave.artwork_url || demoArtwork}
                alt={`${preSave.title} artwork`}
                className="relative z-10 h-full w-full rounded-[1.35rem] object-cover shadow-[0_22px_65px_rgba(0,0,0,.48)] ring-1 ring-white/20"
              />
            </div>

            <h1 className="font-display text-2xl sm:text-[1.8rem] font-extrabold tracking-tight leading-tight">
              {preSave.title}
            </h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-white/65">{preSave.artist}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.2em] text-cyan-300">
              {preSave.is_released ? "OUT NOW" : "PRE-SAVE • COMING SOON"}
            </p>
            {preSave.release_date && (
              <p className="mt-2 text-xs text-white/55">
                {preSave.is_released ? "Released" : "Coming"} {formatReleaseDate(preSave.release_date)}
              </p>
            )}
            {preSave.description && (
              <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-white/60">{preSave.description}</p>
            )}

            {preSave.preview_audio_url && (
              <div className="mt-5">
                <AudioPreviewPlayer
                  audioUrl={preSave.preview_audio_url}
                  artworkUrl={preSave.artwork_url || undefined}
                  title={preSave.title}
                  artist={preSave.artist}
                  previewStart={preSave.preview_start ?? 0}
                  previewEnd={preSave.preview_end ?? 30}
                  waveformData={preSave.waveform_data ?? undefined}
                />
              </div>
            )}

            {!preSave.is_released && (
              <Button
                type="button"
                size="lg"
                className="mt-6 min-h-[52px] w-full rounded-2xl bg-[#00c853] text-black hover:bg-[#00b94b] font-semibold shadow-[0_12px_35px_rgba(0,200,83,.22)]"
                disabled={submitting || spotifyPresaved}
                onClick={handleSpotifyPresave}
              >
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SpotifyIcon />}
                {spotifyPresaved ? "Already Pre-Saved" : "Pre-Save on Spotify"}
              </Button>
            )}

            {platformLinks.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {platformLinks.slice(0, 8).map((link) => {
                  const key = link.platform_name.toLowerCase().trim().replace(/\\s+/g, "_");
                  const iconMap: Record<string, React.ReactNode> = {
                    spotify: <SpotifyIcon />,
                    apple_music: <AppleMusicIcon />,
                    youtube: <YouTubeIcon />,
                    deezer: <DeezerIcon />,
                  };
                  const colorMap: Record<string, string> = {
                    spotify: "#1DB954",
                    apple_music: "#FA243C",
                    youtube: "#FF0000",
                    deezer: "#FEAA2D",
                  };
                  const actionLabel =
                    link.action_type === "presave" ? "PRE-SAVE" :
                    link.action_type === "preadd" ? "PRE-ADD" :
                    link.action_type === "notify" ? "NOTIFY" : "PLAY";
                  return (
                    <a
                      key={link.id}
                      href={link.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center gap-3 rounded-full bg-white px-4 text-left text-black shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[.99]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center" style={{ color: colorMap[key] || "#111" }}>
                        {iconMap[key] || <Music2 className="h-5 w-5" />}
                      </span>
                      <span className="flex-1 text-[13px] font-medium">{link.platform_name}</span>
                      <span className="text-[9px] font-bold tracking-wider text-black/55">{actionLabel}</span>
                    </a>
                  );
                })}
              </div>
            )}

            <details className="mt-5 rounded-2xl border border-white/15 bg-black/20 p-4 text-left backdrop-blur-xl">
              <summary className="cursor-pointer list-none text-sm font-semibold text-white/90">
                <span className="flex items-center justify-between">
                  Keep up with {preSave.artist}
                  <span className="text-xs text-cyan-300">Optional +</span>
                </span>
                <span className="mt-1 block text-xs font-normal text-white/55">
                  Get an email when this artist releases new music.
                </span>
              </summary>
              <div className="mt-4">
                {futureSubscribed ? (
                  <p className="text-sm text-emerald-300">You're following {preSave.artist}. You can unsubscribe from any email.</p>
                ) : (
                  <form onSubmit={handleFutureArtistUpdates} className="space-y-3">
                    <Input
                      type="email"
                      value={futureEmail}
                      onChange={(e) => setFutureEmail(e.target.value)}
                      placeholder="Your email address"
                      maxLength={254}
                      required
                      className="bg-white text-black placeholder:text-black/45"
                    />
                    <label className="flex items-start gap-2 text-xs leading-relaxed text-white/65">
                      <input
                        type="checkbox"
                        checked={futureConsent}
                        onChange={(e) => setFutureConsent(e.target.checked)}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span>I agree to receive future release emails from {preSave.artist}. I can unsubscribe at any time.</span>
                    </label>
                    <Button type="submit" variant="outline" className="w-full" disabled={futureSubmitting || !futureConsent}>
                      {futureSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      Notify me about future releases
                    </Button>
                  </form>
                )}
              </div>
            </details>

            <div className="mt-5">
              <HouseAdSlot artistUserId={preSave.user_id} preSaveId={preSave.id} reserveSpace />
            </div>
            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-white/55">
              <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 hover:text-white">
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1.5 hover:text-white">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </motion.div>
        </main>

        <footer className="p-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <img src={logo} alt="MDistro Link" className="w-4 h-4 rounded" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, Check, ExternalLink, Loader2, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import demoArtwork from "@/assets/demo-artwork.jpg";
import SEOHead from "@/components/SEOHead";
import FanContactForm from "@/components/FanContactForm";
import { getShareableFanlinkUrl } from "@/lib/shareUrl";
import logo from "@/assets/logo.png";
import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeIcon,
  AudiomackIcon,
  BoomplayIcon,
  DeezerIcon,
  TidalIcon,
  AmazonMusicIcon,
  SoundCloudIcon,
  ShazamIcon,
} from "@/components/icons/PlatformIcons";

const platformConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  spotify: { icon: <SpotifyIcon />, color: "#1DB954" },
  apple_music: { icon: <AppleMusicIcon />, color: "#FA243C" },
  youtube: { icon: <YouTubeIcon />, color: "#FF0000" },
  audiomack: { icon: <AudiomackIcon />, color: "#FFA500" },
  boomplay: { icon: <BoomplayIcon />, color: "#FFCC00" },
  deezer: { icon: <DeezerIcon />, color: "#FEAA2D" },
  tidal: { icon: <TidalIcon />, color: "#00FFFF" },
  amazon: { icon: <AmazonMusicIcon />, color: "#FF9900" },
  soundcloud: { icon: <SoundCloudIcon />, color: "#FF5500" },
  shazam: { icon: <ShazamIcon />, color: "#0088FF" },
};

const formatPlatformName = (key: string) => {
  const names: Record<string, string> = {
    spotify: "Spotify",
    apple_music: "Apple Music",
    youtube: "YouTube Music",
    audiomack: "Audiomack",
    boomplay: "Boomplay",
    deezer: "Deezer",
    tidal: "Tidal",
    amazon: "Amazon Music",
    soundcloud: "SoundCloud",
    shazam: "Shazam",
  };
  return names[key] || key;
};

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

interface Fanlink {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  release_type: string | null;
  isrc: string | null;
  upc: string | null;
  is_published: boolean | null;
  expires_at: string | null;
  collect_email: boolean | null;
  collect_phone: boolean | null;
  require_contact: boolean | null;
}

interface PlatformLink {
  id: string;
  platform_name: string;
  platform_url: string;
  display_order: number;
}

interface LinkThemeData {
  background_color: string;
  button_color: string;
  text_color: string;
  font_family: string;
  layout_style: string;
  theme_mode: string;
  logo_url: string | null;
  background_image_url: string | null;
}

const FanlinkPage = () => {
  const { artist, song, id } = useParams();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fanlink, setFanlink] = useState<Fanlink | null>(null);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [theme, setTheme] = useState<LinkThemeData | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const currentUrl = window.location.href;
  
  // Generate shareable URL that works with social media crawlers
  const shareableUrl = artist && song 
    ? getShareableFanlinkUrl(artist, song) 
    : currentUrl;

  useEffect(() => {
    fetchFanlink();
  }, [artist, song, id]);

  const fetchFanlink = async () => {
    try {
      let query = supabase.from("fanlinks").select("*");
      
      if (id) {
        query = query.eq("id", id);
      } else if (artist && song) {
        query = query.eq("artist_slug", artist).eq("slug", song);
      }

      const { data: fanlinkData, error: fanlinkError } = await query.maybeSingle();

      if (fanlinkError) throw fanlinkError;
      
      if (!fanlinkData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setFanlink(fanlinkData);

      // Check if contact collection is enabled
      if (fanlinkData.collect_email || fanlinkData.collect_phone) {
        setShowContactForm(true);
      }

      // Fetch platform links
      const { data: linksData, error: linksError } = await supabase
        .from("platform_links")
        .select("*")
        .eq("fanlink_id", fanlinkData.id)
        .eq("is_active", true)
        .order("display_order");

      if (linksError) throw linksError;
      setPlatformLinks(linksData || []);

      // Load theme
      const { data: themeData } = await supabase
        .from("link_themes")
        .select("*")
        .eq("link_id", fanlinkData.id)
        .maybeSingle();

      if (themeData) setTheme(themeData as LinkThemeData);

      // Log page view click with geo tracking via edge function
      try {
        await supabase.functions.invoke("track-geo", {
          body: {
            type: "click",
            id: fanlinkData.id,
            platform_name: null, // Page view, not platform click
            user_agent: navigator.userAgent,
            device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          },
        });
      } catch (geoError) {
        console.error("Geo tracking error:", geoError);
        // Fallback to direct insert without geo
        await supabase.from("clicks").insert({
          fanlink_id: fanlinkData.id,
          user_agent: navigator.userAgent,
          device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
        });
      }

    } catch (error) {
      console.error("Error fetching fanlink:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformClick = async (platformName: string) => {
    if (fanlink) {
      try {
        trackEvent("link_clicked", { type: "fanlink", platform: platformName, fanlink_id: fanlink.id });
        await supabase.functions.invoke("track-geo", {
          body: {
            type: "click",
            id: fanlink.id,
            platform_name: platformName,
            user_agent: navigator.userAgent,
            device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          },
        });
      } catch (geoError) {
        console.error("Geo tracking error:", geoError);
        // Fallback to direct insert
        await supabase.from("clicks").insert({
          fanlink_id: fanlink.id,
          platform_name: platformName,
          user_agent: navigator.userAgent,
          device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
        });
      }
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    toast.success("Link copied! This link works with social media previews.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && fanlink) {
      try {
        await navigator.share({
          title: `${fanlink.title} by ${fanlink.artist}`,
          text: `Listen to ${fanlink.title} on all platforms`,
          url: shareableUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !fanlink) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Fanlink Not Found</h1>
        <p className="text-muted-foreground mb-6">This link doesn't exist or has been removed.</p>
        <Button variant="hero" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  // Check if disabled or expired
  const isExpired = fanlink.expires_at && new Date(fanlink.expires_at) < new Date();
  const isDisabled = fanlink.is_published === false;

  if (isDisabled || isExpired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">
          {isExpired ? "Link Expired" : "Link Unavailable"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isExpired ? "This link has expired and is no longer available." : "This link has been disabled by the creator."}
        </p>
        <Button variant="hero" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-background"
      style={{
        backgroundColor: theme?.background_color || undefined,
        color: theme?.text_color || undefined,
        fontFamily: theme?.font_family || undefined,
      }}
    >
      {/* SEO Head */}
      <SEOHead
        title={fanlink.title}
        artist={fanlink.artist}
        imageUrl={fanlink.artwork_url || undefined}
        pageUrl={currentUrl}
        type="fanlink"
      />

      {/* Ambient background */}
      <div className="absolute inset-0 z-0" aria-hidden>
        {theme?.background_image_url ? (
          <img src={theme.background_image_url} alt="" className="w-full h-full object-cover opacity-30" />
        ) : (
          <img
            src={fanlink.artwork_url || demoArtwork}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover opacity-25 blur-3xl scale-125"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background"
          style={theme ? { background: `linear-gradient(to bottom, ${theme.background_color}B3, ${theme.background_color}E6, ${theme.background_color})` } : undefined}
        />
        {!theme && <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-mesh)" }} />}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 px-3 sm:px-5 py-3 flex justify-between items-center backdrop-blur-xl bg-background/40 border-b border-border/30">
          <Link to="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            {theme?.logo_url ? (
              <img src={theme.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <img src={logo} alt="MDistro Link" className="w-8 h-8 rounded-lg" />
            )}
            <span className="font-display font-semibold text-sm tracking-tight" style={{ color: theme?.text_color }}>MDistro Link</span>
          </Link>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Show QR code" onClick={() => setShowQR(!showQR)}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 2h-2v4h2v-4zm2-2h-2v2h2v-2zm2 0h-2v2h2v-2zm0 4h-2v2h2v-2zm-4 2h-2v2h2v-2zm-4 0h-2v2h2v-2zm4-6h2v2h-2v-2zm-4 0h2v2h-2v-2z"/>
              </svg>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Share" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Copy link" onClick={handleCopyLink}>
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* QR Code popover */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-16 right-3 sm:right-5 z-40 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-4 shadow-[var(--shadow-xl)]"
          >
            <QRCodeSVG value={shareableUrl} size={150} bgColor="transparent" fgColor="currentColor" level="H" />
            <p className="text-xs text-center text-muted-foreground mt-2">Scan to open</p>
          </motion.div>
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 sm:py-12">
          <div className="mx-auto w-full max-w-5xl grid gap-8 lg:gap-14 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
            {/* ── Left: release identity ── */}
            <motion.div
              className="text-center lg:text-left lg:sticky lg:top-24"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
            >
              <motion.div
                className="relative mb-6 sm:mb-8 inline-block"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, ease: [0.16, 1, 0.3, 1], duration: 0.7 }}
              >
                <div className="absolute -inset-6 bg-gradient-to-br from-primary/40 via-accent/30 to-transparent blur-3xl rounded-full opacity-60" aria-hidden />
                <img
                  src={fanlink.artwork_url || demoArtwork}
                  alt={`${fanlink.title} artwork`}
                  fetchPriority="high"
                  className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-[340px] lg:h-[340px] mx-auto rounded-[1.75rem] object-cover shadow-[var(--shadow-xl)] ring-1 ring-border/40"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                {fanlink.release_type && (
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                    {fanlink.release_type}
                  </span>
                )}
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight text-balance mb-2">
                  {fanlink.title}
                </h1>
                <p className="text-lg text-muted-foreground">{fanlink.artist}</p>
                {fanlink.release_date && (
                  <p className="text-sm text-muted-foreground/70 mt-1">Out {fanlink.release_date}</p>
                )}
              </motion.div>
            </motion.div>

            {/* ── Right: actions ── */}
            <div className="w-full max-w-md mx-auto lg:max-w-none">
              {/* Fan Contact Form */}
              {showContactForm && !contactSubmitted && (
                <FanContactForm
                  linkId={fanlink.id}
                  collectEmail={fanlink.collect_email ?? false}
                  collectPhone={fanlink.collect_phone ?? false}
                  requireContact={fanlink.require_contact ?? false}
                  onContinue={() => {
                    setContactSubmitted(true);
                    setShowContactForm(false);
                  }}
                  artistName={fanlink.artist}
                  themeColors={{
                    buttonColor: theme?.button_color,
                    textColor: theme?.text_color,
                    buttonTextColor: theme?.button_color ? getContrastColor(theme.button_color) : undefined,
                  }}
                />
              )}

              {/* Platform Links */}
              {(!showContactForm || contactSubmitted) && (
                <motion.div
                  className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-xl p-4 sm:p-5 shadow-[var(--shadow-lg)]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4 px-1">
                    Choose your platform
                  </p>

                  <div className="space-y-2.5">
                    {platformLinks.length > 0 ? (
                      platformLinks.map((link, index) => {
                        const config = platformConfig[link.platform_name] || {
                          icon: <Music2 className="w-6 h-6" />,
                          color: "#888",
                        };

                        return (
                          <motion.a
                            key={link.id}
                            href={link.platform_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handlePlatformClick(link.platform_name)}
                            className="group relative flex items-center gap-3 sm:gap-4 rounded-2xl border border-border/40 bg-background/50 p-3 sm:p-4 overflow-hidden transition-all duration-300 hover:border-border hover:shadow-[var(--shadow-md)]"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.28 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.985 }}
                            style={{
                              backgroundColor: theme?.button_color || undefined,
                              color: theme?.button_color ? getContrastColor(theme.button_color) : undefined,
                            }}
                          >
                            {/* brand wash */}
                            <span
                              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ background: `linear-gradient(90deg, ${config.color}22, transparent 70%)` }}
                              aria-hidden
                            />
                            <span
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                              style={{ color: config.color, backgroundColor: `${config.color}1F` }}
                            >
                              {config.icon}
                            </span>
                            <span className="relative flex-1 min-w-0 text-left">
                              <span className="block font-semibold text-sm sm:text-base truncate">
                                {formatPlatformName(link.platform_name)}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">Play now</span>
                            </span>
                            <span className="relative inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                              <span className="hidden sm:inline">Listen</span>
                              <ExternalLink className="w-4 h-4" />
                            </span>
                          </motion.a>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center">
                        <Music2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No streaming links available yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="glass" className="flex-1 h-11" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" /> Share
                    </Button>
                    <Button variant="ghost" className="flex-1 h-11" onClick={handleCopyLink}>
                      {copied ? <Check className="w-4 h-4 mr-2 text-primary" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <img src={logo} alt="MDistro Link" className="w-4 h-4 rounded" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};


export default FanlinkPage;

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Music2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Edit3,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AccuracyScore from "@/components/AccuracyScore";
import WizardShell from "@/components/wizard/WizardShell";
import DevicePreview from "@/components/wizard/DevicePreview";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

interface LinkMetadata {
  title: string;
  artist: string;
  album: string;
  album_id: string;
  artist_id: string;
  isrc: string | null;
  upc: string | null;
  release_date: string | null;
  artwork: { large: string | null; medium: string | null; small: string | null };
  spotify_track_url: string | null;
  spotify_artist_url: string | null;
  spotify_album_url: string | null;
  release_type?: string | null;
  total_tracks?: number | null;
}

interface ReleaseTrack {
  track_number: number;
  title: string;
  isrc: string | null;
  duration_ms: number | null;
  spotify_track_url: string | null;
  apple_track_url: string | null;
}

interface AccuracyBreakdown {
  isrc_match: boolean;
  upc_match: boolean;
  artist_similarity: number;
  title_similarity: number;
  album_match: boolean;
}

const platforms = [
  { key: "spotify", name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954" },
  { key: "apple_music", name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C" },
  { key: "youtube", name: "YouTube Music", icon: <YouTubeIcon />, color: "#FF0000" },
  { key: "deezer", name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D" },
  { key: "audiomack", name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500" },
  { key: "boomplay", name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00" },
  { key: "tidal", name: "Tidal", icon: <TidalIcon />, color: "#00FFFF" },
  { key: "amazon", name: "Amazon Music", icon: <AmazonMusicIcon />, color: "#FF9900" },
  { key: "soundcloud", name: "SoundCloud", icon: <SoundCloudIcon />, color: "#FF5500" },
  { key: "shazam", name: "Shazam", icon: <ShazamIcon />, color: "#0088FF" },
];

const CreateFanlink = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});
  const [accuracyScore, setAccuracyScore] = useState(0);
  const [accuracyBreakdown, setAccuracyBreakdown] = useState<AccuracyBreakdown | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"release" | "track">("track");
  const [tracklist, setTracklist] = useState<ReleaseTrack[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string) => {
    const t = input.trim();
    if (/^\d{12,13}$/.test(t)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(t)) return "ISRC";
    if (t.includes("spotify.com")) return "Spotify Link";
    if (t.includes("music.apple.com") || t.includes("itunes.apple.com")) return "Apple Music Link";
    if (t.includes("deezer.com")) return "Deezer Link";
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setDetectedType(detectInputType(e.target.value));
    setFetchError(null);
  };

  const handleFetch = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a link, UPC, or ISRC");
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    setMetadata(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-link", {
        body: { input: inputValue.trim() },
      });
      if (error) throw error;
      if (data.error) {
        setFetchError(data.error);
        toast.error(data.error);
        return;
      }
      setMetadata(data.metadata);
      setPlatformUrls(data.streaming_links || {});
      setAccuracyScore(data.accuracy_score || 0);
      setAccuracyBreakdown(data.accuracy_breakdown || null);
      setContentType(data.content_type === "release" ? "release" : "track");
      setTracklist(Array.isArray(data.tracklist) ? data.tracklist : []);
      toast.success(
        data.content_type === "release"
          ? `Release found (${data.metadata?.total_tracks || data.tracklist?.length || 0} tracks) — ${data.accuracy_score}% accuracy`
          : `Track found with ${data.accuracy_score}% accuracy!`
      );
      setStep(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!metadata?.title || !metadata?.artist) {
      toast.error("Fill in track title and artist");
      return;
    }
    setIsCreating(true);
    try {
      const artistSlug = slugify(metadata.artist);
      const slug = slugify(metadata.title);
      const { data: fanlink, error: fErr } = await supabase
        .from("fanlinks")
        .insert({
          user_id: user?.id,
          title: metadata.title,
          artist: metadata.artist,
          artwork_url: metadata.artwork?.large || metadata.artwork?.medium || null,
          release_date: metadata.release_date,
          release_type: contentType === "release" ? metadata.release_type || "Album" : "Single",
          content_type: contentType,
          tracklist: contentType === "release" ? tracklist : [],
          total_tracks: contentType === "release" ? metadata.total_tracks ?? tracklist.length : 1,
          upc: metadata.upc,
          isrc: metadata.isrc,
          slug,
          artist_slug: artistSlug,
        })
        .select()
        .single();
      if (fErr) throw fErr;

      const links = Object.entries(platformUrls)
        .filter(([_, u]) => u)
        .map(([name, url], i) => ({
          fanlink_id: fanlink.id,
          platform_name: name,
          platform_url: url,
          display_order: i,
        }));
      if (links.length) {
        const { error: pErr } = await supabase.from("platform_links").insert(links);
        if (pErr) throw pErr;
      }
      await supabase.from("link_themes").insert({ link_id: fanlink.id });

      // Persist normalized release + tracks for UPC-based (release-level) links
      if (contentType === "release") {
        const { data: release, error: rErr } = await supabase
          .from("releases")
          .insert({
            user_id: user?.id,
            fanlink_id: fanlink.id,
            upc: metadata.upc,
            artist_name: metadata.artist,
            release_title: metadata.title,
            release_type: metadata.release_type || "Album",
            artwork: metadata.artwork?.large || null,
            release_date: metadata.release_date,
            spotify_release_url: platformUrls.spotify || null,
            apple_release_url: platformUrls.apple_music?.startsWith("http") ? platformUrls.apple_music : null,
            youtube_release_url: platformUrls.youtube || null,
            deezer_release_url: platformUrls.deezer || null,
            tidal_release_url: platformUrls.tidal || null,
            amazon_release_url: platformUrls.amazon || null,
            boomplay_release_url: platformUrls.boomplay || null,
            audiomack_release_url: platformUrls.audiomack || null,
          })
          .select()
          .single();

        if (rErr) {
          console.error("Failed to save release row", rErr);
        } else if (release && tracklist.length) {
          const trackRows = tracklist.map((t, i) => ({
            release_id: release.id,
            isrc: t.isrc,
            track_number: t.track_number ?? i + 1,
            track_title: t.title,
            duration_ms: t.duration_ms,
            spotify_track_url: t.spotify_track_url,
            apple_track_url: t.apple_track_url,
          }));
          const { error: tErr } = await supabase.from("tracks").insert(trackRows);
          if (tErr) console.error("Failed to save tracks", tErr);
        }
      }

      trackEvent("fanlink_created", {
        title: metadata.title,
        artist: metadata.artist,
        content_type: contentType,
      });
      toast.success(contentType === "release" ? "Release link created!" : "Fanlink created!");
      navigate("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast.error(msg.includes("duplicate") ? "A fanlink with this title already exists" : msg);
    } finally {
      setIsCreating(false);
    }
  };

  const platformCount = useMemo(
    () => Object.values(platformUrls).filter(Boolean).length,
    [platformUrls]
  );

  const artworkUrl = metadata?.artwork?.large || metadata?.artwork?.medium || null;

  const preview = (
    <DevicePreview
      artworkUrl={artworkUrl}
      title={metadata?.title}
      artist={metadata?.artist}
      subtitle={platformCount ? `${platformCount} platforms` : undefined}
      platforms={platforms.map((p) => ({
        name: p.name,
        icon: p.icon,
        color: p.color,
        hasUrl: !!platformUrls[p.key],
      }))}
    />
  );

  const steps = [
    { id: "source", label: "Source" },
    { id: "details", label: "Details" },
    { id: "platforms", label: "Platforms" },
    { id: "publish", label: "Publish" },
  ];

  const canProceed =
    (step === 0 && !!metadata) ||
    (step === 1 && !!metadata?.title && !!metadata?.artist) ||
    step === 2 ||
    step === 3;

  const onNext = () => {
    if (step < 3) setStep(step + 1);
    else handleCreate();
  };

  const onBack = () => setStep((s) => Math.max(0, s - 1));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <WizardShell
      title={<>Create a <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">Fanlink</span></>}
      subtitle="Route every fan to the right streaming platform in one branded link."
      steps={steps}
      currentStep={step}
      onStepChange={(s) => s <= step && setStep(s)}
      canProceed={canProceed}
      onNext={onNext}
      onBack={onBack}
      submitLabel="Create Fanlink"
      submitting={isCreating}
      preview={preview}
    >
      {step === 0 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Where should we find your track?
              </h2>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Paste Spotify link, UPC, or ISRC…"
                value={inputValue}
                onChange={handleInputChange}
                className="pl-12 h-14 text-base"
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
            </div>

            {detectedType && (
              <div className="flex items-center gap-2 mt-3 text-primary text-sm">
                <CheckCircle className="w-4 h-4" />
                Detected: {detectedType}
              </div>
            )}

            <Button
              variant="premium"
              size="xl"
              onClick={handleFetch}
              disabled={isLoading || !inputValue.trim()}
              className="w-full mt-5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Fetch metadata
                </>
              )}
            </Button>

            {fetchError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">{fetchError}</p>
                  <p className="text-muted-foreground mt-1">
                    Try a direct Spotify track URL or valid ISRC.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="chip">Spotify link</span>
            <span className="chip">ISRC</span>
            <span className="chip">UPC</span>
            <span className="ml-auto">Powered by Spotify Web API</span>
          </div>
        </div>
      )}

      {step === 1 && metadata && (
        <div className="space-y-5">
          {accuracyBreakdown && <AccuracyScore score={accuracyScore} breakdown={accuracyBreakdown} />}

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2 mb-5">
              <Edit3 className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Refine track details
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              {artworkUrl ? (
                <img src={artworkUrl} alt="" className="w-32 h-32 rounded-xl object-cover shadow-lg" />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center">
                  <Music2 className="w-10 h-10 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-widest">Title</label>
                  <Input
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-widest">Artist</label>
                  <Input
                    value={metadata.artist}
                    onChange={(e) => setMetadata({ ...metadata, artist: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {metadata.isrc && <span className="chip chip-primary">ISRC {metadata.isrc}</span>}
                  {metadata.upc && <span className="chip chip-accent">UPC {metadata.upc}</span>}
                  {metadata.release_date && <span className="chip">{metadata.release_date}</span>}
                </div>
                {metadata.spotify_track_url && (
                  <a
                    href={metadata.spotify_track_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#1DB954] hover:underline"
                  >
                    <SpotifyIcon />
                    View on Spotify <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && metadata && (
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Streaming platforms
            </h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {platformCount} of {platforms.length} connected
            </span>
          </div>
          <div className="space-y-2.5">
            {platforms.map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0"
                  style={{ color: p.color }}
                >
                  {p.icon}
                </div>
                <Input
                  placeholder={`${p.name} URL`}
                  value={platformUrls[p.key] || ""}
                  onChange={(e) => setPlatformUrls({ ...platformUrls, [p.key]: e.target.value })}
                  className="flex-1"
                />
                {platformUrls[p.key] ? (
                  <CheckCircle className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && metadata && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
            <h2 className="font-display text-lg font-semibold mb-2">Ready to publish</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Your fanlink URL — share this anywhere to route fans to their preferred platform.
            </p>
            <div className="rounded-xl bg-secondary/50 p-4 font-mono text-sm break-all border border-border/50">
              <span className="text-muted-foreground">md.malpinohdistro.com.ng/</span>
              <span className="text-primary">
                {slugify(metadata.artist || "artist")}/{slugify(metadata.title || "track")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">{platformCount}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Platforms</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <p className="text-2xl font-display font-bold text-accent">{accuracyScore}%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Accuracy</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <p className="text-2xl font-display font-bold text-success">Live</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Status</p>
            </div>
          </div>
        </div>
      )}
    </WizardShell>
  );
};

export default CreateFanlink;

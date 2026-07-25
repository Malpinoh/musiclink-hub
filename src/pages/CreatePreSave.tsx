import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Music2,
  Search,
  Loader2,
  Disc3,
  CheckCircle,
  Edit3,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WizardShell from "@/components/wizard/WizardShell";
import DevicePreview from "@/components/wizard/DevicePreview";
import AudioPreviewUploader from "@/components/AudioPreviewUploader";
import { trackEvent } from "@/lib/analytics";
import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeIcon,
  DeezerIcon,
} from "@/components/icons/PlatformIcons";

interface PreSaveMetadata {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  releaseDate: string;
  spotifyUri: string;
  spotifyAlbumId: string;
  spotifyArtistId: string;
  isrc: string;
  upc: string;
}

const slugify = (t: string) =>
  t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

const CreatePreSave = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"manual" | "search">("manual");

  // Search mode
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual mode
  const [manualData, setManualData] = useState({
    title: "",
    artist: "",
    upc: "",
    isrc: "",
    releaseDate: "",
    artworkUrl: "",
    description: "",
  });

  // Artwork upload
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Audio
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewStart, setPreviewStart] = useState(0);
  const [previewEnd, setPreviewEnd] = useState(30);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const [creating, setCreating] = useState(false);
  const [metadata, setMetadata] = useState<PreSaveMetadata | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string) => {
    const t = input.trim();
    if (/^\d{12,14}$/.test(t)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(t.toUpperCase())) return "ISRC";
    if (t.includes("spotify.com") || t.includes("open.spotify")) return "Spotify Link";
    return null;
  };

  const handleArtworkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be < 5MB");
    setArtworkFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setArtworkPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearArtwork = () => {
    setArtworkFile(null);
    setArtworkPreview(null);
    setManualData((p) => ({ ...p, artworkUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadArtwork = async (): Promise<string | null> => {
    if (!artworkFile || !user) return null;
    setUploading(true);
    try {
      const ext = artworkFile.name.split(".").pop();
      const name = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("artwork").upload(name, artworkFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("artwork").getPublicUrl(name);
      return data.publicUrl;
    } catch (e) {
      toast.error("Failed to upload artwork");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleManualBuild = async (): Promise<boolean> => {
    const { title, artist, upc, releaseDate } = manualData;
    if (!title.trim() || !artist.trim()) {
      toast.error("Enter title and artist");
      return false;
    }
    if (!upc.trim() || !/^\d{12,14}$/.test(upc.trim())) {
      toast.error("Enter a valid UPC (12–14 digits)");
      return false;
    }
    if (!releaseDate) {
      toast.error("Enter release date");
      return false;
    }
    let artworkUrl = manualData.artworkUrl.trim();
    if (artworkFile) {
      const uploaded = await uploadArtwork();
      if (uploaded) artworkUrl = uploaded;
    }
    setMetadata({
      title: title.trim(),
      artist: artist.trim(),
      album: title.trim(),
      artworkUrl,
      releaseDate,
      spotifyUri: "",
      spotifyAlbumId: "",
      spotifyArtistId: "",
      isrc: manualData.isrc.trim().toUpperCase(),
      upc: upc.trim(),
    });
    return true;
  };

  const handleFetch = async (): Promise<boolean> => {
    if (!inputValue.trim()) {
      toast.error("Enter a Spotify URL, UPC, or ISRC");
      return false;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-link", {
        body: { input: inputValue.trim() },
      });
      if (error) throw error;
      if (data?.not_found || data?.error) {
        toast.info("Track not indexed yet. Use Manual Entry.");
        setMode("manual");
        return false;
      }
      const md = data.metadata || data;
      setMetadata({
        title: md.title || "",
        artist: md.artist || "",
        album: md.album || md.title || "",
        artworkUrl: md.artwork?.large || md.artwork?.medium || "",
        releaseDate: md.release_date || "",
        spotifyUri: md.spotify_track_url ? `spotify:track:${md.spotify_track_url.split("/").pop()}` : "",
        spotifyAlbumId: md.album_id || "",
        spotifyArtistId: md.artist_id || "",
        isrc: md.isrc || "",
        upc: md.upc || "",
      });
      toast.success("Release metadata fetched");
      return true;
    } catch (e) {
      toast.info("Track not found. Switch to Manual Entry.");
      setMode("manual");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!metadata || !user) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from("pre_saves")
        .insert({
          user_id: user.id,
          title: metadata.title,
          artist: metadata.artist,
          slug: slugify(metadata.title),
          artist_slug: slugify(metadata.artist),
          artwork_url: metadata.artworkUrl || null,
          release_date: metadata.releaseDate,
          spotify_uri: metadata.spotifyUri || null,
          spotify_album_id: metadata.spotifyAlbumId || null,
          spotify_artist_id: metadata.spotifyArtistId || null,
          isrc: metadata.isrc || null,
          upc: metadata.upc || null,
          album_title: metadata.album,
          is_released: false,
          description: manualData.description?.trim() || null,
          preview_audio_url: previewAudioUrl || null,
          preview_start: previewStart,
          preview_end: previewEnd,
          waveform_data: waveformData.length > 0 ? waveformData : null,
        });
      if (error) throw error;
      trackEvent("presave_created", { title: metadata.title, artist: metadata.artist });
      toast.success("Pre-save link created!");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.code === "23505" ? "A pre-save for this release already exists" : "Failed to create pre-save");
    } finally {
      setCreating(false);
    }
  };

  const currentArtwork = metadata?.artworkUrl || artworkPreview || manualData.artworkUrl;
  const currentTitle = metadata?.title || manualData.title;
  const currentArtist = metadata?.artist || manualData.artist;

  const preview = (
    <DevicePreview
      artworkUrl={currentArtwork || null}
      title={currentTitle}
      artist={currentArtist}
      subtitle="Pre-save · Coming soon"
      platforms={[
        { name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954", hasUrl: !!metadata },
        { name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C", hasUrl: !!metadata?.upc },
        { name: "YouTube Music", icon: <YouTubeIcon />, color: "#FF0000", hasUrl: !!metadata?.upc },
        { name: "Deezer", icon: <DeezerIcon />, color: "#FEAA2D", hasUrl: !!metadata?.upc },
      ]}
      footerNote={previewAudioUrl ? "🎧 Audio preview attached" : undefined}
    />
  );

  const steps = [
    { id: "source", label: "Source" },
    { id: "details", label: "Details" },
    { id: "audio", label: "Audio" },
    { id: "publish", label: "Publish" },
  ];

  const canProceed =
    (step === 0 &&
      (mode === "manual"
        ? !!manualData.title && !!manualData.artist && !!manualData.upc && !!manualData.releaseDate
        : !!inputValue.trim() || !!metadata)) ||
    (step === 1 && !!metadata) ||
    step === 2 ||
    (step === 3 && !!metadata);

  const onNext = async () => {
    if (step === 0) {
      if (mode === "manual") {
        const ok = await handleManualBuild();
        if (ok) setStep(1);
      } else {
        const ok = metadata ? true : await handleFetch();
        if (ok) setStep(1);
      }
      return;
    }
    if (step < 3) setStep(step + 1);
    else handleCreate();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <WizardShell
      title={<>Create a <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">Pre-save</span></>}
      subtitle="Build hype before drop day. Fans commit once — you convert on release."
      steps={steps}
      currentStep={step}
      onStepChange={(s) => s <= step && setStep(s)}
      canProceed={canProceed}
      onNext={onNext}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      submitLabel="Publish Pre-save"
      submitting={creating || uploading || loading}
      preview={preview}
    >
      {step === 0 && (
        <div className="space-y-5">
          <div className="flex gap-2">
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => { setMode("manual"); setMetadata(null); }}
              className="flex-1"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Manual entry
            </Button>
            <Button
              variant={mode === "search" ? "default" : "outline"}
              onClick={() => { setMode("search"); setMetadata(null); }}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Search released
            </Button>
          </div>

          {mode === "manual" ? (
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)] space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-primary/10 border border-primary/20 p-3">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Enter distributor metadata (ONErpm, DistroKid, etc.). Streaming links activate on release day automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={manualData.title} onChange={(e) => setManualData({ ...manualData, title: e.target.value })} placeholder="Release title" />
                </div>
                <div>
                  <Label>Artist *</Label>
                  <Input value={manualData.artist} onChange={(e) => setManualData({ ...manualData, artist: e.target.value })} placeholder="Artist name" />
                </div>
                <div>
                  <Label>UPC *</Label>
                  <Input value={manualData.upc} onChange={(e) => setManualData({ ...manualData, upc: e.target.value })} placeholder="12–14 digits" />
                </div>
                <div>
                  <Label>ISRC</Label>
                  <Input value={manualData.isrc} onChange={(e) => setManualData({ ...manualData, isrc: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label>Release date *</Label>
                  <Input type="date" value={manualData.releaseDate} onChange={(e) => setManualData({ ...manualData, releaseDate: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={manualData.description} onChange={(e) => setManualData({ ...manualData, description: e.target.value })} placeholder="Tell fans about it…" maxLength={500} />
                </div>
              </div>

              <div>
                <Label>Cover artwork</Label>
                <div
                  className={`mt-1 relative border-2 border-dashed rounded-xl p-4 transition-colors cursor-pointer ${artworkPreview ? "border-primary" : "border-border hover:border-primary/50"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleArtworkSelect} className="hidden" />
                  {artworkPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={artworkPreview} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{artworkFile?.name}</p>
                        <p className="text-xs text-muted-foreground">{artworkFile && (artworkFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); clearArtwork(); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload artwork</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG or JPG · Max 5MB</p>
                    </div>
                  )}
                </div>
                {!artworkFile && (
                  <Input
                    className="mt-3"
                    placeholder="Or paste artwork URL"
                    value={manualData.artworkUrl}
                    onChange={(e) => setManualData({ ...manualData, artworkUrl: e.target.value })}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)] space-y-3">
              <p className="text-xs text-muted-foreground">
                Only for tracks already live on Spotify. For unreleased music, use Manual entry.
              </p>
              <div className="relative">
                <Input
                  placeholder="Paste Spotify URL, UPC, or ISRC…"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setInputType(detectInputType(e.target.value)); }}
                  className="pr-24"
                />
                {inputType && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                    {inputType}
                  </span>
                )}
              </div>
              <Button onClick={handleFetch} disabled={loading || !inputValue.trim()} variant="premium" className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Fetch metadata
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 1 && metadata && (
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 mb-5">
            <Disc3 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Release preview
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {metadata.artworkUrl ? (
              <img src={metadata.artworkUrl} alt="" className="w-36 h-36 rounded-xl object-cover shadow-lg" />
            ) : (
              <div className="w-36 h-36 rounded-xl bg-secondary flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</p>
                <p className="font-display font-semibold text-lg">{metadata.title}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Artist</p>
                <p>{metadata.artist}</p>
              </div>
              {metadata.releaseDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  {metadata.releaseDate}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {metadata.upc && <span className="chip chip-accent">UPC {metadata.upc}</span>}
                {metadata.isrc && <span className="chip chip-primary">ISRC {metadata.isrc}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-2 mb-3">
            <Music2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Audio preview (optional)
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Upload a snippet of your unreleased track. Fans hear a 30-second preview on the pre-save page.
          </p>
          {user && (
            <AudioPreviewUploader
              userId={user.id}
              currentUrl={previewAudioUrl}
              onUploaded={(url, start, end, waveform) => {
                setPreviewAudioUrl(url);
                setPreviewStart(start);
                setPreviewEnd(end);
                setWaveformData(waveform);
              }}
            />
          )}
        </div>
      )}

      {step === 3 && metadata && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[var(--shadow-md)]">
            <h2 className="font-display text-lg font-semibold mb-2">Ready to publish</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Streaming links auto-activate on release day. Fans who pre-save get notified.
            </p>
            <div className="rounded-xl bg-secondary/50 p-4 font-mono text-sm break-all border border-border/50">
              <span className="text-muted-foreground">md.malpinohdistro.com.ng/pre/</span>
              <span className="text-primary">{slugify(metadata.artist)}-{slugify(metadata.title)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <CheckCircle className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Metadata</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              {previewAudioUrl ? <CheckCircle className="w-4 h-4 text-success mx-auto mb-1" /> : <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Audio</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              {metadata.artworkUrl ? <CheckCircle className="w-4 h-4 text-success mx-auto mb-1" /> : <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Artwork</p>
            </div>
          </div>
        </div>
      )}
    </WizardShell>
  );
};

export default CreatePreSave;

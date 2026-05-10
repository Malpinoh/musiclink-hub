import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Upload, Loader2, Music2, Disc3, Video, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CampaignTemplateCard from "@/components/CampaignTemplateCard";
import CampaignTimeline, { TimelineStep } from "@/components/CampaignTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  default_settings: Record<string, any>;
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Template-specific form data
type TemplateData = Record<string, string>;

const CreateCampaign = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Common fields
  const [campaignName, setCampaignName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);

  // Template-specific fields stored in one object
  const [templateData, setTemplateData] = useState<TemplateData>({});

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const loadTemplates = async () => {
      const { data } = await supabase.from("campaign_templates").select("*");
      if (data) setTemplates(data.map((t) => ({ ...t, default_settings: (t.default_settings as Record<string, any>) || {} })));
    };
    loadTemplates();
  }, []);

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArtworkFile(file);
      setArtworkPreview(URL.createObjectURL(file));
    }
  };

  const setField = (key: string, value: string) =>
    setTemplateData((prev) => ({ ...prev, [key]: value }));

  // Validation per template
  const isFormValid = (): boolean => {
    if (!campaignName.trim() || !artistName.trim()) return false;
    const t = selectedTemplate?.template_type;
    if (t === "song_release") {
      return !!templateData.track_title?.trim();
    }
    if (t === "album_launch") {
      return !!templateData.album_title?.trim();
    }
    if (t === "video_launch") {
      return !!templateData.video_title?.trim() && !!templateData.video_url?.trim();
    }
    if (t === "event_promotion") {
      return !!templateData.event_name?.trim() && !!templateData.venue?.trim() && !!templateData.event_date?.trim();
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user || !selectedTemplate || !isFormValid()) return;
    setCreating(true);

    try {
      // 1. Upload artwork
      let artworkUrl: string | null = null;
      if (artworkFile) {
        const ext = artworkFile.name.split(".").pop();
        const path = `campaigns/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("artwork").upload(path, artworkFile);
        if (uploadError) throw uploadError;
        artworkUrl = supabase.storage.from("artwork").getPublicUrl(path).data.publicUrl;
      }

      const settings = selectedTemplate.default_settings;
      const type = selectedTemplate.template_type;
      let fanlinkId: string | null = null;
      let presaveId: string | null = null;

      // 2. Auto-create pre-save (song_release / album_launch)
      if (settings.create_presave) {
        const title =
          type === "album_launch"
            ? templateData.album_title
            : templateData.track_title || campaignName;

        const { data: ps, error: psErr } = await supabase
          .from("pre_saves")
          .insert({
            user_id: user.id,
            title,
            artist: artistName,
            slug: slugify(title) + "-" + Date.now().toString(36).slice(-4),
            artist_slug: slugify(artistName),
            artwork_url: artworkUrl,
            release_date: releaseDate || null,
            description: description || null,
            album_title: templateData.album_title || null,
            upc: templateData.upc || null,
            isrc: templateData.isrc || null,
            spotify_uri: templateData.spotify_uri || null,
          })
          .select("id")
          .single();
        if (psErr) throw psErr;
        presaveId = ps?.id ?? null;
      }

      // 3. Auto-create fanlink for promotion (all types)
      if (settings.create_fanlink) {
        const title =
          type === "video_launch"
            ? templateData.video_title
            : type === "event_promotion"
              ? templateData.event_name
              : type === "album_launch"
                ? templateData.album_title
                : templateData.track_title || campaignName;

        const { data: fl, error: flErr } = await supabase
          .from("fanlinks")
          .insert({
            user_id: user.id,
            title,
            artist: artistName,
            slug: slugify(title) + "-" + Date.now().toString(36).slice(-4),
            artist_slug: slugify(artistName),
            artwork_url: artworkUrl,
            release_date: releaseDate || null,
            upc: templateData.upc || null,
            isrc: templateData.isrc || null,
            collect_email: !!settings.collect_email,
          })
          .select("id")
          .single();
        if (flErr) throw flErr;
        fanlinkId = fl?.id ?? null;
      }

      // 4. Create campaign record with all template-specific data in metadata
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          template_id: selectedTemplate.id,
          campaign_name: campaignName,
          artist_name: artistName,
          release_date: releaseDate ? new Date(releaseDate).toISOString() : null,
          artwork_url: artworkUrl,
          status: "active",
          fanlink_id: fanlinkId,
          pre_save_id: presaveId,
          description: description || null,
          metadata: { template_type: type, ...templateData },
        })
        .select("id")
        .single();

      if (error) throw error;

      trackEvent("campaign_created", { template_type: type, campaign_id: campaign?.id });
      toast.success("Campaign created successfully!");
      setStep(4);
    } catch (err: any) {
      console.error("Campaign create failed:", err);
      toast.error(err?.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const getTimelineSteps = (): TimelineStep[] => {
    if (!selectedTemplate) return [];
    const type = selectedTemplate.template_type;
    if (type === "song_release" || type === "album_launch") {
      return [
        { label: "Campaign Created", description: "Pre-save & fanlink generated", status: "done" },
        { label: "Pre-save Active", description: "Fans can pre-save", status: "current" },
        { label: "Release Day", description: releaseDate || "TBD", status: "upcoming" },
        { label: "Post-Release Promo", description: "Share your fanlink", status: "upcoming" },
      ];
    }
    if (type === "event_promotion") {
      return [
        { label: "Campaign Created", description: "Promo link generated", status: "done" },
        { label: "Promotion Active", description: "Drive ticket sales", status: "current" },
        { label: "Event Day", description: templateData.event_date || "TBD", status: "upcoming" },
      ];
    }
    return [
      { label: "Campaign Created", description: "Assets generated", status: "done" },
      { label: "Promotion Active", description: "Share your link", status: "current" },
      { label: "Track Performance", description: "Monitor on dashboard", status: "upcoming" },
    ];
  };

  // Renders the template-specific fields
  const renderTemplateFields = () => {
    const type = selectedTemplate?.template_type;

    if (type === "song_release") {
      return (
        <>
          <div>
            <Label>Track Title *</Label>
            <Input value={templateData.track_title || ""} onChange={(e) => setField("track_title", e.target.value)} placeholder="Song title" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>UPC</Label>
              <Input value={templateData.upc || ""} onChange={(e) => setField("upc", e.target.value)} placeholder="123456789012" className="mt-1" />
            </div>
            <div>
              <Label>ISRC</Label>
              <Input value={templateData.isrc || ""} onChange={(e) => setField("isrc", e.target.value)} placeholder="USRC1XXXXXXX" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Spotify URI / Link (optional)</Label>
            <Input value={templateData.spotify_uri || ""} onChange={(e) => setField("spotify_uri", e.target.value)} placeholder="spotify:track:..." className="mt-1" />
          </div>
        </>
      );
    }

    if (type === "album_launch") {
      return (
        <>
          <div>
            <Label>Album / EP Title *</Label>
            <Input value={templateData.album_title || ""} onChange={(e) => setField("album_title", e.target.value)} placeholder="Album name" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total Tracks</Label>
              <Input type="number" min="1" value={templateData.total_tracks || ""} onChange={(e) => setField("total_tracks", e.target.value)} placeholder="12" className="mt-1" />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={templateData.label || ""} onChange={(e) => setField("label", e.target.value)} placeholder="Record label" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>UPC</Label>
            <Input value={templateData.upc || ""} onChange={(e) => setField("upc", e.target.value)} placeholder="123456789012" className="mt-1" />
          </div>
        </>
      );
    }

    if (type === "video_launch") {
      return (
        <>
          <div>
            <Label>Video Title *</Label>
            <Input value={templateData.video_title || ""} onChange={(e) => setField("video_title", e.target.value)} placeholder="Music video title" className="mt-1" />
          </div>
          <div>
            <Label>Video URL (YouTube / Vimeo) *</Label>
            <Input type="url" value={templateData.video_url || ""} onChange={(e) => setField("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1" />
          </div>
          <div>
            <Label>Premiere Date / Time</Label>
            <Input type="datetime-local" value={templateData.premiere_at || ""} onChange={(e) => setField("premiere_at", e.target.value)} className="mt-1" />
          </div>
        </>
      );
    }

    if (type === "event_promotion") {
      return (
        <>
          <div>
            <Label>Event Name *</Label>
            <Input value={templateData.event_name || ""} onChange={(e) => setField("event_name", e.target.value)} placeholder="Live in Lagos" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Venue *</Label>
              <Input value={templateData.venue || ""} onChange={(e) => setField("venue", e.target.value)} placeholder="Eko Hotel" className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={templateData.city || ""} onChange={(e) => setField("city", e.target.value)} placeholder="Lagos, NG" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Event Date / Time *</Label>
            <Input type="datetime-local" value={templateData.event_date || ""} onChange={(e) => setField("event_date", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Ticket Purchase URL</Label>
            <Input type="url" value={templateData.ticket_url || ""} onChange={(e) => setField("ticket_url", e.target.value)} placeholder="https://tickets.example.com" className="mt-1" />
          </div>
        </>
      );
    }

    return null;
  };

  const templateIcon = () => {
    const t = selectedTemplate?.template_type;
    if (t === "album_launch") return <Disc3 className="w-5 h-5" />;
    if (t === "video_launch") return <Video className="w-5 h-5" />;
    if (t === "event_promotion") return <CalendarIcon className="w-5 h-5" />;
    return <Music2 className="w-5 h-5" />;
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/50" : "w-8 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Choose template */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-3xl font-bold text-center mb-2">Choose a Campaign Template</h1>
              <p className="text-center text-muted-foreground mb-8">Select the type of campaign you want to launch</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map((t) => (
                  <CampaignTemplateCard
                    key={t.id}
                    name={t.name}
                    description={t.description || ""}
                    templateType={t.template_type}
                    onSelect={() => {
                      setSelectedTemplate(t);
                      setTemplateData({});
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Enter details */}
          {step === 2 && selectedTemplate && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2 mb-2 text-primary">
                {templateIcon()}
                <span className="text-sm font-medium">{selectedTemplate.name}</span>
              </div>
              <h1 className="font-display text-2xl font-bold mb-6">Campaign Details</h1>
              <div className="space-y-5">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Internal name for this campaign" className="mt-1" />
                </div>
                <div>
                  <Label>Artist Name *</Label>
                  <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Your artist name" className="mt-1" />
                </div>

                {/* Template-specific fields */}
                {renderTemplateFields()}

                {/* Release / launch date — applies to song & album */}
                {(selectedTemplate.template_type === "song_release" ||
                  selectedTemplate.template_type === "album_launch") && (
                  <div>
                    <Label>Release Date</Label>
                    <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="mt-1" />
                  </div>
                )}

                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional campaign description" className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Artwork / Cover</Label>
                  <div className="mt-1 flex items-center gap-4">
                    {artworkPreview && (
                      <img src={artworkPreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleArtworkChange} />
                    </label>
                  </div>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  disabled={!isFormValid()}
                  onClick={() => setStep(3)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm and create */}
          {step === 3 && selectedTemplate && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="font-display text-2xl font-bold mb-6">Review & Launch</h1>
              <div className="glass-card p-6 space-y-4 mb-6">
                <div className="flex items-center gap-4">
                  {artworkPreview && <img src={artworkPreview} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                  <div>
                    <h3 className="font-semibold text-lg">{campaignName}</h3>
                    <p className="text-sm text-muted-foreground">{artistName}</p>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Template:</span> {selectedTemplate.name}</p>
                  {Object.entries(templateData)
                    .filter(([, v]) => v && v.trim())
                    .map(([k, v]) => (
                      <p key={k}>
                        <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span> {v}
                      </p>
                    ))}
                  {releaseDate && <p><span className="text-muted-foreground">Release:</span> {releaseDate}</p>}
                  {selectedTemplate.default_settings.create_fanlink && <p className="text-primary">✓ Fanlink will be created</p>}
                  {selectedTemplate.default_settings.create_presave && <p className="text-primary">✓ Pre-save will be created</p>}
                  {selectedTemplate.default_settings.collect_email && <p className="text-primary">✓ Fan email collection enabled</p>}
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Launch Campaign
              </Button>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                {templateIcon()}
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">Campaign Launched! 🚀</h1>
              <p className="text-muted-foreground mb-8">Your assets have been created and saved.</p>

              <CampaignTimeline steps={getTimelineSteps()} />

              <div className="glass-card p-5 mt-6 text-left space-y-2">
                <h3 className="font-semibold">Smart Recommendations</h3>
                <p className="text-sm text-muted-foreground">📱 Share your link on Instagram Stories</p>
                <p className="text-sm text-muted-foreground">💬 Send to your WhatsApp contacts</p>
                <p className="text-sm text-muted-foreground">📊 Check performance on your Campaign Dashboard</p>
              </div>

              <div className="flex gap-3 mt-6 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/artist/campaigns">View Performance</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateCampaign;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Upload, Loader2 } from "lucide-react";
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

const CreateCampaign = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (!user || !selectedTemplate || !campaignName || !artistName) return;
    setCreating(true);

    try {
      let artworkUrl: string | null = null;
      if (artworkFile) {
        const ext = artworkFile.name.split(".").pop();
        const path = `campaigns/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("artwork").upload(path, artworkFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("artwork").getPublicUrl(path);
          artworkUrl = urlData.publicUrl;
        }
      }

      const settings = selectedTemplate.default_settings;
      let fanlinkId: string | null = null;
      let presaveId: string | null = null;

      // Auto-create fanlink if template calls for it
      if (settings.create_fanlink) {
        const { data: fl } = await supabase
          .from("fanlinks")
          .insert({
            user_id: user.id,
            title: campaignName,
            artist: artistName,
            slug: slugify(campaignName),
            artist_slug: slugify(artistName),
            artwork_url: artworkUrl,
            release_date: releaseDate || null,
            collect_email: settings.collect_email || false,
          })
          .select("id")
          .single();
        if (fl) fanlinkId = fl.id;
      }

      // Auto-create pre-save if template calls for it
      if (settings.create_presave) {
        const { data: ps } = await supabase
          .from("pre_saves")
          .insert({
            user_id: user.id,
            title: campaignName,
            artist: artistName,
            slug: slugify(campaignName),
            artist_slug: slugify(artistName),
            artwork_url: artworkUrl,
            release_date: releaseDate || null,
            description: description || null,
          })
          .select("id")
          .single();
        if (ps) presaveId = ps.id;
      }

      // Create campaign record
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
        })
        .select("id")
        .single();

      if (error) throw error;

      setCreatedCampaignId(campaign?.id || null);
      trackEvent("campaign_created", { template_type: selectedTemplate.template_type });
      toast.success("Campaign created successfully!");
      setStep(4);
    } catch (err) {
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const getTimelineSteps = (): TimelineStep[] => {
    if (!selectedTemplate) return [];
    const type = selectedTemplate.template_type;
    if (type === "song_release") {
      return [
        { label: "Campaign Created", description: "Pre-save & fanlink generated", status: "done" },
        { label: "Pre-save Active", description: "Fans can pre-save your track", status: "current" },
        { label: "Release Day", description: releaseDate || "TBD", status: "upcoming" },
        { label: "Post-Release Promo", description: "Share your fanlink everywhere", status: "upcoming" },
      ];
    }
    return [
      { label: "Campaign Created", description: "Assets generated", status: "done" },
      { label: "Promotion Active", description: "Share your links", status: "current" },
      { label: "Track Performance", description: "Monitor on dashboard", status: "upcoming" },
    ];
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
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Enter details */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="font-display text-2xl font-bold mb-6">Campaign Details</h1>
              <div className="space-y-5">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. New Single Drop" className="mt-1" />
                </div>
                <div>
                  <Label>Artist Name *</Label>
                  <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Your artist name" className="mt-1" />
                </div>
                <div>
                  <Label>Release Date</Label>
                  <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional campaign description" className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Artwork</Label>
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
                  disabled={!campaignName || !artistName}
                  onClick={() => setStep(3)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm and create */}
          {step === 3 && (
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
                  <p><span className="text-muted-foreground">Template:</span> {selectedTemplate?.name}</p>
                  {releaseDate && <p><span className="text-muted-foreground">Release:</span> {releaseDate}</p>}
                  {selectedTemplate?.default_settings.create_fanlink && <p className="text-primary">✓ Fanlink will be created</p>}
                  {selectedTemplate?.default_settings.create_presave && <p className="text-primary">✓ Pre-save will be created</p>}
                  {selectedTemplate?.default_settings.collect_email && <p className="text-primary">✓ Fan email collection enabled</p>}
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
                <Music2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">Campaign Launched! 🚀</h1>
              <p className="text-muted-foreground mb-8">Your assets have been created and are ready to share.</p>

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

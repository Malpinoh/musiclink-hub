import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  ExternalLink,
  GripVertical,
  User,
  Link2,
  BarChart3,
  Eye,
  MousePointerClick,
  Upload,
  X,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ArtistProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  profile_picture_url: string;
  is_verified: boolean;
  instagram_url: string;
  tiktok_url: string;
  twitter_url: string;
  facebook_url: string;
  youtube_url: string;
}

interface CustomButton {
  id: string;
  title: string;
  url: string;
  display_order: number;
  isNew?: boolean;
}

interface Analytics {
  totalViews: number;
  totalClicks: number;
  recentViews: number;
  clicksByType: Record<string, number>;
}

const CLICK_TYPE_COLORS: Record<string, string> = {
  social: "hsl(187 100% 50%)",
  custom: "hsl(280 100% 65%)",
  release: "hsl(142 76% 36%)",
  streaming: "hsl(32 100% 50%)",
};

const EditArtistBio = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalViews: 0,
    totalClicks: 0,
    recentViews: 0,
    clicksByType: {},
  });

  const [form, setForm] = useState<ArtistProfile>({
    id: "",
    username: "",
    display_name: "",
    bio: "",
    profile_picture_url: "",
    is_verified: false,
    instagram_url: "",
    tiktok_url: "",
    twitter_url: "",
    facebook_url: "",
    youtube_url: "",
  });
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [deletedButtonIds, setDeletedButtonIds] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (data) {
        setProfileId(data.id);
        setForm({
          id: data.id,
          username: data.username || "",
          display_name: data.display_name || "",
          bio: data.bio || "",
          profile_picture_url: data.profile_picture_url || "",
          is_verified: data.is_verified || false,
          instagram_url: data.instagram_url || "",
          tiktok_url: data.tiktok_url || "",
          twitter_url: data.twitter_url || "",
          facebook_url: data.facebook_url || "",
          youtube_url: data.youtube_url || "",
        });

        // Load custom buttons
        const { data: btns } = await supabase
          .from("artist_custom_buttons")
          .select("*")
          .eq("artist_profile_id", data.id)
          .order("display_order");
        setCustomButtons(btns || []);

        // Load analytics
        await loadAnalytics(data.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (pid: string) => {
    const [viewsResult, clicksResult] = await Promise.all([
      supabase
        .from("artist_profile_views")
        .select("viewed_at", { count: "exact" })
        .eq("artist_profile_id", pid),
      supabase
        .from("artist_link_clicks")
        .select("link_type, clicked_at", { count: "exact" })
        .eq("artist_profile_id", pid),
    ]);

    const totalViews = viewsResult.count || 0;
    const totalClicks = clicksResult.count || 0;

    // Recent views (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentViews = (viewsResult.data || []).filter(v => v.viewed_at > weekAgo).length;

    // Clicks by type
    const clicksByType: Record<string, number> = {};
    for (const c of clicksResult.data || []) {
      clicksByType[c.link_type] = (clicksByType[c.link_type] || 0) + 1;
    }

    setAnalytics({ totalViews, totalClicks, recentViews, clicksByType });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `artist-profiles/${user!.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("artwork").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("artwork").getPublicUrl(path);
      setForm(f => ({ ...f, profile_picture_url: urlData.publicUrl }));
      toast.success("Profile picture uploaded!");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const validateUsername = (val: string) => /^[a-z0-9_-]{3,30}$/.test(val);

  const handleSave = async () => {
    if (!form.username || !form.display_name) {
      toast.error("Username and display name are required");
      return;
    }
    if (!validateUsername(form.username)) {
      toast.error("Username must be 3-30 characters, lowercase letters, numbers, - or _ only");
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        user_id: user!.id,
        username: form.username.toLowerCase().trim(),
        display_name: form.display_name.trim(),
        bio: form.bio.trim() || null,
        profile_picture_url: form.profile_picture_url || null,
        instagram_url: form.instagram_url || null,
        tiktok_url: form.tiktok_url || null,
        twitter_url: form.twitter_url || null,
        facebook_url: form.facebook_url || null,
        youtube_url: form.youtube_url || null,
      };

      let currentProfileId = profileId;

      if (profileId) {
        const { error } = await supabase
          .from("artist_profiles")
          .update(profileData)
          .eq("id", profileId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("artist_profiles")
          .insert(profileData)
          .select()
          .single();
        if (error) throw error;
        currentProfileId = data.id;
        setProfileId(data.id);
      }

      // Delete removed buttons
      if (deletedButtonIds.length > 0) {
        await supabase.from("artist_custom_buttons").delete().in("id", deletedButtonIds);
        setDeletedButtonIds([]);
      }

      // Upsert custom buttons
      for (let i = 0; i < customButtons.length; i++) {
        const btn = customButtons[i];
        if (btn.isNew) {
          await supabase.from("artist_custom_buttons").insert({
            artist_profile_id: currentProfileId!,
            title: btn.title,
            url: btn.url,
            display_order: i,
          });
        } else {
          await supabase.from("artist_custom_buttons")
            .update({ title: btn.title, url: btn.url, display_order: i })
            .eq("id", btn.id);
        }
      }

      toast.success("Artist Bio page saved!");
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("That username is already taken. Please choose another.");
      } else {
        toast.error("Failed to save. Please try again.");
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  };

  const addButton = () => {
    setCustomButtons(prev => [
      ...prev,
      { id: crypto.randomUUID(), title: "", url: "", display_order: prev.length, isNew: true },
    ]);
  };

  const removeButton = (id: string, isNew?: boolean) => {
    setCustomButtons(prev => prev.filter(b => b.id !== id));
    if (!isNew) setDeletedButtonIds(prev => [...prev, id]);
  };

  const updateButton = (id: string, field: "title" | "url", value: string) => {
    setCustomButtons(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const bioUrl = form.username
    ? `${window.location.origin}/artist/${form.username}`
    : null;

  const handleCopyBioLink = async () => {
    if (!bioUrl) return;
    await navigator.clipboard.writeText(bioUrl);
    setCopiedLink(true);
    toast.success("Bio link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Page header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-1">Artist Bio Page</h1>
                <p className="text-muted-foreground text-sm">Your public artist page for fans</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {bioUrl && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCopyBioLink}>
                      {copiedLink ? (
                        <><Check className="w-4 h-4 mr-2 text-primary" />Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" />Copy Link</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/artist/${form.username}`} target="_blank">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Preview
                      </Link>
                    </Button>
                  </>
                )}
                <Button variant="hero" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {profileId ? "Save Changes" : "Create Page"}
                </Button>
              </div>
            </div>
            {bioUrl && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl w-fit">
                <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <a href={bioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-medium truncate max-w-xs">
                  {bioUrl}
                </a>
              </div>
            )}
          </motion.div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6 w-full grid grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Links
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Analytics
              </TabsTrigger>
            </TabsList>

            {/* ── PROFILE TAB ── */}
            <TabsContent value="profile">
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Profile Picture */}
                <div className="glass-card p-6">
                  <h2 className="font-display font-semibold mb-4">Profile Picture</h2>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary border border-border flex-shrink-0">
                      {form.profile_picture_url ? (
                        <img src={form.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors w-fit text-sm font-medium">
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          Upload Photo
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WebP. Max 5MB.</p>
                      {form.profile_picture_url && (
                        <button
                          onClick={() => setForm(f => ({ ...f, profile_picture_url: "" }))}
                          className="text-xs text-destructive mt-1 hover:underline flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="glass-card p-6 space-y-4">
                  <h2 className="font-display font-semibold">Basic Info</h2>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/artist/</span>
                      <Input
                        id="username"
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                        placeholder="yourname"
                        className="pl-16"
                        maxLength={30}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">3–30 chars. Lowercase letters, numbers, - or _ only.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="display_name"
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="Your Artist Name"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea
                      id="bio"
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell fans about yourself..."
                      rows={3}
                      maxLength={300}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{form.bio.length}/300</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="glass-card p-6 space-y-4">
                  <h2 className="font-display font-semibold">Social Media</h2>
                  {[
                    { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/yourname" },
                    { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
                    { key: "twitter_url", label: "X (Twitter)", placeholder: "https://x.com/yourname" },
                    { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/yourname" },
                    { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        value={form[key as keyof ArtistProfile] as string}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        type="url"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* ── LINKS TAB ── */}
            <TabsContent value="links">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-display font-semibold">Custom Buttons</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Add links to anything — merch, events, website, etc.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addButton}>
                      <Plus className="w-4 h-4 mr-1" /> Add Button
                    </Button>
                  </div>

                  {customButtons.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-xl">
                      <Link2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No custom buttons yet.</p>
                      <Button variant="ghost" size="sm" onClick={addButton} className="mt-3">
                        <Plus className="w-4 h-4 mr-1" /> Add your first button
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customButtons.map((btn, i) => (
                        <div key={btn.id} className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl border border-border">
                          <GripVertical className="w-5 h-5 text-muted-foreground mt-3 flex-shrink-0" />
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Button Label</Label>
                              <Input
                                value={btn.title}
                                onChange={e => updateButton(btn.id, "title", e.target.value)}
                                placeholder="e.g. Buy Merch"
                                maxLength={60}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">URL</Label>
                              <Input
                                value={btn.url}
                                onChange={e => updateButton(btn.id, "url", e.target.value)}
                                placeholder="https://..."
                                type="url"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeButton(btn.id, btn.isNew)}
                            className="text-muted-foreground hover:text-destructive transition-colors mt-3 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Music releases</strong> from your fanlinks are automatically shown on your bio page — no extra setup needed!
                    </p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ── ANALYTICS TAB ── */}
            <TabsContent value="analytics">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {!profileId ? (
                  <div className="glass-card p-12 text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Analytics will appear after you create your page.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: "Total Views", value: analytics.totalViews, icon: Eye, bg: "bg-primary/15", color: "text-primary" },
                        { label: "Total Clicks", value: analytics.totalClicks, icon: MousePointerClick, bg: "bg-accent/15", color: "text-accent" },
                        { label: "Views (7 days)", value: analytics.recentViews, icon: TrendingUp, bg: "bg-green-500/15", color: "text-green-400" },
                      ].map(({ label, value, icon: Icon, bg, color }) => (
                        <div key={label} className="glass-card p-5">
                          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                          </div>
                          <p className="font-display text-2xl font-bold">{value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Conversion rate */}
                    {analytics.totalViews > 0 && (
                      <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Engagement Rate</span>
                          <span className="font-display font-bold text-primary text-lg">
                            {Math.round((analytics.totalClicks / analytics.totalViews) * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.totalClicks} clicks from {analytics.totalViews} profile views
                        </p>
                        <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "hsl(187 100% 50%)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.round((analytics.totalClicks / analytics.totalViews) * 100))}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Clicks by type */}
                    {Object.keys(analytics.clicksByType).length > 0 ? (
                      <div className="glass-card p-6">
                        <h3 className="font-display font-semibold mb-4">Clicks by Type</h3>
                        <div className="space-y-4">
                          {Object.entries(analytics.clicksByType)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => {
                              const total = analytics.totalClicks || 1;
                              const pct = Math.round((count / total) * 100);
                              const color = CLICK_TYPE_COLORS[type] || "hsl(187 100% 50%)";
                              return (
                                <div key={type}>
                                  <div className="flex justify-between text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                      <span className="capitalize font-medium">{type}</span>
                                    </div>
                                    <span className="text-muted-foreground tabular-nums">{count} <span className="text-muted-foreground/60">({pct}%)</span></span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: color }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.6, delay: 0.1 }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card p-8 text-center">
                        <MousePointerClick className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No link clicks yet. Share your bio page to start tracking!</p>
                        {bioUrl && (
                          <Button variant="outline" size="sm" className="mt-3" onClick={handleCopyBioLink}>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Copy Bio Link
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditArtistBio;

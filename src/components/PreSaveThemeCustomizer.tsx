import { useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Palette, Sparkles, Music2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PreSaveTheme {
  theme_bg_color: string | null;
  theme_text_color: string | null;
  theme_accent_color: string | null;
  theme_button_color: string | null;
  theme_button_text_color: string | null;
  theme_font_family: string | null;
  theme_bg_image_url: string | null;
  theme_hero_image_url: string | null;
  theme_cta_text: string | null;
  theme_countdown_enabled: boolean | null;
  theme_layout: string | null;
}

const PRESETS: { name: string; theme: Partial<PreSaveTheme> }[] = [
  {
    name: "Midnight",
    theme: {
      theme_bg_color: "#0a0a0f",
      theme_text_color: "#ffffff",
      theme_accent_color: "#a855f7",
      theme_button_color: "#1DB954",
      theme_button_text_color: "#000000",
      theme_font_family: "Inter",
      theme_layout: "classic",
    },
  },
  {
    name: "Sunset",
    theme: {
      theme_bg_color: "#1a0a1f",
      theme_text_color: "#fff5e6",
      theme_accent_color: "#ff6b35",
      theme_button_color: "#ff6b35",
      theme_button_text_color: "#ffffff",
      theme_font_family: "Poppins",
      theme_layout: "cinematic",
    },
  },
  {
    name: "Editorial",
    theme: {
      theme_bg_color: "#f5f3ee",
      theme_text_color: "#0d0d0d",
      theme_accent_color: "#c9a84c",
      theme_button_color: "#0d0d0d",
      theme_button_text_color: "#ffffff",
      theme_font_family: "Playfair Display",
      theme_layout: "editorial",
    },
  },
  {
    name: "Neon",
    theme: {
      theme_bg_color: "#050510",
      theme_text_color: "#e0f7ff",
      theme_accent_color: "#00e5ff",
      theme_button_color: "#00e5ff",
      theme_button_text_color: "#050510",
      theme_font_family: "Inter",
      theme_layout: "minimal",
    },
  },
];

const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Space Grotesk", "Sora"];
const LAYOUTS = [
  { value: "classic", label: "Classic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "editorial", label: "Editorial" },
  { value: "minimal", label: "Minimal" },
];

interface Props {
  preSaveId: string;
  theme: PreSaveTheme;
  onChange: (patch: Partial<PreSaveTheme>) => void;
}

const ColorField = ({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        className="w-11 h-11 rounded-lg border border-border cursor-pointer bg-transparent"
      />
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fallback}
        className="flex-1 font-mono text-sm h-11"
        maxLength={9}
      />
    </div>
  </div>
);

const PreSaveThemeCustomizer = ({ preSaveId, theme, onChange }: Props) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<"bg" | "hero" | null>(null);

  const set = useCallback((patch: Partial<PreSaveTheme>) => onChange(patch), [onChange]);

  const upload = async (file: File, kind: "bg" | "hero") => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB");
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/presave-${preSaveId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("link-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("link-assets").getPublicUrl(path);
      set(kind === "bg" ? { theme_bg_image_url: data.publicUrl } : { theme_hero_image_url: data.publicUrl });
      toast.success("Uploaded");
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Customize Pre-Save Page</h2>
      </div>

      {/* Presets */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Quick presets
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => set(p.theme)}
              className="group rounded-xl border border-border hover:border-primary/50 p-3 text-left transition-colors"
              style={{ backgroundColor: p.theme.theme_bg_color || undefined }}
            >
              <div className="flex gap-1 mb-2">
                {[p.theme.theme_button_color, p.theme.theme_accent_color, p.theme.theme_text_color]
                  .filter(Boolean)
                  .map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c! }} />
                  ))}
              </div>
              <p className="text-xs font-semibold" style={{ color: p.theme.theme_text_color || undefined }}>
                {p.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ColorField label="Background" value={theme.theme_bg_color} fallback="#0a0a0f" onChange={(v) => set({ theme_bg_color: v })} />
        <ColorField label="Text" value={theme.theme_text_color} fallback="#ffffff" onChange={(v) => set({ theme_text_color: v })} />
        <ColorField label="Accent" value={theme.theme_accent_color} fallback="#a855f7" onChange={(v) => set({ theme_accent_color: v })} />
        <ColorField label="Button" value={theme.theme_button_color} fallback="#1DB954" onChange={(v) => set({ theme_button_color: v })} />
        <ColorField label="Button text" value={theme.theme_button_text_color} fallback="#000000" onChange={(v) => set({ theme_button_text_color: v })} />
      </div>

      {/* Font & layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Font family</Label>
          <Select value={theme.theme_font_family || "Inter"} onValueChange={(v) => set({ theme_font_family: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Layout</Label>
          <Select value={theme.theme_layout || "classic"} onValueChange={(v) => set({ theme_layout: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYOUTS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CTA + countdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Call-to-action text</Label>
          <Input
            value={theme.theme_cta_text || ""}
            placeholder="Pre-Save on Spotify"
            onChange={(e) => set({ theme_cta_text: e.target.value || null })}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <Label className="text-sm">Show countdown</Label>
            <p className="text-xs text-muted-foreground">Display release-day timer</p>
          </div>
          <Switch
            checked={theme.theme_countdown_enabled ?? true}
            onCheckedChange={(v) => set({ theme_countdown_enabled: v })}
          />
        </div>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          { kind: "bg" as const, label: "Background image", url: theme.theme_bg_image_url, Icon: ImageIcon },
          { kind: "hero" as const, label: "Hero image", url: theme.theme_hero_image_url, Icon: Music2 },
        ]).map(({ kind, label, url, Icon }) => (
          <div key={kind}>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-secondary flex items-center justify-center shrink-0">
                {url ? (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                {uploading === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="text-xs">{url ? "Replace" : "Upload"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], kind)}
                />
              </label>
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(kind === "bg" ? { theme_bg_image_url: null } : { theme_hero_image_url: null })
                  }
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Changes apply when you click <span className="font-semibold text-foreground">Save Changes</span> at the top.
      </p>
    </div>
  );
};

export default PreSaveThemeCustomizer;

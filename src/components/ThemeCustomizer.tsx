import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Save, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LinkTheme {
  id?: string;
  link_id: string;
  background_color: string;
  button_color: string;
  text_color: string;
  font_family: string;
  layout_style: string;
  theme_mode: string;
  logo_url: string | null;
  background_image_url: string | null;
}

const DEFAULT_THEME: Omit<LinkTheme, "link_id"> = {
  background_color: "#000000",
  button_color: "#1DB954",
  text_color: "#ffffff",
  font_family: "Inter",
  layout_style: "card",
  theme_mode: "dark",
  logo_url: null,
  background_image_url: null,
};

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
];

const LAYOUT_OPTIONS = [
  { value: "card", label: "Card Layout" },
  { value: "list", label: "List Layout" },
  { value: "minimal", label: "Minimal Layout" },
];

interface ThemeCustomizerProps {
  linkId: string;
  onChange?: (theme: LinkTheme) => void;
}

const ThemeCustomizer = ({ linkId, onChange }: ThemeCustomizerProps) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<LinkTheme>({ ...DEFAULT_THEME, link_id: linkId });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  useEffect(() => {
    if (linkId) loadTheme();
  }, [linkId]);

  const loadTheme = async () => {
    try {
      const { data } = await supabase
        .from("link_themes")
        .select("*")
        .eq("link_id", linkId)
        .maybeSingle();

      if (data) {
        setTheme(data as LinkTheme);
        onChange?.(data as LinkTheme);
      }
    } catch (e) {
      console.error("Error loading theme:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = useCallback((updates: Partial<LinkTheme>) => {
    setTheme(prev => {
      const next = { ...prev, ...updates };
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("link_themes")
        .upsert({
          link_id: linkId,
          background_color: theme.background_color,
          button_color: theme.button_color,
          text_color: theme.text_color,
          font_family: theme.font_family,
          layout_style: theme.layout_style,
          theme_mode: theme.theme_mode,
          logo_url: theme.logo_url,
          background_image_url: theme.background_image_url,
        }, { onConflict: "link_id" });

      if (error) throw error;
      toast.success("Theme saved!");
    } catch (e) {
      console.error("Error saving theme:", e);
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "background") => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    const setter = type === "logo" ? setUploadingLogo : setUploadingBg;
    setter(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${linkId}/${type}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("link-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("link-assets")
        .getPublicUrl(path);

      updateTheme(type === "logo" ? { logo_url: publicUrl } : { background_image_url: publicUrl });
      toast.success(`${type === "logo" ? "Logo" : "Background"} uploaded!`);
    } catch (e) {
      console.error("Upload error:", e);
      toast.error("Upload failed");
    } finally {
      setter(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Theme Customization</h2>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1.5 block text-sm">Background Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.background_color}
              onChange={(e) => updateTheme({ background_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={theme.background_color}
              onChange={(e) => updateTheme({ background_color: e.target.value })}
              className="flex-1 font-mono text-sm h-10"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Button Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.button_color}
              onChange={(e) => updateTheme({ button_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={theme.button_color}
              onChange={(e) => updateTheme({ button_color: e.target.value })}
              className="flex-1 font-mono text-sm h-10"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Text Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.text_color}
              onChange={(e) => updateTheme({ text_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={theme.text_color}
              onChange={(e) => updateTheme({ text_color: e.target.value })}
              className="flex-1 font-mono text-sm h-10"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Font & Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block text-sm">Font Family</Label>
          <Select value={theme.font_family} onValueChange={(v) => updateTheme({ font_family: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map(f => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Layout Style</Label>
          <Select value={theme.layout_style} onValueChange={(v) => updateTheme({ layout_style: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Theme Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Dark Mode</Label>
          <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
        </div>
        <Switch
          checked={theme.theme_mode === "dark"}
          onCheckedChange={(checked) => updateTheme({
            theme_mode: checked ? "dark" : "light",
            background_color: checked ? "#000000" : "#ffffff",
            text_color: checked ? "#ffffff" : "#000000",
          })}
        />
      </div>

      {/* Logo Upload */}
      <div>
        <Label className="mb-1.5 block text-sm">Custom Logo</Label>
        <div className="flex items-center gap-3">
          {theme.logo_url && (
            <img src={theme.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
          )}
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm">{theme.logo_url ? "Change Logo" : "Upload Logo"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")}
            />
          </label>
          {theme.logo_url && (
            <Button variant="ghost" size="sm" onClick={() => updateTheme({ logo_url: null })}>Remove</Button>
          )}
        </div>
      </div>

      {/* Background Image Upload */}
      <div>
        <Label className="mb-1.5 block text-sm">Background Image</Label>
        <div className="flex items-center gap-3">
          {theme.background_image_url && (
            <img src={theme.background_image_url} alt="Background" className="w-12 h-12 rounded-lg object-cover border border-border" />
          )}
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
            {uploadingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm">{theme.background_image_url ? "Change Background" : "Upload Background"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "background")}
            />
          </label>
          {theme.background_image_url && (
            <Button variant="ghost" size="sm" onClick={() => updateTheme({ background_image_url: null })}>Remove</Button>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Theme
      </Button>
    </div>
  );
};

export default ThemeCustomizer;

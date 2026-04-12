import { Music2 } from "lucide-react";
import type { LinkTheme } from "./ThemeCustomizer";

interface ThemePreviewProps {
  theme: Partial<LinkTheme>;
  title?: string;
  artist?: string;
  artworkUrl?: string | null;
}

const SAMPLE_PLATFORMS = [
  { name: "Spotify", color: "#1DB954" },
  { name: "Apple Music", color: "#FA243C" },
  { name: "Audiomack", color: "#FFA500" },
];

const ThemePreview = ({ theme, title = "Track Title", artist = "Artist Name", artworkUrl }: ThemePreviewProps) => {
  const bg = theme.background_color || "#000000";
  const text = theme.text_color || "#ffffff";
  const btn = theme.button_color || "#1DB954";
  const font = theme.font_family || "Inter";
  const layout = theme.layout_style || "card";

  return (
    <div className="glass-card p-4 overflow-hidden">
      <p className="text-xs text-muted-foreground mb-3 font-medium">Live Preview</p>
      <div
        className="relative rounded-xl overflow-hidden border border-border/30 transition-all duration-300"
        style={{
          backgroundColor: bg,
          color: text,
          fontFamily: font,
          minHeight: 320,
        }}
      >
        {/* Background image */}
        {theme.background_image_url && (
          <img
            src={theme.background_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}

        <div className="relative z-10 flex flex-col items-center p-6 text-center">
          {/* Logo */}
          {theme.logo_url && (
            <img src={theme.logo_url} alt="Logo" className="w-8 h-8 rounded-lg mb-4 object-cover" />
          )}

          {/* Artwork */}
          <div className="mb-4">
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={title}
                className={`object-cover shadow-lg mx-auto ${
                  layout === "minimal" ? "w-24 h-24 rounded-xl" : "w-32 h-32 rounded-2xl"
                }`}
              />
            ) : (
              <div className={`flex items-center justify-center bg-white/10 mx-auto ${
                layout === "minimal" ? "w-24 h-24 rounded-xl" : "w-32 h-32 rounded-2xl"
              }`}>
                <Music2 className="w-10 h-10" style={{ color: text, opacity: 0.5 }} />
              </div>
            )}
          </div>

          {/* Info */}
          <h3 className="font-bold text-lg mb-0.5" style={{ color: text }}>{title}</h3>
          <p className="text-sm mb-5" style={{ color: text, opacity: 0.7 }}>{artist}</p>

          {/* Buttons */}
          <div className={`w-full space-y-2 ${layout === "list" ? "max-w-full" : "max-w-[200px]"}`}>
            {SAMPLE_PLATFORMS.map((p) => (
              <div
                key={p.name}
                className={`flex items-center gap-3 rounded-lg transition-all cursor-default ${
                  layout === "minimal"
                    ? "px-3 py-2 text-xs"
                    : "px-4 py-2.5 text-sm"
                }`}
                style={{
                  backgroundColor: btn,
                  color: getContrastColor(btn),
                  borderLeft: layout === "list" ? `3px solid ${p.color}` : undefined,
                }}
              >
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export default ThemePreview;

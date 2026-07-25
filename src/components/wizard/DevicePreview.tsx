import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface DevicePreviewProps {
  artworkUrl?: string | null;
  title?: string;
  artist?: string;
  subtitle?: string;
  platforms?: { name: string; icon?: ReactNode; color?: string; hasUrl: boolean }[];
  accent?: string; // hex or css color
  footerNote?: string;
}

const DevicePreview = ({
  artworkUrl,
  title,
  artist,
  subtitle,
  platforms = [],
  accent,
  footerNote,
}: DevicePreviewProps) => {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Live preview</p>
          <p className="text-sm font-medium">How fans will see it</p>
        </div>
        <div className="flex items-center rounded-full border border-border/60 bg-secondary/40 p-1">
          <button
            onClick={() => setDevice("phone")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              device === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone
          </button>
          <button
            onClick={() => setDevice("desktop")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            Web
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <motion.div
          key={device}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "relative overflow-hidden bg-background",
            device === "phone"
              ? "w-[260px] rounded-[2.25rem] border-[10px] border-foreground/90 shadow-2xl"
              : "w-full rounded-xl border-2 border-foreground/70 shadow-xl"
          )}
          style={{
            aspectRatio: device === "phone" ? "9 / 19" : "16 / 10",
          }}
        >
          {device === "phone" && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-24 bg-foreground/90 rounded-b-2xl z-10" />
          )}

          {/* Preview body */}
          <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
            <div
              className="relative min-h-full p-4"
              style={{
                background: artworkUrl
                  ? `linear-gradient(180deg, hsl(var(--background)/0.2), hsl(var(--background)) 60%), url(${artworkUrl}) center/cover`
                  : "var(--gradient-hero)",
              }}
            >
              <div className={cn("flex flex-col items-center text-center", device === "phone" ? "pt-6" : "pt-4")}>
                <div
                  className={cn(
                    "rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-secondary flex items-center justify-center",
                    device === "phone" ? "w-32 h-32" : "w-40 h-40"
                  )}
                  style={{ boxShadow: `0 20px 60px -20px ${accent || "hsl(var(--primary)/0.6)"}` }}
                >
                  {artworkUrl ? (
                    <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-muted-foreground text-xs">Artwork</span>
                  )}
                </div>

                <h3 className={cn("font-display font-bold mt-4 leading-tight", device === "phone" ? "text-base" : "text-xl")}>
                  {title || "Track title"}
                </h3>
                <p className={cn("text-muted-foreground", device === "phone" ? "text-xs" : "text-sm")}>
                  {artist || "Artist name"}
                </p>
                {subtitle && (
                  <p className="text-[10px] uppercase tracking-widest text-primary mt-1.5">{subtitle}</p>
                )}

                <div className={cn("w-full mt-4 space-y-1.5", device === "desktop" && "max-w-xs mx-auto")}>
                  {platforms.slice(0, device === "phone" ? 6 : 8).map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-opacity",
                        p.hasUrl ? "bg-white text-black" : "bg-white/30 text-white/60 backdrop-blur"
                      )}
                    >
                      <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: p.color }}>
                        {p.icon}
                      </span>
                      <span className="flex-1 text-left truncate">{p.name}</span>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider", p.hasUrl ? "text-black/60" : "text-white/50")}>
                        {p.hasUrl ? "Play" : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {footerNote && (
                  <p className="text-[9px] text-white/70 mt-4">{footerNote}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DevicePreview;

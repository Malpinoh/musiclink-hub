import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeMusicIcon,
  DeezerIcon,
  AudiomackIcon,
  BoomplayIcon,
  TidalIcon,
  AmazonMusicIcon,
  SoundCloudIcon,
} from "@/components/icons/PlatformIcons";

export interface StreamingPlatform {
  name: string;
  url?: string;
}

type Variant = "grid" | "list" | "cinematic";

interface StreamingPlatformsProps {
  platforms?: StreamingPlatform[];
  variant?: Variant;
  className?: string;
  onClick?: (name: string, url?: string) => void;
}

const DEFAULT_PLATFORMS: StreamingPlatform[] = [
  { name: "Spotify" },
  { name: "Apple Music" },
  { name: "YouTube Music" },
  { name: "Deezer" },
  { name: "Audiomack" },
  { name: "Boomplay" },
  { name: "Tidal" },
  { name: "Amazon Music" },
];

const META: Record<
  string,
  { Icon: React.FC<{ className?: string }>; brand: string; bg: string; ring: string }
> = {
  spotify: { Icon: SpotifyIcon, brand: "#1DB954", bg: "#0b1f14", ring: "rgba(29,185,84,0.4)" },
  apple_music: { Icon: AppleMusicIcon, brand: "#FA243C", bg: "#1a0a0e", ring: "rgba(250,36,60,0.4)" },
  youtube_music: { Icon: YouTubeMusicIcon, brand: "#FF0000", bg: "#1a0808", ring: "rgba(255,0,0,0.4)" },
  deezer: { Icon: DeezerIcon, brand: "#A238FF", bg: "#140a1f", ring: "rgba(162,56,255,0.4)" },
  audiomack: { Icon: AudiomackIcon, brand: "#FFA200", bg: "#1f1608", ring: "rgba(255,162,0,0.4)" },
  boomplay: { Icon: BoomplayIcon, brand: "#E72A3A", bg: "#1f0a0c", ring: "rgba(231,42,58,0.4)" },
  tidal: { Icon: TidalIcon, brand: "#ffffff", bg: "#0a0a0a", ring: "rgba(255,255,255,0.3)" },
  amazon_music: { Icon: AmazonMusicIcon, brand: "#25D1DA", bg: "#08181f", ring: "rgba(37,209,218,0.4)" },
  soundcloud: { Icon: SoundCloudIcon, brand: "#FF5500", bg: "#1f0d05", ring: "rgba(255,85,0,0.4)" },
};

const key = (n: string) => n.toLowerCase().replace(/[\s-]/g, "_");

const StreamingPlatforms = ({
  platforms = DEFAULT_PLATFORMS,
  variant = "grid",
  className = "",
  onClick,
}: StreamingPlatformsProps) => {
  const list = platforms.map((p) => ({ ...p, meta: META[key(p.name)] })).filter((p) => p.meta);

  if (variant === "list") {
    return (
      <div className={`w-full space-y-2 ${className}`}>
        {list.map((p, i) => {
          const { Icon, brand, ring } = p.meta;
          const Comp: any = p.url ? motion.a : motion.button;
          return (
            <Comp
              key={p.name}
              href={p.url}
              target={p.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => onClick?.(p.name, p.url)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2, boxShadow: `0 8px 30px -8px ${ring}` }}
              whileTap={{ scale: 0.98 }}
              className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-colors text-left"
              style={{ borderLeft: `3px solid ${brand}` }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/40 shrink-0">
                <Icon className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-[11px] uppercase tracking-widest opacity-50">Play now</p>
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full opacity-90 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: brand, color: brand === "#ffffff" ? "#000" : "#fff" }}
              >
                Play
              </span>
            </Comp>
          );
        })}
      </div>
    );
  }

  if (variant === "cinematic") {
    return (
      <div className={`w-full grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
        {list.map((p, i) => {
          const { Icon, brand, ring } = p.meta;
          const Comp: any = p.url ? motion.a : motion.button;
          return (
            <Comp
              key={p.name}
              href={p.url}
              target={p.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => onClick?.(p.name, p.url)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="group relative overflow-hidden rounded-sm border border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur px-5 py-4 flex items-center gap-3 transition-colors"
              style={{ boxShadow: `inset 0 0 0 0 ${ring}` }}
            >
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"
                style={{ backgroundColor: brand }}
              />
              <Icon className="w-7 h-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold uppercase tracking-wide text-sm truncate">{p.name}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Listen</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80 transition-opacity" />
            </Comp>
          );
        })}
      </div>
    );
  }

  // grid (default) — premium tiles
  return (
    <div className={`w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 ${className}`}>
      {list.map((p, i) => {
        const { Icon, brand, bg, ring } = p.meta;
        const Comp: any = p.url ? motion.a : motion.button;
        return (
          <Comp
            key={p.name}
            href={p.url}
            target={p.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => onClick?.(p.name, p.url)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ y: -3, boxShadow: `0 12px 40px -12px ${ring}` }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 p-3 flex flex-col items-center gap-2 backdrop-blur-md transition-all"
            style={{ backgroundColor: bg }}
          >
            <span
              className="absolute -top-8 -right-8 w-20 h-20 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity"
              style={{ backgroundColor: brand }}
            />
            <span className="relative w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </span>
            <span className="relative text-[11px] font-semibold text-white/90 text-center leading-tight">
              {p.name}
            </span>
          </Comp>
        );
      })}
    </div>
  );
};

export default StreamingPlatforms;

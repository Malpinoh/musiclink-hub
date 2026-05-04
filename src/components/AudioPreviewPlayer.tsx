import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AudioPreviewPlayerProps {
  audioUrl: string;
  artworkUrl?: string;
  title?: string;
  artist?: string;
  previewStart?: number;
  previewEnd?: number;
  waveformData?: number[];
}

const BAR_COUNT = 48;
const DEFAULT_MAX = 30;

const AudioPreviewPlayer = ({
  audioUrl,
  artworkUrl,
  title,
  artist,
  previewStart = 0,
  previewEnd,
  waveformData,
}: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [tapped, setTapped] = useState(false);

  const clipStart = previewStart;
  const clipEnd = previewEnd ?? Math.min((duration || DEFAULT_MAX), clipStart + DEFAULT_MAX);
  const clipLen = clipEnd - clipStart;

  // Generate simple waveform if none provided
  const bars = useMemo(() => {
    if (waveformData && waveformData.length >= BAR_COUNT) {
      const step = Math.floor(waveformData.length / BAR_COUNT);
      return Array.from({ length: BAR_COUNT }, (_, i) => waveformData[i * step] ?? 0.3);
    }
    // Pseudo-random deterministic waveform based on URL
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) seed = (seed * 31 + audioUrl.charCodeAt(i)) & 0xffffff;
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      seed = (seed * 16807 + 1) & 0x7fffffff;
      return 0.2 + (seed % 100) / 130;
    });
  }, [waveformData, audioUrl]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = clipStart; }
    setPlaying(false);
    setProgress(0);
    setEnded(true);
  }, [clipStart]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setTapped(true);
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      setEnded(false);
      if (a.currentTime < clipStart || a.currentTime >= clipEnd) a.currentTime = clipStart;
      a.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing, clipStart, clipEnd]);

  const replay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = clipStart;
    setEnded(false);
    setProgress(0);
    a.play().catch(() => {});
    setPlaying(true);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => setDuration(a.duration);
    const onTime = () => {
      const t = a.currentTime - clipStart;
      setProgress(Math.max(0, t));
      if (a.currentTime >= clipEnd) stop();
    };
    const onEnd = () => stop();
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [clipStart, clipEnd, stop]);

  // Fade in/out effect
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const fade = () => {
      const t = a.currentTime;
      const fadeIn = Math.min(1, (t - clipStart) / 1);
      const fadeOut = Math.min(1, (clipEnd - t) / 1);
      a.volume = muted ? 0 : Math.max(0, Math.min(1, fadeIn, fadeOut));
    };
    const id = setInterval(fade, 50);
    return () => clearInterval(id);
  }, [clipStart, clipEnd, muted]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !clipLen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = clipStart + x * clipLen;
    setProgress(x * clipLen);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressRatio = clipLen ? progress / clipLen : 0;

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl" />
      <div className="absolute inset-0 border border-border/30 rounded-2xl" />

      {/* Glow effect when playing */}
      <AnimatePresence>
        {playing && (
          <motion.div
            className="absolute -inset-1 bg-primary/10 blur-xl rounded-3xl z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4">
        {/* Top row: artwork + info + controls */}
        <div className="flex items-center gap-3 mb-4">
          {/* Album art with pulse */}
          {artworkUrl && (
            <motion.div
              className="relative flex-shrink-0"
              animate={playing ? { scale: [1, 1.03, 1] } : {}}
              transition={playing ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              <img
                src={artworkUrl}
                alt={title || "Preview"}
                className="w-14 h-14 rounded-xl object-cover shadow-lg"
              />
              {playing && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-primary/50"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          )}

          <div className="flex-1 min-w-0">
            {title && <p className="text-sm font-semibold truncate">{title}</p>}
            {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Volume2 className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                Preview · {Math.round(clipLen)}s
              </span>
            </div>
          </div>

          {/* Play button */}
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={muted ? () => setMuted(false) : () => setMuted(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </motion.button>

            <AnimatePresence mode="wait">
              {ended ? (
                <motion.button
                  key="replay"
                  onClick={replay}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <RotateCcw className="w-5 h-5 text-primary-foreground" />
                </motion.button>
              ) : (
                <motion.button
                  key="play"
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  {playing ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Waveform seek bar */}
        <div className="cursor-pointer" onClick={handleSeek}>
          <div className="flex items-end gap-[1px] h-10 mb-1">
            {bars.map((v, i) => {
              const barRatio = i / BAR_COUNT;
              const isPlayed = barRatio <= progressRatio;
              return (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-100 ${
                    isPlayed ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                  style={{ height: `${Math.max(10, v * 100)}%` }}
                  animate={
                    playing && isPlayed
                      ? { scaleY: [1, 1.1, 1], transition: { duration: 0.4, delay: i * 0.01 } }
                      : {}
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>{fmt(progress)}</span>
          <span>{fmt(clipLen)}</span>
        </div>

        {/* Tap to play hint */}
        <AnimatePresence>
          {!tapped && (
            <motion.p
              className="text-center text-[10px] text-muted-foreground/60 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Tap play to listen to a preview
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </motion.div>
  );
};

export default AudioPreviewPlayer;

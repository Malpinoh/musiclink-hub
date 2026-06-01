import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
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

const AudioPreviewPlayer = ({
  audioUrl,
  artworkUrl,
  title,
  artist,
  previewStart = 0,
  previewEnd,
  waveformData,
}: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);

  const clipStart = previewStart || 0;
  const clipEnd = previewEnd ?? duration ?? 30;
  const clipLen = Math.max(0, clipEnd - clipStart);

  const bars = useMemo(() => {
    if (waveformData && waveformData.length >= BAR_COUNT) {
      const step = Math.floor(waveformData.length / BAR_COUNT);
      return Array.from({ length: BAR_COUNT }, (_, i) => waveformData[i * step] ?? 0.3);
    }
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) seed = (seed * 31 + audioUrl.charCodeAt(i)) & 0xffffff;
    return Array.from({ length: BAR_COUNT }, () => {
      seed = (seed * 16807 + 1) & 0x7fffffff;
      return 0.2 + (seed % 100) / 130;
    });
  }, [waveformData, audioUrl]);

  // Audio lifecycle: one element, attach all listeners once.
  useEffect(() => {
    const a = new Audio();
    // iOS Safari + PWA support
    a.preload = "metadata";
    a.crossOrigin = "anonymous";
    (a as any).playsInline = true;
    a.setAttribute("playsinline", "");
    a.src = audioUrl;
    audioRef.current = a;

    const onMeta = () => setDuration(a.duration || 0);
    const onTime = () => {
      setProgress(Math.max(0, a.currentTime - clipStart));
      if (previewEnd != null && a.currentTime >= previewEnd) {
        a.pause();
        a.currentTime = clipStart;
        setPlaying(false);
        setEnded(true);
      }
    };
    const onEnded = () => { setPlaying(false); setEnded(true); setProgress(0); };
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onPlay = () => { setPlaying(true); setError(false); };
    const onPause = () => setPlaying(false);
    const onError = () => { setError(true); setPlaying(false); setBuffering(false); };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("canplaythrough", onCanPlay);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);

    return () => {
      a.pause();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("canplaythrough", onCanPlay);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.src = "";
      audioRef.current = null;
    };
  }, [audioUrl, clipStart, previewEnd]);

  // Mute sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    setError(false);
    if (playing) {
      a.pause();
      return;
    }
    setEnded(false);
    if (a.currentTime < clipStart || (previewEnd != null && a.currentTime >= previewEnd)) {
      a.currentTime = clipStart;
    }
    setBuffering(true);
    try {
      await a.play();
      setBuffering(false);
    } catch (e) {
      setError(true);
      setBuffering(false);
    }
  }, [playing, clipStart, previewEnd]);

  const replay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = clipStart;
    setProgress(0);
    setEnded(false);
    setError(false);
    try { await a.play(); } catch { setError(true); }
  }, [clipStart]);

  const handleRetry = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setError(false);
    a.load();
  }, []);

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

  const progressRatio = clipLen ? Math.min(1, progress / clipLen) : 0;

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl" />
      <div className="absolute inset-0 border border-border/30 rounded-2xl" />

      <div className="relative z-10 p-4">
        {error && (
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive flex-1">Failed to load audio</p>
            <button onClick={handleRetry} className="text-xs font-medium text-destructive underline">Retry</button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          {artworkUrl && (
            <img
              src={artworkUrl}
              alt={title || "Preview"}
              loading="lazy"
              decoding="async"
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl object-cover shadow-lg flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            {title && <p className="text-sm font-semibold truncate">{title}</p>}
            {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Volume2 className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                Preview · {Math.round(clipLen) || 30}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMuted((m) => !m)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

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
                  aria-label="Replay"
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
                  disabled={buffering}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {buffering ? (
                    <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                  ) : playing ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="cursor-pointer" onClick={handleSeek} role="slider" aria-label="Seek">
          <div className="flex items-end gap-[1px] h-10 mb-1">
            {bars.map((v, i) => {
              const isPlayed = i / BAR_COUNT <= progressRatio;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isPlayed ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                  style={{ height: `${Math.max(10, v * 100)}%` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>{fmt(progress)}</span>
          <span>{fmt(clipLen)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AudioPreviewPlayer;

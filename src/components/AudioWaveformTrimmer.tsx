import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Scissors, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface AudioWaveformTrimmerProps {
  audioUrl: string;
  onTrimChange: (start: number, end: number, waveform: number[]) => void;
  initialStart?: number;
  initialEnd?: number;
}

const MAX_CLIP = 30;
const BAR_COUNT = 80;

const generateWaveform = async (url: string): Promise<number[]> => {
  const ctx = new AudioContext();
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const audio = await ctx.decodeAudioData(buf);
  const raw = audio.getChannelData(0);
  const step = Math.floor(raw.length / BAR_COUNT);
  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += Math.abs(raw[i * step + j]);
    }
    peaks.push(sum / step);
  }
  const max = Math.max(...peaks, 0.01);
  ctx.close();
  return peaks.map((p) => p / max);
};

const AudioWaveformTrimmer = ({
  audioUrl,
  onTrimChange,
  initialStart = 0,
  initialEnd = 30,
}: AudioWaveformTrimmerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const dragging = useRef<"start" | "end" | null>(null);

  // Generate waveform on mount
  useEffect(() => {
    setLoading(true);
    generateWaveform(audioUrl)
      .then((w) => {
        setWaveform(w);
        onTrimChange(start, end, w);
      })
      .catch(() => setWaveform(Array(BAR_COUNT).fill(0.3)))
      .finally(() => setLoading(false));
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => {
      setDuration(audio.duration);
      const s = Math.min(initialStart, Math.max(audio.duration - MAX_CLIP, 0));
      const e = Math.min(s + MAX_CLIP, audio.duration);
      setStart(s);
      setEnd(e);
    };
    const onTime = () => {
      const t = audio.currentTime;
      setProgress(t);
      if (t >= end) {
        audio.pause();
        audio.currentTime = start;
        setPlaying(false);
        setProgress(start);
      }
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [end, start, initialStart]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (audio.currentTime < start || audio.currentTime >= end) audio.currentTime = start;
      audio.play();
      setPlaying(true);
    }
  };

  const snapTo30 = () => {
    if (!duration) return;
    // Auto-select: skip first 20s if possible
    const s = duration > 50 ? 20 : 0;
    const e = Math.min(s + MAX_CLIP, duration);
    setStart(s);
    setEnd(e);
    onTrimChange(s, e, waveform);
  };

  const reset = () => {
    setStart(0);
    setEnd(Math.min(MAX_CLIP, duration));
    onTrimChange(0, Math.min(MAX_CLIP, duration), waveform);
  };

  // Dragging logic
  const getTimeFromX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !duration) return 0;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const onPointerDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const t = getTimeFromX(e.clientX);
    if (dragging.current === "start") {
      const newStart = Math.max(0, Math.min(t, end - 5));
      const clampedEnd = Math.min(newStart + MAX_CLIP, duration);
      setStart(newStart);
      if (end - newStart > MAX_CLIP) setEnd(clampedEnd);
    } else {
      const newEnd = Math.min(duration, Math.max(t, start + 5));
      const clampedStart = Math.max(newEnd - MAX_CLIP, 0);
      setEnd(newEnd);
      if (newEnd - start > MAX_CLIP) setStart(clampedStart);
    }
  };

  const onPointerUp = () => {
    if (dragging.current) {
      dragging.current = null;
      onTrimChange(start, end, waveform);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 0;
  const progressPct = duration ? (progress / duration) * 100 : 0;

  return (
    <motion.div
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Audio Trimmer</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {fmt(start)} – {fmt(end)} ({Math.round(end - start)}s)
        </span>
      </div>

      {/* Waveform */}
      <div
        ref={containerRef}
        className="relative h-24 select-none touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-16">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-muted-foreground/20 rounded-full animate-pulse"
                  style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Dimmed outside regions */}
            <div
              className="absolute inset-y-0 left-0 bg-background/60 z-10 pointer-events-none"
              style={{ width: `${startPct}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-background/60 z-10 pointer-events-none"
              style={{ width: `${100 - endPct}%` }}
            />

            {/* Waveform bars */}
            <div className="absolute inset-0 flex items-center gap-[1px]">
              {waveform.map((v, i) => {
                const barPct = (i / BAR_COUNT) * 100;
                const inRange = barPct >= startPct && barPct <= endPct;
                const isPlayed = barPct <= progressPct;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors duration-150 ${
                      inRange
                        ? isPlayed
                          ? "bg-primary"
                          : "bg-primary/40"
                        : "bg-muted-foreground/15"
                    }`}
                    style={{ height: `${Math.max(8, v * 100)}%` }}
                  />
                );
              })}
            </div>

            {/* Progress line */}
            {playing && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                style={{ left: `${progressPct}%` }}
              />
            )}

            {/* Start handle */}
            <div
              className="absolute top-0 bottom-0 w-3 z-30 cursor-col-resize group"
              style={{ left: `calc(${startPct}% - 6px)` }}
              onPointerDown={onPointerDown("start")}
            >
              <div className="h-full w-1 mx-auto rounded-full bg-primary group-hover:bg-primary/80 transition-colors" />
              <div className="absolute top-1/2 -translate-y-1/2 -left-0.5 w-4 h-8 rounded bg-primary/90 flex items-center justify-center">
                <div className="w-0.5 h-3 bg-primary-foreground/70 rounded-full" />
              </div>
            </div>

            {/* End handle */}
            <div
              className="absolute top-0 bottom-0 w-3 z-30 cursor-col-resize group"
              style={{ left: `calc(${endPct}% - 6px)` }}
              onPointerDown={onPointerDown("end")}
            >
              <div className="h-full w-1 mx-auto rounded-full bg-primary group-hover:bg-primary/80 transition-colors" />
              <div className="absolute top-1/2 -translate-y-1/2 -left-0.5 w-4 h-8 rounded bg-primary/90 flex items-center justify-center">
                <div className="w-0.5 h-3 bg-primary-foreground/70 rounded-full" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlay}
          disabled={loading}
          className="gap-1.5"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {playing ? "Pause" : "Preview"}
        </Button>
        <Button variant="ghost" size="sm" onClick={snapTo30} disabled={loading} className="gap-1.5">
          <Scissors className="w-3.5 h-3.5" />
          Auto 30s
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={loading} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </motion.div>
  );
};

export default AudioWaveformTrimmer;

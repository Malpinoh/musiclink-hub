import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface AudioPreviewPlayerProps {
  audioUrl: string;
  maxDuration?: number;
}

const MAX_PREVIEW_SECONDS = 30;

const AudioPreviewPlayer = ({ audioUrl, maxDuration = MAX_PREVIEW_SECONDS }: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const limit = Math.min(duration || maxDuration, maxDuration);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (audio.currentTime >= limit) audio.currentTime = 0;
      audio.play();
      setPlaying(true);
    }
  }, [playing, limit]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setProgress(t);
      // Hard stop at 30 seconds
      if (t >= limit) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        setProgress(0);
      }
    };
    const onEnded = () => stop();

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [limit, stop]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !limit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = x * limit;
    audio.currentTime = Math.min(newTime, limit);
    setProgress(audio.currentTime);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 mt-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Preview (30s)
        </span>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
          aria-label={playing ? "Pause" : "Play"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {playing ? (
            <Pause className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          )}
        </motion.button>

        <div className="flex-1 flex flex-col gap-1">
          <div
            className="h-2.5 bg-secondary rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
              style={{ width: limit ? `${(progress / limit) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(limit)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AudioPreviewPlayer;

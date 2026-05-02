import { useState, useRef } from "react";
import { Upload, Music2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioPreviewUploaderProps {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}

const AudioPreviewUploader = ({ userId, currentUrl, onUploaded }: AudioPreviewUploaderProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const maxSnippet = 30;
  const endTime = Math.min(startTime + maxSnippet, duration);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      toast.error("Please select an audio file (MP3 or WAV)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Audio file must be under 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStartTime(0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("audio-previews").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("audio-previews").getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success("Audio preview uploaded!");
    } catch {
      toast.error("Failed to upload audio");
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setDuration(0);
    setStartTime(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Music2 className="w-4 h-4" />
        Audio Preview (30s snippet)
      </Label>

      {currentUrl && !file && (
        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
          ✓ Audio preview already uploaded
        </div>
      )}

      {!file ? (
        <div
          className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Upload MP3 or WAV (max 10MB)</p>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp3"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <audio ref={audioRef} src={preview!} preload="metadata" onLoadedMetadata={handleLoadedMetadata} />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <Button variant="ghost" size="icon" onClick={clear}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {duration > 30 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Select snippet start ({Math.floor(startTime)}s – {Math.floor(endTime)}s of {Math.floor(duration)}s)
              </p>
              <Slider
                value={[startTime]}
                onValueChange={([v]) => setStartTime(v)}
                max={Math.max(duration - maxSnippet, 0)}
                step={1}
              />
            </div>
          )}

          <Button
            variant="hero"
            className="w-full"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Preview
          </Button>
        </div>
      )}
    </div>
  );
};

export default AudioPreviewUploader;

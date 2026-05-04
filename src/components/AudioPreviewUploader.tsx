import { useState, useRef, lazy, Suspense } from "react";
import { Upload, Music2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AudioWaveformTrimmer = lazy(() => import("@/components/AudioWaveformTrimmer"));

interface AudioPreviewUploaderProps {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string, start: number, end: number, waveform: number[]) => void;
}

const AudioPreviewUploader = ({ userId, currentUrl, onUploaded }: AudioPreviewUploaderProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [waveform, setWaveform] = useState<number[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/aac", "audio/mp4", "audio/x-m4a"];
    if (!validTypes.some(t => f.type === t) && !f.name.match(/\.(mp3|wav|aac|m4a)$/i)) {
      toast.error("Please select MP3, WAV, or AAC");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Audio file must be under 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setTrimStart(0);
    setTrimEnd(30);
  };

  const handleTrimChange = (start: number, end: number, w: number[]) => {
    setTrimStart(start);
    setTrimEnd(end);
    setWaveform(w);
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
      onUploaded(data.publicUrl, trimStart, trimEnd, waveform);
      toast.success("Audio preview uploaded!");
    } catch {
      toast.error("Failed to upload audio");
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setTrimStart(0);
    setTrimEnd(30);
    setWaveform([]);
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
          <p className="text-sm text-muted-foreground">Upload MP3, WAV, or AAC (max 10MB)</p>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp3,audio/aac,audio/mp4,.mp3,.wav,.aac,.m4a"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-center justify-between">
            <p className="text-sm font-medium truncate flex-1">{file.name}</p>
            <Button variant="ghost" size="icon" onClick={clear}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Waveform Trimmer */}
          {preview && (
            <Suspense
              fallback={
                <div className="h-32 rounded-2xl bg-card/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <AudioWaveformTrimmer
                audioUrl={preview}
                onTrimChange={handleTrimChange}
                initialStart={trimStart}
                initialEnd={trimEnd}
              />
            </Suspense>
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

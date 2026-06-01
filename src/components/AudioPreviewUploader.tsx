import { useState, useRef } from "react";
import { Upload, Music2, X, Loader2, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processAudioPreview } from "@/lib/audioProcessing";
import AudioWaveformTrimmer from "@/components/AudioWaveformTrimmer";

interface AudioPreviewUploaderProps {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string, start: number, end: number, waveform: number[]) => void;
  onDeleted?: () => void;
}

const AudioPreviewUploader = ({ userId, currentUrl, onUploaded, onDeleted }: AudioPreviewUploaderProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [uploaded, setUploaded] = useState(false);

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
    setUploaded(false);
  };

  const handleTrimChange = (start: number, end: number, w: number[]) => {
    setTrimStart(start);
    setTrimEnd(end);
    setWaveform(w);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProcessing(true);

    try {
      // Step 1: Process audio — trim, normalize, fade, generate waveform
      toast.info("Processing audio preview...");
      const result = await processAudioPreview(file, trimStart, trimEnd);
      setProcessing(false);

      // Step 2: Upload original to storage (hidden from frontend)
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const originalPath = `original/${userId}/${timestamp}.${ext}`;
      await supabase.storage.from("audio-previews").upload(originalPath, file, {
        cacheControl: "3600",
      });

      // Step 3: Upload processed preview
      const previewPath = `preview/${userId}/${timestamp}.wav`;
      const { error: previewError } = await supabase.storage
        .from("audio-previews")
        .upload(previewPath, result.previewBlob, {
          contentType: "audio/wav",
          cacheControl: "31536000", // 1 year cache
        });

      if (previewError) throw previewError;

      const { data } = supabase.storage.from("audio-previews").getPublicUrl(previewPath);
      
      onUploaded(data.publicUrl, result.actualStart, result.actualEnd, result.waveformData);
      setUploaded(true);
      toast.success("Audio preview processed and uploaded!");
    } catch (err) {
      console.error("Audio processing error:", err);
      toast.error("Failed to process audio. Please try again.");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setTrimStart(0);
    setTrimEnd(30);
    setWaveform([]);
    setUploaded(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Music2 className="w-4 h-4" />
        Audio Preview (30s snippet)
      </Label>

      {currentUrl && !file && (
        <div className="text-xs bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1 text-muted-foreground">Audio preview uploaded</span>
          <Button size="sm" variant="outline" type="button" onClick={() => fileRef.current?.click()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Replace
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => {
              if (onDeleted) onDeleted();
              else onUploaded("", 0, 30, []);
              toast.success("Preview removed");
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      )}

      {!file ? (
        <div
          className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Upload MP3, WAV, or AAC (max 10MB)</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Audio will be auto-trimmed, normalized, and optimized
          </p>
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {uploaded && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
              <p className="text-sm font-medium truncate">{file.name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={clear} disabled={uploading}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Waveform Trimmer */}
          {preview && !uploaded && (
            <AudioWaveformTrimmer
              audioUrl={preview}
              onTrimChange={handleTrimChange}
              initialStart={trimStart}
              initialEnd={trimEnd}
            />
          )}

          {!uploaded && (
            <Button
              variant="hero"
              className="w-full"
              onClick={handleUpload}
              disabled={uploading}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing audio...
                </>
              ) : uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading preview...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Process & Upload Preview
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPreviewUploader;

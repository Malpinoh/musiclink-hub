import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Disc3, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface BackfillResult {
  id: string;
  title: string;
  status: "upgraded" | "skipped" | "failed";
  tracks?: number;
  platforms?: number;
  reason?: string;
}

interface Props {
  onDone?: () => void;
}

/**
 * Lets an artist re-resolve older UPC fanlinks that were saved as track-level
 * links into full release-level pages (album metadata + tracklist).
 */
const ReleaseBackfillCard = ({ onDone }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [candidates, setCandidates] = useState<number | null>(null);
  const [results, setResults] = useState<BackfillResult[] | null>(null);

  const call = async (dryRun: boolean) => {
    const { data, error } = await supabase.functions.invoke("backfill-release-links", {
      body: { dry_run: dryRun, limit: 25 },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleScan = async () => {
    setScanning(true);
    setResults(null);
    try {
      const data = await call(true);
      setCandidates(data.candidates ?? 0);
      toast.success(
        data.candidates
          ? `${data.candidates} link${data.candidates === 1 ? "" : "s"} can be upgraded to release pages`
          : "All your UPC links are already release-level"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const data = await call(false);
      setResults(data.results ?? []);
      setCandidates(0);
      toast.success(`Upgraded ${data.upgraded} of ${data.scanned} link(s)`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <motion.section
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-4 sm:p-6 shadow-[var(--shadow-md)]"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Disc3 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Upgrade older UPC links to release pages</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Links created from a UPC before the release update point at a single track. Re-resolve them
            to full album/EP pages with tracklists.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="glass" size="sm" onClick={handleScan} disabled={scanning || running}>
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Scan
          </Button>
          <Button size="sm" onClick={handleRun} disabled={running || scanning || candidates === 0}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {running ? "Upgrading…" : "Upgrade now"}
          </Button>
        </div>
      </div>

      {candidates !== null && !results && (
        <p className="text-xs text-muted-foreground mt-3">
          {candidates} track-level UPC link{candidates === 1 ? "" : "s"} found.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-4 space-y-1.5 max-h-56 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-xs">
              {r.status === "upgraded" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
              )}
              <span className="truncate font-medium">{r.title}</span>
              <span className="text-muted-foreground">
                {r.status === "upgraded"
                  ? `· ${r.tracks} tracks · ${r.platforms} platforms`
                  : `· ${r.status}${r.reason ? `: ${r.reason}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
};

export default ReleaseBackfillCard;

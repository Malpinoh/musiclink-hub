import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { useAdminImports, useAdminMonetizationActions } from "@/hooks/useAdminMonetization";

/** Last completed Saturday→Friday window. */
const lastSatFri = () => {
  const now = new Date();
  const end = new Date(now);
  // step back to the most recent Friday
  while (end.getUTCDay() !== 5) end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
};

const parseRows = (text: string) => {
  const out: { zone_id: string; gross_cents: number }[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length < 2) return;
      const zone = parts[0].replace(/^"|"$/g, "");
      if (!zone || /^zone/i.test(zone)) return; // skip header
      const cents = parseAmountToCents(parts[1]);
      out.push({ zone_id: zone, gross_cents: cents });
    });
  return out;
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s === "processed" ? "default" : s === "reversed" || s === "failed" ? "destructive" : "secondary";

const AdminImports = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminImports();
  const { createImport } = useAdminMonetizationActions();
  const defaults = useMemo(lastSatFri, []);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [notes, setNotes] = useState("");
  const [csv, setCsv] = useState("");

  const parsed = useMemo(() => parseRows(csv), [csv]);
  const total = parsed.reduce((s, r) => s + r.gross_cents, 0);

  const onFile = async (file?: File) => {
    if (!file) return;
    setCsv(await file.text());
  };

  const submit = () => {
    createImport.mutate(
      { periodStart: start, periodEnd: end, rows: parsed, notes: notes || undefined },
      {
        onSuccess: (id) => {
          setOpen(false);
          setCsv("");
          setNotes("");
          if (id) navigate(`/admin/monetization/imports/${id}`);
        },
      },
    );
  };

  return (
    <AdminLayout
      title="Weekly Imports"
      description="Upload Monetag revenue every Friday night (Sat–Fri periods)."
      actions={
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New weekly import"}
        </Button>
      }
    >
      {open && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Period start</Label>
                <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Period end</Label>
                <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">CSV file (zone_id, gross)</Label>
              <Input id="file" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv">Or paste rows</Label>
              <Textarea
                id="csv"
                rows={6}
                placeholder={"1234567,12.40\n7654321,3.05"}
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <strong>{parsed.length}</strong> row(s) parsed · gross <strong>{formatCents(total)}</strong>
            </div>

            <Button onClick={submit} disabled={createImport.isPending || parsed.length === 0}>
              {createImport.isPending ? "Creating…" : "Create draft import"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No imports yet.</p>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((imp) => (
            <Link key={imp.id} to={`/admin/monetization/imports/${imp.id}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {imp.period_start} → {imp.period_end}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imp.matched_row_count}/{imp.row_count} matched · {imp.source} ·{" "}
                      {new Date(imp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCents(imp.gross_cents_total)}</span>
                    <Badge variant={statusVariant(imp.status)}>{imp.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminImports;

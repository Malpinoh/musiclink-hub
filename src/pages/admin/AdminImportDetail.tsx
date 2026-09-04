import { useParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { useImportDetail, useAdminMonetizationActions } from "@/hooks/useAdminMonetization";

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s === "processed" || s === "matched" ? "default" : s === "reversed" || s === "failed" || s === "unmatched" ? "destructive" : "secondary";

const AdminImportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { header, rows } = useImportDetail(id);
  const { processImport, rematchImport, reverseImport, deleteImport } = useAdminMonetizationActions();

  const imp = header.data;
  const list = rows.data ?? [];
  const unmatched = list.filter((r) => r.match_status !== "matched").length;

  return (
    <AdminLayout
      title="Import detail"
      description={imp ? `${imp.period_start} → ${imp.period_end} · ${imp.provider}` : undefined}
      actions={
        imp && (
          <>
            <Button size="sm" variant="outline" onClick={() => rematchImport.mutate(imp.id)} disabled={rematchImport.isPending}>
              Re-match
            </Button>
            {imp.status === "draft" && (
              <>
                <Button size="sm" onClick={() => processImport.mutate(imp.id)} disabled={processImport.isPending}>
                  Process
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteImport.mutate(imp.id)} disabled={deleteImport.isPending}>
                  Delete
                </Button>
              </>
            )}
            {imp.status === "processed" && (
              <Button size="sm" variant="destructive" onClick={() => reverseImport.mutate(imp.id)} disabled={reverseImport.isPending}>
                Reverse
              </Button>
            )}
          </>
        )
      }
    >
      {header.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !imp ? (
        <p className="text-sm text-muted-foreground">Import not found.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Status", value: imp.status },
              { label: "Gross", value: formatCents(imp.gross_cents_total) },
              { label: "Rows", value: `${imp.matched_row_count}/${imp.row_count} matched` },
              { label: "Unmatched", value: String(unmatched) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold capitalize">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {imp.notes && <p className="text-sm text-muted-foreground">Notes: {imp.notes}</p>}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zone rows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading rows…</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rows.</p>
              ) : (
                list.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="font-mono">{r.zone_id}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCents(r.gross_cents)}</span>
                      <Badge variant={statusVariant(r.match_status)}>{r.match_status}</Badge>
                      {r.processed && <Badge variant="outline">processed</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminImportDetail;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/money";
import { useAdminOverview, useAdminMonetizationActions } from "@/hooks/useAdminMonetization";
import { AlertTriangle } from "lucide-react";

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const AdminMonetizationOverview = () => {
  const { data, isLoading } = useAdminOverview();
  const { updateSettings } = useAdminMonetizationActions();
  const [share, setShare] = useState("70");
  const [limit, setLimit] = useState("20");

  useEffect(() => {
    if (data) {
      setShare(String(data.artist_share_percent));
      setLimit(String(data.early_access_limit));
    }
  }, [data]);

  return (
    <AdminLayout title="Monetization Overview" description="Platform-wide link monetization performance and settings.">
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Gross revenue" value={formatCents(data.total_gross_cents)} />
            <Stat label="Artist share" value={formatCents(data.total_artist_cents)} hint={`${data.artist_share_percent}% split`} />
            <Stat label="Platform share" value={formatCents(data.total_platform_cents)} />
            <Stat label="Approved artists" value={String(data.approved_artists)} hint={`Early access limit ${data.early_access_limit}`} />
            <Stat label="Pending applications" value={String(data.pending_applications)} />
            <Stat label="Active zones" value={String(data.active_zones)} />
          </div>

          {data.unmatched_rows > 0 && (
            <Card className="border-destructive/40">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium">{data.unmatched_rows} unmatched revenue row(s)</p>
                    <p className="text-sm text-muted-foreground">These zones aren't assigned to any artist yet.</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/monetization/imports">Review</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="share">Artist share (%)</Label>
                  <Input id="share" type="number" min={0} max={100} value={share} onChange={(e) => setShare(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Platform keeps {100 - (Number(share) || 0)}%. Existing earnings keep their original split.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Early access limit</Label>
                  <Input id="limit" type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Applications auto-approve until this many artists are approved.</p>
                </div>
              </div>
              <Button
                onClick={() =>
                  updateSettings.mutate({ sharePercent: Number(share) || 0, earlyAccessLimit: Number(limit) || 0 })
                }
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? "Saving…" : "Save settings"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminMonetizationOverview;

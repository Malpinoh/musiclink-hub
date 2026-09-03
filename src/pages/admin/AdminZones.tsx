import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/money";
import MonetizationStatusBadge from "@/components/monetization/MonetizationStatusBadge";
import { useAdminArtists, useAdminMonetizationActions } from "@/hooks/useAdminMonetization";

const AdminZones = () => {
  const { data, isLoading } = useAdminArtists();
  const { assignZone, revokeZone } = useAdminMonetizationActions();
  const [search, setSearch] = useState("");
  const [zoneInputs, setZoneInputs] = useState<Record<string, string>>({});

  const rows = (data ?? []).filter((a) => {
    if (!search.trim()) return true;
    const hay = `${a.display_name ?? ""} ${a.username ?? ""} ${a.full_name ?? ""} ${a.zone_id ?? ""}`.toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  return (
    <AdminLayout title="Artists & Zones" description="Assign Monetag zone IDs to approved artists.">
      <Input placeholder="Search artist or zone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No monetization artists yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.user_id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {a.display_name || a.username || a.full_name || a.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lifetime {formatCents(a.lifetime_artist_cents)} · Available {formatCents(a.available_cents)}
                    </p>
                  </div>
                  <MonetizationStatusBadge status={a.application_status} earlyAccess={a.early_access} />
                </div>

                {a.zone_uuid ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">zone {a.zone_id}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeZone.isPending}
                      onClick={() => revokeZone.mutate(a.zone_uuid!)}
                    >
                      Revoke
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Monetag zone ID"
                      value={zoneInputs[a.user_id] ?? ""}
                      onChange={(e) => setZoneInputs((s) => ({ ...s, [a.user_id]: e.target.value }))}
                      className="sm:max-w-xs"
                    />
                    <Button
                      size="sm"
                      disabled={assignZone.isPending || !(zoneInputs[a.user_id] ?? "").trim()}
                      onClick={() =>
                        assignZone.mutate(
                          { userId: a.user_id, zoneId: (zoneInputs[a.user_id] ?? "").trim() },
                          { onSuccess: () => setZoneInputs((s) => ({ ...s, [a.user_id]: "" })) },
                        )
                      }
                    >
                      Assign zone
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminZones;

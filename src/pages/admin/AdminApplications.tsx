import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MonetizationStatusBadge from "@/components/monetization/MonetizationStatusBadge";
import { useAdminArtists, useAdminMonetizationActions } from "@/hooks/useAdminMonetization";

interface AppRow {
  id: string;
  user_id: string;
  status: string;
  early_access: boolean;
  applied_at: string;
  review_note: string | null;
}

const AdminApplications = () => {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");
  const artists = useAdminArtists();
  const { setApplicationStatus } = useAdminMonetizationActions();

  const apps = useQuery({
    queryKey: ["admin-monetization-artists", "applications", filter],
    queryFn: async () => {
      let q = supabase
        .from("monetization_applications")
        .select("id,user_id,status,early_access,applied_at,review_note")
        .order("applied_at", { ascending: false })
        .limit(200);
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AppRow[];
    },
  });

  const nameFor = useMemo(() => {
    const map = new Map<string, string>();
    (artists.data ?? []).forEach((a) =>
      map.set(a.user_id, a.display_name || a.username || a.full_name || a.user_id.slice(0, 8)),
    );
    return map;
  }, [artists.data]);

  const rows = (apps.data ?? []).filter((r) => {
    if (!search.trim()) return true;
    const name = (nameFor.get(r.user_id) ?? "").toLowerCase();
    return name.includes(search.trim().toLowerCase()) || r.user_id.includes(search.trim());
  });

  return (
    <AdminLayout
      title="Applications"
      description="Review artist requests to join link monetization."
      actions={
        <>
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
            Pending
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
        </>
      }
    >
      <Input placeholder="Search artist…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {apps.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No applications here.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{nameFor.get(r.user_id) ?? r.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied {new Date(r.applied_at).toLocaleString()}
                  </p>
                  {r.review_note && <p className="text-xs text-muted-foreground mt-1">Note: {r.review_note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MonetizationStatusBadge status={r.status} earlyAccess={r.early_access} />
                  {r.status !== "approved" && (
                    <Button
                      size="sm"
                      disabled={setApplicationStatus.isPending}
                      onClick={() => setApplicationStatus.mutate({ applicationId: r.id, status: "approved", note: "Approved by admin" })}
                    >
                      Approve
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setApplicationStatus.isPending}
                      onClick={() => setApplicationStatus.mutate({ applicationId: r.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  )}
                  {r.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setApplicationStatus.isPending}
                      onClick={() => setApplicationStatus.mutate({ applicationId: r.id, status: "suspended" })}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminApplications;

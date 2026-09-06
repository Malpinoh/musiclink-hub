import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = {
  id: string;
  user_id: string;
  full_name: string | null;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  email_status: string | null;
  email_error: string | null;
};

const statusVariant = (s: string | null) => {
  if (s === "sent") return "default" as const;
  if (s === "failed") return "destructive" as const;
  return "secondary" as const;
};

const AdminNotifications = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notification-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_notification_activity", { _limit: 300 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const emailStatus = r.email_status ?? "not_sent";
      if (status !== "all" && emailStatus !== status) return false;
      if (!q) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [data, search, status]);

  return (
    <AdminLayout
      title="Notifications"
      description="Every monetization and earnings notification, with its email delivery result."
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by artist, type, or title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Email status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All email statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="not_sent">No email record</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading activity…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No notifications match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Artist</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Read</th>
                    <th className="px-4 py-3">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap">{r.full_name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.type}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.message}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {r.read_at ? "Read" : "Unread"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(r.email_status)}>
                          {r.email_status ?? "no record"}
                        </Badge>
                        {r.email_error && (
                          <p className="mt-1 text-xs text-destructive line-clamp-2">{r.email_error}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminNotifications;

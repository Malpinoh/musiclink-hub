import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminOverview {
  total_gross_cents: number;
  total_artist_cents: number;
  total_platform_cents: number;
  approved_artists: number;
  pending_applications: number;
  active_zones: number;
  early_access_limit: number;
  artist_share_percent: number;
  unmatched_rows: number;
}

export interface AdminArtistRow {
  user_id: string;
  full_name: string | null;
  username: string | null;
  display_name: string | null;
  application_status: string;
  early_access: boolean;
  applied_at: string | null;
  zone_uuid: string | null;
  zone_id: string | null;
  tag_code: string | null;
  lifetime_artist_cents: number;
  available_cents: number;
}

export interface ImportRow {
  id: string;
  provider: string;
  period_start: string;
  period_end: string;
  status: string;
  source: string;
  row_count: number;
  matched_row_count: number;
  gross_cents_total: number;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  reversed_at: string | null;
}

export interface ZoneRevenueRow {
  id: string;
  zone_id: string;
  gross_cents: number;
  match_status: string;
  matched_user_id: string | null;
  processed: boolean;
}

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  ["admin-monetization-overview", "admin-monetization-artists", "admin-monetization-imports", "admin-import-rows"].forEach(
    (k) => qc.invalidateQueries({ queryKey: [k] }),
  );
};

export const useAdminOverview = () =>
  useQuery({
    queryKey: ["admin-monetization-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monetization_overview");
      if (error) throw error;
      return ((data as AdminOverview[]) ?? [])[0] ?? null;
    },
  });

export const useAdminArtists = () =>
  useQuery({
    queryKey: ["admin-monetization-artists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_monetization_artists");
      if (error) throw error;
      return (data as AdminArtistRow[]) ?? [];
    },
  });

export const useAdminImports = () =>
  useQuery({
    queryKey: ["admin-monetization-imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monetization_revenue_imports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ImportRow[];
    },
  });

export const useImportDetail = (importId?: string) => {
  const header = useQuery({
    queryKey: ["admin-monetization-imports", importId],
    enabled: !!importId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monetization_revenue_imports")
        .select("*")
        .eq("id", importId!)
        .maybeSingle();
      if (error) throw error;
      return data as ImportRow | null;
    },
  });

  const rows = useQuery({
    queryKey: ["admin-import-rows", importId],
    enabled: !!importId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monetization_zone_revenue")
        .select("id,zone_id,gross_cents,match_status,matched_user_id,processed")
        .eq("import_id", importId!)
        .order("gross_cents", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ZoneRevenueRow[];
    },
  });

  return { header, rows };
};

export const useAdminMonetizationActions = () => {
  const qc = useQueryClient();
  const ok = (msg: string) => {
    toast.success(msg);
    invalidateAll(qc);
  };
  const fail = (e: Error) => toast.error(e.message || "Action failed");

  const setApplicationStatus = useMutation({
    mutationFn: async (vars: { applicationId: string; status: "pending" | "approved" | "rejected" | "suspended" | "withdrawn"; note?: string }) => {
      const { error } = await supabase.rpc("set_monetization_application_status", {
        _application_id: vars.applicationId,
        _status: vars.status,
        _note: vars.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => ok("Application updated"),
    onError: fail,
  });

  const assignZone = useMutation({
    mutationFn: async (vars: { userId: string; zoneId: string; note?: string; tagCode?: string }) => {
      const { error } = await supabase.rpc("assign_monetization_zone", {
        _user_id: vars.userId,
        _zone_id: vars.zoneId,
        _provider: "monetag",
        _note: vars.note ?? null,
        _tag_code: vars.tagCode?.trim() ? vars.tagCode : null,
      });
      if (error) throw error;
    },
    onSuccess: () => ok("Zone assigned"),
    onError: fail,
  });

  const setZoneTag = useMutation({
    mutationFn: async (vars: { zoneUuid: string; tagCode: string }) => {
      const { error } = await supabase.rpc("set_monetization_zone_tag", {
        _zone_uuid: vars.zoneUuid,
        _tag_code: vars.tagCode.trim() ? vars.tagCode : null,
      });
      if (error) throw error;
    },
    onSuccess: () => ok("Monetag tag saved"),
    onError: fail,
  });

  const revokeZone = useMutation({
    mutationFn: async (zoneUuid: string) => {
      const { error } = await supabase.rpc("revoke_monetization_zone", { _zone_uuid: zoneUuid });
      if (error) throw error;
    },
    onSuccess: () => ok("Zone revoked"),
    onError: fail,
  });


  const createImport = useMutation({
    mutationFn: async (vars: {
      periodStart: string;
      periodEnd: string;
      rows: { zone_id: string; gross_cents: number }[];
      source?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_monetization_import", {
        _provider: "monetag",
        _period_start: vars.periodStart,
        _period_end: vars.periodEnd,
        _rows: vars.rows,
        _source: vars.source ?? "csv",
        _notes: vars.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => ok("Draft import created"),
    onError: fail,
  });

  const processImport = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.rpc("process_monetization_import", { _import_id: importId });
      if (error) throw error;
    },
    onSuccess: () => ok("Import processed"),
    onError: fail,
  });

  const rematchImport = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.rpc("rematch_monetization_import", { _import_id: importId });
      if (error) throw error;
    },
    onSuccess: () => ok("Rows re-matched"),
    onError: fail,
  });

  const reverseImport = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.rpc("reverse_monetization_import", { _import_id: importId });
      if (error) throw error;
    },
    onSuccess: () => ok("Import reversed"),
    onError: fail,
  });

  const deleteImport = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.rpc("delete_monetization_import", { _import_id: importId });
      if (error) throw error;
    },
    onSuccess: () => ok("Draft deleted"),
    onError: fail,
  });

  const updateSettings = useMutation({
    mutationFn: async (vars: { sharePercent: number; earlyAccessLimit: number }) => {
      const { error } = await supabase.rpc("update_monetization_settings", {
        _artist_share_percent: vars.sharePercent,
        _early_access_limit: vars.earlyAccessLimit,
      });
      if (error) throw error;
    },
    onSuccess: () => ok("Settings saved"),
    onError: fail,
  });

  return {
    setApplicationStatus,
    assignZone,
    revokeZone,
    createImport,
    processImport,
    rematchImport,
    reverseImport,
    deleteImport,
    updateSettings,
  };
};

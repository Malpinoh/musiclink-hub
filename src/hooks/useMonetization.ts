import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MonetizationSummary {
  status: string;
  early_access: boolean;
  applied_at: string | null;
  reviewed_at: string | null;
  has_zone: boolean;
  provider: string;
  lifetime_gross_cents: number;
  lifetime_artist_cents: number;
  pending_cents: number;
  available_cents: number;
  paid_cents: number;
  artist_share_percent: number;
  early_access_slots_left: number;
}

export interface EarningRow {
  id: string;
  period_start: string;
  period_end: string;
  artist_cents: number;
  gross_cents: number;
  artist_share_percent: number;
  status: string;
  created_at: string;
}

export const useMonetization = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const summary = useQuery({
    queryKey: ["monetization-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_monetization_summary");
      if (error) throw error;
      return ((data as MonetizationSummary[]) ?? [])[0] ?? null;
    },
  });

  const earnings = useQuery({
    queryKey: ["monetization-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monetization_earnings")
        .select("id,period_start,period_end,artist_cents,gross_cents,artist_share_percent,status,created_at")
        .order("period_start", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as EarningRow[];
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("apply_for_monetization", {
        _provider: "monetag",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Application submitted");
      qc.invalidateQueries({ queryKey: ["monetization-summary"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit application"),
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("withdraw_monetization_application", {
        _provider: "monetag",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application withdrawn");
      qc.invalidateQueries({ queryKey: ["monetization-summary"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not withdraw"),
  });

  return { summary, earnings, apply, withdraw };
};

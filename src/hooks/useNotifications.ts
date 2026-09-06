import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const useNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,message,link,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const markRead = useMutation({
    mutationFn: async (ids?: string[]) => {
      const { error } = await supabase.rpc("mark_notifications_read", { _ids: ids ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const items = query.data ?? [];
  return {
    items,
    unreadCount: items.filter((n) => !n.read_at).length,
    loading: query.isLoading,
    markRead,
  };
};

export type NotificationPrefs = {
  email_monetization_status: boolean;
  email_earnings_updates: boolean;
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_monetization_status,email_earnings_updates")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { email_monetization_status: true, email_earnings_updates: true }) as NotificationPrefs;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const current = query.data ?? { email_monetization_status: true, email_earnings_updates: true };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user!.id, ...current, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs", user?.id] }),
  });

  return { prefs: query.data, loading: query.isLoading, update };
};

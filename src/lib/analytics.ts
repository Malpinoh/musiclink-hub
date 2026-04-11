import { supabase } from "@/integrations/supabase/client";

export const trackEvent = async (
  eventName: string,
  properties?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      user_id: user?.id || null,
      properties: properties || {},
    });
  } catch {
    // Fail silently — never block UX for analytics
  }
};

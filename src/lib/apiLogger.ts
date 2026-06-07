// Lightweight helper to forward client-side errors to the server-side
// api_logs table via the `log-api-error` edge function. Never throws.
import { supabase } from "@/integrations/supabase/client";

export type LogCategory =
  | "spotify_oauth"
  | "spotify_config"
  | "presave_fan_upsert"
  | "presave_load"
  | "presave_other";

export interface LogParams {
  category: LogCategory;
  step: string;
  level?: "error" | "warn" | "info";
  message: string;
  preSaveId?: string | null;
  fanId?: string | null;
  context?: Record<string, unknown>;
}

export async function logApiError(params: LogParams): Promise<void> {
  try {
    await supabase.functions.invoke("log-api-error", {
      body: {
        category: params.category,
        step: params.step,
        level: params.level ?? "error",
        message: params.message,
        preSaveId: params.preSaveId ?? null,
        fanId: params.fanId ?? null,
        origin: typeof window !== "undefined" ? window.location.origin : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        context: params.context ?? {},
      },
    });
  } catch (e) {
    // Swallow — logger must never break the calling flow.
    console.error("logApiError failed:", e);
  }
}

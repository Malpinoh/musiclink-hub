// Public endpoint that records server-side / client-side error events
// to the api_logs table using the service-role key. Never exposes data back
// to the caller beyond { ok: true }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_LEVELS = new Set(["error", "warn", "info"]);

function clientIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "unknown").slice(0, 64);
    const step = String(body.step ?? "unknown").slice(0, 128);
    const level = ALLOWED_LEVELS.has(body.level) ? body.level : "error";
    const message = String(body.message ?? "").slice(0, 2000) || "(no message)";
    const preSaveId = typeof body.preSaveId === "string" && uuidRegex.test(body.preSaveId) ? body.preSaveId : null;
    const fanId = typeof body.fanId === "string" && uuidRegex.test(body.fanId) ? body.fanId : null;
    const userId = typeof body.userId === "string" && uuidRegex.test(body.userId) ? body.userId : null;
    const origin = typeof body.origin === "string" ? body.origin.slice(0, 256) : req.headers.get("origin");
    const ua = typeof body.userAgent === "string"
      ? body.userAgent.slice(0, 512)
      : req.headers.get("user-agent");
    const context = typeof body.context === "object" && body.context !== null ? body.context : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("api_logs").insert({
      category,
      step,
      level,
      message,
      pre_save_id: preSaveId,
      fan_id: fanId,
      user_id: userId,
      origin,
      user_agent: ua,
      ip: clientIp(req),
      context,
    });

    if (error) {
      console.error("api_logs insert failed:", error);
      return new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-api-error fatal:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function logError(message: string, context: Record<string, unknown>) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("api_logs").insert({
      category: "spotify_config",
      step: "get_spotify_client_id",
      level: "error",
      message,
      context,
    });
  } catch (e) {
    console.error("Failed to log spotify_config error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
  if (!clientId) {
    await logError("SPOTIFY_CLIENT_ID env var is not set", {
      origin: req.headers.get("origin"),
    });
  }
  return new Response(JSON.stringify({ clientId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

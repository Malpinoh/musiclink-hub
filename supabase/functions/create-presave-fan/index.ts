import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function logFailure(
  client: ReturnType<typeof createClient>,
  step: string,
  message: string,
  context: Record<string, unknown>,
  preSaveId?: string | null,
) {
  try {
    await client.from("api_logs").insert({
      category: "presave_fan_upsert",
      step,
      level: "error",
      message: message.slice(0, 2000),
      pre_save_id: preSaveId ?? null,
      context,
    });
  } catch (e) {
    console.error("api_logs insert failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Backend is not configured", step: "missing_env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const preSaveId = typeof body.preSaveId === "string" ? body.preSaveId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";

    if (!uuidRegex.test(preSaveId) || !name || !emailRegex.test(email)) {
      await logFailure(supabase, "invalid_input", "Invalid fan signup details", {
        validPreSaveId: uuidRegex.test(preSaveId), hasName: !!name, validEmail: emailRegex.test(email),
      }, preSaveId || null);
      return new Response(JSON.stringify({ error: "Invalid fan signup details", step: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: preSave, error: preSaveError } = await supabase
      .from("pre_saves")
      .select("id")
      .eq("id", preSaveId)
      .eq("is_active", true)
      .maybeSingle();

    if (preSaveError) {
      await logFailure(supabase, "presave_lookup_failed", preSaveError.message, {
        code: preSaveError.code, details: preSaveError.details,
      }, preSaveId);
      throw preSaveError;
    }
    if (!preSave) {
      await logFailure(supabase, "presave_not_found", "No active pre-save matches this id", {}, preSaveId);
      return new Response(JSON.stringify({ error: "Pre-save campaign not found", step: "presave_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("presave_fans")
      .upsert(
        { pre_save_id: preSaveId, name, email },
        { onConflict: "pre_save_id,email", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (error) {
      await logFailure(supabase, "fan_upsert_failed", error.message, {
        code: error.code, details: error.details, hint: error.hint,
      }, preSaveId);
      throw error;
    }

    return new Response(JSON.stringify({ fanId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("create-presave-fan failed:", error);
    const message = error instanceof Error ? error.message : "Could not save fan signup";
    return new Response(JSON.stringify({ error: message, step: "unhandled_exception" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

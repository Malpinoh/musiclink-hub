import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const preSaveId = typeof body.preSaveId === "string" ? body.preSaveId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";

    if (!uuidRegex.test(preSaveId) || !name || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid fan signup details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Backend is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: preSave, error: preSaveError } = await supabase
      .from("pre_saves")
      .select("id")
      .eq("id", preSaveId)
      .eq("is_active", true)
      .maybeSingle();

    if (preSaveError) throw preSaveError;
    if (!preSave) {
      return new Response(JSON.stringify({ error: "Pre-save campaign not found" }), {
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

    if (error) throw error;

    return new Response(JSON.stringify({ fanId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("create-presave-fan failed:", error);
    const message = error instanceof Error ? error.message : "Could not save fan signup";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
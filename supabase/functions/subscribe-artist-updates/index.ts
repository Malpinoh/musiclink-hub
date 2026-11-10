import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Server configuration missing");
    const db = createClient(url, key);
    const body = await req.json().catch(() => ({}));
    const preSaveId = typeof body.preSaveId === "string" ? body.preSaveId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

    if (!/^[0-9a-f-]{36}$/i.test(preSaveId) || !emailPattern.test(email)) {
      return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: campaign, error: campaignError } = await db
      .from("pre_saves").select("id, user_id, is_active").eq("id", preSaveId).eq("is_active", true).maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return new Response(JSON.stringify({ error: "This release campaign is unavailable." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    const { error } = await db.from("artist_email_subscriptions").upsert({
      artist_user_id: campaign.user_id,
      email,
      fan_name: name,
      source_pre_save_id: campaign.id,
      is_active: true,
      consented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "artist_user_id,email" });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("artist email subscription failed", error);
    return new Response(JSON.stringify({ error: "We couldn't save your subscription. Please try again." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

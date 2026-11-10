import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("Service unavailable", { status: 503 });
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return new Response("Invalid unsubscribe link", { status: 400 });
  const db = createClient(url, key);
  const { error } = await db.from("artist_email_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token);
  if (error) return new Response("Unable to update subscription. Please try again.", { status: 500 });
  return new Response("<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='font-family:Arial;background:#0b0b18;color:white;display:grid;place-items:center;min-height:100vh'><main style='max-width:420px;padding:32px;text-align:center'><h1>You are unsubscribed</h1><p>You will no longer receive future release emails from this artist through MDistro Link.</p></main></body></html>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

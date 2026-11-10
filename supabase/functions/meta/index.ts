// Unified public metadata endpoint.
// GET remains public for crawlers. Cache purge is restricted to authenticated admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleMetaRequest, serviceClient } from "../_shared/meta.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  if (url.pathname.endsWith("/purge")) {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const authorization = req.headers.get("Authorization");
      const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!token || !supabaseUrl || !anonKey) {
        return new Response(JSON.stringify({ error: "Admin authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin, error: roleError } = await authClient.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (roleError || isAdmin !== true) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const supabase = serviceClient();
      let query = supabase.from("meta_cache").delete();
      if (body?.path) query = query.eq("path", String(body.path));
      else if (body?.entity_id) query = query.eq("entity_id", String(body.entity_id));
      else query = query.neq("path", "");

      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ purged: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("meta purge error", error);
      return new Response(JSON.stringify({ error: "Purge failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    return await handleMetaRequest(req, "meta");
  } catch (error) {
    console.error("meta error", error);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

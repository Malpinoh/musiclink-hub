// Unified public metadata endpoint.
//   GET  /functions/v1/meta/{...path}      → crawler HTML or 302 for humans
//   GET  /functions/v1/meta?path=/a/b      → same, explicit path
//   POST /functions/v1/meta/purge          → invalidate cached pages
import { corsHeaders, handleMetaRequest, serviceClient } from "../_shared/meta.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname.endsWith("/purge")) {
    try {
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
    } catch (e) {
      console.error("purge error", e);
      return new Response(JSON.stringify({ error: "purge failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    return await handleMetaRequest(req, "meta");
  } catch (e) {
    console.error("meta error", e);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

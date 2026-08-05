// Backwards-compatible alias for the unified metadata engine.
// URL: /functions/v1/fanlink-meta/{artist}/{slug}
import { corsHeaders, handleMetaRequest } from "../_shared/meta.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleMetaRequest(req, "fanlink-meta");
  } catch (e) {
    console.error("fanlink-meta error", e);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

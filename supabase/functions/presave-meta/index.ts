// Backwards-compatible alias for the unified metadata engine.
// URL: /functions/v1/presave-meta/{artist}/{slug}
import { corsHeaders, handleMetaRequest } from "../_shared/meta.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleMetaRequest(req, "presave-meta", "presave");
  } catch (e) {
    console.error("presave-meta error", e);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

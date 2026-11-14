import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PIXEL_CODE = "DBS1OD3C77UDGS03KM10";
const ALLOWED_EVENTS = new Set(["ViewContent", "ClickButton"]);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = Deno.env.get("TIKTOK_EVENTS_API_ACCESS_TOKEN");
  if (!token) return json({ error: "server_not_configured" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const event = str(body.event, 40);
  const eventId = str(body.event_id, 100);
  const url = str(body.url, 1000);
  if (!event || !ALLOWED_EVENTS.has(event)) return json({ error: "invalid_event" }, 400);
  if (!eventId) return json({ error: "missing_event_id" }, 400);
  if (!url || !/^https?:\/\//.test(url)) return json({ error: "invalid_url" }, 400);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || undefined;
  const payload = {
    event_source: "web",
    event_source_id: PIXEL_CODE,
    data: [{
      event,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      user: {
        ip,
        user_agent: req.headers.get("user-agent") || undefined,
        ttclid: str(body.ttclid, 200),
        ttp: str(body.ttp, 200),
      },
      page: { url, referrer: str(body.referrer, 1000) },
      properties: {
        content_id: str(body.content_id, 100),
        content_name: str(body.content_name, 300),
        description: str(body.platform, 100),
        content_type: "product",
      },
    }],
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: { "Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.code !== 0) {
      console.error("tiktok_events_error", res.status, out.code, out.message);
      return json({ ok: false, error: "tiktok_rejected", message: out.message ?? null }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("tiktok_events_network", String(e));
    return json({ ok: false, error: "network_error" }, 502);
  }
});

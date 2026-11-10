import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GeoData {
  country: string | null;
  city: string | null;
  ip: string | null;
}

async function getGeoFromIP(ip: string): Promise<GeoData> {
  try {
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
      return { country: null, city: null, ip };
    }
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    if (!response.ok) return { country: null, city: null, ip };
    const data = await response.json();
    if (data.status === "success") {
      return { country: data.country || null, city: data.city || null, ip };
    }
    return { country: null, city: null, ip };
  } catch (error) {
    console.error("Geolocation lookup failed:", error);
    return { country: null, city: null, ip };
  }
}

function getClientIP(req: Request): string {
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
}

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    // This endpoint is intentionally public for fanlink click analytics only.
    // OAuth completion and token-bearing pre-save actions must use the
    // authenticated Spotify callback, never this public telemetry endpoint.
    const { type, id, platform_name, content_type, user_agent, device_type } = body ?? {};
    if (type !== "click") return json({ error: "Unsupported tracking event" }, 400);
    if (!isUuid(id)) return json({ error: "A valid fanlink ID is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Tracking is temporarily unavailable" }, 503);

    const clientIP = getClientIP(req);
    const geoData = await getGeoFromIP(clientIP);
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: fanlink, error: lookupError } = await supabase
      .from("fanlinks")
      .select("id,is_published")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!fanlink?.is_published) return json({ error: "Fanlink not found" }, 404);

    const { error } = await supabase.from("clicks").insert({
      fanlink_id: id,
      platform_name: typeof platform_name === "string" ? platform_name.slice(0, 100) : null,
      content_type: content_type === "release" ? "release" : "track",
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 500) : null,
      device_type: typeof device_type === "string" ? device_type.slice(0, 50) : null,
      ip_address: geoData.ip,
      country: geoData.country,
      city: geoData.city,
    });
    if (error) throw error;

    return json({ success: true, geo: { country: geoData.country, city: geoData.city } });
  } catch (error) {
    console.error("Error in track-geo:", error);
    return json({ success: false, error: "Unable to record this click" }, 500);
  }
});

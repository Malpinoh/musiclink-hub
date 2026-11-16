import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeoData {
  country: string | null;
  city: string | null;
  ip: string | null;
}

// Use ip-api.com for free geolocation (no API key required, 45 requests/min limit)
async function getGeoFromIP(ip: string): Promise<GeoData> {
  try {
    // Skip for localhost/private IPs
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
      console.log("Private/local IP detected, skipping geolocation");
      return { country: null, city: null, ip };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    
    if (!response.ok) {
      console.error("Geolocation API error:", response.status);
      return { country: null, city: null, ip };
    }

    const data = await response.json();
    console.log("Geolocation response:", data);

    if (data.status === "success") {
      return {
        country: data.country || null,
        city: data.city || null,
        ip,
      };
    }

    return { country: null, city: null, ip };
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return { country: null, city: null, ip };
  }
}

// Extract client IP from request headers
function getClientIP(req: Request): string {
  // Check various headers used by proxies/load balancers
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;

  const xRealIP = req.headers.get("x-real-ip");
  if (xRealIP) return xRealIP;

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Can contain multiple IPs, get the first (original client)
    return xForwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, id, platform_name, content_type, user_agent, device_type, action_type, email, spotify_user_id, spotify_access_token, spotify_refresh_token, token_expires_at, tiktok_attribution } = body;

    // Get client IP
    const clientIP = getClientIP(req);
    console.log("Client IP:", clientIP);

    // Get geolocation from IP
    const geoData = await getGeoFromIP(clientIP);
    console.log("GeoData:", geoData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;

    if (type === "click") {
      // Insert click with geo data
      const { data, error } = await supabase.from("clicks").insert({
        fanlink_id: id,
        platform_name: platform_name || null,
        content_type: content_type === "release" ? "release" : "track",
        user_agent: user_agent || null,
        device_type: device_type || null,
        ip_address: geoData.ip,
        country: geoData.country,
        city: geoData.city,
      }).select();

      if (error) {
        console.error("Error inserting click:", error);
        throw error;
      }
      result = data;

      // Persist TikTok campaign attribution separately from the core click row.
      // TikTok Ads can append ttclid and/or UTM/macros such as campaign name/ID to the landing URL.
      if (tiktok_attribution && typeof tiktok_attribution === "object" && Object.values(tiktok_attribution).some(Boolean)) {
        const { error: attributionError } = await supabase.from("tiktok_attributions").insert({
          fanlink_id: id,
          click_id: data?.[0]?.id || null,
          platform_name: platform_name || null,
          ttclid: typeof tiktok_attribution.ttclid === "string" ? tiktok_attribution.ttclid.slice(0, 1000) : null,
          campaign_id: typeof tiktok_attribution.campaignId === "string" ? tiktok_attribution.campaignId.slice(0, 255) : null,
          campaign_name: typeof tiktok_attribution.campaignName === "string" ? tiktok_attribution.campaignName.slice(0, 255) : null,
          adgroup_id: typeof tiktok_attribution.adgroupId === "string" ? tiktok_attribution.adgroupId.slice(0, 255) : null,
          adgroup_name: typeof tiktok_attribution.adgroupName === "string" ? tiktok_attribution.adgroupName.slice(0, 255) : null,
          ad_id: typeof tiktok_attribution.adId === "string" ? tiktok_attribution.adId.slice(0, 255) : null,
          ad_name: typeof tiktok_attribution.adName === "string" ? tiktok_attribution.adName.slice(0, 255) : null,
          utm_source: typeof tiktok_attribution.source === "string" ? tiktok_attribution.source.slice(0, 100) : null,
          utm_medium: typeof tiktok_attribution.medium === "string" ? tiktok_attribution.medium.slice(0, 100) : null,
          utm_content: typeof tiktok_attribution.content === "string" ? tiktok_attribution.content.slice(0, 255) : null,
          utm_term: typeof tiktok_attribution.term === "string" ? tiktok_attribution.term.slice(0, 255) : null,
          user_agent: user_agent || null,
          device_type: device_type || null,
          country: geoData.country,
          city: geoData.city,
        });
        if (attributionError) console.error("TikTok attribution insert error:", attributionError);
      }
    } else if (type === "presave_action") {
      // Insert pre-save action with geo data
      const insertData: Record<string, unknown> = {
        pre_save_id: id,
        action_type: action_type || "presave",
        country: geoData.country,
        city: geoData.city,
        completed: true,
      };

      // Add optional fields
      if (email) insertData.email = email;
      if (spotify_user_id) insertData.spotify_user_id = spotify_user_id;
      if (spotify_access_token) insertData.spotify_access_token = spotify_access_token;
      if (spotify_refresh_token) insertData.spotify_refresh_token = spotify_refresh_token;
      if (token_expires_at) insertData.token_expires_at = token_expires_at;

      const { data, error } = await supabase.from("pre_save_actions").insert(insertData).select();

      if (error) {
        console.error("Error inserting pre-save action:", error);
        throw error;
      }
      result = data;
    } else {
      throw new Error("Invalid type. Must be 'click' or 'presave_action'");
    }

    return new Response(
      JSON.stringify({ success: true, data: result, geo: geoData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in track-geo function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

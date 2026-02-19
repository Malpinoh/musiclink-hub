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
    const { type, id, platform_name, user_agent, device_type, action_type, email, spotify_user_id, spotify_access_token, spotify_refresh_token, token_expires_at } = body;

    // Get client IP
    const clientIP = getClientIP(req);
    console.log("Client IP:", clientIP);

    // Get geolocation from IP
    const geoData = await getGeoFromIP(clientIP);
    console.log("GeoData:", geoData);

    // Initialize Supabase client pointing to MALPINOHDISTRO
    const supabaseUrl = Deno.env.get("MD_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("MD_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;

    if (type === "click") {
      // Insert click with geo data
      const { data, error } = await supabase.from("clicks").insert({
        fanlink_id: id,
        platform_name: platform_name || null,
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

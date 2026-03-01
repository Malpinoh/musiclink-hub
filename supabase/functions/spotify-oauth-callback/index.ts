import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeoData {
  country: string | null;
  city: string | null;
  ip: string | null;
}

// Get geolocation from IP using ip-api.com
async function getGeoFromIP(ip: string): Promise<GeoData> {
  try {
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.") || ip === "unknown") {
      return { country: null, city: null, ip };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    if (!response.ok) return { country: null, city: null, ip };

    const data = await response.json();
    if (data.status === "success") {
      return { country: data.country || null, city: data.city || null, ip };
    }
    return { country: null, city: null, ip };
  } catch {
    return { country: null, city: null, ip };
  }
}

// Extract client IP from request headers
function getClientIP(req: Request): string {
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;

  const xRealIP = req.headers.get("x-real-ip");
  if (xRealIP) return xRealIP;

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();

  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, preSaveId, action } = await req.json();

    if (!code || !preSaveId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      console.error("Spotify credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Spotify not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP and geo data
    const clientIP = getClientIP(req);
    const geoData = await getGeoFromIP(clientIP);
    console.log("Client IP:", clientIP, "Geo:", geoData);

    // Determine redirect URI based on environment
    const redirectUri = `${supabaseUrl.replace('.supabase.co', '')}.lovable.app/callback/spotify`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get Spotify user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let spotifyUserId = null;
    let email = null;
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      spotifyUserId = profile.id;
      email = profile.email;
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store the pre-save action with OAuth tokens and geo data
    const { error: insertError } = await supabase.from("pre_save_actions").insert({
      pre_save_id: preSaveId,
      action_type: action || "presave",
      spotify_user_id: spotifyUserId,
      email: email,
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
      token_expires_at: tokenExpiresAt,
      completed: true,
      country: geoData.country,
      city: geoData.city,
    });

    if (insertError) {
      console.error("Error storing pre-save action:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save pre-save" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Pre-save action recorded for user ${spotifyUserId} on pre-save ${preSaveId} from ${geoData.country}`);

    return new Response(
      JSON.stringify({ success: true, spotifyUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in spotify-oauth-callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

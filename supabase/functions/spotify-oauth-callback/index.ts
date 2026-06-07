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

async function getGeoFromIP(ip: string): Promise<GeoData> {
  try {
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.") || ip === "unknown") {
      return { country: null, city: null, ip };
    }
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    if (!response.ok) return { country: null, city: null, ip };
    const data = await response.json();
    if (data.status === "success") return { country: data.country || null, city: data.city || null, ip };
    return { country: null, city: null, ip };
  } catch {
    return { country: null, city: null, ip };
  }
}

function getClientIP(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip"); if (cf) return cf;
  const xr = req.headers.get("x-real-ip"); if (xr) return xr;
  const xf = req.headers.get("x-forwarded-for"); if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

async function logFailure(
  step: string,
  message: string,
  context: Record<string, unknown>,
  preSaveId?: string | null,
  fanId?: string | null,
) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("api_logs").insert({
      category: "spotify_oauth",
      step,
      level: "error",
      message: message.slice(0, 2000),
      pre_save_id: preSaveId ?? null,
      fan_id: fanId ?? null,
      context,
    });
  } catch (e) {
    console.error("api_logs insert failed:", e);
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      code,
      preSaveId,
      action,
      fanId,
      fanName,
      fanEmail,
      redirectUri,
    } = body;

    if (!code || !preSaveId || !redirectUri) {
      await logFailure("missing_callback_params", "Missing code/preSaveId/redirectUri", {
        hasCode: !!code, hasPreSaveId: !!preSaveId, hasRedirectUri: !!redirectUri,
      }, preSaveId, fanId);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters", step: "missing_callback_params" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      console.error("Spotify credentials not configured");
      await logFailure("spotify_credentials_missing", "SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set", {
        hasClientId: !!clientId, hasClientSecret: !!clientSecret,
      }, preSaveId, fanId);
      return new Response(
        JSON.stringify({ success: false, error: "Spotify not configured", step: "spotify_credentials_missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientIP = getClientIP(req);
    const geoData = await getGeoFromIP(clientIP);

    // Exchange code for tokens using the EXACT redirect URI the frontend used.
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
      await logFailure(
        "token_exchange_failed",
        `Spotify token exchange returned ${tokenResponse.status}`,
        { status: tokenResponse.status, response: errorText.slice(0, 1500), redirectUri },
        preSaveId, fanId,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to exchange authorization code",
          step: "token_exchange_failed",
          detail: errorText.slice(0, 500),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Fetch Spotify profile
    let spotifyUserId: string | null = null;
    let spotifyEmail: string | null = null;
    try {
      const profileRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        spotifyUserId = profile.id ?? null;
        spotifyEmail = profile.email ?? null;
      }
    } catch (e) {
      console.error("Profile fetch failed:", e);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: insertError } = await supabase.from("pre_save_actions").insert({
      pre_save_id: preSaveId,
      action_type: action || "save_and_follow",
      fan_id: fanId ?? null,
      fan_name: fanName ?? null,
      fan_email: (fanEmail ?? null)?.toLowerCase() ?? null,
      spotify_user_id: spotifyUserId,
      email: spotifyEmail,
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
      token_expires_at: tokenExpiresAt,
      completed: true,
      country: geoData.country,
      city: geoData.city,
    });

    if (insertError) {
      console.error("Error storing pre-save action:", insertError);
      await logFailure(
        "presave_action_insert_failed",
        insertError.message || "Insert into pre_save_actions failed",
        { code: insertError.code, details: insertError.details, hint: insertError.hint },
        preSaveId, fanId,
      );
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save pre-save", step: "presave_action_insert_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Pre-save recorded: spotify=${spotifyUserId}, fan=${fanId}, presave=${preSaveId}`);

    return new Response(
      JSON.stringify({ success: true, spotifyUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in spotify-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await logFailure("unhandled_exception", message, {});
    return new Response(
      JSON.stringify({ success: false, error: message, step: "unhandled_exception" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

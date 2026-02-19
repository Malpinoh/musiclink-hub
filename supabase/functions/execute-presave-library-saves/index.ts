import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Refresh Spotify token
async function refreshSpotifyToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

// Save album to user's Spotify library
async function saveAlbumToLibrary(accessToken: string, albumId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/albums?ids=${albumId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch (error) {
    console.error("Error saving album:", error);
    return false;
  }
}

// Follow artist on Spotify
async function followArtist(accessToken: string, artistId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch (error) {
    console.error("Error following artist:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting execute-presave-library-saves job...");

  try {
    const supabaseUrl = Deno.env.get("MD_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("MD_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find pre-saves that are released and have resolved Spotify IDs
    const { data: releasedPreSaves, error: preSaveError } = await supabase
      .from("pre_saves")
      .select("id, spotify_album_id, spotify_artist_id, title, artist")
      .eq("is_released", true)
      .not("spotify_album_id", "is", null);

    if (preSaveError) throw preSaveError;

    if (!releasedPreSaves || releasedPreSaves.length === 0) {
      console.log("No released pre-saves with Spotify IDs found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No releases to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${releasedPreSaves.length} released pre-saves to process`);

    let savedCount = 0;
    let errorCount = 0;

    for (const preSave of releasedPreSaves) {
      // Find pre-save actions that haven't been saved to library yet
      const { data: actions, error: actionsError } = await supabase
        .from("pre_save_actions")
        .select("*")
        .eq("pre_save_id", preSave.id)
        .eq("library_saved", false)
        .not("spotify_refresh_token", "is", null);

      if (actionsError || !actions) continue;

      console.log(`Processing ${actions.length} pending saves for "${preSave.title}"`);

      for (const action of actions) {
        try {
          // Refresh token if needed
          let accessToken = action.spotify_access_token;
          const tokenExpiry = new Date(action.token_expires_at);

          if (tokenExpiry < new Date()) {
            console.log(`Refreshing token for action ${action.id}`);
            const refreshed = await refreshSpotifyToken(action.spotify_refresh_token);
            if (!refreshed) {
              console.error(`Failed to refresh token for action ${action.id}`);
              errorCount++;
              continue;
            }
            accessToken = refreshed.accessToken;

            // Update stored token
            await supabase
              .from("pre_save_actions")
              .update({
                spotify_access_token: refreshed.accessToken,
                token_expires_at: refreshed.expiresAt,
              })
              .eq("id", action.id);
          }

          // Save album to library
          const saved = await saveAlbumToLibrary(accessToken, preSave.spotify_album_id);

          // Also follow artist if we have their ID
          if (preSave.spotify_artist_id) {
            await followArtist(accessToken, preSave.spotify_artist_id);
          }

          if (saved) {
            await supabase
              .from("pre_save_actions")
              .update({
                library_saved: true,
                library_saved_at: new Date().toISOString(),
              })
              .eq("id", action.id);
            savedCount++;
            console.log(`Saved album to library for action ${action.id}`);
          } else {
            errorCount++;
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (actionError) {
          console.error(`Error processing action ${action.id}:`, actionError);
          errorCount++;
        }
      }
    }

    console.log(`Library saves complete: ${savedCount} saved, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ success: true, saved: savedCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in execute-presave-library-saves:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreSave {
  id: string;
  upc: string | null;
  artist: string;
  title: string;
  release_date: string | null;
  is_released: boolean;
}

// Get Spotify access token
async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Spotify credentials not configured");
    return null;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    return null;
  }
}

// Search Spotify by UPC
async function searchSpotifyByUPC(token: string, upc: string): Promise<{ url: string; uri: string; albumId: string } | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=upc:${upc}&type=album&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const album = data.albums?.items?.[0];
    
    if (album) {
      return {
        url: album.external_urls?.spotify || null,
        uri: album.uri || null,
        albumId: album.id || null
      };
    }
    return null;
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return null;
  }
}

// Search Spotify by artist and title
async function searchSpotifyByQuery(token: string, artist: string, title: string): Promise<{ url: string; uri: string; albumId: string } | null> {
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=album&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const albums = data.albums?.items || [];
    
    // Find best match
    for (const album of albums) {
      const artistMatch = album.artists?.some((a: any) => 
        a.name.toLowerCase().includes(artist.toLowerCase()) ||
        artist.toLowerCase().includes(a.name.toLowerCase())
      );
      const titleMatch = album.name.toLowerCase().includes(title.toLowerCase()) ||
                        title.toLowerCase().includes(album.name.toLowerCase());
      
      if (artistMatch || titleMatch) {
        return {
          url: album.external_urls?.spotify || null,
          uri: album.uri || null,
          albumId: album.id || null
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error searching Spotify by query:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting auto-resolve pre-saves job...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Find pre-saves that are past release date but not yet marked as released
    const { data: preSaves, error: fetchError } = await supabase
      .from("pre_saves")
      .select("id, upc, artist, title, release_date, is_released, spotify_uri, spotify_album_id")
      .eq("is_released", false)
      .eq("is_active", true)
      .lte("release_date", todayStr);

    if (fetchError) {
      console.error("Error fetching pre-saves:", fetchError);
      throw fetchError;
    }

    if (!preSaves || preSaves.length === 0) {
      console.log("No pre-saves to resolve");
      return new Response(
        JSON.stringify({ success: true, resolved: 0, message: "No pre-saves to resolve" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${preSaves.length} pre-saves to check for resolution`);

    // Get Spotify token
    const spotifyToken = await getSpotifyToken();
    if (!spotifyToken) {
      console.error("Could not get Spotify token");
      return new Response(
        JSON.stringify({ success: false, error: "Could not authenticate with Spotify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedCount = 0;
    const results: Array<{ id: string; status: string; details?: string }> = [];

    for (const preSave of preSaves) {
      console.log(`Checking pre-save: ${preSave.artist} - ${preSave.title}`);

      let spotifyResult = null;

      // Try UPC first if available
      if (preSave.upc) {
        spotifyResult = await searchSpotifyByUPC(spotifyToken, preSave.upc);
      }

      // Fall back to search if UPC didn't work
      if (!spotifyResult) {
        spotifyResult = await searchSpotifyByQuery(spotifyToken, preSave.artist, preSave.title);
      }

      if (spotifyResult) {
        // Update the pre-save with resolved data
        const { error: updateError } = await supabase
          .from("pre_saves")
          .update({
            is_released: true,
            spotify_uri: spotifyResult.uri,
            spotify_album_id: spotifyResult.albumId,
            updated_at: new Date().toISOString()
          })
          .eq("id", preSave.id);

        if (updateError) {
          console.error(`Error updating pre-save ${preSave.id}:`, updateError);
          results.push({ id: preSave.id, status: "error", details: updateError.message });
        } else {
          console.log(`Resolved pre-save: ${preSave.artist} - ${preSave.title} → ${spotifyResult.url}`);
          resolvedCount++;
          results.push({ id: preSave.id, status: "resolved", details: spotifyResult.url });
        }
      } else {
        console.log(`Could not find release on Spotify: ${preSave.artist} - ${preSave.title}`);
        results.push({ id: preSave.id, status: "not_found" });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Auto-resolve complete: ${resolvedCount}/${preSaves.length} resolved`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: preSaves.length,
        resolved: resolvedCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in auto-resolve-presaves:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

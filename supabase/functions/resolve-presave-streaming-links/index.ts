import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    return (await res.json()).access_token;
  } catch { return null; }
}

interface ResolvedLink {
  platform_name: string;
  platform_url: string;
  display_order: number;
}

async function resolveLinks(upc: string, isrc: string | null, artist: string, title: string): Promise<ResolvedLink[]> {
  const links: ResolvedLink[] = [];
  const query = encodeURIComponent(`${artist} ${title}`);

  // Spotify
  const token = await getSpotifyToken();
  if (token) {
    let spotifyUrl: string | null = null;
    // Try UPC first
    if (upc) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=upc:${upc}&type=album&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        spotifyUrl = data.albums?.items?.[0]?.external_urls?.spotify || null;
      } catch {}
    }
    // Try ISRC
    if (!spotifyUrl && isrc) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        spotifyUrl = data.tracks?.items?.[0]?.external_urls?.spotify || null;
      } catch {}
    }
    // Fallback query
    if (!spotifyUrl) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        spotifyUrl = data.albums?.items?.[0]?.external_urls?.spotify || null;
      } catch {}
    }
    if (spotifyUrl) links.push({ platform_name: "Spotify", platform_url: spotifyUrl, display_order: 1 });
  }

  // Apple Music via iTunes
  if (upc) {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?upc=${upc}&entity=album`);
      const data = await res.json();
      const match = data.results?.find((r: any) => r.wrapperType === "collection" && r.collectionViewUrl);
      if (match) links.push({ platform_name: "Apple Music", platform_url: match.collectionViewUrl, display_order: 2 });
    } catch {}
  }

  // YouTube Music
  links.push({ platform_name: "YouTube Music", platform_url: `https://music.youtube.com/search?q=${query}`, display_order: 3 });

  // Audiomack
  links.push({ platform_name: "Audiomack", platform_url: `https://audiomack.com/search?q=${query}`, display_order: 4 });

  // Boomplay
  links.push({ platform_name: "Boomplay", platform_url: `https://www.boomplay.com/search/default/${query}`, display_order: 5 });

  // Deezer
  try {
    let deezerUrl: string | null = null;
    if (upc) {
      const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(upc)}&limit=1`);
      const data = await res.json();
      deezerUrl = data.data?.[0]?.link || null;
    }
    if (!deezerUrl) {
      const res = await fetch(`https://api.deezer.com/search/album?q=${query}&limit=1`);
      const data = await res.json();
      deezerUrl = data.data?.[0]?.link || null;
    }
    if (deezerUrl) links.push({ platform_name: "Deezer", platform_url: deezerUrl, display_order: 6 });
  } catch {}

  // Tidal
  links.push({ platform_name: "Tidal", platform_url: `https://tidal.com/search?q=${query}`, display_order: 7 });

  return links;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const preSaveId = body.pre_save_id;

    // If specific ID, resolve just that one. Otherwise resolve all unresolved releases due today or past.
    let preSaves: any[] = [];

    if (preSaveId) {
      const { data } = await supabase.from("pre_saves").select("*").eq("id", preSaveId).single();
      if (data) preSaves = [data];
    } else {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("is_active", true)
        .eq("links_resolved", false)
        .lte("release_date", today);
      preSaves = data || [];
    }

    let resolved = 0;

    for (const ps of preSaves) {
      if (!ps.upc && !ps.isrc) {
        console.log(`Skipping ${ps.title}: no UPC or ISRC`);
        continue;
      }

      const links = await resolveLinks(ps.upc || "", ps.isrc, ps.artist, ps.title);
      if (links.length === 0) continue;

      // Upsert links
      for (const link of links) {
        await supabase.from("presave_streaming_links").upsert(
          { pre_save_id: ps.id, platform_name: link.platform_name, platform_url: link.platform_url, display_order: link.display_order },
          { onConflict: "pre_save_id,platform_name" }
        );
      }

      // Mark resolved
      await supabase.from("pre_saves").update({ links_resolved: true }).eq("id", ps.id);
      resolved++;

      // Rate limit
      await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ message: "Streaming links resolved", resolved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

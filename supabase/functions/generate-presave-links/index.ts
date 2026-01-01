import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreSaveInput {
  upc: string;
  artist: string;
  title: string;
  releaseDate: string;
}

interface PlatformLink {
  platform: string;
  platformDisplayName: string;
  url: string | null;
  type: "presave" | "streaming" | "unavailable";
  message: string;
}

interface PreSaveResult {
  success: boolean;
  isReleased: boolean;
  releaseDate: string;
  artist: string;
  title: string;
  upc: string;
  platforms: PlatformLink[];
}

// Check if release date is in the past
function isReleased(releaseDate: string): boolean {
  const release = new Date(releaseDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return release <= today;
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
async function searchSpotifyByUPC(token: string, upc: string): Promise<{ url: string; uri: string } | null> {
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
        uri: album.uri || null
      };
    }
    return null;
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return null;
  }
}

// Search Apple Music by UPC using iTunes API
async function searchAppleMusicByUPC(upc: string, artist: string, title: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/lookup?upc=${encodeURIComponent(upc)}&entity=album`;
    console.log("Fetching Apple Music by UPC:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      for (const result of data.results) {
        if (result.wrapperType === "collection" && result.collectionViewUrl) {
          // Verify match
          const artistMatch = result.artistName?.toLowerCase().includes(artist.toLowerCase()) ||
                              artist.toLowerCase().includes(result.artistName?.toLowerCase());
          const titleMatch = result.collectionName?.toLowerCase().includes(title.toLowerCase()) ||
                             title.toLowerCase().includes(result.collectionName?.toLowerCase());
          
          if (artistMatch || titleMatch) {
            console.log("Apple Music match found:", result.collectionViewUrl);
            return result.collectionViewUrl;
          }
        }
      }
      // Return first collection if available
      const firstCollection = data.results.find((r: any) => r.wrapperType === "collection");
      if (firstCollection?.collectionViewUrl) {
        return firstCollection.collectionViewUrl;
      }
    }
    
    console.log("No Apple Music match found for UPC:", upc);
    return null;
  } catch (error) {
    console.error("Error searching Apple Music:", error);
    return null;
  }
}

// Search Deezer by UPC
async function searchDeezerByUPC(upc: string): Promise<string | null> {
  try {
    // Deezer doesn't have direct UPC lookup, search by query
    const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(upc)}&limit=1`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].link || null;
    }
    return null;
  } catch (error) {
    console.error("Error searching Deezer:", error);
    return null;
  }
}

// Search Deezer by artist and title
async function searchDeezerByQuery(artist: string, title: string): Promise<string | null> {
  try {
    const query = `${artist} ${title}`;
    const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].link || null;
    }
    return null;
  } catch (error) {
    console.error("Error searching Deezer by query:", error);
    return null;
  }
}

// Generate platform links
async function generatePlatformLinks(
  input: PreSaveInput,
  released: boolean
): Promise<PlatformLink[]> {
  const platforms: PlatformLink[] = [];
  const { upc, artist, title } = input;
  const query = encodeURIComponent(`${artist} ${title}`);

  // Get Spotify token
  const spotifyToken = await getSpotifyToken();

  // 1. Spotify
  if (spotifyToken) {
    const spotifyResult = await searchSpotifyByUPC(spotifyToken, upc);
    if (spotifyResult?.url) {
      platforms.push({
        platform: "spotify",
        platformDisplayName: "Spotify",
        url: spotifyResult.url,
        type: released ? "streaming" : "presave",
        message: released 
          ? "Listen on Spotify" 
          : "Pre-save on Spotify"
      });
    } else {
      platforms.push({
        platform: "spotify",
        platformDisplayName: "Spotify",
        url: null,
        type: "unavailable",
        message: "Spotify link not available yet."
      });
    }
  } else {
    platforms.push({
      platform: "spotify",
      platformDisplayName: "Spotify",
      url: null,
      type: "unavailable",
      message: "Spotify link not available yet."
    });
  }

  // 2. Apple Music - Only via UPC lookup
  const appleMusicUrl = await searchAppleMusicByUPC(upc, artist, title);
  if (appleMusicUrl) {
    platforms.push({
      platform: "apple_music",
      platformDisplayName: "Apple Music",
      url: appleMusicUrl,
      type: released ? "streaming" : "presave",
      message: released 
        ? "Listen on Apple Music" 
        : "Pre-add on Apple Music"
    });
  } else {
    platforms.push({
      platform: "apple_music",
      platformDisplayName: "Apple Music",
      url: null,
      type: "unavailable",
      message: "Apple Music link not available yet."
    });
  }

  // 3. Deezer
  let deezerUrl = await searchDeezerByUPC(upc);
  if (!deezerUrl) {
    deezerUrl = await searchDeezerByQuery(artist, title);
  }
  if (deezerUrl) {
    platforms.push({
      platform: "deezer",
      platformDisplayName: "Deezer",
      url: deezerUrl,
      type: released ? "streaming" : "presave",
      message: released 
        ? "Listen on Deezer" 
        : "Pre-save on Deezer"
    });
  } else {
    platforms.push({
      platform: "deezer",
      platformDisplayName: "Deezer",
      url: null,
      type: "unavailable",
      message: "Deezer link not available yet."
    });
  }

  // 4. Tidal - Search URL (Tidal doesn't have public API for UPC lookup)
  const tidalSearchUrl = `https://tidal.com/search?q=${query}`;
  platforms.push({
    platform: "tidal",
    platformDisplayName: "Tidal",
    url: tidalSearchUrl,
    type: released ? "streaming" : "presave",
    message: released 
      ? "Listen on Tidal" 
      : "Pre-save on Tidal (search)"
  });

  // 5. YouTube Music - Search URL
  const youtubeSearchUrl = `https://music.youtube.com/search?q=${query}`;
  platforms.push({
    platform: "youtube_music",
    platformDisplayName: "YouTube Music",
    url: youtubeSearchUrl,
    type: released ? "streaming" : "presave",
    message: released 
      ? "Listen on YouTube Music" 
      : "Pre-save on YouTube Music (search)"
  });

  // 6. Amazon Music
  const amazonSearchUrl = `https://music.amazon.com/search/${query}`;
  platforms.push({
    platform: "amazon_music",
    platformDisplayName: "Amazon Music",
    url: amazonSearchUrl,
    type: released ? "streaming" : "presave",
    message: released 
      ? "Listen on Amazon Music" 
      : "Pre-order on Amazon Music"
  });

  // 7. Audiomack
  const audiomackSearchUrl = `https://audiomack.com/search?q=${query}`;
  platforms.push({
    platform: "audiomack",
    platformDisplayName: "Audiomack",
    url: audiomackSearchUrl,
    type: released ? "streaming" : "presave",
    message: released 
      ? "Listen on Audiomack" 
      : "Pre-save on Audiomack (search)"
  });

  // 8. Boomplay
  const boomplaySearchUrl = `https://www.boomplay.com/search/default/${query}`;
  platforms.push({
    platform: "boomplay",
    platformDisplayName: "Boomplay",
    url: boomplaySearchUrl,
    type: released ? "streaming" : "presave",
    message: released 
      ? "Listen on Boomplay" 
      : "Pre-save on Boomplay (search)"
  });

  return platforms;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { upc, artist, title, releaseDate } = body;

    // Validate required fields
    if (!upc || !artist || !title || !releaseDate) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields. Please provide upc, artist, title, and releaseDate." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UPC format
    const cleanUPC = upc.trim();
    if (!/^\d{12,14}$/.test(cleanUPC)) {
      return new Response(
        JSON.stringify({ error: "Invalid UPC format. UPC must be 12-14 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating pre-save links for:", { upc: cleanUPC, artist, title, releaseDate });

    // Check if already released
    const released = isReleased(releaseDate);
    console.log("Release status:", released ? "Already released" : "Upcoming release");

    // Generate platform links
    const platforms = await generatePlatformLinks(
      { upc: cleanUPC, artist, title, releaseDate },
      released
    );

    const result: PreSaveResult = {
      success: true,
      isReleased: released,
      releaseDate,
      artist,
      title,
      upc: cleanUPC,
      platforms
    };

    console.log("Generated pre-save result:", {
      artist: result.artist,
      title: result.title,
      isReleased: result.isReleased,
      platformCount: result.platforms.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-presave-links:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to generate pre-save links", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string; external_urls: { spotify: string } }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
    release_date: string;
    external_urls: { spotify: string };
  };
  external_ids?: { isrc?: string; upc?: string };
  external_urls: { spotify: string };
}

interface LinkResult {
  metadata: {
    title: string;
    artist: string;
    album: string;
    album_id: string;
    artist_id: string;
    isrc: string | null;
    upc: string | null;
    release_date: string | null;
    artwork: {
      large: string | null;
      medium: string | null;
      small: string | null;
    };
    spotify_track_url: string | null;
    spotify_artist_url: string | null;
    spotify_album_url: string | null;
  };
  streaming_links: Record<string, string>;
  accuracy_score: number;
  accuracy_breakdown: {
    isrc_match: boolean;
    upc_match: boolean;
    artist_similarity: number;
    title_similarity: number;
    album_match: boolean;
  };
}

// Get Spotify access token using Client Credentials flow
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

    if (!response.ok) {
      console.error("Failed to get Spotify token:", await response.text());
      return null;
    }

    const data: SpotifyToken = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    return null;
  }
}

// Search Spotify by ISRC
async function searchByISRC(token: string, isrc: string): Promise<SpotifyTrack | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.tracks?.items?.[0] || null;
  } catch (error) {
    console.error("Error searching by ISRC:", error);
    return null;
  }
}

// Search Spotify by UPC (album)
async function searchByUPC(token: string, upc: string): Promise<SpotifyTrack | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=upc:${upc}&type=album&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const album = data.albums?.items?.[0];
    
    if (!album) return null;

    // Get first track from album
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!tracksResponse.ok) return null;

    const tracksData = await tracksResponse.json();
    const trackId = tracksData.items?.[0]?.id;

    if (!trackId) return null;

    // Get full track details
    return await getTrackById(token, trackId);
  } catch (error) {
    console.error("Error searching by UPC:", error);
    return null;
  }
}

// Get track by Spotify ID
async function getTrackById(token: string, trackId: string): Promise<SpotifyTrack | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Error getting track by ID:", error);
    return null;
  }
}

// Search Spotify by query
async function searchByQuery(token: string, query: string): Promise<SpotifyTrack | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.tracks?.items?.[0] || null;
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return null;
  }
}

// Parse Spotify URL
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    const match = url.match(/spotify\.com\/(track|album|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { type: match[1], id: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

// Calculate string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  // Check if one contains the other
  if (longer.includes(shorter)) {
    return Math.round((shorter.length / longer.length) * 100);
  }
  
  // Simple word overlap check
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  return Math.round((commonWords.length / Math.max(words1.length, words2.length)) * 100);
}

// Calculate accuracy score
function calculateAccuracyScore(
  inputType: string,
  track: SpotifyTrack,
  originalInput: string
): { score: number; breakdown: LinkResult["accuracy_breakdown"] } {
  const breakdown: LinkResult["accuracy_breakdown"] = {
    isrc_match: false,
    upc_match: false,
    artist_similarity: 0,
    title_similarity: 0,
    album_match: false,
  };

  let score = 0;

  // Check for ISRC match (40 points)
  if (inputType === "isrc" && track.external_ids?.isrc) {
    if (track.external_ids.isrc.toLowerCase() === originalInput.toLowerCase()) {
      breakdown.isrc_match = true;
      score += 40;
    }
  } else if (track.external_ids?.isrc) {
    breakdown.isrc_match = true;
    score += 20; // Partial points for having ISRC
  }

  // Check for UPC match (40 points)
  if (inputType === "upc") {
    breakdown.upc_match = true;
    score += 40;
  }

  // For Spotify URL input, give high base score (verified source)
  if (inputType === "spotify_url") {
    score = 100;
    breakdown.isrc_match = !!track.external_ids?.isrc;
    breakdown.artist_similarity = 100;
    breakdown.title_similarity = 100;
    breakdown.album_match = true;
    return { score, breakdown };
  }

  // If we have a direct identifier match, ensure minimum 90%
  if (breakdown.isrc_match || breakdown.upc_match) {
    if (score < 90) score = 90;
  }

  // Artist and title similarity for search queries (20 points each)
  if (inputType === "query") {
    const parts = originalInput.split(/[-–]/);
    if (parts.length >= 2) {
      const inputArtist = parts[0].trim();
      const inputTitle = parts.slice(1).join("-").trim();
      
      breakdown.artist_similarity = calculateSimilarity(inputArtist, track.artists[0]?.name || "");
      breakdown.title_similarity = calculateSimilarity(inputTitle, track.name);
      
      score += Math.round((breakdown.artist_similarity / 100) * 20);
      score += Math.round((breakdown.title_similarity / 100) * 20);
    } else {
      // Single search term
      const combinedMatch = calculateSimilarity(
        originalInput,
        `${track.artists[0]?.name} ${track.name}`
      );
      breakdown.title_similarity = combinedMatch;
      breakdown.artist_similarity = combinedMatch;
      score += Math.round((combinedMatch / 100) * 40);
    }
  }

  // Album match bonus (20 points max)
  if (track.album?.name) {
    breakdown.album_match = true;
    score += 20;
  }

  return { score: Math.min(score, 100), breakdown };
}

// Fetch Apple Music link by UPC using iTunes API
async function fetchAppleMusicByUPC(upc: string, expectedArtist: string, expectedTitle: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/lookup?upc=${encodeURIComponent(upc)}&entity=song`;
    console.log("Fetching Apple Music by UPC:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find the matching track by verifying artist and title
      for (const result of data.results) {
        if (result.wrapperType === "track") {
          const artistMatch = result.artistName?.toLowerCase().includes(expectedArtist.toLowerCase()) ||
                              expectedArtist.toLowerCase().includes(result.artistName?.toLowerCase());
          const titleMatch = result.trackName?.toLowerCase().includes(expectedTitle.toLowerCase()) ||
                             expectedTitle.toLowerCase().includes(result.trackName?.toLowerCase());
          
          if (artistMatch || titleMatch) {
            console.log("Apple Music match found:", result.trackViewUrl);
            return result.trackViewUrl;
          }
        }
        // Also check for album/collection level match
        if (result.wrapperType === "collection" && result.collectionViewUrl) {
          console.log("Apple Music album match found:", result.collectionViewUrl);
          return result.collectionViewUrl;
        }
      }
      // If we have results but no exact match, still return the first track URL if available
      const firstTrack = data.results.find((r: any) => r.wrapperType === "track");
      if (firstTrack?.trackViewUrl) {
        console.log("Apple Music first track:", firstTrack.trackViewUrl);
        return firstTrack.trackViewUrl;
      }
    }
    
    console.log("No Apple Music match found for UPC:", upc);
    return null;
  } catch (error) {
    console.error("Error fetching Apple Music by UPC:", error);
    return null;
  }
}

// Generate streaming links
async function generateStreamingLinks(
  track: SpotifyTrack, 
  upc: string | null,
  inputType: string
): Promise<Record<string, string>> {
  const links: Record<string, string> = {};
  const query = encodeURIComponent(`${track.artists[0]?.name || ""} ${track.name}`);
  const artistQuery = encodeURIComponent(track.artists[0]?.name || "");
  const titleQuery = encodeURIComponent(track.name);

  // Spotify (verified)
  links.spotify = track.external_urls.spotify;

  // Apple Music - ONLY via UPC lookup, never inferred from Spotify
  if (upc) {
    const appleMusicUrl = await fetchAppleMusicByUPC(
      upc, 
      track.artists[0]?.name || "", 
      track.name
    );
    if (appleMusicUrl) {
      links.apple_music = appleMusicUrl;
    } else {
      links.apple_music = "Apple Music link not available yet.";
    }
  } else {
    // No UPC available - cannot generate Apple Music link
    links.apple_music = "Apple Music link not available yet.";
  }

  // YouTube Music
  links.youtube = `https://music.youtube.com/search?q=${query}`;

  // Deezer
  links.deezer = `https://www.deezer.com/search/${query}`;

  // Audiomack
  links.audiomack = `https://audiomack.com/search?q=${query}`;

  // Boomplay
  links.boomplay = `https://www.boomplay.com/search/default/${query}`;

  // Tidal
  links.tidal = `https://tidal.com/search?q=${query}`;

  // Amazon Music
  links.amazon = `https://music.amazon.com/search/${query}`;

  // SoundCloud
  links.soundcloud = `https://soundcloud.com/search?q=${query}`;

  // Shazam
  links.shazam = `https://www.shazam.com/search/${artistQuery}-${titleQuery}`;

  return links;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string") {
      return new Response(
        JSON.stringify({ error: "No input provided. Please enter a UPC, ISRC, or Spotify link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedInput = input.trim();
    console.log("Processing input:", trimmedInput);

    // Get Spotify token
    const token = await getSpotifyToken();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Spotify. Please check API credentials." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let track: SpotifyTrack | null = null;
    let inputType = "query";

    // Detect input type and search accordingly
    const isUPC = /^\d{12,13}$/.test(trimmedInput);
    const isISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(trimmedInput);
    const isSpotifyUrl = trimmedInput.includes("spotify.com");
    
    // Store UPC for Apple Music lookup
    let upcForAppleMusic: string | null = null;

    if (isUPC) {
      console.log("Searching by UPC:", trimmedInput);
      upcForAppleMusic = trimmedInput;
      inputType = "upc";
      track = await searchByUPC(token, trimmedInput);
    } else if (isISRC) {
      console.log("Searching by ISRC:", trimmedInput.toUpperCase());
      inputType = "isrc";
      track = await searchByISRC(token, trimmedInput.toUpperCase());
    } else if (isSpotifyUrl) {
      console.log("Parsing Spotify URL:", trimmedInput);
      inputType = "spotify_url";
      const parsed = parseSpotifyUrl(trimmedInput);
      
      if (parsed?.type === "track") {
        track = await getTrackById(token, parsed.id);
      } else if (parsed?.type === "album") {
        // Get first track from album
        const albumResponse = await fetch(
          `https://api.spotify.com/v1/albums/${parsed.id}/tracks?limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (albumResponse.ok) {
          const albumData = await albumResponse.json();
          const firstTrackId = albumData.items?.[0]?.id;
          if (firstTrackId) {
            track = await getTrackById(token, firstTrackId);
          }
        }
      }
    } else {
      // General search
      console.log("Searching by query:", trimmedInput);
      inputType = "query";
      track = await searchByQuery(token, trimmedInput);
    }

    // If Spotify didn't find the track, try iTunes as fallback
    if (!track) {
      console.log("Spotify returned no results, trying iTunes fallback...");
      let itunesResult = null;

      if (isUPC) {
        try {
          const itunesResp = await fetch(`https://itunes.apple.com/lookup?upc=${encodeURIComponent(trimmedInput)}&entity=song`);
          const itunesData = await itunesResp.json();
          const song = itunesData.results?.find((r: any) => r.wrapperType === "track");
          const collection = itunesData.results?.find((r: any) => r.wrapperType === "collection");
          if (song || collection) {
            itunesResult = { song, collection };
          }
        } catch (e) { console.error("iTunes UPC fallback error:", e); }
      } else if (isISRC) {
        // iTunes doesn't support ISRC, but try a text search with the ISRC
        // No good fallback here
      }

      if (itunesResult) {
        const song = itunesResult.song;
        const collection = itunesResult.collection;
        const title = song?.trackName || collection?.collectionName || "Unknown";
        const artist = song?.artistName || collection?.artistName || "Unknown";
        const artworkUrl = (song?.artworkUrl100 || collection?.artworkUrl100 || "").replace("100x100", "600x600");
        const releaseDate = song?.releaseDate || collection?.releaseDate || null;
        const appleMusicUrl = song?.trackViewUrl || collection?.collectionViewUrl || null;
        const query = encodeURIComponent(`${artist} ${title}`);

        const result: LinkResult = {
          metadata: {
            title,
            artist,
            album: song?.collectionName || collection?.collectionName || "",
            album_id: "",
            artist_id: "",
            isrc: null,
            upc: isUPC ? trimmedInput : null,
            release_date: releaseDate ? releaseDate.split("T")[0] : null,
            artwork: {
              large: artworkUrl || null,
              medium: artworkUrl ? artworkUrl.replace("600x600", "300x300") : null,
              small: artworkUrl ? artworkUrl.replace("600x600", "64x64") : null,
            },
            spotify_track_url: null,
            spotify_artist_url: null,
            spotify_album_url: null,
          },
          streaming_links: {
            spotify: `https://open.spotify.com/search/${query}`,
            apple_music: appleMusicUrl || `https://music.apple.com/search?term=${query}`,
            youtube: `https://music.youtube.com/search?q=${query}`,
            deezer: `https://www.deezer.com/search/${query}`,
            audiomack: `https://audiomack.com/search?q=${query}`,
            boomplay: `https://www.boomplay.com/search/default/${query}`,
            tidal: `https://tidal.com/search?q=${query}`,
            amazon: `https://music.amazon.com/search/${query}`,
            soundcloud: `https://soundcloud.com/search?q=${query}`,
            shazam: `https://www.shazam.com/search/${encodeURIComponent(artist)}-${encodeURIComponent(title)}`,
          },
          accuracy_score: 70,
          accuracy_breakdown: {
            isrc_match: false,
            upc_match: isUPC,
            artist_similarity: 100,
            title_similarity: 100,
            album_match: true,
          },
        };

        console.log("iTunes fallback result:", { title, artist });

        return new Response(
          JSON.stringify({ success: true, source: "itunes", ...result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // No results from any source
      return new Response(
        JSON.stringify({
          not_found: true,
          error: "No track found on Spotify or Apple Music. The track may not be distributed to stores yet.",
          suggestions: [
            "Try using a direct Spotify track or album URL",
            "Use a different UPC or ISRC code",
            "The track may not be available on streaming platforms yet",
          ],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate accuracy score
    const { score, breakdown } = calculateAccuracyScore(inputType, track, trimmedInput);

    // Generate streaming links (async for Apple Music UPC lookup)
    const streamingLinks = await generateStreamingLinks(track, upcForAppleMusic, inputType);

    // Build result
    const result: LinkResult = {
      metadata: {
        title: track.name,
        artist: track.artists[0]?.name || "Unknown Artist",
        album: track.album?.name || "",
        album_id: track.album?.id || "",
        artist_id: track.artists[0]?.id || "",
        isrc: track.external_ids?.isrc || null,
        upc: upcForAppleMusic || track.external_ids?.upc || null,
        release_date: track.album?.release_date || null,
        artwork: {
          large: track.album?.images?.find(i => i.width === 640)?.url || track.album?.images?.[0]?.url || null,
          medium: track.album?.images?.find(i => i.width === 300)?.url || track.album?.images?.[1]?.url || null,
          small: track.album?.images?.find(i => i.width === 64)?.url || track.album?.images?.[2]?.url || null,
        },
        spotify_track_url: track.external_urls?.spotify || null,
        spotify_artist_url: track.artists[0]?.external_urls?.spotify || null,
        spotify_album_url: track.album?.external_urls?.spotify || null,
      },
      streaming_links: streamingLinks,
      accuracy_score: score,
      accuracy_breakdown: breakdown,
    };

    console.log("Generated link result:", {
      title: result.metadata.title,
      artist: result.metadata.artist,
      accuracy_score: result.accuracy_score,
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-link:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to generate link", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

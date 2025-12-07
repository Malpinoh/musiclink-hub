import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MusicMetadata {
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  release_type: string | null;
  upc: string | null;
  isrc: string | null;
  platforms: Record<string, string>;
}

// Parse DSP link to extract identifiers
function parseDSPLink(url: string): { platform: string; id: string; type: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Spotify
    if (urlObj.hostname.includes("spotify.com")) {
      const match = url.match(/spotify\.com\/(track|album|artist)\/([a-zA-Z0-9]+)/);
      if (match) return { platform: "spotify", type: match[1], id: match[2] };
    }
    
    // Apple Music
    if (urlObj.hostname.includes("music.apple.com") || urlObj.hostname.includes("itunes.apple.com")) {
      const match = url.match(/\/(album|song)\/[^/]+\/(\d+)/);
      if (match) return { platform: "apple_music", type: match[1], id: match[2] };
    }
    
    // Deezer
    if (urlObj.hostname.includes("deezer.com")) {
      const match = url.match(/deezer\.com\/(?:[a-z]{2}\/)?([^/]+)\/(\d+)/);
      if (match) return { platform: "deezer", type: match[1], id: match[2] };
    }
    
    // YouTube
    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
      let videoId = urlObj.searchParams.get("v");
      if (!videoId && urlObj.hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      }
      if (videoId) return { platform: "youtube", type: "video", id: videoId };
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch from iTunes/Apple Music API
async function fetchFromItunes(query: string, type: "upc" | "isrc" | "term" = "term"): Promise<any> {
  try {
    let url: string;
    if (type === "upc") {
      url = `https://itunes.apple.com/lookup?upc=${encodeURIComponent(query)}&entity=song`;
    } else if (type === "isrc") {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`;
    } else {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`;
    }
    
    console.log("Fetching from iTunes:", url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      return {
        title: track.trackName,
        artist: track.artistName,
        artwork_url: track.artworkUrl100?.replace("100x100", "600x600"),
        release_date: track.releaseDate?.split("T")[0],
        apple_music_url: track.trackViewUrl,
        collection_name: track.collectionName,
      };
    }
    return null;
  } catch (error) {
    console.error("iTunes API error:", error);
    return null;
  }
}

// Fetch from Deezer API
async function fetchFromDeezer(query: string, type: "track" | "search" = "search", id?: string): Promise<any> {
  try {
    let url: string;
    if (type === "track" && id) {
      url = `https://api.deezer.com/track/${id}`;
    } else {
      url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    }
    
    console.log("Fetching from Deezer:", url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (type === "track" && data.id) {
      return {
        title: data.title,
        artist: data.artist?.name,
        artwork_url: data.album?.cover_xl || data.album?.cover_big,
        deezer_url: data.link,
        isrc: data.isrc,
        release_date: data.release_date,
      };
    }
    
    if (data.data && data.data.length > 0) {
      const track = data.data[0];
      return {
        title: track.title,
        artist: track.artist?.name,
        artwork_url: track.album?.cover_xl || track.album?.cover_big,
        deezer_url: track.link,
      };
    }
    return null;
  } catch (error) {
    console.error("Deezer API error:", error);
    return null;
  }
}

// Fetch Spotify embed info (limited but no API key needed)
async function fetchFromSpotifyEmbed(spotifyUrl: string): Promise<any> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
    console.log("Fetching from Spotify oEmbed:", url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.title) {
      // Parse title which is usually "Track Name - Artist"
      const parts = data.title.split(" - ");
      return {
        title: parts[0] || data.title,
        artist: parts[1] || "Unknown Artist",
        artwork_url: data.thumbnail_url,
        spotify_url: spotifyUrl,
      };
    }
    return null;
  } catch (error) {
    console.error("Spotify oEmbed error:", error);
    return null;
  }
}

// Search MusicBrainz for ISRC lookup
async function fetchFromMusicBrainz(isrc: string): Promise<any> {
  try {
    const url = `https://musicbrainz.org/ws/2/recording?query=isrc:${isrc}&fmt=json`;
    console.log("Fetching from MusicBrainz:", url);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MDistroLink/1.0 (contact@malpinohdistro.com.ng)",
      },
    });
    const data = await response.json();
    
    if (data.recordings && data.recordings.length > 0) {
      const recording = data.recordings[0];
      return {
        title: recording.title,
        artist: recording["artist-credit"]?.[0]?.name || recording["artist-credit"]?.[0]?.artist?.name,
        release_date: recording["first-release-date"],
      };
    }
    return null;
  } catch (error) {
    console.error("MusicBrainz API error:", error);
    return null;
  }
}

// Search TheAudioDB for additional artwork
async function fetchFromAudioDB(artist: string, track: string): Promise<any> {
  try {
    const url = `https://theaudiodb.com/api/v1/json/2/searchtrack.php?s=${encodeURIComponent(artist)}&t=${encodeURIComponent(track)}`;
    console.log("Fetching from AudioDB:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.track && data.track.length > 0) {
      const track = data.track[0];
      return {
        artwork_url: track.strTrackThumb,
        artist_artwork: track.strArtistThumb,
      };
    }
    return null;
  } catch (error) {
    console.error("AudioDB API error:", error);
    return null;
  }
}

// Generate platform search URLs
function generatePlatformSearchUrls(title: string, artist: string): Record<string, string> {
  const query = encodeURIComponent(`${artist} ${title}`);
  
  return {
    spotify: `https://open.spotify.com/search/${query}`,
    youtube: `https://www.youtube.com/results?search_query=${query}`,
    audiomack: `https://audiomack.com/search?q=${query}`,
    boomplay: `https://www.boomplay.com/search/default/${query}`,
    soundcloud: `https://soundcloud.com/search?q=${query}`,
    tidal: `https://tidal.com/search?q=${query}`,
    amazon: `https://music.amazon.com/search/${query}`,
    shazam: `https://www.shazam.com/search/${query}`,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, type } = await req.json();
    
    if (!input) {
      return new Response(
        JSON.stringify({ error: "No input provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing input:", input, "Type:", type);

    let metadata: MusicMetadata = {
      title: "",
      artist: "",
      artwork_url: null,
      release_date: null,
      release_type: "Single",
      upc: null,
      isrc: null,
      platforms: {},
    };

    // Detect input type
    const trimmedInput = input.trim();
    const isUPC = /^\d{12,13}$/.test(trimmedInput);
    const isISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(trimmedInput);
    const isURL = trimmedInput.startsWith("http");

    if (isUPC) {
      console.log("Detected UPC:", trimmedInput);
      metadata.upc = trimmedInput;
      
      // Fetch from iTunes by UPC
      const itunesData = await fetchFromItunes(trimmedInput, "upc");
      if (itunesData) {
        metadata.title = itunesData.title;
        metadata.artist = itunesData.artist;
        metadata.artwork_url = itunesData.artwork_url;
        metadata.release_date = itunesData.release_date;
        if (itunesData.apple_music_url) {
          metadata.platforms.apple_music = itunesData.apple_music_url;
        }
      }
    } else if (isISRC) {
      console.log("Detected ISRC:", trimmedInput.toUpperCase());
      metadata.isrc = trimmedInput.toUpperCase();
      
      // First try MusicBrainz for basic info
      const mbData = await fetchFromMusicBrainz(trimmedInput.toUpperCase());
      if (mbData) {
        metadata.title = mbData.title;
        metadata.artist = mbData.artist;
        metadata.release_date = mbData.release_date;
      }
      
      // Then search iTunes for artwork and links
      if (metadata.title && metadata.artist) {
        const itunesData = await fetchFromItunes(`${metadata.artist} ${metadata.title}`);
        if (itunesData) {
          metadata.artwork_url = itunesData.artwork_url;
          if (itunesData.apple_music_url) {
            metadata.platforms.apple_music = itunesData.apple_music_url;
          }
        }
      }
    } else if (isURL) {
      const parsed = parseDSPLink(trimmedInput);
      console.log("Parsed DSP link:", parsed);
      
      if (parsed) {
        if (parsed.platform === "spotify") {
          metadata.platforms.spotify = trimmedInput;
          const spotifyData = await fetchFromSpotifyEmbed(trimmedInput);
          if (spotifyData) {
            metadata.title = spotifyData.title;
            metadata.artist = spotifyData.artist;
            metadata.artwork_url = spotifyData.artwork_url;
          }
        } else if (parsed.platform === "deezer") {
          metadata.platforms.deezer = trimmedInput;
          const deezerData = await fetchFromDeezer("", "track", parsed.id);
          if (deezerData) {
            metadata.title = deezerData.title;
            metadata.artist = deezerData.artist;
            metadata.artwork_url = deezerData.artwork_url;
            metadata.isrc = deezerData.isrc;
            metadata.release_date = deezerData.release_date;
          }
        } else if (parsed.platform === "apple_music") {
          metadata.platforms.apple_music = trimmedInput;
          // Try to extract info from iTunes lookup
          const itunesData = await fetchFromItunes(parsed.id);
          if (itunesData) {
            metadata.title = itunesData.title;
            metadata.artist = itunesData.artist;
            metadata.artwork_url = itunesData.artwork_url;
            metadata.release_date = itunesData.release_date;
          }
        }
      }
    }

    // If we have title and artist, try to find more platform links
    if (metadata.title && metadata.artist) {
      console.log("Searching for additional platforms for:", metadata.title, "-", metadata.artist);
      
      // Search Deezer if we don't have it
      if (!metadata.platforms.deezer) {
        const deezerSearch = await fetchFromDeezer(`${metadata.artist} ${metadata.title}`);
        if (deezerSearch?.deezer_url) {
          metadata.platforms.deezer = deezerSearch.deezer_url;
          if (!metadata.artwork_url && deezerSearch.artwork_url) {
            metadata.artwork_url = deezerSearch.artwork_url;
          }
        }
      }
      
      // Search iTunes if we don't have Apple Music
      if (!metadata.platforms.apple_music) {
        const itunesSearch = await fetchFromItunes(`${metadata.artist} ${metadata.title}`);
        if (itunesSearch?.apple_music_url) {
          metadata.platforms.apple_music = itunesSearch.apple_music_url;
          if (!metadata.artwork_url && itunesSearch.artwork_url) {
            metadata.artwork_url = itunesSearch.artwork_url;
          }
        }
      }
      
      // Try to get better artwork from AudioDB
      if (!metadata.artwork_url) {
        const audioDbData = await fetchFromAudioDB(metadata.artist, metadata.title);
        if (audioDbData?.artwork_url) {
          metadata.artwork_url = audioDbData.artwork_url;
        }
      }
      
      // Generate search URLs for platforms we couldn't find direct links for
      const searchUrls = generatePlatformSearchUrls(metadata.title, metadata.artist);
      
      // Only add search URLs for platforms we don't have direct links to
      for (const [platform, url] of Object.entries(searchUrls)) {
        if (!metadata.platforms[platform]) {
          metadata.platforms[platform] = url;
        }
      }
    }

    // Check if we got any useful data
    if (!metadata.title && !metadata.artist) {
      return new Response(
        JSON.stringify({ 
          error: "Could not find track information. Please try a different link or enter the details manually.",
          metadata: null 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Final metadata:", metadata);

    return new Response(
      JSON.stringify({ 
        success: true,
        metadata 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in fetch-music-metadata:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to fetch metadata", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

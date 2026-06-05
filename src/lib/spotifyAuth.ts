// Build the Spotify OAuth authorize URL for fan pre-save.
// The redirect URI must be registered in the Spotify developer dashboard
// for each origin (preview + production + custom domains).
import { supabase } from "@/integrations/supabase/client";

export const SPOTIFY_PRESAVE_SCOPES = [
  "user-library-modify",
  "user-follow-modify",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-email",
].join(" ");

export interface PresaveOAuthState {
  preSaveId: string;
  fanId: string;
  action: "presave" | "save_and_follow";
  redirectUri: string;
  returnUrl: string;
}

let cachedClientId: string | null = null;

async function getSpotifyClientId(): Promise<string | null> {
  if (cachedClientId) return cachedClientId;
  const envId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) || "";
  if (envId) {
    cachedClientId = envId;
    return envId;
  }
  try {
    const { data, error } = await supabase.functions.invoke("get-spotify-client-id");
    if (error) throw error;
    const id = (data as { clientId?: string } | null)?.clientId || "";
    if (!id) return null;
    cachedClientId = id;
    return id;
  } catch (e) {
    console.error("Failed to fetch Spotify client id", e);
    return null;
  }
}

export async function buildSpotifyAuthorizeUrl(state: PresaveOAuthState): Promise<string | null> {
  const clientId = await getSpotifyClientId();
  if (!clientId) {
    console.error("Spotify client id not configured");
    return null;
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_PRESAVE_SCOPES,
    redirect_uri: state.redirectUri,
    state: btoa(JSON.stringify(state)),
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function getPresaveRedirectUri(): string {
  return `${window.location.origin}/callback/spotify`;
}

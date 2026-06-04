// Build the Spotify OAuth authorize URL for fan pre-save.
// The redirect URI must be registered in the Spotify developer dashboard
// for each origin (preview + production + custom domains).

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

export function buildSpotifyAuthorizeUrl(state: PresaveOAuthState): string | null {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    console.error("VITE_SPOTIFY_CLIENT_ID not configured");
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

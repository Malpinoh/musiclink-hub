// Shareable URLs backed by the unified `meta` edge function.
// Crawlers receive server-rendered HTML with full metadata; humans get a 302
// redirect straight to the real page.

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://uwzhhzkvqqvaqvkuocrz.supabase.co";

export const PUBLIC_SITE_URL = "https://md.malpinohdistro.com.ng";

/** Current page as a public, previewable URL on the custom domain */
export function getCurrentShareUrl(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  return `${PUBLIC_SITE_URL}${window.location.pathname}`;
}

export const META_ENDPOINT = `${SUPABASE_URL}/functions/v1/meta`;

/** Shareable URL for any public app path, e.g. "/artist/name" */
export function getShareableUrl(path: string): string {
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Shareable fanlink URL that renders correct social previews */
export function getShareableFanlinkUrl(artist: string, song: string): string {
  return getShareableUrl(`/${artist}/${song}`);
}

/** Shareable release URL */
export function getShareableReleaseUrl(slug: string): string {
  return getShareableUrl(`/release/${slug}`);
}

/** Shareable pre-save URL */
export function getShareablePresaveUrl(artist: string, song: string): string {
  return getShareableUrl(`/presave/${artist}/${song}`);
}

/** Shareable artist bio page URL */
export function getShareableArtistUrl(username: string): string {
  return getShareableUrl(`/artist/${username}`);
}

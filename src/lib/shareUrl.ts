// Generate shareable URLs that work with social media crawlers
// These URLs point to Edge Functions that serve pre-rendered meta tags

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uwzhhzkvqqvaqvkuocrz.supabase.co';

/**
 * Generates a shareable fanlink URL that works with social media previews
 * @param artist - The artist slug
 * @param song - The song slug  
 * @returns The shareable URL for social media
 */
export function getShareableFanlinkUrl(artist: string, song: string): string {
  return `${SUPABASE_URL}/functions/v1/fanlink-meta/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
}

/**
 * Generates a shareable presave URL that works with social media previews
 * @param artist - The artist slug
 * @param song - The song slug
 * @returns The shareable URL for social media
 */
export function getShareablePresaveUrl(artist: string, song: string): string {
  return `${SUPABASE_URL}/functions/v1/presave-meta/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
}

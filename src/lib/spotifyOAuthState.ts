export interface StoredPresaveState {
  preSaveId: string;
  fanId?: string | null;
  action: "presave" | "save_and_follow";
  redirectUri: string;
  returnUrl: string;
}

const KEY = "mdistro_spotify_oauth_";
const MAX_AGE = 30 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safePath = (path: unknown): path is string => typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");

export function createPresaveState(state: StoredPresaveState, storage: Storage, origin: string, now = Date.now()): string {
  if (state.redirectUri !== `${origin}/callback/spotify` || !safePath(state.returnUrl)) throw new Error("Invalid Spotify return address.");
  const nonce = crypto.randomUUID();
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ ...state, nonce }))));
  storage.setItem(KEY + nonce, JSON.stringify({ encoded, createdAt: now }));
  return encoded;
}

export function validatePresaveState(encoded: string, storage: Storage, origin: string, now = Date.now()): StoredPresaveState & { nonce: string } {
  const message = "Your Spotify session expired or could not be verified. Return to the campaign and retry in the same browser.";
  try {
    const state = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
    if (!state || !uuid.test(state.nonce) || !uuid.test(state.preSaveId) ||
      (state.fanId != null && !uuid.test(state.fanId)) ||
      !["presave", "save_and_follow"].includes(state.action) ||
      state.redirectUri !== `${origin}/callback/spotify` || !safePath(state.returnUrl)) throw new Error(message);
    const stored = storage.getItem(KEY + state.nonce);
    const pending = stored ? JSON.parse(stored) : null;
    if (!pending || pending.encoded !== encoded || !Number.isFinite(pending.createdAt) || now < pending.createdAt || now - pending.createdAt > MAX_AGE) throw new Error(message);
    return state;
  } catch { throw new Error(message); }
}

export function clearPresaveState(nonce: string, storage: Storage) {
  storage.removeItem(KEY + nonce);
}
import { describe, expect, test } from "bun:test";
import { clearPresaveState, createPresaveState, validatePresaveState } from "../src/lib/spotifyOAuthState";
import { readSubscriptionResponse } from "../src/lib/subscriptionResponse";

const origin = "https://md.malpinohdistro.com.ng";
const values = new Map<string, string>();
const storage: Storage = {
  getItem: k => values.get(k) ?? null,
  setItem: (k, v) => { values.set(k, v); },
  removeItem: k => { values.delete(k); },
  clear: () => values.clear(),
  key: i => [...values.keys()][i] ?? null,
  get length() { return values.size; },
};
const state = { preSaveId: "123e4567-e89b-42d3-a456-426614174000", action: "save_and_follow" as const, redirectUri: `${origin}/callback/spotify`, returnUrl: "/pre/mosky-baby-ft-sheglass-dance-remix?from=browser" };
describe("Spotify browser state", () => {
  test("returns to the exact campaign with the same registered callback", () => {
    const encoded = createPresaveState(state, storage, origin, 1000);
    const verified = validatePresaveState(encoded, storage, origin, 2000);
    expect(verified.returnUrl).toBe(state.returnUrl);
    expect(verified.redirectUri).toBe(`${origin}/callback/spotify`);
    clearPresaveState(verified.nonce, storage);
    expect(() => validatePresaveState(encoded, storage, origin, 2000)).toThrow();
  });
  test("rejects altered, expired, cross-origin and absent browser state", () => {
    const encoded = createPresaveState(state, storage, origin, 1000);
    const altered = btoa(JSON.stringify({ ...JSON.parse(atob(encoded)), preSaveId: crypto.randomUUID() }));
    expect(() => validatePresaveState(altered, storage, origin, 2000)).toThrow();
    expect(() => validatePresaveState(encoded, storage, origin, 1801001)).toThrow();
    expect(() => validatePresaveState(encoded, storage, "https://other.example", 2000)).toThrow();
    storage.clear();
    expect(() => validatePresaveState(encoded, storage, origin, 2000)).toThrow();
  });
  test("rejects unsafe return URLs", () => {
    for (const returnUrl of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
      expect(() => createPresaveState({ ...state, returnUrl }, storage, origin)).toThrow();
    }
  });
});
test("client reads safe error JSON from a non-2xx function response", async () => {
  const response = await readSubscriptionResponse(null, { context: new Response(JSON.stringify({ success: false, code: "CONSENT_REQUIRED", message: "Tick the consent box." }), { status: 400 }) });
  expect(response.success).toBe(false);
  expect(response.code).toBe("CONSENT_REQUIRED");
});
test("a missing success confirmation cannot be mistaken for subscribed", async () => {
  expect((await readSubscriptionResponse(null, null)).success).not.toBe(true);
});
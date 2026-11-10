import { createSubscriptionHandler, safeDiagnostic } from "./handler.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";
const body = { preSaveId: id, email: " Fan@Example.com ", consent: true };
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
function fixture(campaign: unknown = { id, user_id: id }, dbError: unknown = null) {
  let row: Record<string, unknown> | undefined;
  let conflict: string | undefined;
  const db = { from: (table: string) => table === "pre_saves" ? {
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: campaign, error: null }) }) }) }),
  } : { upsert: async (value: Record<string, unknown>, options: { onConflict: string }) => {
    row = value; conflict = options.onConflict; return { error: dbError };
  } } };
  const handler = createSubscriptionHandler(cors, () => db, () => {});
  return { handler, row: () => row, conflict: () => conflict };
}
async function post(handler: (req: Request) => Promise<Response>, input: unknown = body) {
  return handler(new Request("https://example.com", { method: "POST", body: JSON.stringify(input) }));
}

Deno.test("requires explicit true consent, including repeat subscriptions", async () => {
  for (const consent of [undefined, false, "true", 1]) {
    const f = fixture(); const response = await post(f.handler, { ...body, consent });
    assert(response.status === 400 && (await response.json()).code === "CONSENT_REQUIRED", "consent must be true");
    assert(!f.row(), "must not write without consent");
  }
});
Deno.test("invalid email and invalid campaign UUID are rejected", async () => {
  assert((await (await post(fixture().handler, { ...body, email: "bad" })).json()).code === "INVALID_EMAIL", "invalid email");
  assert((await (await post(fixture().handler, { ...body, preSaveId: "------------------------------------" })).json()).code === "INVALID_REQUEST", "invalid UUID");
});
Deno.test("upsert normalizes email and preserves unsubscribe token", async () => {
  const f = fixture();
  for (let i = 0; i < 2; i++) assert((await (await post(f.handler)).json()).success === true, "repeat opt-in succeeds");
  assert(f.row()?.email === "fan@example.com", "trimmed lowercase email");
  assert(f.conflict() === "artist_user_id,email", "must match actual unique constraint");
  assert(f.row()?.is_active === true && typeof f.row()?.consented_at === "string", "explicit opt-in reactivates subscription");
  assert(!Object.hasOwn(f.row() || {}, "unsubscribe_token"), "preserve unsubscribe support");
});
Deno.test("unavailable campaign is not subscribed", async () => {
  const f = fixture(null); const r = await post(f.handler);
  assert(r.status === 404 && (await r.json()).code === "CAMPAIGN_UNAVAILABLE" && !f.row(), "unavailable campaign");
});
Deno.test("database failures have safe actionable codes", async () => {
  for (const [dbCode, expected] of [["42P01", "SUBSCRIPTION_SCHEMA_ERROR"], ["42P10", "SUBSCRIPTION_SCHEMA_ERROR"], ["23505", "SUBSCRIPTION_CONFLICT"], ["23502", "SUBSCRIPTION_CONSTRAINT_ERROR"], ["42501", "SUBSCRIPTION_PERMISSION_ERROR"], ["23503", "CAMPAIGN_UNAVAILABLE"]]) {
    const error = { code: dbCode, details: "secret-token fan@example.com", message: "fan@example.com", hint: "secret-token" };
    const r = await post(fixture(undefined, error).handler); const payload = await r.json();
    assert(payload.success === false && payload.code === expected, expected);
    assert(!JSON.stringify(payload).includes("fan@example.com") && !JSON.stringify(safeDiagnostic("upsert", "id", error)).includes("secret-token"), "no raw private diagnostics");
  }
});
Deno.test("missing config, OPTIONS, POST-only and invalid JSON are handled safely", async () => {
  const handler = createSubscriptionHandler(cors, () => null, () => {});
  assert((await (await post(handler)).json()).code === "SERVER_CONFIG_MISSING", "missing config");
  const options = await handler(new Request("https://example.com", { method: "OPTIONS" }));
  assert(options.ok && options.headers.get("Access-Control-Allow-Methods")?.includes("POST"), "preflight");
  const get = await handler(new Request("https://example.com"));
  assert(get.status === 405 && get.headers.get("Access-Control-Allow-Origin") === "*", "method and error CORS");
  const invalid = await handler(new Request("https://example.com", { method: "POST", body: "{" }));
  assert((await invalid.json()).code === "INVALID_JSON", "invalid JSON");
});
import { z } from "npm:zod@3.25.76";

const BodySchema = z.object({
  preSaveId: z.string().uuid(),
  email: z.string().trim().toLowerCase().max(254).email(),
  name: z.string().trim().max(120).optional().default(""),
  consent: z.literal(true),
});

type DbError = { code?: string; message?: string; details?: string; hint?: string };
export function databaseFailure(error: DbError) {
  const code = error.code || "UNKNOWN";
  if (["42P01", "42703", "PGRST204", "PGRST205", "42P10"].includes(code)) {
    return { status: 503, code: "SUBSCRIPTION_SCHEMA_ERROR", message: "Subscriptions are temporarily unavailable. Ask the artist to contact MDistro Link about the subscription schema configuration." };
  }
  if (code === "42501" || code === "PGRST301") {
    return { status: 503, code: "SUBSCRIPTION_PERMISSION_ERROR", message: "Subscriptions are temporarily unavailable. MDistro Link needs to check subscription access permissions." };
  }
  if (code === "23503") {
    return { status: 409, code: "CAMPAIGN_UNAVAILABLE", message: "This release campaign is no longer available. Refresh the page or ask the artist for a current link." };
  }
  if (code === "23505") {
    return { status: 409, code: "SUBSCRIPTION_CONFLICT", message: "Your subscription could not be confirmed because of a conflicting record. Please retry; if it persists, contact MDistro Link." };
  }
  if (code.startsWith("23")) {
    return { status: 503, code: "SUBSCRIPTION_CONSTRAINT_ERROR", message: "Subscriptions are temporarily unavailable. MDistro Link needs to check subscription data constraints." };
  }
  return { status: 503, code: "SUBSCRIPTION_SAVE_FAILED", message: "We couldn't confirm your subscription. Please try again shortly." };
}

// Deliberately log only allowlisted diagnostics: database detail/hint/message can
// contain email addresses, names, tokens or entire failing rows.
export function safeDiagnostic(stage: string, requestId: string, error?: DbError) {
  return { event: "artist_subscription_failure", stage, requestId, databaseCode: error?.code || "UNKNOWN" };
}

export function createSubscriptionHandler(
  corsHeaders: Record<string, string>,
  getDatabase: () => {
    from: (table: string) => any;
  } | null,
  log: (diagnostic: ReturnType<typeof safeDiagnostic>) => void = console.error,
) {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const respond = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify({ ...body, requestId }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", "Allow": "POST, OPTIONS" },
    });
    if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
    if (req.method !== "POST") return respond(405, { success: false, code: "METHOD_NOT_ALLOWED", message: "Use POST to submit a subscription." });
    let stage = "request_validation";
    try {
      let body: unknown;
      try { body = await req.json(); } catch {
        return respond(400, { success: false, code: "INVALID_JSON", message: "The subscription request is invalid. Refresh the page and try again." });
      }
      const parsed = BodySchema.safeParse(body);
      if (!parsed.success) {
        const fields = parsed.error.issues.map(issue => issue.path[0]);
        const code = fields.includes("consent") ? "CONSENT_REQUIRED" : fields.includes("email") ? "INVALID_EMAIL" : "INVALID_REQUEST";
        const message = code === "CONSENT_REQUIRED" ? "Tick the consent box to receive future release emails." : code === "INVALID_EMAIL" ? "Enter a valid email address (up to 254 characters)." : "The campaign or subscription details are invalid. Refresh the page and try again.";
        return respond(400, { success: false, code, message });
      }
      stage = "server_config";
      const db = getDatabase();
      if (!db) {
        log(safeDiagnostic(stage, requestId));
        return respond(503, { success: false, code: "SERVER_CONFIG_MISSING", message: "Subscriptions are temporarily unavailable. MDistro Link needs to restore the subscription service configuration." });
      }
      const fail = (error: DbError) => {
        log(safeDiagnostic(stage, requestId, error));
        const failure = databaseFailure(error);
        return respond(failure.status, { success: false, code: failure.code, message: failure.message });
      };
      stage = "campaign_lookup";
      const { data: campaign, error: campaignError } = await db.from("pre_saves")
        .select("id, user_id, is_active").eq("id", parsed.data.preSaveId).eq("is_active", true).maybeSingle();
      if (campaignError) return fail(campaignError);
      if (!campaign) return respond(404, { success: false, code: "CAMPAIGN_UNAVAILABLE", message: "This release campaign is unavailable. Ask the artist for a current link." });
      stage = "subscription_upsert";
      const now = new Date().toISOString();
      const { error } = await db.from("artist_email_subscriptions").upsert({
        artist_user_id: campaign.user_id,
        email: parsed.data.email,
        fan_name: parsed.data.name,
        source_pre_save_id: campaign.id,
        is_active: true,
        consented_at: now,
        updated_at: now,
        // Never overwrite unsubscribe_token or created_at on repeat opt-in.
      }, { onConflict: "artist_user_id,email" });
      if (error) return fail(error);
      return respond(200, { success: true, code: "SUBSCRIBED", message: "You are subscribed to this artist’s future release updates. You can unsubscribe from any email." });
    } catch {
      log(safeDiagnostic(stage, requestId));
      return respond(503, { success: false, code: "SUBSCRIPTION_SERVICE_UNAVAILABLE", message: "The subscription service is unavailable. Please try again shortly." });
    }
  };
}
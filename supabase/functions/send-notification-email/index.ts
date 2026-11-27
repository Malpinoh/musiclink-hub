// Sends an email for a newly created in-app notification (triggered by the database).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EARNINGS_TYPES = ["earnings_available", "earnings_imported", "earnings_paid", "earnings_reversed"];

const emailShell = (title: string, message: string, link?: string | null) => `
<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#0b0f19;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e6e9f0">
  <div style="max-width:520px;margin:0 auto;background:#121826;border-radius:16px;padding:28px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7c8aa5">MDistro Link</p>
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${title}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#c3cbdb">${message}</p>
    ${
      link
        ? `<a href="${link}" style="display:inline-block;background:#6d5cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">Open dashboard</a>`
        : ""
    }
    <p style="margin:24px 0 0;font-size:12px;color:#6d7893">You can manage these emails in your notification settings.</p>
  </div>
</body></html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { notification_id } = await req.json();
    if (!notification_id) return json({ error: "notification_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: notification, error: nErr } = await supabase
      .from("notifications")
      .select("id,user_id,type,title,message,link")
      .eq("id", notification_id)
      .maybeSingle();
    if (nErr) throw nErr;
    if (!notification) return json({ error: "notification not found" }, 404);

    const record = async (status: string, error_message?: string) => {
      await supabase.from("notification_deliveries").insert({
        notification_id: notification.id,
        channel: "email",
        status,
        error_message: error_message ?? null,
      });
    };

    // Respect the artist's email preferences (defaults to enabled when no row exists)
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_monetization_status,email_earnings_updates")
      .eq("user_id", notification.user_id)
      .maybeSingle();

    const isEarnings = EARNINGS_TYPES.includes(notification.type);
    const allowed = prefs
      ? isEarnings
        ? prefs.email_earnings_updates
        : prefs.email_monetization_status
      : true;

    if (!allowed) {
      await record("skipped", "Disabled by user preference");
      return json({ skipped: true });
    }

    const { data: userRes, error: uErr } = await supabase.auth.admin.getUserById(notification.user_id);
    if (uErr) throw uErr;
    const email = userRes?.user?.email;
    if (!email) {
      await record("failed", "No email on account");
      return json({ error: "no email" }, 422);
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      await record("failed", "BREVO_API_KEY is not configured");
      return json({ error: "email not configured" }, 500);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://md.malpinohdistro.com.ng";
    const link = notification.link ? `${siteUrl}${notification.link}` : null;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "MDistro Link", email: "noreply@malpinohdistro.com.ng" },
        to: [{ email }],
        subject: notification.title,
        htmlContent: emailShell(notification.title, notification.message, link),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await record("failed", text.slice(0, 500));
      return json({ error: "send failed", detail: text }, 502);
    }

    await record("sent");
    return json({ sent: true });
  } catch (e) {
    console.error("send-notification-email error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

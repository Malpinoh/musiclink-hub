import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FanRecord {
  id: string;
  email: string;
  name: string;
}

interface PreSaveRecord {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  upc: string | null;
  slug: string;
  artist_slug: string;
}

async function sendBrevoEmail(
  brevoApiKey: string,
  to: { email: string; name: string },
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "MDistro Link", email: "noreply@malpinohdistro.com.ng" },
        to: [to],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Brevo API error [${response.status}]: ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function buildEmailHtml(preSave: PreSaveRecord, fanName: string): string {
  const artworkUrl = preSave.artwork_url || "https://via.placeholder.com/300x300?text=Music";
  const streamingUrl = `https://md.malpinohdistro.com.ng/pre/${preSave.artist_slug}-${preSave.slug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e; border-radius:16px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:30px 30px 10px; text-align:center;">
              <p style="color:#9ca3af; font-size:12px; margin:0;">MDistro Link</p>
            </td>
          </tr>
          <!-- Artwork -->
          <tr>
            <td align="center" style="padding:20px;">
              <img src="${artworkUrl}" alt="${preSave.title}" width="250" height="250" style="border-radius:12px; display:block;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:0 30px 20px; text-align:center;">
              <h1 style="color:#ffffff; font-size:24px; margin:0 0 8px;">${preSave.title}</h1>
              <p style="color:#9ca3af; font-size:16px; margin:0 0 20px;">${preSave.artist}</p>
              <p style="color:#d1d5db; font-size:14px; margin:0 0 30px;">
                Hey ${fanName}! 🎉 The wait is over — <strong>${preSave.title}</strong> by <strong>${preSave.artist}</strong> is now available to stream!
              </p>
              <a href="${streamingUrl}" style="display:inline-block; background:linear-gradient(135deg,#8b5cf6,#ec4899); color:#ffffff; font-size:16px; font-weight:bold; text-decoration:none; padding:14px 40px; border-radius:30px;">
                🎧 Listen Now
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px 30px; text-align:center;">
              <p style="color:#6b7280; font-size:11px; margin:0;">
                You received this because you signed up for release notifications on MDistro Link.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find pre-saves where release_date is today
    const today = new Date().toISOString().split("T")[0];

    const { data: releasingToday, error: fetchError } = await supabase
      .from("pre_saves")
      .select("id, title, artist, artwork_url, release_date, upc, slug, artist_slug")
      .eq("release_date", today)
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    if (!releasingToday || releasingToday.length === 0) {
      return new Response(JSON.stringify({ message: "No releases today", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const preSave of releasingToday) {
      // Get fans for this pre-save
      const { data: fans, error: fansError } = await supabase
        .from("presave_fans")
        .select("id, email, name")
        .eq("pre_save_id", preSave.id);

      if (fansError || !fans || fans.length === 0) continue;

      for (const fan of fans as FanRecord[]) {
        // Check if already notified
        const { data: existing } = await supabase
          .from("presave_notifications")
          .select("id")
          .eq("pre_save_id", preSave.id)
          .eq("fan_id", fan.id)
          .maybeSingle();

        if (existing) continue;

        const subject = `🎶 ${preSave.title} by ${preSave.artist} is OUT NOW!`;
        const html = buildEmailHtml(preSave, fan.name);

        const result = await sendBrevoEmail(brevoApiKey, { email: fan.email, name: fan.name }, subject, html);

        // Log notification
        await supabase.from("presave_notifications").insert({
          pre_save_id: preSave.id,
          fan_id: fan.id,
          email: fan.email,
          status: result.success ? "sent" : "failed",
          error_message: result.error || null,
        });

        if (result.success) {
          totalSent++;
        } else {
          totalErrors++;
          console.error(`Failed to send to ${fan.email}:`, result.error);
        }

        // Rate limiting: 100ms between emails
        await new Promise((r) => setTimeout(r, 100));
      }

      // Mark pre-save as released
      await supabase
        .from("pre_saves")
        .update({ is_released: true })
        .eq("id", preSave.id);
    }

    return new Response(
      JSON.stringify({ message: "Notifications processed", sent: totalSent, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

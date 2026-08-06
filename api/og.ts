// Vercel Function (Node runtime) — crawler-aware HTML for public MDistro pages.
// Vite/React app is untouched: humans always get the SPA shell (index.html),
// crawlers get server-rendered HTML with full OG/Twitter/JSON-LD metadata
// produced by the existing Supabase `meta` Edge Function.
//
// No Next.js. No middleware. Plain Web-standard request/response handling.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://uwzhhzkvqqvaqvkuocrz.supabase.co";

const META_ENDPOINT = `${SUPABASE_URL}/functions/v1/meta`;

const CRAWLER_PATTERN =
  /(bot\b|bot\/|spider|crawler|crawl|slurp|googlebot|google-inspectiontool|googleother|bingbot|bingpreview|facebookexternalhit|facebot|facebook|twitterbot|linkedinbot|whatsapp|telegrambot|telegram|discordbot|discord|slackbot|slack-imgproxy|skypeuripreview|embedly|pinterest|redditbot|applebot|vkshare|flipboard|tumblr|snapchat|viber|mastodon|iframely|preview|chatgpt|gptbot|oai-searchbot|perplexitybot|claudebot|anthropic-ai|yandex|baiduspider|duckduckbot)/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // no UA → serve metadata so previews never break
  return CRAWLER_PATTERN.test(userAgent);
}

function appPath(req: Request): string {
  const url = new URL(req.url, "http://localhost");
  const explicit = url.searchParams.get("path");
  const path = explicit || url.pathname;
  return path.startsWith("/") ? path : `/${path}`;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = new URL(req.url, `https://${process.env.VERCEL_URL ?? "localhost"}`).origin;
  const path = appPath(req);
  const ua = req.headers.get("user-agent");

  if (isCrawler(ua)) {
    try {
      const res = await fetch(`${META_ENDPOINT}?path=${encodeURIComponent(path)}`, {
        headers: {
          // Forwarding the UA keeps the edge function on its HTML branch.
          "user-agent": ua || "MDistroLinkPreviewBot/1.0",
          accept: "text/html",
        },
        redirect: "manual",
      });

      if (res.ok) {
        const html = await res.text();
        return new Response(html, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
            "x-mdistro-render": "crawler",
          },
        });
      }
    } catch (e) {
      console.error("og: meta fetch failed", e);
    }
    // fall through to the SPA shell if metadata generation fails
  }

  // Humans (and metadata failures): return the built Vite index.html untouched.
  const shell = await fetch(`${origin}/index.html`, {
    headers: { accept: "text/html" },
  });
  const html = await shell.text();

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "x-mdistro-render": "spa",
    },
  });
}

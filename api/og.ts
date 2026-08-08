// Vercel Function (Node runtime) — crawler-aware HTML for public MDistro pages.
// Vite/React app is untouched: humans always get the SPA shell (index.html),
// crawlers get server-rendered HTML with full OG/Twitter/JSON-LD metadata
// produced by the existing Supabase `meta` Edge Function.
//
// No Next.js. No middleware. Node.js request/response handling.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://uwzhhzkvqqvaqvkuocrz.supabase.co";

const META_ENDPOINT = `${SUPABASE_URL}/functions/v1/meta`;

const CRAWLER_PATTERN =
  /(bot\b|bot\/|spider|crawler|crawl|slurp|googlebot|google-inspectiontool|googleother|bingbot|bingpreview|facebookexternalhit|facebot|facebook|twitterbot|linkedinbot|whatsapp|telegrambot|telegram|discordbot|discord|slackbot|slack-imgproxy|skypeuripreview|embedly|pinterest|redditbot|applebot|vkshare|flipboard|tumblr|snapchat|viber|mastodon|iframely|preview|chatgpt|gptbot|oai-searchbot|perplexitybot|claudebot|anthropic-ai|yandex|baiduspider|duckduckbot)/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // no UA → serve metadata so previews never break
  return CRAWLER_PATTERN.test(userAgent);
}

function appPath(req: VercelRequest): string {
  const url = new URL(req.url ?? "/", "http://localhost");
  const explicit = url.searchParams.get("path");
  const path = explicit || url.pathname;
  return path.startsWith("/") ? path : `/${path}`;
}

function getHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = new URL(
    req.url ?? "/",
    `https://${process.env.VERCEL_URL ?? "localhost"}`
  ).origin;
  const path = appPath(req);
  const ua = getHeader(req, "user-agent");

  if (isCrawler(ua)) {
    try {
      const metaRes = await fetch(
        `${META_ENDPOINT}?path=${encodeURIComponent(path)}`,
        {
          headers: {
            // Forwarding the UA keeps the edge function on its HTML branch.
            "user-agent": ua || "MDistroLinkPreviewBot/1.0",
            accept: "text/html",
          },
          redirect: "manual",
        }
      );

      if (metaRes.ok) {
        const html = await metaRes.text();
        res
          .status(200)
          .setHeader("content-type", "text/html; charset=utf-8")
          .setHeader(
            "cache-control",
            "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
          )
          .setHeader("x-mdistro-render", "crawler")
          .send(html);
        return;
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

  res
    .status(200)
    .setHeader("content-type", "text/html; charset=utf-8")
    .setHeader("cache-control", "public, max-age=0, must-revalidate")
    .setHeader("x-mdistro-render", "spa")
    .send(html);
}

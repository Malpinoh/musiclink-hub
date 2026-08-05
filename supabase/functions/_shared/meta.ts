// Unified metadata engine for every public MDistro Link page.
// Handles: route resolution, crawler detection, server-side HTML generation,
// dynamic Open Graph / Twitter / JSON-LD / canonical tags and DB-backed caching.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SITE_URL = "https://md.malpinohdistro.com.ng";
export const SITE_NAME = "MDistro Link";
export const TWITTER_HANDLE = "@MalpinohDistro";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ------------------------------------------------------------------ */
/* Crawler detection                                                   */
/* ------------------------------------------------------------------ */

const CRAWLER_PATTERN =
  /(bot\b|bot\/|spider|crawler|crawl|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|slack-imgproxy|skypeuripreview|embedly|quora link preview|pinterest|redditbot|applebot|vkshare|w3c_validator|nuzzel|outbrain|flipboard|tumblr|bitlybot|xing-contenttabreceiver|google-inspectiontool|googleother|chatgpt|gptbot|oai-searchbot|perplexitybot|claudebot|anthropic-ai|bingpreview|yandex|baiduspider|duckduckbot|ia_archiver|preview|metainspector|snapchat|line-poker|viber|mastodon|iframely)/i;

export function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA → treat as crawler so previews never break
  return CRAWLER_PATTERN.test(userAgent);
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PageKind = "fanlink" | "presave" | "artist" | "site";

export interface MetaModel {
  kind: PageKind;
  entityType: string;
  entityId: string | null;
  title: string;
  description: string;
  image: string;
  canonical: string;
  ogType: string;
  keywords: string;
  updatedAt: string | null;
  robots: string;
  jsonLd: unknown[];
  music?: {
    musician?: string;
    album?: string;
    releaseDate?: string;
    duration?: number;
  };
  body: { heading: string; lines: string[]; links: { href: string; label: string }[] };
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/* ------------------------------------------------------------------ */
/* Route resolution                                                    */
/* ------------------------------------------------------------------ */

export interface RouteMatch {
  kind: PageKind;
  /** canonical path for this page */
  path: string;
  params: Record<string, string>;
}

const RESERVED = new Set([
  "dashboard",
  "create",
  "edit",
  "analytics",
  "login",
  "callback",
  "admin",
  "assets",
  "functions",
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
]);

export function resolveRoute(rawPath: string): RouteMatch | null {
  const path = "/" + rawPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { kind: "site", path: "/", params: {} };
  if (RESERVED.has(parts[0]) && !(parts[0] === "artist" && parts.length === 2)) return null;

  if (parts[0] === "demo") return { kind: "site", path: "/demo", params: {} };

  // /presave/{artist}/{slug}
  if (parts[0] === "presave" && parts.length === 3 && parts[1] !== "create") {
    return { kind: "presave", path, params: { artist: parts[1], slug: parts[2] } };
  }
  // /pre/{slug} and /listen/{slug}
  if ((parts[0] === "pre" || parts[0] === "listen") && parts.length === 2) {
    return { kind: "presave", path, params: { slug: parts[1] } };
  }
  // /release/{key} and /track/{key}
  if ((parts[0] === "release" || parts[0] === "track") && parts.length === 2) {
    return { kind: "fanlink", path, params: { key: parts[1], contentType: parts[0] } };
  }
  // /link/{id}
  if (parts[0] === "link" && parts.length === 2) {
    return { kind: "fanlink", path, params: { id: parts[1] } };
  }
  // /artist/{username}
  if (parts[0] === "artist" && parts.length === 2) {
    return { kind: "artist", path, params: { username: parts[1] } };
  }
  // /{artist}/{song}
  if (parts.length === 2) {
    return { kind: "fanlink", path, params: { artist: parts[0], song: parts[1] } };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Model builders                                                      */
/* ------------------------------------------------------------------ */

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clean = (v: unknown, max = 300) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

function siteModel(path: string): MetaModel {
  const isDemo = path === "/demo";
  const title = isDemo
    ? `Live Demo — ${SITE_NAME}`
    : `${SITE_NAME} — One Link. All Platforms. Infinite Reach.`;
  const description = isDemo
    ? "See a live MDistro Link fanlink in action: every streaming platform, real analytics and pre-save campaigns in one smart music link."
    : "Create smart music links that send fans to Spotify, Apple Music, YouTube Music, Audiomack, Boomplay, Deezer and Tidal — with automatic metadata and real-time analytics.";
  return {
    kind: "site",
    entityType: "site",
    entityId: null,
    title,
    description,
    image: DEFAULT_IMAGE,
    canonical: `${SITE_URL}${path === "/" ? "/" : path}`,
    ogType: "website",
    keywords: "fanlink, smart link, music link, pre-save, spotify link, apple music link, music marketing",
    updatedAt: null,
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description,
      },
    ],
    body: {
      heading: title,
      lines: [description],
      links: [{ href: SITE_URL, label: SITE_NAME }],
    },
  };
}

async function fanlinkModel(
  supabase: SupabaseClient,
  route: RouteMatch,
): Promise<MetaModel | null> {
  let query = supabase.from("fanlinks").select("*").eq("is_published", true).limit(1);

  if (route.params.id) query = supabase.from("fanlinks").select("*").eq("id", route.params.id).limit(1);
  else if (route.params.key) query = query.eq("slug", route.params.key);
  else query = query.eq("artist_slug", route.params.artist).eq("slug", route.params.song);

  const { data } = await query;
  const link = data?.[0];
  if (!link) return null;

  const canonicalPath =
    link.content_type === "release"
      ? `/release/${link.slug}`
      : `/${link.artist_slug}/${link.slug}`;
  const canonical = `${SITE_URL}${canonicalPath}`;

  const { data: platforms } = await supabase
    .from("platform_links")
    .select("platform_name, platform_url, is_active, display_order")
    .eq("fanlink_id", link.id)
    .order("display_order", { ascending: true });

  const active = (platforms || []).filter((p) => p.is_active !== false);
  const platformNames = active.map((p) => p.platform_name);
  const isRelease = link.content_type === "release";
  const tracks: Array<{ track_number?: number; title?: string; duration_ms?: number | null }> =
    Array.isArray(link.tracklist) ? link.tracklist : [];

  const label = isRelease ? link.release_type || "release" : "song";
  const title = `${link.title} — ${link.artist}`;
  const description = clean(
    `Listen to ${isRelease ? `the ${label} ` : ""}"${link.title}" by ${link.artist}${
      platformNames.length ? ` on ${platformNames.slice(0, 5).join(", ")}` : ""
    }${platformNames.length > 5 ? " and more" : ""}. One link, every streaming platform.`,
  );
  const image = link.artwork_url || DEFAULT_IMAGE;

  const jsonLd: unknown[] = [
    isRelease
      ? {
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: link.title,
          albumProductionType: "https://schema.org/StudioAlbum",
          albumReleaseType:
            (link.total_tracks || tracks.length) > 6
              ? "https://schema.org/AlbumRelease"
              : "https://schema.org/EPRelease",
          byArtist: { "@type": "MusicGroup", name: link.artist },
          image,
          url: canonical,
          description,
          numTracks: link.total_tracks || tracks.length || undefined,
          ...(link.release_date ? { datePublished: link.release_date } : {}),
          ...(link.upc ? { gtin13: link.upc } : {}),
          ...(tracks.length
            ? {
                track: {
                  "@type": "ItemList",
                  numberOfItems: tracks.length,
                  itemListElement: tracks.map((t, i) => ({
                    "@type": "ListItem",
                    position: t.track_number || i + 1,
                    item: {
                      "@type": "MusicRecording",
                      name: t.title || `Track ${i + 1}`,
                      byArtist: { "@type": "MusicGroup", name: link.artist },
                      ...(t.duration_ms
                        ? { duration: `PT${Math.round(t.duration_ms / 1000)}S` }
                        : {}),
                    },
                  })),
                },
              }
            : {}),
          ...(active.length ? { sameAs: active.map((p) => p.platform_url) } : {}),
        }
      : {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: link.title,
          byArtist: { "@type": "MusicGroup", name: link.artist },
          image,
          url: canonical,
          description,
          ...(link.isrc ? { isrcCode: link.isrc } : {}),
          ...(link.release_date ? { datePublished: link.release_date } : {}),
          ...(active.length ? { sameAs: active.map((p) => p.platform_url) } : {}),
          potentialAction: {
            "@type": "ListenAction",
            target: { "@type": "EntryPoint", urlTemplate: canonical },
          },
        },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: link.artist, item: `${SITE_URL}/${link.artist_slug}` },
        { "@type": "ListItem", position: 3, name: link.title, item: canonical },
      ],
    },
  ];

  return {
    kind: "fanlink",
    entityType: "fanlink",
    entityId: link.id,
    title,
    description,
    image,
    canonical,
    ogType: isRelease ? "music.album" : "music.song",
    keywords: `${link.title}, ${link.artist}, ${label}, stream, listen, smart link, ${platformNames
      .slice(0, 8)
      .join(", ")}`,
    updatedAt: link.updated_at ?? null,
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    jsonLd,
    music: {
      musician: link.artist,
      album: isRelease ? link.title : undefined,
      releaseDate: link.release_date || undefined,
    },
    body: {
      heading: title,
      lines: [
        description,
        ...(tracks.length
          ? [`Tracklist: ${tracks.map((t, i) => `${t.track_number || i + 1}. ${t.title || ""}`).join(" · ")}`]
          : []),
      ],
      links: [
        { href: canonical, label: `Listen to ${link.title}` },
        ...active.map((p) => ({ href: p.platform_url, label: p.platform_name })),
      ],
    },
  };
}

async function presaveModel(
  supabase: SupabaseClient,
  route: RouteMatch,
): Promise<MetaModel | null> {
  let query = supabase.from("pre_saves").select("*").eq("is_active", true).limit(1);
  if (route.params.artist) query = query.eq("artist_slug", route.params.artist).eq("slug", route.params.slug);
  else query = query.eq("slug", route.params.slug);

  const { data } = await query;
  const presave = data?.[0];
  if (!presave) return null;

  const canonical = `${SITE_URL}/presave/${presave.artist_slug}/${presave.slug}`;
  const { data: platforms } = await supabase
    .from("presave_streaming_links")
    .select("platform_name, platform_url")
    .eq("pre_save_id", presave.id)
    .order("display_order", { ascending: true });

  const released = !!presave.is_released;
  const title = released
    ? `${presave.title} — ${presave.artist}`
    : `Pre-save ${presave.title} — ${presave.artist}`;
  const description = clean(
    presave.description ||
      (released
        ? `"${presave.title}" by ${presave.artist} is out now. Stream it on Spotify, Apple Music and every major platform.`
        : `Pre-save "${presave.title}" by ${presave.artist}${
            presave.release_date ? `, out ${presave.release_date}` : ""
          }. It lands in your Spotify library the moment it drops.`),
  );
  const image = presave.theme_hero_image_url || presave.artwork_url || DEFAULT_IMAGE;

  return {
    kind: "presave",
    entityType: "pre_save",
    entityId: presave.id,
    title,
    description,
    image,
    canonical,
    ogType: "music.song",
    keywords: `${presave.title}, ${presave.artist}, pre-save, pre-add, spotify pre-save, new music${
      presave.release_date ? `, ${presave.release_date}` : ""
    }`,
    updatedAt: presave.updated_at ?? null,
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: presave.title,
        byArtist: { "@type": "MusicGroup", name: presave.artist },
        image,
        url: canonical,
        description,
        ...(presave.isrc ? { isrcCode: presave.isrc } : {}),
        ...(presave.album_title
          ? { inAlbum: { "@type": "MusicAlbum", name: presave.album_title } }
          : {}),
        ...(presave.release_date ? { datePublished: presave.release_date } : {}),
        ...(platforms?.length ? { sameAs: platforms.map((p) => p.platform_url) } : {}),
        potentialAction: {
          "@type": "ListenAction",
          target: { "@type": "EntryPoint", urlTemplate: canonical },
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: presave.artist, item: `${SITE_URL}/${presave.artist_slug}` },
          { "@type": "ListItem", position: 3, name: presave.title, item: canonical },
        ],
      },
    ],
    music: {
      musician: presave.artist,
      album: presave.album_title || undefined,
      releaseDate: presave.release_date || undefined,
    },
    body: {
      heading: title,
      lines: [description],
      links: [
        { href: canonical, label: released ? `Stream ${presave.title}` : `Pre-save ${presave.title}` },
        ...(platforms || []).map((p) => ({ href: p.platform_url, label: p.platform_name })),
      ],
    },
  };
}

async function artistModel(
  supabase: SupabaseClient,
  route: RouteMatch,
): Promise<MetaModel | null> {
  const { data } = await supabase
    .from("artist_profiles")
    .select("*")
    .eq("username", route.params.username)
    .eq("is_active", true)
    .limit(1);
  const profile = data?.[0];
  if (!profile) return null;

  const canonical = `${SITE_URL}/artist/${profile.username}`;
  const title = `${profile.display_name} — Music, Links & Socials`;
  const description = clean(
    profile.bio ||
      `All of ${profile.display_name}'s music, streaming links and social profiles in one place on ${SITE_NAME}.`,
  );
  const image = profile.profile_picture_url || DEFAULT_IMAGE;
  const socials = [
    profile.instagram_url,
    profile.tiktok_url,
    profile.twitter_url,
    profile.facebook_url,
    profile.youtube_url,
  ].filter(Boolean);

  return {
    kind: "artist",
    entityType: "artist_profile",
    entityId: profile.id,
    title,
    description,
    image,
    canonical,
    ogType: "profile",
    keywords: `${profile.display_name}, ${profile.username}, artist page, music links, bio link`,
    updatedAt: profile.updated_at ?? null,
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: profile.display_name,
        url: canonical,
        image,
        description,
        ...(socials.length ? { sameAs: socials } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: canonical,
        name: title,
        description,
      },
    ],
    body: {
      heading: profile.display_name,
      lines: [description],
      links: [
        { href: canonical, label: `${profile.display_name} on ${SITE_NAME}` },
        ...socials.map((s: string) => ({ href: s, label: "Social profile" })),
      ],
    },
  };
}

export async function buildModel(
  supabase: SupabaseClient,
  route: RouteMatch,
): Promise<MetaModel | null> {
  switch (route.kind) {
    case "site":
      return siteModel(route.path);
    case "fanlink":
      return await fanlinkModel(supabase, route);
    case "presave":
      return await presaveModel(supabase, route);
    case "artist":
      return await artistModel(supabase, route);
  }
}

/* ------------------------------------------------------------------ */
/* HTML rendering                                                      */
/* ------------------------------------------------------------------ */

export function renderHtml(m: MetaModel): string {
  const jsonLd = m.jsonLd
    .map(
      (block) =>
        `  <script type="application/ld+json">${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");

  const music = [
    m.music?.musician ? `  <meta property="music:musician" content="${esc(m.music.musician)}" />` : "",
    m.music?.album ? `  <meta property="music:album" content="${esc(m.music.album)}" />` : "",
    m.music?.releaseDate
      ? `  <meta property="music:release_date" content="${esc(m.music.releaseDate)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(m.title.includes(SITE_NAME) ? m.title : `${m.title} | ${SITE_NAME}`)}</title>
  <meta name="title" content="${esc(m.title)}" />
  <meta name="description" content="${esc(m.description)}" />
  <meta name="keywords" content="${esc(m.keywords)}" />
  <meta name="robots" content="${esc(m.robots)}" />
  <link rel="canonical" href="${esc(m.canonical)}" />
  <link rel="alternate" hreflang="x-default" href="${esc(m.canonical)}" />

  <meta property="og:type" content="${esc(m.ogType)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${esc(m.title)}" />
  <meta property="og:description" content="${esc(m.description)}" />
  <meta property="og:url" content="${esc(m.canonical)}" />
  <meta property="og:image" content="${esc(m.image)}" />
  <meta property="og:image:secure_url" content="${esc(m.image)}" />
  <meta property="og:image:alt" content="${esc(m.title)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
${music}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${TWITTER_HANDLE}" />
  <meta name="twitter:creator" content="${TWITTER_HANDLE}" />
  <meta name="twitter:title" content="${esc(m.title)}" />
  <meta name="twitter:description" content="${esc(m.description)}" />
  <meta name="twitter:image" content="${esc(m.image)}" />
  <meta name="twitter:image:alt" content="${esc(m.title)}" />

${jsonLd}
</head>
<body>
  <main>
    <h1>${esc(m.body.heading)}</h1>
    ${m.body.lines.map((l) => `<p>${esc(l)}</p>`).join("\n    ")}
    <img src="${esc(m.image)}" alt="${esc(m.title)}" width="640" height="640" />
    <nav>
      ${m.body.links
        .map((l) => `<a href="${esc(l.href)}" rel="noopener">${esc(l.label)}</a>`)
        .join("\n      ")}
    </nav>
  </main>
  <script>window.location.replace(${JSON.stringify(m.canonical)});</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Cache (DB-backed, invalidated automatically by triggers)            */
/* ------------------------------------------------------------------ */

export interface CachedPage {
  html: string;
  etag: string;
}

export async function readCache(
  supabase: SupabaseClient,
  path: string,
): Promise<CachedPage | null> {
  const { data } = await supabase
    .from("meta_cache")
    .select("html, etag")
    .eq("path", path)
    .limit(1);
  const row = data?.[0];
  return row?.html ? { html: row.html, etag: row.etag } : null;
}

export async function writeCache(
  supabase: SupabaseClient,
  path: string,
  page: CachedPage,
  model: MetaModel,
): Promise<void> {
  await supabase.from("meta_cache").upsert(
    {
      path,
      html: page.html,
      etag: page.etag,
      entity_type: model.entityType,
      entity_id: model.entityId,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: "path" },
  );
}

export async function etagFor(model: MetaModel): Promise<string> {
  const seed = `${model.canonical}|${model.updatedAt ?? ""}|${model.title}|${model.image}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(seed));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `"${hex.slice(0, 20)}"`;
}

/* ------------------------------------------------------------------ */
/* Main handler shared by /meta, /fanlink-meta and /presave-meta        */
/* ------------------------------------------------------------------ */

export async function handleMetaRequest(
  req: Request,
  fnName: string,
  forcedPrefix?: string,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === fnName);
  const tail = idx >= 0 ? parts.slice(idx + 1) : parts;
  const rawPath =
    url.searchParams.get("path") ||
    (tail.length ? `${forcedPrefix ? `/${forcedPrefix}` : ""}/${tail.join("/")}` : "/");

  const route = resolveRoute(rawPath);
  if (!route) {
    return new Response("Not found", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const bot = isCrawler(req.headers.get("user-agent"));
  const supabase = serviceClient();

  // Human visitors never need the rendered HTML — send them straight to the app.
  if (!bot) {
    const target = `${SITE_URL}${route.path}`;
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: target, "Cache-Control": "no-store" },
    });
  }

  const cached = await readCache(supabase, route.path);
  if (cached) {
    if (req.headers.get("if-none-match") === cached.etag) {
      return new Response(null, {
        status: 304,
        headers: { ...corsHeaders, ETag: cached.etag },
      });
    }
    return new Response(cached.html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        ETag: cached.etag,
        "X-Meta-Cache": "hit",
      },
    });
  }

  const model = await buildModel(supabase, route);
  if (!model) {
    return new Response(
      renderHtml({
        ...siteModel("/"),
        title: "Link not found",
        description: `This ${SITE_NAME} page is no longer available.`,
        robots: "noindex, follow",
        canonical: SITE_URL,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  const html = renderHtml(model);
  const etag = await etagFor(model);
  if (model.entityId) {
    await writeCache(supabase, route.path, { html, etag }, model);
  }

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ...corsHeaders, ETag: etag } });
  }

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      ETag: etag,
      "X-Meta-Cache": "miss",
    },
  });
}

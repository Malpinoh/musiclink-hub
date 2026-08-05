// Single source of truth for client-side head metadata.
// Mirrors the server-rendered output of the `meta` edge function so crawlers
// and browsers always see the same tags.

export const SITE_URL = "https://md.malpinohdistro.com.ng";
export const SITE_NAME = "MDistro Link";
export const TWITTER_HANDLE = "@MalpinohDistro";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface MetaDescriptor {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  ogType?: string;
  keywords?: string;
  robots?: string;
  music?: { musician?: string; album?: string; releaseDate?: string };
  jsonLd?: unknown[];
}

const clean = (v: unknown, max = 300) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

export const absoluteUrl = (path: string) =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/* ---------------------------- builders ---------------------------- */

export interface FanlinkMetaInput {
  title: string;
  artist: string;
  artistSlug: string;
  slug: string;
  artworkUrl?: string | null;
  contentType?: string | null;
  releaseType?: string | null;
  releaseDate?: string | null;
  isrc?: string | null;
  upc?: string | null;
  totalTracks?: number | null;
  tracklist?: Array<{ track_number?: number; title?: string; duration_ms?: number | null }>;
  platforms?: Array<{ platform_name: string; platform_url: string }>;
}

export function buildFanlinkMeta(input: FanlinkMetaInput): MetaDescriptor {
  const isRelease = input.contentType === "release";
  const canonical = absoluteUrl(
    isRelease ? `/release/${input.slug}` : `/${input.artistSlug}/${input.slug}`,
  );
  const platforms = input.platforms ?? [];
  const names = platforms.map((p) => p.platform_name);
  const label = isRelease ? input.releaseType || "release" : "song";
  const image = input.artworkUrl || DEFAULT_IMAGE;
  const tracks = input.tracklist ?? [];

  const description = clean(
    `Listen to ${isRelease ? `the ${label} ` : ""}"${input.title}" by ${input.artist}${
      names.length ? ` on ${names.slice(0, 5).join(", ")}` : ""
    }${names.length > 5 ? " and more" : ""}. One link, every streaming platform.`,
  );

  return {
    title: `${input.title} — ${input.artist}`,
    description,
    canonical,
    image,
    ogType: isRelease ? "music.album" : "music.song",
    keywords: `${input.title}, ${input.artist}, ${label}, stream, listen, smart link, ${names
      .slice(0, 8)
      .join(", ")}`,
    music: {
      musician: input.artist,
      album: isRelease ? input.title : undefined,
      releaseDate: input.releaseDate || undefined,
    },
    jsonLd: [
      isRelease
        ? {
            "@context": "https://schema.org",
            "@type": "MusicAlbum",
            name: input.title,
            byArtist: { "@type": "MusicGroup", name: input.artist },
            image,
            url: canonical,
            description,
            numTracks: input.totalTracks || tracks.length || undefined,
            ...(input.releaseDate ? { datePublished: input.releaseDate } : {}),
            ...(input.upc ? { gtin13: input.upc } : {}),
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
                        byArtist: { "@type": "MusicGroup", name: input.artist },
                        ...(t.duration_ms
                          ? { duration: `PT${Math.round(t.duration_ms / 1000)}S` }
                          : {}),
                      },
                    })),
                  },
                }
              : {}),
            ...(platforms.length ? { sameAs: platforms.map((p) => p.platform_url) } : {}),
          }
        : {
            "@context": "https://schema.org",
            "@type": "MusicRecording",
            name: input.title,
            byArtist: { "@type": "MusicGroup", name: input.artist },
            image,
            url: canonical,
            description,
            ...(input.isrc ? { isrcCode: input.isrc } : {}),
            ...(input.releaseDate ? { datePublished: input.releaseDate } : {}),
            ...(platforms.length ? { sameAs: platforms.map((p) => p.platform_url) } : {}),
            potentialAction: {
              "@type": "ListenAction",
              target: { "@type": "EntryPoint", urlTemplate: canonical },
            },
          },
      breadcrumb([
        ["Home", SITE_URL],
        [input.artist, absoluteUrl(`/${input.artistSlug}`)],
        [input.title, canonical],
      ]),
    ],
  };
}

export interface PresaveMetaInput {
  title: string;
  artist: string;
  artistSlug: string;
  slug: string;
  artworkUrl?: string | null;
  heroImageUrl?: string | null;
  albumTitle?: string | null;
  releaseDate?: string | null;
  isrc?: string | null;
  description?: string | null;
  isReleased?: boolean | null;
  platforms?: Array<{ platform_name: string; platform_url: string }>;
}

export function buildPresaveMeta(input: PresaveMetaInput): MetaDescriptor {
  const canonical = absoluteUrl(`/presave/${input.artistSlug}/${input.slug}`);
  const released = !!input.isReleased;
  const image = input.heroImageUrl || input.artworkUrl || DEFAULT_IMAGE;
  const description = clean(
    input.description ||
      (released
        ? `"${input.title}" by ${input.artist} is out now. Stream it on Spotify, Apple Music and every major platform.`
        : `Pre-save "${input.title}" by ${input.artist}${
            input.releaseDate ? `, out ${input.releaseDate}` : ""
          }. It lands in your Spotify library the moment it drops.`),
  );

  return {
    title: released
      ? `${input.title} — ${input.artist}`
      : `Pre-save ${input.title} — ${input.artist}`,
    description,
    canonical,
    image,
    ogType: "music.song",
    keywords: `${input.title}, ${input.artist}, pre-save, pre-add, spotify pre-save, new music`,
    music: {
      musician: input.artist,
      album: input.albumTitle || undefined,
      releaseDate: input.releaseDate || undefined,
    },
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: input.title,
        byArtist: { "@type": "MusicGroup", name: input.artist },
        image,
        url: canonical,
        description,
        ...(input.isrc ? { isrcCode: input.isrc } : {}),
        ...(input.albumTitle
          ? { inAlbum: { "@type": "MusicAlbum", name: input.albumTitle } }
          : {}),
        ...(input.releaseDate ? { datePublished: input.releaseDate } : {}),
        ...(input.platforms?.length ? { sameAs: input.platforms.map((p) => p.platform_url) } : {}),
        potentialAction: {
          "@type": "ListenAction",
          target: { "@type": "EntryPoint", urlTemplate: canonical },
        },
      },
      breadcrumb([
        ["Home", SITE_URL],
        [input.artist, absoluteUrl(`/${input.artistSlug}`)],
        [input.title, canonical],
      ]),
    ],
  };
}

export interface ArtistMetaInput {
  username: string;
  displayName: string;
  bio?: string | null;
  profilePictureUrl?: string | null;
  socials?: Array<string | null | undefined>;
}

export function buildArtistMeta(input: ArtistMetaInput): MetaDescriptor {
  const canonical = absoluteUrl(`/artist/${input.username}`);
  const image = input.profilePictureUrl || DEFAULT_IMAGE;
  const description = clean(
    input.bio ||
      `All of ${input.displayName}'s music, streaming links and social profiles in one place on ${SITE_NAME}.`,
  );
  const socials = (input.socials ?? []).filter(Boolean) as string[];

  return {
    title: `${input.displayName} — Music, Links & Socials`,
    description,
    canonical,
    image,
    ogType: "profile",
    keywords: `${input.displayName}, ${input.username}, artist page, music links, bio link`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: input.displayName,
        url: canonical,
        image,
        description,
        ...(socials.length ? { sameAs: socials } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: canonical,
        name: input.displayName,
        description,
      },
    ],
  };
}

function breadcrumb(items: Array<[string, string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, item], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item,
    })),
  };
}

/* ------------------------- DOM application ------------------------ */

const MANAGED = "data-mdistro-meta";

function setMeta(kind: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    el.setAttribute(MANAGED, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    el.setAttribute(MANAGED, "true");
    document.head.appendChild(el);
  }
  el.href = href;
}

export function applyMeta(m: MetaDescriptor): () => void {
  const fullTitle = m.title.includes(SITE_NAME) ? m.title : `${m.title} | ${SITE_NAME}`;
  const image = m.image || DEFAULT_IMAGE;
  const previousTitle = document.title;

  document.title = fullTitle;
  setMeta("name", "title", fullTitle);
  setMeta("name", "description", m.description);
  if (m.keywords) setMeta("name", "keywords", m.keywords);
  setMeta("name", "robots", m.robots || "index, follow, max-image-preview:large, max-snippet:-1");
  setLink("canonical", m.canonical);

  setMeta("property", "og:type", m.ogType || "website");
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:locale", "en_US");
  setMeta("property", "og:title", fullTitle);
  setMeta("property", "og:description", m.description);
  setMeta("property", "og:url", m.canonical);
  setMeta("property", "og:image", image);
  setMeta("property", "og:image:secure_url", image);
  setMeta("property", "og:image:alt", m.title);

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:site", TWITTER_HANDLE);
  setMeta("name", "twitter:creator", TWITTER_HANDLE);
  setMeta("name", "twitter:title", fullTitle);
  setMeta("name", "twitter:description", m.description);
  setMeta("name", "twitter:image", image);
  setMeta("name", "twitter:image:alt", m.title);

  document.head.querySelectorAll('meta[property^="music:"]').forEach((el) => el.remove());
  if (m.music?.musician) setMeta("property", "music:musician", m.music.musician);
  if (m.music?.album) setMeta("property", "music:album", m.music.album);
  if (m.music?.releaseDate) setMeta("property", "music:release_date", m.music.releaseDate);

  document
    .head.querySelectorAll('script[type="application/ld+json"][data-mdistro-jsonld]')
    .forEach((el) => el.remove());
  (m.jsonLd || []).forEach((block) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-mdistro-jsonld", "true");
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  });

  return () => {
    document.title = previousTitle;
    document.head.querySelectorAll('meta[property^="music:"]').forEach((el) => el.remove());
    document
      .head.querySelectorAll('script[type="application/ld+json"][data-mdistro-jsonld]')
      .forEach((el) => el.remove());
  };
}

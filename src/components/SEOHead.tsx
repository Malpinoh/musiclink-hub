import MetaTags from "@/components/MetaTags";
import { buildFanlinkMeta, buildPresaveMeta } from "@/lib/seoMeta";

interface SEOHeadProps {
  title: string;
  artist: string;
  artistSlug?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  pageUrl?: string;
  albumTitle?: string;
  releaseDate?: string;
  isrc?: string | null;
  upc?: string | null;
  contentType?: string | null;
  releaseType?: string | null;
  totalTracks?: number | null;
  tracklist?: Array<{ track_number?: number; title?: string; duration_ms?: number | null }>;
  platforms?: Array<{ platform_name: string; platform_url: string }>;
  isReleased?: boolean | null;
  type?: "fanlink" | "presave";
}

/** Legacy-friendly wrapper around the unified metadata system. */
const SEOHead = (props: SEOHeadProps) => {
  const fallbackSlugs = (() => {
    try {
      const parts = new URL(props.pageUrl || window.location.href).pathname.split("/").filter(Boolean);
      const cleaned = parts[0] === "presave" ? parts.slice(1) : parts;
      return { artistSlug: cleaned[0] || "", slug: cleaned[1] || cleaned[0] || "" };
    } catch {
      return { artistSlug: "", slug: "" };
    }
  })();

  const artistSlug = props.artistSlug || fallbackSlugs.artistSlug;
  const slug = props.slug || fallbackSlugs.slug;

  const meta =
    props.type === "presave"
      ? buildPresaveMeta({
          title: props.title,
          artist: props.artist,
          artistSlug,
          slug,
          artworkUrl: props.imageUrl,
          albumTitle: props.albumTitle,
          releaseDate: props.releaseDate,
          isrc: props.isrc,
          description: props.description,
          isReleased: props.isReleased,
          platforms: props.platforms,
        })
      : buildFanlinkMeta({
          title: props.title,
          artist: props.artist,
          artistSlug,
          slug,
          artworkUrl: props.imageUrl,
          contentType: props.contentType,
          releaseType: props.releaseType,
          releaseDate: props.releaseDate,
          isrc: props.isrc,
          upc: props.upc,
          totalTracks: props.totalTracks,
          tracklist: props.tracklist,
          platforms: props.platforms,
        });

  return <MetaTags meta={props.description ? { ...meta, description: props.description } : meta} />;
};

export default SEOHead;

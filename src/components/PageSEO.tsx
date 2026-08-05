import MetaTags from "@/components/MetaTags";
import { absoluteUrl, DEFAULT_IMAGE, SITE_NAME } from "@/lib/seoMeta";

interface PageSEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
  jsonLd?: object;
}

/** Generic (non-music) page metadata, powered by the unified metadata system. */
const PageSEO = ({
  title,
  description,
  canonicalPath = "/",
  ogType = "website",
  ogImage,
  noIndex = false,
  keywords = [],
  jsonLd,
}: PageSEOProps) => {
  const canonical = absoluteUrl(canonicalPath || "/");

  return (
    <MetaTags
      meta={{
        title: title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`,
        description,
        canonical,
        image: ogImage || DEFAULT_IMAGE,
        ogType,
        keywords: keywords.join(", ") || undefined,
        robots: noIndex ? "noindex, nofollow" : undefined,
        jsonLd: jsonLd
          ? [jsonLd]
          : [
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: SITE_NAME,
                url: canonical,
                description,
              },
            ],
      }}
    />
  );
};

export default PageSEO;

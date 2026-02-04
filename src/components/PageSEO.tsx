import { useEffect } from 'react';

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

const PageSEO = ({
  title,
  description,
  canonicalPath = '',
  ogType = 'website',
  ogImage,
  noIndex = false,
  keywords = [],
  jsonLd,
}: PageSEOProps) => {
  const siteUrl = 'https://md.malpinohdistro.com.ng';
  const fullTitle = title.includes('MDistro') ? title : `${title} | MDistro Link`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const defaultImage = `${siteUrl}/og-image.png`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper function to update or create meta tags
    const updateMetaTag = (selector: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (element) {
        element.setAttribute('content', content);
      } else {
        element = document.createElement('meta');
        const parts = selector.match(/\[([^\]]+)\]/g);
        if (parts) {
          parts.forEach(part => {
            const [attr, val] = part.slice(1, -1).split('=');
            element!.setAttribute(attr, val?.replace(/"/g, '') || '');
          });
        }
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };

    // Helper for link tags
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (element) {
        element.href = href;
      } else {
        element = document.createElement('link');
        element.rel = rel;
        element.href = href;
        document.head.appendChild(element);
      }
    };

    // Standard SEO meta tags
    updateMetaTag('meta[name="title"]', fullTitle);
    updateMetaTag('meta[name="description"]', description);
    
    if (keywords.length > 0) {
      updateMetaTag('meta[name="keywords"]', keywords.join(', '));
    }

    // Robots
    updateMetaTag('meta[name="robots"]', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Canonical URL
    updateLinkTag('canonical', canonicalUrl);

    // Open Graph tags
    updateMetaTag('meta[property="og:type"]', ogType);
    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:url"]', canonicalUrl);
    updateMetaTag('meta[property="og:image"]', ogImage || defaultImage);
    updateMetaTag('meta[property="og:site_name"]', 'MDistro Link');

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', ogImage || defaultImage);

    // JSON-LD Structured Data
    if (jsonLd) {
      let scriptElement = document.querySelector('script[type="application/ld+json"][data-page-seo]') as HTMLScriptElement | null;
      if (scriptElement) {
        scriptElement.textContent = JSON.stringify(jsonLd);
      } else {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        scriptElement.setAttribute('data-page-seo', 'true');
        scriptElement.textContent = JSON.stringify(jsonLd);
        document.head.appendChild(scriptElement);
      }
    }

    // Cleanup
    return () => {
      document.title = 'MDistro Link - One Link. All Platforms. Infinite Reach.';
      // Remove page-specific JSON-LD
      const scriptElement = document.querySelector('script[type="application/ld+json"][data-page-seo]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [fullTitle, description, canonicalUrl, ogType, ogImage, noIndex, keywords, jsonLd, defaultImage]);

  return null;
};

export default PageSEO;

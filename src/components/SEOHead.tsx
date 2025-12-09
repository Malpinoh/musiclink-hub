import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  artist: string;
  description?: string;
  imageUrl?: string;
  pageUrl: string;
  albumTitle?: string;
  type?: 'fanlink' | 'presave';
}

const SEOHead = ({ 
  title, 
  artist, 
  description, 
  imageUrl, 
  pageUrl,
  albumTitle,
  type = 'fanlink'
}: SEOHeadProps) => {
  const fullTitle = `${title} – ${artist}`;
  const defaultDescription = type === 'presave' 
    ? `Pre-save ${title} by ${artist}. Be the first to listen when it drops!`
    : `Listen to ${title} by ${artist} on Spotify, Apple Music, Boomplay, Audiomack and more.`;
  const metaDescription = description || defaultDescription;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper function to update or create meta tags
    const updateMetaTag = (selector: string, content: string, attribute: string = 'content') => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (element) {
        element.setAttribute(attribute, content);
      } else {
        element = document.createElement('meta');
        const parts = selector.match(/\[([^\]]+)\]/g);
        if (parts) {
          parts.forEach(part => {
            const [attr, val] = part.slice(1, -1).split('=');
            element!.setAttribute(attr, val?.replace(/"/g, '') || '');
          });
        }
        element.setAttribute(attribute, content);
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
    updateMetaTag('meta[name="description"]', metaDescription);
    
    // Canonical URL
    updateLinkTag('canonical', pageUrl);

    // Open Graph tags
    updateMetaTag('meta[property="og:type"]', 'music.song');
    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', metaDescription);
    updateMetaTag('meta[property="og:url"]', pageUrl);
    if (imageUrl) {
      updateMetaTag('meta[property="og:image"]', imageUrl);
      updateMetaTag('meta[property="og:image:width"]', '640');
      updateMetaTag('meta[property="og:image:height"]', '640');
    }

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', metaDescription);
    if (imageUrl) {
      updateMetaTag('meta[name="twitter:image"]', imageUrl);
    }

    // JSON-LD Structured Data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      'name': title,
      'byArtist': {
        '@type': 'MusicGroup',
        'name': artist
      },
      'image': imageUrl,
      'url': pageUrl,
      ...(albumTitle && { 'inAlbum': { '@type': 'MusicAlbum', 'name': albumTitle } })
    };

    let scriptElement = document.querySelector('script[type="application/ld+json"][data-seo="music"]') as HTMLScriptElement | null;
    if (scriptElement) {
      scriptElement.textContent = JSON.stringify(jsonLd);
    } else {
      scriptElement = document.createElement('script');
      scriptElement.type = 'application/ld+json';
      scriptElement.setAttribute('data-seo', 'music');
      scriptElement.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptElement);
    }

    // Cleanup function
    return () => {
      // Reset title on unmount
      document.title = 'MDistro Link - One Link. All Platforms. Infinite Reach.';
    };
  }, [title, artist, metaDescription, imageUrl, pageUrl, albumTitle, fullTitle]);

  return null;
};

export default SEOHead;

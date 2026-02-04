import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  artist: string;
  description?: string;
  imageUrl?: string;
  pageUrl: string;
  albumTitle?: string;
  releaseDate?: string;
  type?: 'fanlink' | 'presave';
}

const SEOHead = ({ 
  title, 
  artist, 
  description, 
  imageUrl, 
  pageUrl,
  albumTitle,
  releaseDate,
  type = 'fanlink'
}: SEOHeadProps) => {
  const siteUrl = 'https://md.malpinohdistro.com.ng';
  const fullTitle = `${title} – ${artist} | MDistro Link`;
  const defaultDescription = type === 'presave' 
    ? `Pre-save "${title}" by ${artist}. Be the first to listen when it drops! Save to your Spotify library automatically on release day.`
    : `Listen to "${title}" by ${artist} on Spotify, Apple Music, Boomplay, Audiomack, YouTube Music, Deezer, Tidal, and more streaming platforms.`;
  const metaDescription = description || defaultDescription;
  const defaultImage = `${siteUrl}/og-image.png`;

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
    updateMetaTag('meta[name="keywords"]', `${title}, ${artist}, music, stream, listen, ${type === 'presave' ? 'pre-save, pre-add' : 'fanlink, smart link'}, spotify, apple music, audiomack, boomplay`);
    updateMetaTag('meta[name="robots"]', 'index, follow, max-image-preview:large');
    
    // Canonical URL
    updateLinkTag('canonical', pageUrl);

    // Open Graph tags
    updateMetaTag('meta[property="og:type"]', 'music.song');
    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', metaDescription);
    updateMetaTag('meta[property="og:url"]', pageUrl);
    updateMetaTag('meta[property="og:site_name"]', 'MDistro Link');
    updateMetaTag('meta[property="og:locale"]', 'en_US');
    
    const ogImage = imageUrl || defaultImage;
    updateMetaTag('meta[property="og:image"]', ogImage);
    updateMetaTag('meta[property="og:image:secure_url"]', ogImage);
    updateMetaTag('meta[property="og:image:width"]', '640');
    updateMetaTag('meta[property="og:image:height"]', '640');
    updateMetaTag('meta[property="og:image:alt"]', `${title} by ${artist} - Album Artwork`);
    updateMetaTag('meta[property="og:image:type"]', 'image/jpeg');

    // Music-specific OG tags
    updateMetaTag('meta[property="music:musician"]', artist);
    if (albumTitle) {
      updateMetaTag('meta[property="music:album"]', albumTitle);
    }
    if (releaseDate) {
      updateMetaTag('meta[property="music:release_date"]', releaseDate);
    }

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:site"]', '@MalpinohDistro');
    updateMetaTag('meta[name="twitter:creator"]', '@MalpinohDistro');
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', metaDescription);
    updateMetaTag('meta[name="twitter:image"]', ogImage);
    updateMetaTag('meta[name="twitter:image:alt"]', `${title} by ${artist}`);

    // JSON-LD Structured Data for MusicRecording
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      'name': title,
      'byArtist': {
        '@type': 'MusicGroup',
        'name': artist
      },
      'image': imageUrl || defaultImage,
      'url': pageUrl,
      'description': metaDescription,
      ...(albumTitle && { 
        'inAlbum': { 
          '@type': 'MusicAlbum', 
          'name': albumTitle 
        } 
      }),
      ...(releaseDate && { 'datePublished': releaseDate }),
      'potentialAction': {
        '@type': 'ListenAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': pageUrl
        }
      }
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

    // BreadcrumbList for better navigation in search
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': siteUrl
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': artist,
          'item': pageUrl
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': title,
          'item': pageUrl
        }
      ]
    };

    let breadcrumbScript = document.querySelector('script[type="application/ld+json"][data-seo="breadcrumb"]') as HTMLScriptElement | null;
    if (breadcrumbScript) {
      breadcrumbScript.textContent = JSON.stringify(breadcrumbJsonLd);
    } else {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.setAttribute('data-seo', 'breadcrumb');
      breadcrumbScript.textContent = JSON.stringify(breadcrumbJsonLd);
      document.head.appendChild(breadcrumbScript);
    }

    // Cleanup function
    return () => {
      document.title = 'MDistro Link - One Link. All Platforms. Infinite Reach.';
      // Clean up music-specific meta tags
      const musicTags = document.querySelectorAll('meta[property^="music:"]');
      musicTags.forEach(tag => tag.remove());
      // Clean up breadcrumb
      const breadcrumb = document.querySelector('script[data-seo="breadcrumb"]');
      if (breadcrumb) breadcrumb.remove();
    };
  }, [title, artist, metaDescription, imageUrl, pageUrl, albumTitle, releaseDate, fullTitle, defaultImage, type]);

  return null;
};

export default SEOHead;

import { useEffect } from 'react';

const SITEMAP_URL = 'https://uwzhhzkvqqvaqvkuocrz.supabase.co/functions/v1/sitemap';

const SitemapRedirect = () => {
  useEffect(() => {
    // Redirect to the sitemap edge function
    window.location.href = SITEMAP_URL;
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to sitemap...</p>
    </div>
  );
};

export default SitemapRedirect;

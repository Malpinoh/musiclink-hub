import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract artist and slug from path: /fanlink-meta/{artist}/{slug}
    // The function name is the first part, so we skip it
    const functionName = pathParts[0]; // "fanlink-meta"
    const artist = pathParts[1];
    const slug = pathParts[2];

    if (!artist || !slug) {
      return new Response(JSON.stringify({ error: 'Missing artist or slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch fanlink data
    const { data: fanlink, error } = await supabase
      .from('fanlinks')
      .select('*')
      .eq('artist_slug', artist)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !fanlink) {
      return new Response(JSON.stringify({ error: 'Fanlink not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const title = `${fanlink.title} – ${fanlink.artist}`;
    const description = `Listen to ${fanlink.title} by ${fanlink.artist} on Spotify, Apple Music, Boomplay, Audiomack and more.`;
    const imageUrl = fanlink.artwork_url || '';
    const pageUrl = `https://md.malpinohdistro.com.ng/${artist}/${slug}`;

    // Check if it's a bot/crawler
    const userAgent = req.headers.get('user-agent') || '';
    const isBot = /bot|crawl|spider|facebook|whatsapp|telegram|twitter|linkedin|discord|slack|preview/i.test(userAgent);

    if (isBot) {
      // Return HTML with meta tags for bots
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <link rel="canonical" href="${pageUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="music.song">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="640">
  <meta property="og:image:height" content="640">
  <meta property="og:site_name" content="MDistro Link">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": "${fanlink.title}",
    "byArtist": {
      "@type": "MusicGroup",
      "name": "${fanlink.artist}"
    },
    "image": "${imageUrl}",
    "url": "${pageUrl}"
  }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title} cover art">
  <a href="${pageUrl}">Listen Now</a>
</body>
</html>`;

      return new Response(html, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }

    // For regular users, return JSON with redirect info
    return new Response(JSON.stringify({ 
      redirect: pageUrl,
      fanlink 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

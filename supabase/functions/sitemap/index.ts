import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://md.malpinohdistro.com.ng";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("MD_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("MD_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all published fanlinks
    const { data: fanlinks, error: fanlinksError } = await supabase
      .from("fanlinks")
      .select("artist_slug, slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    if (fanlinksError) {
      console.error("Error fetching fanlinks:", fanlinksError);
    }

    // Fetch all active pre-saves
    const { data: presaves, error: presavesError } = await supabase
      .from("pre_saves")
      .select("artist_slug, slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (presavesError) {
      console.error("Error fetching presaves:", presavesError);
    }

    const now = new Date().toISOString().split("T")[0];

    // Build XML sitemap
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Static Pages -->
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${SITE_URL}/demo</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Fanlink Pages -->
`;

    // Add fanlink URLs
    if (fanlinks && fanlinks.length > 0) {
      for (const link of fanlinks) {
        const lastmod = link.updated_at 
          ? new Date(link.updated_at).toISOString().split("T")[0]
          : now;
        
        xml += `  <url>
    <loc>${SITE_URL}/${link.artist_slug}/${link.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
      }
    }

    xml += `
  <!-- Pre-Save Pages -->
`;

    // Add presave URLs
    if (presaves && presaves.length > 0) {
      for (const presave of presaves) {
        const lastmod = presave.updated_at 
          ? new Date(presave.updated_at).toISOString().split("T")[0]
          : now;
        
        xml += `  <url>
    <loc>${SITE_URL}/presave/${presave.artist_slug}/${presave.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    
    // Return a minimal sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
      status: 200,
    });
  }
});

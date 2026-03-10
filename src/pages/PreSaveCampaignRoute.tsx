import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PreSaveContent } from "./PreSavePage";

const PreSaveCampaignRoute = () => {
  const { slug: combinedSlug } = useParams<{ slug: string }>();
  const [resolved, setResolved] = useState<{ artist: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!combinedSlug) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("pre_saves")
        .select("artist_slug, slug")
        .eq("is_active", true);
      
      const match = data?.find((ps) => `${ps.artist_slug}-${ps.slug}` === combinedSlug);
      if (match) setResolved({ artist: match.artist_slug, slug: match.slug });
      setLoading(false);
    })();
  }, [combinedSlug]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-muted-foreground mb-6">This pre-save link doesn't exist.</p>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  return <PreSaveContent artistParam={resolved.artist} slugParam={resolved.slug} />;
};

export default PreSaveCampaignRoute;

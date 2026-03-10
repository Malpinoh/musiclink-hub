import { useParams } from "react-router-dom";
import PreSavePage from "./PreSavePage";

/**
 * Wrapper for the /pre/:slug route format.
 * Parses slug like "artist-name-song-title" and delegates to PreSavePage.
 */
const PreSaveCampaignPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // The slug format is "{artist_slug}-{title_slug}" but we need to look it up differently
  // We'll query by the combined slug directly
  return <PreSaveCampaignLookup combinedSlug={slug || ""} />;
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PreSaveCampaignLookup = ({ combinedSlug }: { combinedSlug: string }) => {
  const [artistSlug, setArtistSlug] = useState<string | null>(null);
  const [titleSlug, setTitleSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    lookupPreSave();
  }, [combinedSlug]);

  const lookupPreSave = async () => {
    try {
      // Try to find a pre-save where artist_slug + '-' + slug matches
      const { data, error } = await supabase
        .from("pre_saves")
        .select("artist_slug, slug")
        .eq("is_active", true);

      if (error) throw error;

      const match = data?.find(
        (ps) => `${ps.artist_slug}-${ps.slug}` === combinedSlug
      );

      if (match) {
        setArtistSlug(match.artist_slug);
        setTitleSlug(match.slug);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !artistSlug || !titleSlug) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-muted-foreground mb-6">This pre-save link doesn't exist.</p>
        <Button variant="hero" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  // Render PreSavePage with the resolved params by navigating
  // We use a trick: set the URL params that PreSavePage expects
  return <PreSavePageWithParams artist={artistSlug} slug={titleSlug} />;
};

// Internal wrapper that passes params directly to the PreSavePage logic
import PreSavePageDirect from "./PreSavePageDirect";

const PreSavePageWithParams = ({ artist, slug }: { artist: string; slug: string }) => {
  return <PreSavePageDirect artist={artist} slug={slug} />;
};

export default PreSaveCampaignPage;

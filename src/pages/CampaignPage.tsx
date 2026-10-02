import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SongReleasePage from "@/components/campaign-templates/SongReleasePage";
import VideoLaunchPage from "@/components/campaign-templates/VideoLaunchPage";
import AlbumLaunchPage from "@/components/campaign-templates/AlbumLaunchPage";
import EventPromotionPage from "@/components/campaign-templates/EventPromotionPage";
import HouseAdSlot from "@/components/HouseAdSlot";
import MonetagTag from "@/components/monetization/MonetagTag";
import MetaTags from "@/components/MetaTags";
import { buildCampaignMeta } from "@/lib/seoMeta";

const CampaignPage = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [templateType, setTemplateType] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase
        .from("campaigns")
        .select("*, campaign_templates(template_type)")
        .eq("id", id)
        .single();

      if (c) {
        setCampaign(c);
        setTemplateType((c.campaign_templates as any)?.template_type || "song_release");
      }
      setLoading(false);
    })();
  }, [id]);

  let content;
  if (loading) {
    content = (
      <div className="min-h-[65vh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  } else if (!campaign) {
    content = (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Campaign Not Found</h1>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  } else {
    switch (templateType) {
      case "video_launch": content = <VideoLaunchPage campaign={campaign} />; break;
      case "album_launch": content = <AlbumLaunchPage campaign={campaign} />; break;
      case "event_promotion": content = <EventPromotionPage campaign={campaign} />; break;
      case "song_release":
      default: content = <SongReleasePage campaign={campaign} />;
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {campaign && (
        <>
          <MetaTags meta={buildCampaignMeta({
            id: campaign.id,
            name: campaign.campaign_name,
            artist: campaign.artist_name,
            description: campaign.description,
            artworkUrl: campaign.artwork_url,
            releaseDate: campaign.release_date,
            templateType,
          })} />
          <MonetagTag userId={campaign.user_id} />
        </>
      )}
      <div className="relative z-50 mx-auto w-full max-w-xl px-3 pt-3 sm:px-4">
        <HouseAdSlot artistUserId={campaign?.user_id} campaignId={id} reserveSpace />
      </div>
      {content}
    </div>
  );
};

export default CampaignPage;

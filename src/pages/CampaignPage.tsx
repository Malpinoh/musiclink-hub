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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Campaign Not Found</h1>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  switch (templateType) {
    case "video_launch":
      return <VideoLaunchPage campaign={campaign} />;
    case "album_launch":
      return <AlbumLaunchPage campaign={campaign} />;
    case "event_promotion":
      return <EventPromotionPage campaign={campaign} />;
    case "song_release":
    default:
      return <SongReleasePage campaign={campaign} />;
  }
};

export default CampaignPage;

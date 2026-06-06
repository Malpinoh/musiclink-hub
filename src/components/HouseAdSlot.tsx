import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface AdCampaign {
  id: string;
  advertiser: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_url: string;
  cta_text: string | null;
}

interface Props {
  artistUserId?: string | null;
  preSaveId?: string | null;
  fanlinkId?: string | null;
  className?: string;
}

/**
 * House ad slot. Fetches a random active ad campaign, renders it inline,
 * and tracks impressions and clicks to ad_impressions for revenue sharing.
 */
const HouseAdSlot = ({ artistUserId, preSaveId, fanlinkId, className }: Props) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ad_campaigns")
        .select("id, advertiser, title, description, image_url, target_url, cta_text")
        .eq("is_active", true)
        .limit(20);
      if (!data || data.length === 0) return;
      const picked = data[Math.floor(Math.random() * data.length)];
      setAd(picked);
      // Log impression (fire-and-forget)
      supabase.from("ad_impressions").insert({
        ad_campaign_id: picked.id,
        artist_user_id: artistUserId ?? null,
        pre_save_id: preSaveId ?? null,
        fanlink_id: fanlinkId ?? null,
        event_type: "impression",
      }).then(() => {});
    })();
  }, [artistUserId, preSaveId, fanlinkId]);

  const handleClick = () => {
    if (!ad) return;
    supabase.from("ad_impressions").insert({
      ad_campaign_id: ad.id,
      artist_user_id: artistUserId ?? null,
      pre_save_id: preSaveId ?? null,
      fanlink_id: fanlinkId ?? null,
      event_type: "click",
    }).then(() => {});
  };

  if (!ad) return null;

  return (
    <a
      href={ad.target_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className={`block glass-card p-4 hover:border-primary/40 transition-colors group ${className ?? ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Sponsored · {ad.advertiser}
        </span>
        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
      </div>
      <div className="flex gap-3 items-center">
        {ad.image_url && (
          <img src={ad.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{ad.title}</h4>
          {ad.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
          )}
        </div>
      </div>
      {ad.cta_text && (
        <div className="mt-3 text-xs font-medium text-primary">{ad.cta_text} →</div>
      )}
    </a>
  );
};

export default HouseAdSlot;

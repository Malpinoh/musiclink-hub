import { Button } from "@/components/ui/button";
import { Music2, Video, Disc3, Ticket } from "lucide-react";

interface CampaignTemplateCardProps {
  name: string;
  description: string;
  templateType: string;
  onSelect: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  song_release: <Music2 className="w-8 h-8 text-primary" />,
  video_launch: <Video className="w-8 h-8 text-primary" />,
  album_launch: <Disc3 className="w-8 h-8 text-primary" />,
  event_promotion: <Ticket className="w-8 h-8 text-primary" />,
};

const CampaignTemplateCard = ({ name, description, templateType, onSelect }: CampaignTemplateCardProps) => {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-4 hover:border-primary/50 transition-colors cursor-pointer group" onClick={onSelect}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        {iconMap[templateType] || <Music2 className="w-8 h-8 text-primary" />}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" className="mt-auto">
        Start Campaign
      </Button>
    </div>
  );
};

export default CampaignTemplateCard;

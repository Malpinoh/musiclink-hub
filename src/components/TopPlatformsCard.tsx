import { Badge } from "@/components/ui/badge";

interface TopPlatformsCardProps {
  platforms: { name: string; count: number }[];
}

const TopPlatformsCard = ({ platforms }: TopPlatformsCardProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-lg mb-4">Top Platforms</h3>
      {platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-3">
          {platforms.slice(0, 6).map((p, i) => (
            <div key={p.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
              <Badge variant="secondary">{p.count.toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPlatformsCard;

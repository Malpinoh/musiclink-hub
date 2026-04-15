import { Badge } from "@/components/ui/badge";

interface TopCountriesCardProps {
  countries: { name: string; count: number }[];
}

const TopCountriesCard = ({ countries }: TopCountriesCardProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-lg mb-4">Top Countries</h3>
      {countries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-3">
          {countries.slice(0, 6).map((c, i) => (
            <div key={c.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
              <Badge variant="secondary">{c.count.toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopCountriesCard;

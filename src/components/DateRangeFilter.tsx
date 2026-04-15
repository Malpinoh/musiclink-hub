import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All Time" },
];

export function getDateFromRange(range: DateRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now;
}

const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      {ranges.map((r) => (
        <Button
          key={r.value}
          variant={value === r.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(r.value)}
          className="text-xs"
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
};

export type { DateRange };
export default DateRangeFilter;

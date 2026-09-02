import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import type { EarningRow } from "@/hooks/useMonetization";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const EarningsTable = ({ rows }: { rows: EarningRow[] }) => {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No earnings yet. Weekly revenue is posted every Friday night.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border/60">
            <th className="py-2 pr-4 font-medium">Period</th>
            <th className="py-2 pr-4 font-medium">Share</th>
            <th className="py-2 pr-4 font-medium">Your earnings</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/40 last:border-0">
              <td className="py-3 pr-4 whitespace-nowrap">
                {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{r.artist_share_percent}%</td>
              <td className="py-3 pr-4 font-semibold">{formatCents(r.artist_cents)}</td>
              <td className="py-3">
                <Badge variant={r.status === "paid" ? "default" : r.status === "reversed" ? "destructive" : "secondary"}>
                  {r.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EarningsTable;

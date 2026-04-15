import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CampaignRow {
  id: string;
  name: string;
  type: "fanlink" | "presave";
  clicks: number;
  fans: number;
  presaves: number;
  conversionRate: number;
  createdAt: string;
  status: string;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
  onExport: () => void;
}

const CampaignTable = ({ campaigns, onExport }: CampaignTableProps) => {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">All Campaigns</h3>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Fans</TableHead>
              <TableHead className="text-right">Pre-saves</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No campaign data yet
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.name}
                      <Badge variant="outline" className="text-[10px]">
                        {c.type === "fanlink" ? "Link" : "Pre-save"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{c.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{c.fans.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{c.presaves.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{c.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export type { CampaignRow };
export default CampaignTable;

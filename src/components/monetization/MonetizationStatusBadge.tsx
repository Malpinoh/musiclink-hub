import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_applied: { label: "Not enrolled", variant: "outline" },
  pending: { label: "Pending review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  suspended: { label: "Suspended", variant: "destructive" },
  withdrawn: { label: "Withdrawn", variant: "outline" },
};

const MonetizationStatusBadge = ({ status, earlyAccess }: { status: string; earlyAccess?: boolean }) => {
  const cfg = MAP[status] ?? MAP.not_applied;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={cfg.variant}>{cfg.label}</Badge>
      {earlyAccess && status === "approved" && <Badge variant="secondary">Early access</Badge>}
    </div>
  );
};

export default MonetizationStatusBadge;

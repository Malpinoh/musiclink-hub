import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart3, FileCheck2, Radio, Upload, ScrollText, ArrowLeft } from "lucide-react";

const NAV = [
  { to: "/admin/monetization", label: "Overview", icon: BarChart3 },
  { to: "/admin/monetization/applications", label: "Applications", icon: FileCheck2 },
  { to: "/admin/monetization/zones", label: "Artists & Zones", icon: Radio },
  { to: "/admin/monetization/imports", label: "Weekly Imports", icon: Upload },
  { to: "/admin/api-logs", label: "API Logs", icon: ScrollText },
];

const AdminLayout = ({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          <nav className="mt-4 -mx-1 flex gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active =
                item.to === "/admin/monetization"
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">{children}</main>
    </div>
  );
};

export default AdminLayout;

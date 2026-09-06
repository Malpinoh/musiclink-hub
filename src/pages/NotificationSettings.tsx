import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PageSEO from "@/components/PageSEO";

const NotificationSettings = () => {
  const { user, loading } = useAuth();
  const { prefs, loading: prefsLoading, update } = useNotificationPreferences();

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-muted-foreground">Sign in to manage your notifications.</p>
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const value = prefs ?? { email_monetization_status: true, email_earnings_updates: true };

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <PageSEO title="Notification settings | MDistro Link" description="Choose which emails you receive from MDistro Link." />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link to="/artist/revenue" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to earnings
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            In-app notifications are always on. Choose which ones also arrive by email.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email notifications</CardTitle>
            <CardDescription>Account and security emails are always sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="status" className="text-sm font-medium">Monetization updates</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When your request is received, approved, or your monetization goes live.
                </p>
              </div>
              <Switch
                id="status"
                checked={value.email_monetization_status}
                disabled={prefsLoading || update.isPending}
                onCheckedChange={(v) => update.mutate({ email_monetization_status: v })}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="earnings" className="text-sm font-medium">Earnings updates</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Weekly earnings added to your balance and any adjustments.
                </p>
              </div>
              <Switch
                id="earnings"
                checked={value.email_earnings_updates}
                disabled={prefsLoading || update.isPending}
                onCheckedChange={(v) => update.mutate({ email_earnings_updates: v })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;

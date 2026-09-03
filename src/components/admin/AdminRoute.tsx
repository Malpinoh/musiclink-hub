import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            {user ? "Your account doesn't have admin permissions." : "Sign in with an admin account to continue."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={user ? "/dashboard" : "/login"}>{user ? "Back to dashboard" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;

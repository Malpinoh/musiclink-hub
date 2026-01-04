import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Authorization was cancelled or denied.");
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Invalid callback parameters.");
      return;
    }

    try {
      // Parse state to get pre_save_id and action
      const stateData = JSON.parse(atob(state));
      const { preSaveId, action, returnUrl } = stateData;

      // Exchange code for tokens via edge function
      const { data, error: exchangeError } = await supabase.functions.invoke(
        "spotify-oauth-callback",
        {
          body: { code, preSaveId, action },
        }
      );

      if (exchangeError || !data?.success) {
        throw new Error(exchangeError?.message || data?.error || "Failed to complete authorization");
      }

      setStatus("success");
      setMessage(
        action === "presave"
          ? "Pre-save confirmed! We'll save this to your library on release day."
          : "You're now following the artist!"
      );

      // Redirect back after a delay
      setTimeout(() => {
        if (returnUrl) {
          navigate(returnUrl);
        }
      }, 2000);
    } catch (err: any) {
      console.error("Callback error:", err);
      setStatus("error");
      setMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Connecting to Spotify...</h1>
            <p className="text-muted-foreground">Please wait while we complete your request.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Success!</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;

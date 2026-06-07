import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { logApiError } from "@/lib/apiLogger";

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Authorization was cancelled or denied.");
      logApiError({
        category: "spotify_oauth",
        step: "spotify_authorize_denied",
        message: `Spotify returned error=${error}`,
        context: { error, errorDescription: searchParams.get("error_description") },
      });
      return;
    }
    if (!code || !state) {
      setStatus("error");
      setMessage("Invalid callback parameters.");
      logApiError({
        category: "spotify_oauth",
        step: "callback_missing_params",
        message: "Spotify callback missing code or state",
        context: { hasCode: !!code, hasState: !!state },
      });
      return;
    }

    try {
      const stateData = JSON.parse(atob(state));
      const { preSaveId, action, returnUrl, redirectUri, fanId } = stateData;

      // Recover fan name/email from sessionStorage
      let fanName: string | null = null;
      let fanEmail: string | null = null;
      try {
        const cached = sessionStorage.getItem(`presave_fan_${preSaveId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          fanName = parsed.name ?? null;
          fanEmail = parsed.email ?? null;
        }
      } catch {/* ignore */}

      const { data, error: invokeError } = await supabase.functions.invoke("spotify-oauth-callback", {
        body: { code, preSaveId, action, fanId, fanName, fanEmail, redirectUri },
      });

      if (invokeError || !data?.success) {
        throw new Error(invokeError?.message || data?.error || "Failed to complete authorization");
      }

      sessionStorage.removeItem(`presave_fan_${preSaveId}`);
      setStatus("success");
      setMessage("Pre-save confirmed! We'll save this to your library on release day.");

      setTimeout(() => {
        if (returnUrl) navigate(returnUrl);
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("Callback error:", err);
      setStatus("error");
      setMessage(msg);
      let preSaveId: string | null = null;
      let fanId: string | null = null;
      try {
        const parsed = state ? JSON.parse(atob(state)) : {};
        preSaveId = parsed.preSaveId ?? null;
        fanId = parsed.fanId ?? null;
      } catch {/* ignore */}
      logApiError({
        category: "spotify_oauth",
        step: "callback_exchange_failed",
        message: msg,
        preSaveId,
        fanId,
        context: { hasCode: !!code, hasState: !!state },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Connecting to Spotify...</h1>
            <p className="text-muted-foreground">Please wait while we complete your pre-save.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">You're in! 🎉</h1>
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

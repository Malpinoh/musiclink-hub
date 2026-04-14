import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowRight, Loader2 } from "lucide-react";

interface FanContactFormProps {
  linkId: string;
  collectEmail: boolean;
  collectPhone: boolean;
  requireContact: boolean;
  onContinue: () => void;
  artistName?: string;
  themeColors?: {
    buttonColor?: string;
    textColor?: string;
    buttonTextColor?: string;
  };
}

const FanContactForm = ({
  linkId,
  collectEmail,
  collectPhone,
  requireContact,
  onContinue,
  artistName,
  themeColors,
}: FanContactFormProps) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = () => {
    if (!consent) return false;
    if (collectEmail && !email) return false;
    if (collectEmail && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("fan_contacts")
        .insert({
          link_id: linkId,
          email: email || null,
          phone: phone || null,
          consent: true,
          user_agent: navigator.userAgent,
        });

      if (insertError) throw insertError;

      trackEvent("fan_contact_collected", { link_id: linkId });
      onContinue();
    } catch (err) {
      console.error("Error saving contact:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onContinue();
  };

  return (
    <motion.div
      className="w-full max-w-sm mx-auto space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold mb-1" style={{ color: themeColors?.textColor }}>
          Stay Connected
        </h2>
        <p className="text-sm text-muted-foreground">
          {artistName
            ? `Get updates from ${artistName} on new releases`
            : "Get notified about new releases and updates"}
        </p>
      </div>

      <div className="space-y-3">
        {collectEmail && (
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
            />
          </div>
        )}

        {collectPhone && (
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-11"
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          By continuing, you agree to receive updates about new music and releases. You can unsubscribe at any time.
        </Label>
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit() || submitting}
        className="w-full h-12 text-base font-semibold rounded-xl"
        style={{
          backgroundColor: themeColors?.buttonColor,
          color: themeColors?.buttonTextColor,
        }}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      {!requireContact && (
        <button
          onClick={handleSkip}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Skip for now
        </button>
      )}
    </motion.div>
  );
};

export default FanContactForm;

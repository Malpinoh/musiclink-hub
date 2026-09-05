import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MonetagTagRow {
  provider: string;
  zone_id: string;
  tag_code: string | null;
}

/**
 * Injects the exact Monetag tag stored by an admin for this artist into <head>.
 * Only runs when the artist has an active zone on an approved application
 * (enforced server-side by the get_monetization_tag function).
 * The stored tag is never generated or rewritten from the zone ID.
 */
const MonetagTag = ({ userId }: { userId?: string | null }) => {
  const { data } = useQuery({
    queryKey: ["monetag-tag", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monetization_tag", { _user_id: userId! });
      if (error) throw error;
      return ((data as MonetagTagRow[]) ?? [])[0] ?? null;
    },
  });

  const tag = data?.tag_code?.trim() || "";

  useEffect(() => {
    if (!tag) return;

    const container = document.createElement("div");
    container.innerHTML = tag;

    const injected: HTMLElement[] = [];

    container.querySelectorAll("script").forEach((original) => {
      const script = document.createElement("script");
      for (const attr of Array.from(original.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      if (original.textContent) script.textContent = original.textContent;
      script.dataset.monetagTag = "true";
      document.head.appendChild(script);
      injected.push(script);
    });

    // Support tags supplied as raw JS (no <script> wrapper)
    if (injected.length === 0) {
      const script = document.createElement("script");
      script.textContent = tag;
      script.dataset.monetagTag = "true";
      document.head.appendChild(script);
      injected.push(script);
    }

    return () => {
      injected.forEach((el) => el.remove());
    };
  }, [tag]);

  return null;
};

export default MonetagTag;

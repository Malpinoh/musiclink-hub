import { useEffect } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { fbq?: any; ttq?: any; gtag?: any; dataLayer?: any[]; _fbq?: any }
}

const SAFE = /^[A-Za-z0-9_-]{3,40}$/;

export interface PixelIds {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
}

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id; s.async = true; s.src = src;
  document.head.appendChild(s);
}

/** Loads Meta / TikTok / Google tags set by the artist. IDs are validated before use. */
export function RetargetingPixels({ metaPixelId, tiktokPixelId, googleAnalyticsId }: PixelIds) {
  useEffect(() => {
    if (metaPixelId && SAFE.test(metaPixelId) && !window.fbq) {
      const n: any = function (...args: any[]) { n.callMethod ? n.callMethod(...args) : n.queue.push(args); };
      n.queue = []; n.loaded = true; n.version = "2.0"; n.push = n;
      window.fbq = n; window._fbq = n;
      addScript("px-meta", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", metaPixelId);
      window.fbq("track", "PageView");
    }
    if (tiktokPixelId && SAFE.test(tiktokPixelId) && !window.ttq) {
      const q: any[] = [];
      const ttq: any = { _q: q };
      ["page", "track", "identify"].forEach((m) => { ttq[m] = (...a: any[]) => q.push([m, ...a]); });
      window.ttq = ttq;
      addScript("px-tiktok", `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${tiktokPixelId}&lib=ttq`);
      window.ttq.page();
    }
    if (googleAnalyticsId && SAFE.test(googleAnalyticsId) && !window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer!.push(arguments); };
      addScript("px-ga", `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`);
      window.gtag("js", new Date());
      window.gtag("config", googleAnalyticsId);
    }
  }, [metaPixelId, tiktokPixelId, googleAnalyticsId]);
  return null;
}

/** Fire a conversion on all loaded pixels (e.g. streaming platform click). */
export function trackPixelConversion(event: "Lead" | "Subscribe", data: Record<string, unknown> = {}) {
  try {
    window.fbq?.("track", event, data);
    window.ttq?.track?.(event === "Lead" ? "ClickButton" : "Subscribe", data);
    window.gtag?.("event", event === "Lead" ? "generate_lead" : "sign_up", data);
  } catch { /* ignore */ }
}

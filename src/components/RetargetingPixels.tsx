import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    fbq?: any;
    ttq?: any;
    TiktokAnalyticsObject?: string;
    gtag?: any;
    dataLayer?: any[];
    _fbq?: any;
    __mdistroTikTokPixelIds?: Set<string>;
  }
}

const SAFE = /^[A-Za-z0-9_-]{3,40}$/;
export const MDISTRO_TIKTOK_PIXEL_ID = "DBS1OD3C77UDGS03KM10";

export interface PixelIds {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
}

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/**
 * Initializes TikTok's complete official queue/bootstrap once, then loads
 * each requested pixel as its own instance. This allows MDistro's business
 * pixel and an artist's optional pixel to coexist without replacing each other.
 */
export function loadTikTokPixel(pixelId: string) {
  if (!SAFE.test(pixelId)) return null;

  if (!window.ttq) {
    const t = "ttq";
    const ttq: any = (window as any)[t] = (window as any)[t] || [];
    window.TiktokAnalyticsObject = t;
    ttq.methods = [
      "page", "track", "identify", "instances", "debug", "on", "off",
      "once", "ready", "alias", "group", "enableCookie", "disableCookie",
    ];
    ttq.setAndDefer = function (target: any, method: string) {
      target[method] = function (...args: any[]) {
        target.push([method, ...args]);
      };
    };
    for (const method of ttq.methods) ttq.setAndDefer(ttq, method);
    ttq.instance = function (id: string) {
      const instance = ttq._i?.[id] || [];
      for (const method of ttq.methods) ttq.setAndDefer(instance, method);
      return instance;
    };
    ttq.load = function (id: string, options?: Record<string, unknown>) {
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._t = ttq._t || {};
      ttq._t[id] = Date.now();
      ttq._o = ttq._o || {};
      ttq._o[id] = options || {};
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = `${ttq._i[id]._u}?sdkid=${id}&lib=${t}`;
      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
      else document.head.appendChild(script);
    };
  }

  window.__mdistroTikTokPixelIds = window.__mdistroTikTokPixelIds || new Set<string>();
  if (!window.ttq._i?.[pixelId]) window.ttq.load(pixelId);
  window.__mdistroTikTokPixelIds.add(pixelId);
  return window.ttq.instance(pixelId);
}

/** Loads MDistro's business pixel on every route, including public fan links. */
export function TikTokBusinessPixel() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const pixel = loadTikTokPixel(MDISTRO_TIKTOK_PIXEL_ID);
    pixel?.page();
  }, [pathname, search]);

  return null;
}

/** Loads Meta / TikTok / Google tags configured by an individual artist. */
export function RetargetingPixels({ metaPixelId, tiktokPixelId, googleAnalyticsId }: PixelIds) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (metaPixelId && SAFE.test(metaPixelId) && !window.fbq) {
      const n: any = function (...args: any[]) {
        n.callMethod ? n.callMethod(...args) : n.queue.push(args);
      };
      n.queue = [];
      n.loaded = true;
      n.version = "2.0";
      n.push = n;
      window.fbq = n;
      window._fbq = n;
      addScript("px-meta", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", metaPixelId);
      window.fbq("track", "PageView");
    }

    if (tiktokPixelId && SAFE.test(tiktokPixelId)) {
      loadTikTokPixel(tiktokPixelId)?.page();
    }

    if (googleAnalyticsId && SAFE.test(googleAnalyticsId) && !window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer!.push(arguments); };
      addScript("px-ga", `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`);
      window.gtag("js", new Date());
      window.gtag("config", googleAnalyticsId);
    }
  }, [metaPixelId, tiktokPixelId, googleAnalyticsId, pathname, search]);

  return null;
}

/** Send a TikTok standard event to the business pixel and all loaded artist pixels. */
export function trackTikTokEvent(event: string, data: Record<string, unknown> = {}) {
  try {
    for (const pixelId of window.__mdistroTikTokPixelIds || []) {
      window.ttq?.instance?.(pixelId)?.track?.(event, data);
    }
  } catch {
    // Tracking must never interrupt the fan-link experience.
  }
}

/** Fire a conversion on loaded Meta / TikTok / Google pixels (e.g. platform click). */
export function trackPixelConversion(event: "Lead" | "Subscribe", data: Record<string, unknown> = {}) {
  try {
    window.fbq?.("track", event, data);
    trackTikTokEvent(event === "Lead" ? "ClickButton" : "Subscribe", data);
    window.gtag?.("event", event === "Lead" ? "generate_lead" : "sign_up", data);
  } catch {
    // Tracking must never interrupt the fan-link experience.
  }
}

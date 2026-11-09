'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    fbq?: {
      (...args: unknown[]): void;
      push?: (...args: unknown[]) => void;
      loaded?: boolean;
      version?: string;
      queue?: unknown[];
      callMethod?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      load: (pixelId: string) => void;
      methods?: string[];
      setAndDefer?: (target: Record<string, unknown>, method: string) => void;
      [key: string]: unknown;
    };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface StoredUtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  src?: string;
}

const UTM_STORAGE_KEY = 'hotm_traffic_utm';

/**
 * Captures UTMs from current window.location and saves to sessionStorage.
 */
export function captureAndStoreUtm(): StoredUtmParams {
  if (typeof window === 'undefined') return {};

  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('src') || undefined;
    const utmMedium = params.get('utm_medium') || undefined;
    const utmCampaign = params.get('utm_campaign') || undefined;
    const utmContent = params.get('utm_content') || undefined;
    const utmTerm = params.get('utm_term') || undefined;
    const src = params.get('src') || undefined;

    // If new UTMs are present in the URL, store them
    if (utmSource || utmMedium || utmCampaign || utmContent || utmTerm || src) {
      const stored: StoredUtmParams = {
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        src,
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored));
      return stored;
    }

    // Otherwise, check if we previously stored them in this session
    const existing = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing) as StoredUtmParams;
    }
  } catch {
    // Ignore storage errors in restrictive environments
  }

  return {};
}

export function getStoredUtmParams(): StoredUtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const existing = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing) as StoredUtmParams;
    }
  } catch {
    // Ignore
  }
  return captureAndStoreUtm();
}

interface ProductPixelConfig {
  id: string;
  provider: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS';
  pixelId: string;
  triggerEvents: string[];
}

interface PixelTrackerProps {
  productId?: string;
  pageType: 'CHECKOUT' | 'PAYMENT' | 'PURCHASE';
  eventData?: {
    orderId?: string;
    value?: number;
    currency?: string;
    contentName?: string;
  };
}

export default function PixelTracker({
  productId,
  pageType,
  eventData,
}: PixelTrackerProps) {
  const initializedPixels = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Capture and store UTMs on mount
    captureAndStoreUtm();

    if (!productId) return;

    // 2. Fetch active pixels for the product
    let isMounted = true;

    async function loadAndExecutePixels() {
      try {
        const res = await fetch(`/api/v1/products/${productId}/pixels?public=true`);
        if (!res.ok) return;

        const data = await res.json();
        const pixels: ProductPixelConfig[] = data.pixels || [];

        if (!isMounted || pixels.length === 0) return;

        for (const pixel of pixels) {
          const pixelKey = `${pixel.provider}_${pixel.pixelId}`;

          // Inject provider scripts if not yet injected
          if (pixel.provider === 'FACEBOOK') {
            initFacebookPixel(pixel.pixelId);
          } else if (pixel.provider === 'TIKTOK') {
            initTikTokPixel(pixel.pixelId);
          } else if (pixel.provider === 'GOOGLE_ADS') {
            initGoogleAds(pixel.pixelId);
          }

          initializedPixels.current.add(pixelKey);

          // Track specific event based on pageType and configured triggerEvents
          triggerEvent(pixel, pageType, eventData);
        }
      } catch (err) {
        // Silently catch pixel errors to never interrupt checkout flow
        console.warn('Pixel tracking notice:', err);
      }
    }

    loadAndExecutePixels();

    return () => {
      isMounted = false;
    };
  }, [productId, pageType, eventData]);

  return null;
}

function initFacebookPixel(pixelId: string) {
  if (typeof window === 'undefined') return;

  if (!window.fbq) {
    const fbqQueue: unknown[] = [];
    const fbq = function (...args: unknown[]) {
      if (typeof window.fbq?.callMethod === 'function') {
        window.fbq.callMethod(...args);
      } else {
        fbqQueue.push(args);
      }
    };
    fbq.push = (...args: unknown[]) => fbqQueue.push(args);
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = fbqQueue;
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq?.('init', pixelId);
  window.fbq?.('track', 'PageView');
}

function initTikTokPixel(pixelId: string) {
  if (typeof window === 'undefined') return;

  if (!window.ttq) {
    const methods = ['page', 'track', 'identify', 'instances', 'load'];
    const ttqObj: Record<string, unknown> = {};

    const setAndDefer = (method: string) => {
      ttqObj[method] = (...args: unknown[]) => {
        const queue = (ttqObj._q = (ttqObj._q as unknown[]) || []);
        queue.push([method, ...args]);
      };
    };

    methods.forEach((m) => setAndDefer(m));

    ttqObj.load = (instanceId: string) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${instanceId}&lib=ttq`;
      document.head.appendChild(script);
    };

    window.ttq = ttqObj as unknown as Window['ttq'];
  }

  window.ttq?.load(pixelId);
  window.ttq?.page();
}

function initGoogleAds(conversionId: string) {
  if (typeof window === 'undefined') return;

  if (!window.dataLayer) {
    window.dataLayer = [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(script);
  }

  window.gtag?.('config', conversionId);
}

function triggerEvent(
  pixel: ProductPixelConfig,
  pageType: 'CHECKOUT' | 'PAYMENT' | 'PURCHASE',
  data?: {
    orderId?: string;
    value?: number;
    currency?: string;
    contentName?: string;
  }
) {
  if (typeof window === 'undefined') return;

  const value = data?.value || 0;
  const currency = data?.currency || 'AOA';
  const contentName = data?.contentName || 'Produto HOT-M';

  if (pageType === 'CHECKOUT') {
    if (pixel.provider === 'FACEBOOK' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value,
        currency,
        content_name: contentName,
      });
    } else if (pixel.provider === 'TIKTOK' && window.ttq) {
      window.ttq.track('InitiateCheckout', {
        value,
        currency,
        content_name: contentName,
      });
    } else if (pixel.provider === 'GOOGLE_ADS' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        value,
        currency,
        items: [{ item_name: contentName }],
      });
    }
  } else if (pageType === 'PAYMENT') {
    // Customer generated Multicaixa Reference
    if (pixel.provider === 'FACEBOOK' && window.fbq) {
      window.fbq('track', 'AddPaymentInfo', {
        value,
        currency,
        content_name: contentName,
      });
    } else if (pixel.provider === 'TIKTOK' && window.ttq) {
      window.ttq.track('AddPaymentInfo', {
        value,
        currency,
        content_name: contentName,
      });
    }
  } else if (pageType === 'PURCHASE') {
    // Payment confirmed
    if (pixel.provider === 'FACEBOOK' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value,
        currency,
        content_name: contentName,
        order_id: data?.orderId,
      });
    } else if (pixel.provider === 'TIKTOK' && window.ttq) {
      window.ttq.track('CompletePayment', {
        value,
        currency,
        content_name: contentName,
        order_id: data?.orderId,
      });
    } else if (pixel.provider === 'GOOGLE_ADS' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: data?.orderId,
        value,
        currency,
        items: [{ item_name: contentName }],
      });
    }
  }
}

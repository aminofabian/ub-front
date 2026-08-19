"use client";

import { useEffect } from "react";

import {
  STOREFRONT_MANIFEST_HREF,
  captureStorefrontInstallPrompt,
  registerStorefrontServiceWorker,
} from "@/lib/pwa-install";

/**
 * Arms Chromium's install prompt and registers the shopper service worker
 * as soon as the storefront mounts — the event fires once, often before
 * the visitor opens Get the app.
 */
export function StorefrontPwaRuntime() {
  useEffect(() => {
    captureStorefrontInstallPrompt();
    void registerStorefrontServiceWorker();

    const existing = document.querySelector(
      'link[rel="manifest"][data-storefront-pwa]',
    );
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = STOREFRONT_MANIFEST_HREF;
    link.setAttribute("data-storefront-pwa", "1");
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);

  return null;
}

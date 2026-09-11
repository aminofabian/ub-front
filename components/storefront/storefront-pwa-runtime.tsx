"use client";

import { useEffect } from "react";

import {
  STOREFRONT_MANIFEST_HREF,
  captureStorefrontInstallPrompt,
  registerStorefrontServiceWorker,
} from "@/lib/pwa-install";
import {
  shopperPwaIconPath,
  shopperPwaManifestPath,
} from "@/lib/shopper-pwa";

/**
 * Arms Chromium's install prompt and registers the shopper service worker
 * as soon as the storefront mounts — the event fires once, often before
 * the visitor opens Get the app.
 */
export function StorefrontPwaRuntime({ slug }: { slug?: string | null }) {
  useEffect(() => {
    captureStorefrontInstallPrompt();
    void registerStorefrontServiceWorker();

    const manifestHref = slug
      ? shopperPwaManifestPath(slug)
      : STOREFRONT_MANIFEST_HREF;

    const links = Array.from(
      document.querySelectorAll('link[rel="manifest"]'),
    );
    if (links.length > 0) {
      for (const node of links) {
        if (node instanceof HTMLLinkElement) {
          node.href = manifestHref;
        }
      }
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = manifestHref;
      link.setAttribute("data-storefront-pwa", "1");
      document.head.appendChild(link);
    }

    if (slug) {
      const appleHref = shopperPwaIconPath(slug, 180);
      let apple = document.querySelector(
        'link[rel="apple-touch-icon"][data-storefront-pwa]',
      );
      if (!(apple instanceof HTMLLinkElement)) {
        const created = document.createElement("link");
        created.rel = "apple-touch-icon";
        created.setAttribute("data-storefront-pwa", "1");
        document.head.appendChild(created);
        apple = created;
      }
      apple.href = appleHref;
    }
  }, [slug]);

  return null;
}

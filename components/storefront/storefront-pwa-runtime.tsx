"use client";

import { useEffect } from "react";

import { ShopperPwaInvite } from "@/components/storefront/shopper-pwa-invite";
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
export function StorefrontPwaRuntime({
  slug,
  name,
  primary,
  invite = true,
}: {
  slug?: string | null;
  name?: string | null;
  primary?: string | null;
  invite?: boolean;
}) {
  useEffect(() => {
    captureStorefrontInstallPrompt();
    void registerStorefrontServiceWorker();

    const manifestHref = slug
      ? shopperPwaManifestPath(slug)
      : STOREFRONT_MANIFEST_HREF;

    const links = Array.from(
      document.querySelectorAll('link[rel="manifest"]'),
    );
    let kept = false;
    for (const node of links) {
      if (!(node instanceof HTMLLinkElement)) continue;
      if (!kept) {
        node.href = manifestHref;
        kept = true;
      } else {
        node.remove();
      }
    }
    if (!kept) {
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

  if (!invite || !slug) return null;

  return (
    <ShopperPwaInvite
      slug={slug}
      name={name?.trim() || "Shop"}
      primary={primary || "#0D9488"}
    />
  );
}

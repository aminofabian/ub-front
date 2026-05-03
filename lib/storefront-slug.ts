import "server-only";

import { headers } from "next/headers";

import { storefrontSlugFromEnv } from "@/lib/public-storefront";

function parseHostname(rawHost: string): string {
  return rawHost.trim().toLowerCase().split(":")[0] ?? "";
}

function storefrontSlugFromHost(hostname: string): string | null {
  // Local dev convention: <slug>.localhost
  if (hostname.endsWith(".localhost")) {
    const candidate = hostname.slice(0, -".localhost".length).trim();
    return candidate || null;
  }
  return null;
}

export async function resolveStorefrontSlug(): Promise<string | null> {
  const envSlug = storefrontSlugFromEnv();
  if (envSlug) {
    return envSlug;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return null;
  }

  return storefrontSlugFromHost(parseHostname(host));
}

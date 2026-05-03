import "server-only";

import { headers } from "next/headers";

import {
  fetchPublicHostResolve,
  storefrontSlugFromEnv,
} from "@/lib/public-storefront";

const LOCALHOST_SUFFIX = ".localhost";

function parseHostname(raw: string): string {
  return raw.trim().toLowerCase().split(":")[0] ?? "";
}

async function requestHostname(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-forwarded-host") ?? h.get("host");
  if (!raw) {
    return null;
  }
  const hostname = parseHostname(raw);
  return hostname || null;
}

function localStorefrontSlug(hostname: string): string | null {
  if (!hostname.endsWith(LOCALHOST_SUFFIX)) {
    return null;
  }
  const candidate = hostname.slice(0, -LOCALHOST_SUFFIX.length).trim();
  return candidate || null;
}

async function slugFromHostname(hostname: string): Promise<string | null> {
  const local = localStorefrontSlug(hostname);
  if (local) {
    return local;
  }
  const resolved = await fetchPublicHostResolve(hostname);
  return resolved?.slug ?? null;
}

/** Resolution order: env slug → host-based. Use for the storefront pages. */
export async function resolveStorefrontSlug(): Promise<string | null> {
  const envSlug = storefrontSlugFromEnv();
  if (envSlug) {
    return envSlug;
  }
  const hostname = await requestHostname();
  if (!hostname) {
    return null;
  }
  return slugFromHostname(hostname);
}

/** Host-only resolver, skips env so the admin host does not get redirected. */
export async function resolveStorefrontSlugFromHost(): Promise<string | null> {
  const hostname = await requestHostname();
  if (!hostname) {
    return null;
  }
  return slugFromHostname(hostname);
}

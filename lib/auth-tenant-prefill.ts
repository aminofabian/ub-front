"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { fetchTenantIdForHost } from "@/lib/api";
import {
  getSessionTenantId,
  persistSessionTenantHost,
  setSessionTenantId,
} from "@/lib/auth";
import { PUBLIC_TENANT_ID } from "@/lib/config";

const BARE_LOCAL = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Extracts a hostname from a pasted shop URL (`https://shop.example/path`),
 * or returns a bare `host[:port]` fragment lowercased.
 */
export function hostnameFromShopUrlInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  try {
    const withProtocol = t.includes("://") ? t : `https://${t}`;
    const host = new URL(withProtocol).hostname?.toLowerCase();
    return host && host.length > 0 ? host : null;
  } catch {
    const first = t.split("/")[0]?.split(":")[0]?.trim().toLowerCase();
    return first && first.length > 0 ? first : null;
  }
}

function pickHostForResolve(urlQ: string | null, hostQ: string | null): string | null {
  const queryCombined = [urlQ, hostQ].map((s) => s?.trim()).find((s) => s && s.length > 0) ?? "";
  const fromQuery = hostnameFromShopUrlInput(queryCombined);
  if (fromQuery) {
    return fromQuery;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const h = window.location.hostname.toLowerCase();
  if (BARE_LOCAL.has(h)) {
    return null;
  }
  return h;
}

/** Shown when hostname / session cannot supply tenant context (e.g. bare localhost without ?url=). */
export const AUTH_TENANT_RESOLVE_ERROR =
  "Could not determine your business from this page. Open it from your shop’s address, or add ?url= with your shop URL (needed on bare localhost).";

/**
 * Ensures `sessionStorage` has tenant id (and host when resolved from a hostname), using env,
 * existing session, or public host resolve. Call from auth submit handlers and token flows.
 */
export async function resolveTenantForAuthContext(
  urlQ: string | null,
  hostQ: string | null,
  knownTenantId?: string | null,
): Promise<string | null> {
  if (PUBLIC_TENANT_ID.length > 0) {
    setSessionTenantId(PUBLIC_TENANT_ID);
    return PUBLIC_TENANT_ID;
  }
  const fromServer = knownTenantId?.trim();
  if (fromServer) {
    setSessionTenantId(fromServer);
    const host = pickHostForResolve(urlQ, hostQ);
    if (host) {
      persistSessionTenantHost(host);
    }
    return fromServer;
  }
  const stored = getSessionTenantId()?.trim();
  if (stored) {
    return stored;
  }
  const host = pickHostForResolve(urlQ, hostQ);
  if (!host) {
    return null;
  }
  const id = (await fetchTenantIdForHost(host))?.trim() ?? "";
  if (!id) {
    return null;
  }
  setSessionTenantId(id);
  persistSessionTenantHost(host);
  return id;
}

/**
 * Prefills tenant UUID on auth pages from session, `NEXT_PUBLIC_TENANT_ID`,
 * or `GET /api/v1/public/host/resolve?host=…` using the current hostname
 * or `?url=` / `?host=` query parameters.
 */
export function useTenantIdPrefill(
  knownTenantId?: string | null,
): readonly [string, () => Promise<string | null>] {
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("url");
  const hostQ = searchParams.get("host");
  const serverTenantId = knownTenantId?.trim() ?? "";
  const [tenantId, setTenantId] = useState(serverTenantId);

  const ensureTenantResolved = useCallback(async (): Promise<string | null> => {
    const id = await resolveTenantForAuthContext(
      urlQ,
      hostQ,
      serverTenantId || null,
    );
    if (id) {
      setTenantId(id);
    }
    return id;
  }, [urlQ, hostQ, serverTenantId]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      if (PUBLIC_TENANT_ID.length > 0) {
        setTenantId(PUBLIC_TENANT_ID);
        return;
      }
      if (serverTenantId) {
        setSessionTenantId(serverTenantId);
        const host = pickHostForResolve(urlQ, hostQ);
        if (host) {
          persistSessionTenantHost(host);
        }
        setTenantId(serverTenantId);
        return;
      }
      const stored = getSessionTenantId();
      if (stored) {
        setTenantId(stored);
        return;
      }
      const host = pickHostForResolve(urlQ, hostQ);
      if (!host) {
        return;
      }
      void fetchTenantIdForHost(host).then((id) => {
        if (cancelled || !id) {
          return;
        }
        setSessionTenantId(id);
        persistSessionTenantHost(host);
        setTenantId(id);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [urlQ, hostQ, serverTenantId]);

  return [tenantId, ensureTenantResolved] as const;
}

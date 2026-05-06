"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

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
  const queryFirst = urlQ?.trim() || hostQ?.trim() || "";
  const fromQuery = hostnameFromShopUrlInput(queryFirst);
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

/**
 * Prefills tenant UUID on auth pages from session, `NEXT_PUBLIC_TENANT_ID`,
 * or `GET /api/v1/public/host/resolve?host=…` using the current hostname
 * or `?url=` / `?host=` query parameters.
 */
export function useTenantIdPrefill(): [string, Dispatch<SetStateAction<string>>] {
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("url");
  const hostQ = searchParams.get("host");
  const [tenantId, setTenantId] = useState("");

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
  }, [urlQ, hostQ]);

  return [tenantId, setTenantId];
}

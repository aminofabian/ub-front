import { randomUUID } from "crypto";

import { APP_ROUTES, getServerApiOrigin, STORAGE_KEYS } from "@/lib/config";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { SESSION_BOOTSTRAP_KEYS } from "@/lib/session-bootstrap";

export type SessionFinalizeInput = {
  accessToken: string;
  refreshToken?: string;
  tenantId: string;
  tenantHost: string | null;
  nextPath: string;
  bootstrap?: {
    me?: unknown;
    business?: unknown;
    branches?: unknown;
  };
};

function authUpstreamHeaders(
  accessToken: string,
  tenantId: string,
  tenantHost: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-Tenant-Id": tenantId,
  };
  if (tenantHost) {
    headers["X-Tenant-Host"] = tenantHost;
  }
  return headers;
}

export async function prefetchSessionBootstrap(
  accessToken: string,
  tenantId: string,
  tenantHost: string | null,
): Promise<{
  me: unknown | null;
  business: unknown | null;
  branches: unknown | null;
}> {
  const origin = getServerApiOrigin();
  const headers = authUpstreamHeaders(accessToken, tenantId, tenantHost);

  async function load(path: string): Promise<unknown | null> {
    try {
      const response = await fetch(`${origin}${path}`, { headers });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  }

  const [me, business, branches] = await Promise.all([
    load("/api/v1/me"),
    load("/api/v1/businesses/me"),
    load("/api/v1/branches?page=0&size=100"),
  ]);
  return { me, business, branches };
}

export function buildSessionFinalizeHtml(input: SessionFinalizeInput): string {
  const {
    accessToken,
    refreshToken,
    tenantId,
    tenantHost,
    nextPath,
    bootstrap,
  } = input;

  const scriptLines = [
    `localStorage.setItem(${JSON.stringify(STORAGE_KEYS.accessToken)}, ${JSON.stringify(accessToken)});`,
    `sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.accessToken)}, ${JSON.stringify(accessToken)});`,
    refreshToken
      ? `localStorage.setItem(${JSON.stringify(STORAGE_KEYS.refreshToken)}, ${JSON.stringify(refreshToken)});`
      : `localStorage.removeItem(${JSON.stringify(STORAGE_KEYS.refreshToken)});`,
    refreshToken
      ? `sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.refreshToken)}, ${JSON.stringify(refreshToken)});`
      : `sessionStorage.removeItem(${JSON.stringify(STORAGE_KEYS.refreshToken)});`,
    `localStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantId)}, ${JSON.stringify(tenantId)});`,
    `sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantId)}, ${JSON.stringify(tenantId)});`,
  ];

  if (tenantHost) {
    scriptLines.push(
      `localStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)}, ${JSON.stringify(tenantHost)});`,
      `sessionStorage.setItem(${JSON.stringify(STORAGE_KEYS.tenantHost)}, ${JSON.stringify(tenantHost)});`,
    );
  }

  if (bootstrap?.me) {
    scriptLines.push(
      `sessionStorage.setItem(${JSON.stringify(SESSION_BOOTSTRAP_KEYS.me)}, ${JSON.stringify(bootstrap.me)});`,
    );
  }
  if (bootstrap?.business) {
    scriptLines.push(
      `sessionStorage.setItem(${JSON.stringify(SESSION_BOOTSTRAP_KEYS.business)}, ${JSON.stringify(bootstrap.business)});`,
    );
  }
  if (bootstrap?.branches) {
    scriptLines.push(
      `sessionStorage.setItem(${JSON.stringify(SESSION_BOOTSTRAP_KEYS.branches)}, ${JSON.stringify(bootstrap.branches)});`,
    );
  }

  scriptLines.push(`window.location.replace(${JSON.stringify(nextPath)});`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Signing in…</title>
  <style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#444}</style>
</head>
<body>
  <p>Signing you in…</p>
  <script>
    try {
      ${scriptLines.join("\n      ")}
    } catch (e) {
      document.body.innerHTML = "<p>Sign-in succeeded but your browser blocked saving the session. Allow site data for this domain, then try again.</p>";
    }
  </script>
</body>
</html>`;
}

export function safeAuthNextPath(raw: string | null): string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  return "";
}

/** Resolve redirect from prefetched /me; role beats client-supplied next hints. */
export function resolveFinalizeDestination(
  me: unknown,
  requestedNext?: string | null,
): string {
  return resolvePostAuthDestination(
    me as Parameters<typeof resolvePostAuthDestination>[0],
    safeAuthNextPath(requestedNext ?? null) || null,
  );
}

/** Idempotency key factory for upstream login POST. */
export function newLoginIdempotencyKey(): string {
  return randomUUID();
}

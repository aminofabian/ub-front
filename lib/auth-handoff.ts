export type AuthHandoffPayload = {
  /**
   * Legacy: access JWT in the fragment. Prefer cookie restore on the shop host
   * (Gap G) — omit accessToken and let handoff call restore-session.
   */
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  nextPath?: string;
};

const HANDOFF_BUFFER_KEY = "ub.authHandoffFragment";
/** Abandoned handoff fragments are discarded after this window. */
export const AUTH_HANDOFF_TTL_MS = 2 * 60 * 1000;

type HandoffBufferRecord = {
  fragment: string;
  storedAt: number;
};

function readHandoffBufferRecord(): HandoffBufferRecord | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(HANDOFF_BUFFER_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as HandoffBufferRecord;
    if (
      typeof parsed.fragment !== "string" ||
      typeof parsed.storedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return { fragment: raw, storedAt: Date.now() };
  }
}

/** Persists a URL fragment for handoff (survives hash strip via replaceState). */
export function bufferAuthHandoffFragment(fragment: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = fragment.trim();
  if (!trimmed) {
    window.sessionStorage.removeItem(HANDOFF_BUFFER_KEY);
    return;
  }
  const record: HandoffBufferRecord = {
    fragment: trimmed,
    storedAt: Date.now(),
  };
  window.sessionStorage.setItem(HANDOFF_BUFFER_KEY, JSON.stringify(record));
}

/** Returns a buffered fragment when still within {@link AUTH_HANDOFF_TTL_MS}. */
export function peekAuthHandoffFragment(): string | null {
  const record = readHandoffBufferRecord();
  if (!record) {
    return null;
  }
  if (Date.now() - record.storedAt > AUTH_HANDOFF_TTL_MS) {
    clearAuthHandoffFragment();
    return null;
  }
  return record.fragment;
}

/** Reads and clears the buffered handoff fragment when still valid. */
export function consumeAuthHandoffFragment(): string | null {
  const fragment = peekAuthHandoffFragment();
  clearAuthHandoffFragment();
  return fragment;
}

export function clearAuthHandoffFragment(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(HANDOFF_BUFFER_KEY);
}

/** Fragment is not sent to servers on navigation (avoids leaking tokens via Referer on same-origin nav). */
export function encodeAuthHandoffPayload(data: AuthHandoffPayload): string {
  const json = JSON.stringify({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tenantId: data.tenantId,
    nextPath: data.nextPath,
  });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeAuthHandoffPayload(fragment: string): AuthHandoffPayload | null {
  const trimmed = fragment.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const pad = trimmed.length % 4 === 0 ? "" : "=".repeat(4 - (trimmed.length % 4));
    const b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    );
    const o = JSON.parse(json) as Record<string, unknown>;
    const accessToken =
      typeof o.accessToken === "string" ? o.accessToken : undefined;
    const tenantId = typeof o.tenantId === "string" ? o.tenantId : undefined;
    const nextPath = typeof o.nextPath === "string" ? o.nextPath : undefined;
    const refreshToken =
      typeof o.refreshToken === "string" ? o.refreshToken : undefined;
    // Cookie-restore handoff: tenant/next only (no access JWT in fragment).
    if (!accessToken && !tenantId && !nextPath) {
      return null;
    }
    return {
      accessToken,
      refreshToken,
      tenantId,
      nextPath,
    };
  } catch {
    return null;
  }
}

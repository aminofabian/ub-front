export type AuthHandoffPayload = {
  accessToken: string;
  refreshToken: string;
  tenantId?: string;
  nextPath?: string;
};

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
    if (typeof o.accessToken !== "string" || typeof o.refreshToken !== "string") {
      return null;
    }
    return {
      accessToken: o.accessToken,
      refreshToken: o.refreshToken,
      tenantId: typeof o.tenantId === "string" ? o.tenantId : undefined,
      nextPath: typeof o.nextPath === "string" ? o.nextPath : undefined,
    };
  } catch {
    return null;
  }
}

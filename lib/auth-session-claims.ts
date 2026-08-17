/**
 * Gap G increment 3: non-secret session hints held in JS (exp / businessId).
 * The raw access JWT stays in httpOnly `ub.access` only.
 */

export type AuthSessionClaims = {
  exp?: number;
  businessId?: string;
  sub?: string;
};

export function claimsFromAccessToken(
  accessToken: string | null | undefined,
): AuthSessionClaims | null {
  const token = accessToken?.trim();
  if (!token) {
    return null;
  }
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) {
    return null;
  }
  try {
    const json = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const record = JSON.parse(json) as Record<string, unknown>;
    const businessRaw = record.business_id;
    const businessId =
      typeof businessRaw === "string" && businessRaw.trim().length > 0
        ? businessRaw.trim()
        : undefined;
    const sub =
      typeof record.sub === "string" && record.sub.trim().length > 0
        ? record.sub.trim()
        : undefined;
    return {
      exp: typeof record.exp === "number" ? record.exp : undefined,
      businessId,
      sub,
    };
  } catch {
    return null;
  }
}

export const NATIVE_KIOSK_CLIENT_HEADER = "x-kiosk-client";
export const NATIVE_KIOSK_CLIENT_VALUE = "native";

/** True when the caller is a Kiosk native app (needs JWTs in JSON, not cookies). */
export function isNativeKioskClient(
  headerValue: string | null | undefined,
): boolean {
  return headerValue?.trim().toLowerCase() === NATIVE_KIOSK_CLIENT_VALUE;
}

/**
 * Browser clients get cookie-only JWTs. Native apps keep access/refresh in JSON
 * so they can store them in SecureStore and send Bearer tokens.
 */
export function authJsonBodyForClient(
  rawBody: string,
  nativeClient: boolean,
): {
  bodyText: string;
  accessToken: string | null;
} {
  const redacted = redactAccessTokenFromAuthJson(rawBody);
  if (nativeClient) {
    return { bodyText: rawBody, accessToken: redacted.accessToken };
  }
  return redacted;
}

/** Strip secrets from auth JSON for the browser; keep non-secret session hints. */
export function redactAccessTokenFromAuthJson(bodyText: string): {
  bodyText: string;
  accessToken: string | null;
} {
  try {
    const payload = JSON.parse(bodyText) as Record<string, unknown>;
    const access =
      typeof payload.accessToken === "string" ? payload.accessToken.trim() : "";
    if (!access) {
      return { bodyText, accessToken: null };
    }
    const claims = claimsFromAccessToken(access);
    delete payload.accessToken;
    delete payload.refreshToken;
    if (claims) {
      const session: AuthSessionClaims = {};
      if (claims.exp != null) session.exp = claims.exp;
      if (claims.businessId) session.businessId = claims.businessId;
      if (claims.sub) session.sub = claims.sub;
      payload.session = session;
    }
    return { bodyText: JSON.stringify(payload), accessToken: access };
  } catch {
    return { bodyText, accessToken: null };
  }
}

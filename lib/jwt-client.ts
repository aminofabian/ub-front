/** Parsed tenant-user access JWT payload (subset of backend {@code JwtTokenService} claims). */
export type AccessTokenClaims = {
  exp?: number;
  businessId?: string;
};

function decodeJwtPayloadSegment(segment: string): Record<string, unknown> | null {
  try {
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Reads the middle segment of a JWT without verifying the signature (client-side hint only). */
export function parseAccessTokenClaims(
  accessToken: string | null | undefined,
): AccessTokenClaims | null {
  const token = accessToken?.trim();
  if (!token) {
    return null;
  }
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) {
    return null;
  }
  const record = decodeJwtPayloadSegment(payloadSegment);
  if (!record) {
    return null;
  }

  const exp = record.exp;
  const businessRaw = record.business_id;
  const businessId =
    typeof businessRaw === "string" && businessRaw.trim().length > 0
      ? businessRaw.trim()
      : undefined;

  return {
    exp: typeof exp === "number" ? exp : undefined,
    businessId,
  };
}

export function businessIdFromAccessToken(
  accessToken: string | null | undefined,
): string | null {
  return parseAccessTokenClaims(accessToken)?.businessId ?? null;
}

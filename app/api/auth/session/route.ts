import { NextRequest, NextResponse } from "next/server";

import { readAccessTokenFromCookieHeader } from "@/lib/access-token-cookie";
import { claimsFromAccessToken } from "@/lib/auth-session-claims";

/**
 * Gap G3: return non-secret session claims from httpOnly `ub.access`.
 * Never returns the raw JWT.
 */
export async function GET(request: NextRequest) {
  const access = readAccessTokenFromCookieHeader(request.headers.get("cookie"));
  if (!access) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const session = claimsFromAccessToken(access);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    session: {
      ...(session.exp != null ? { exp: session.exp } : {}),
      ...(session.businessId ? { businessId: session.businessId } : {}),
      ...(session.sub ? { sub: session.sub } : {}),
    },
  });
}

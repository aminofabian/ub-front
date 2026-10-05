import { NextResponse } from "next/server";

import {
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
} from "@/lib/auth-route-guard";
import { sessionCookieDomain } from "@/lib/tenant-host";

/** Sets the middleware session hint via Set-Cookie (reliable on Safari / iOS). */
export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set({
    name: SESSION_PRESENCE_COOKIE,
    value: "1",
    path: "/",
    maxAge: SESSION_PRESENCE_MAX_AGE_SEC,
    sameSite: "lax",
    secure,
    httpOnly: false,
  });
  return response;
}

/** Clears the session hint cookie on sign-out (host-only and parent domain). */
export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set({
    name: SESSION_PRESENCE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure,
    httpOnly: false,
  });
  const domain = sessionCookieDomain(request);
  if (domain) {
    const secureAttr = secure ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_PRESENCE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureAttr}; Domain=${domain}`,
    );
  }
  return response;
}

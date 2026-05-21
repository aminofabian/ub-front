"use client";

import { getSessionTokens } from "@/lib/auth";
import { apiUrl } from "@/lib/config";

export type FcmPlatform = "ANDROID" | "IOS";

export async function registerFcmDeviceToken(
  platform: FcmPlatform,
  token: string,
): Promise<boolean> {
  const tokens = getSessionTokens();
  if (!tokens) {
    return false;
  }
  const headers = { Authorization: `Bearer ${tokens.accessToken}` };
  const response = await fetch(apiUrl("/api/v1/me/device-tokens/fcm"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ platform, token }),
  });
  return response.ok;
}

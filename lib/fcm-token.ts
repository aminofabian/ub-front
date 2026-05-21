"use client";

import { apiUrl } from "@/lib/config";
import { buildAuthHeaders } from "@/lib/web-push";

export type FcmPlatform = "ANDROID" | "IOS";

export async function registerFcmDeviceToken(
  platform: FcmPlatform,
  token: string,
): Promise<boolean> {
  const headers = await buildAuthHeaders();
  if (!headers) {
    return false;
  }
  const response = await fetch(apiUrl("/api/v1/me/device-tokens/fcm"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ platform, token }),
  });
  return response.ok;
}

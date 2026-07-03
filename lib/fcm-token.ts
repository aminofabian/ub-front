"use client";

import { apiRequest } from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";

export type FcmPlatform = "ANDROID" | "IOS";

export async function registerFcmDeviceToken(
  platform: FcmPlatform,
  token: string,
): Promise<boolean> {
  if (!getSessionTokens()) {
    return false;
  }
  try {
    await apiRequest<void>("/api/v1/me/device-tokens/fcm", {
      method: "POST",
      toast: false,
      body: { platform, token },
    });
    return true;
  } catch {
    return false;
  }
}

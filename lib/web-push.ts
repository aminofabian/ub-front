import { getSessionTokens } from "@/lib/auth";
import { apiUrl } from "@/lib/config";

function buildAuthHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
  fcmEnabled?: boolean;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function fetchPushConfig(): Promise<PushConfig> {
  const tokens = getSessionTokens();
  if (!tokens) {
    return { enabled: false, publicKey: null };
  }
  const response = await fetch(apiUrl("/api/v1/me/push/config"), {
    headers: buildAuthHeaders(tokens.accessToken),
  });
  if (!response.ok) {
    return { enabled: false, publicKey: null };
  }
  const data = (await response.json()) as PushConfig;
  return {
    enabled: Boolean(data.enabled),
    publicKey: data.publicKey ?? null,
    fcmEnabled: Boolean(data.fcmEnabled),
  };
}

export async function registerWebPushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const config = await fetchPushConfig();
  if (!config.enabled || !config.publicKey) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const key = json.keys;
  if (!endpoint || !key?.p256dh || !key?.auth) {
    return false;
  }

  const tokens = getSessionTokens();
  if (!tokens) {
    return false;
  }

  const response = await fetch(apiUrl("/api/v1/me/device-tokens"), {
    method: "POST",
    headers: {
      ...buildAuthHeaders(tokens.accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint,
      p256dh: key.p256dh,
      auth: key.auth,
      platform: "WEB",
    }),
  });

  return response.ok || response.status === 204;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

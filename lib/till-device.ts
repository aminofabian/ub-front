/**
 * Stable, device-local till id (`ub.tillDeviceId`).
 * Sent as X-Till-Device-Id for audit and trusted-till PIN policy
 * (enforced once a branch has at least one registered till).
 */

export const TILL_DEVICE_STORAGE_KEY = "ub.tillDeviceId";
export const TILL_DEVICE_LABEL_KEY = "ub.tillDeviceLabel";
export const TILL_DEVICE_HEADER = "X-Till-Device-Id";

function randomTillId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `till-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Read existing till id without minting one. */
export function peekTillDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.localStorage.getItem(TILL_DEVICE_STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

/** Returns the durable till device id, creating one on first use. */
export function getOrCreateTillDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const existing = peekTillDeviceId();
    if (existing) {
      return existing;
    }
    const created = randomTillId();
    window.localStorage.setItem(TILL_DEVICE_STORAGE_KEY, created);
    return created;
  } catch {
    return "";
  }
}

export function getTillDeviceLabel(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(TILL_DEVICE_LABEL_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function setTillDeviceLabel(label: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = label.trim().slice(0, 40);
  try {
    if (!trimmed) {
      window.localStorage.removeItem(TILL_DEVICE_LABEL_KEY);
      return;
    }
    window.localStorage.setItem(TILL_DEVICE_LABEL_KEY, trimmed);
  } catch {
    /* private mode */
  }
}

/** Short display form for till chrome (e.g. a1b2c3d4). */
export function formatTillDeviceShortId(deviceId: string): string {
  const id = deviceId.trim();
  if (!id) {
    return "";
  }
  const compact = id.replace(/-/g, "");
  return compact.slice(0, 8);
}

export function tillDeviceDisplayName(): string {
  const label = getTillDeviceLabel();
  if (label) {
    return label;
  }
  const short = formatTillDeviceShortId(getOrCreateTillDeviceId());
  return short ? `Till ${short}` : "Till";
}

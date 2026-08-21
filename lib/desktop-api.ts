"use client";

import { apiRequest } from "@/lib/api";

/** {@code GET /api/v1/license/status} */
export type DesktopLicenseStatus = {
  state: "active" | "trial" | "expired" | "trial_expired" | "invalid" | string;
  message: string;
  plan: string | null;
  daysRemaining: number | null;
  expiresAt: string | null;
  readOnly: boolean;
};

/** {@code GET /api/v1/desktop/lan/status} */
export type DesktopLanStatus = {
  enabled: boolean;
  lanUrl: string | null;
  detectedAddresses: string[];
  port: number;
  restartRequired?: boolean;
};

/** {@code GET /api/v1/desktop/backups} */
export type DesktopBackupInfo = {
  filename: string;
  sizeBytes: number;
  modifiedAt: string;
};

export function fetchDesktopLicenseStatus(): Promise<DesktopLicenseStatus> {
  return apiRequest<DesktopLicenseStatus>("/api/v1/license/status", {
    requiresAuth: false,
    toast: false,
  });
}

export function renewDesktopLicense(token: string): Promise<DesktopLicenseStatus> {
  return apiRequest<DesktopLicenseStatus>("/api/v1/license", {
    method: "POST",
    body: { token: token.trim() },
  });
}

export function fetchDesktopLanStatus(): Promise<DesktopLanStatus> {
  return apiRequest<DesktopLanStatus>("/api/v1/desktop/lan/status");
}

export function toggleDesktopLan(): Promise<DesktopLanStatus> {
  return apiRequest<DesktopLanStatus>("/api/v1/desktop/lan/toggle", {
    method: "POST",
    toast: false,
  });
}

export function fetchDesktopBackups(): Promise<DesktopBackupInfo[]> {
  return apiRequest<DesktopBackupInfo[]>("/api/v1/desktop/backups");
}

export function runDesktopBackupNow(): Promise<DesktopBackupInfo> {
  return apiRequest<DesktopBackupInfo>("/api/v1/desktop/backups/now", {
    method: "POST",
  });
}

export function restoreDesktopBackup(filename: string): Promise<void> {
  return apiRequest<void>(
    `/api/v1/desktop/backups/restore/${encodeURIComponent(filename)}`,
    { method: "POST", toast: false },
  );
}

/** {@code GET /api/v1/desktop/sync/media-status} — background photo download progress. */
export type DesktopMediaStatus = {
  downloading: boolean;
  total: number;
  done: number;
};

export function fetchDesktopMediaStatus(): Promise<DesktopMediaStatus> {
  return apiRequest<DesktopMediaStatus>("/api/v1/desktop/sync/media-status", {
    toast: false,
  });
}

/** {@code POST /api/v1/desktop/reconnect} — re-auth after the cloud session expires. */
export function reconnectDesktop(
  origin: string,
  email: string,
  password: string,
): Promise<{ businessId: string; message: string }> {
  return apiRequest<{ businessId: string; message: string }>(
    "/api/v1/desktop/reconnect",
    {
      method: "POST",
      body: { origin: origin.trim(), email: email.trim(), password },
      requiresAuth: false,
      toast: false,
    },
  );
}

/** Pull counts of a finished sync ({@code GET /api/v1/desktop/sync/status}). */
export type DesktopSyncPullResult = {
  branches: number;
  categories: number;
  items: number;
  taxRates: number;
  staff: number;
  images: number;
};

/** Push counts of a finished sync. */
export type DesktopSyncPushResult = {
  shiftsPushed: number;
  salesPushed: number;
  configured: boolean;
};

/** Live progress of the background full sync. */
export type DesktopSyncStatus = {
  phase: "IDLE" | "DOWNLOADING" | "APPLYING" | "UPLOADING" | "DONE" | "ERROR";
  detail: string;
  startedAt: number;
  finishedAt: number;
  itemsDone: number;
  itemsTotal: number;
  pull: DesktopSyncPullResult | null;
  push: DesktopSyncPushResult | null;
  error: string | null;
};

/**
 * {@code POST /api/v1/desktop/sync/full} — starts the background pull+push
 * sync. Returns immediately; poll {@link fetchDesktopSyncStatus} for progress.
 */
export function runDesktopSyncFull(): Promise<{ started: boolean }> {
  return apiRequest<{ started: boolean }>("/api/v1/desktop/sync/full", {
    method: "POST",
    toast: false,
  });
}

/** {@code GET /api/v1/desktop/sync/status} — live phase + counts. */
export function fetchDesktopSyncStatus(): Promise<DesktopSyncStatus> {
  return apiRequest<DesktopSyncStatus>("/api/v1/desktop/sync/status", {
    toast: false,
  });
}

/** {@code GET/PUT /api/v1/desktop/printer} */
export type DesktopPrinterConfig = {
  mode: "none" | "file" | "network" | string;
  host: string;
  port: number;
  path: string;
};

export function fetchDesktopPrinterConfig(): Promise<DesktopPrinterConfig> {
  return apiRequest<DesktopPrinterConfig>("/api/v1/desktop/printer");
}

export function saveDesktopPrinterConfig(
  config: DesktopPrinterConfig,
): Promise<DesktopPrinterConfig> {
  return apiRequest<DesktopPrinterConfig>("/api/v1/desktop/printer", {
    method: "PUT",
    body: config,
  });
}

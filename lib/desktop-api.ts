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

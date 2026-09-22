import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  parseCashierTemplateId,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { getOrCreateTillDeviceId } from "@/lib/till-device";

export type TillDeviceRecord = {
  id: string;
  branchId: string;
  deviceKey: string;
  label: string;
  cashierTemplate: CashierTemplateId;
  registeredBy: string;
  registeredAt: string;
  revokedAt: string | null;
};

export type TillDeviceListResponse = {
  devices: TillDeviceRecord[];
};

export type TillAccessRequestRecord = {
  id: string;
  branchId: string;
  branchName: string;
  deviceKey: string;
  deviceShortId: string;
  requestedByName: string;
  requestedByEmail: string;
  suggestedLabel: string;
  userAgent: string | null;
  status: string;
  lastSeenAt: string;
  createdAt: string;
  canApprove: boolean;
};

export type TillAccessRequestListResponse = {
  requests: TillAccessRequestRecord[];
};

function normalizeTillDevice(row: TillDeviceRecord): TillDeviceRecord {
  return {
    ...row,
    cashierTemplate: parseCashierTemplateId(row.cashierTemplate),
  };
}

export async function listTillDevices(opts: {
  branchId: string;
  includeRevoked?: boolean;
}): Promise<TillDeviceRecord[]> {
  const sp = new URLSearchParams({ branchId: opts.branchId });
  if (opts.includeRevoked) {
    sp.set("includeRevoked", "true");
  }
  const payload = await apiRequest<TillDeviceListResponse>(
    `/api/v1/till-devices?${sp.toString()}`,
  );
  return Array.isArray(payload?.devices)
    ? payload.devices.map(normalizeTillDevice)
    : [];
}

export async function registerTillDevice(opts: {
  branchId: string;
  deviceKey?: string;
  label?: string;
  cashierTemplate?: CashierTemplateId;
  toast?: boolean;
}): Promise<TillDeviceRecord> {
  const deviceKey =
    opts.deviceKey?.trim() || getOrCreateTillDeviceId() || undefined;
  const row = await apiRequest<TillDeviceRecord>("/api/v1/till-devices", {
    method: "POST",
    body: {
      branchId: opts.branchId,
      deviceKey,
      label: opts.label?.trim() || undefined,
      cashierTemplate: opts.cashierTemplate,
    },
    toast: opts.toast,
  });
  return normalizeTillDevice(row);
}

export async function fetchTillDeviceMe(opts: {
  branchId: string;
  toast?: boolean;
}): Promise<TillDeviceRecord> {
  const sp = new URLSearchParams({ branchId: opts.branchId });
  const row = await apiRequest<TillDeviceRecord>(
    `/api/v1/till-devices/me?${sp.toString()}`,
    { toast: opts.toast },
  );
  return normalizeTillDevice(row);
}

export async function patchTillDevice(
  id: string,
  body: { cashierTemplate: CashierTemplateId },
): Promise<TillDeviceRecord> {
  const row = await apiRequest<TillDeviceRecord>(
    `/api/v1/till-devices/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body,
    },
  );
  return normalizeTillDevice(row);
}

export async function patchTillDeviceMe(opts: {
  branchId: string;
  cashierTemplate: CashierTemplateId;
  /** Off by default: callers explain the outcome in place instead of a toast. */
  toast?: boolean;
}): Promise<TillDeviceRecord> {
  const sp = new URLSearchParams({ branchId: opts.branchId });
  const row = await apiRequest<TillDeviceRecord>(
    `/api/v1/till-devices/me?${sp.toString()}`,
    {
      method: "PATCH",
      body: { cashierTemplate: opts.cashierTemplate },
      toast: opts.toast ?? false,
    },
  );
  return normalizeTillDevice(row);
}

export async function revokeTillDevice(id: string): Promise<void> {
  await apiRequest(`/api/v1/till-devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function reactivateTillDevice(
  id: string,
): Promise<TillDeviceRecord> {
  const row = await apiRequest<TillDeviceRecord>(
    `/api/v1/till-devices/${encodeURIComponent(id)}/reactivate`,
    { method: "POST" },
  );
  return normalizeTillDevice(row);
}

export async function listTillAccessRequests(opts?: {
  branchId?: string;
  status?: "pending" | "approved" | "dismissed";
}): Promise<TillAccessRequestRecord[]> {
  const sp = new URLSearchParams();
  if (opts?.branchId?.trim()) {
    sp.set("branchId", opts.branchId.trim());
  }
  if (opts?.status) {
    sp.set("status", opts.status);
  }
  const qs = sp.toString();
  const payload = await apiRequest<TillAccessRequestListResponse>(
    `/api/v1/till-access-requests${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(payload?.requests) ? payload.requests : [];
}

export async function approveTillAccessRequest(
  id: string,
  label?: string,
): Promise<TillAccessRequestRecord> {
  return apiRequest<TillAccessRequestRecord>(
    `/api/v1/till-access-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      body: label?.trim() ? { label: label.trim() } : {},
    },
  );
}

export async function dismissTillAccessRequest(
  id: string,
): Promise<TillAccessRequestRecord> {
  return apiRequest<TillAccessRequestRecord>(
    `/api/v1/till-access-requests/${encodeURIComponent(id)}/dismiss`,
    { method: "POST" },
  );
}

export function tillDeviceErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return error instanceof Error ? error.message : DEFAULT_PROBLEM_TITLE;
}

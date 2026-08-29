import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  parseCashierTemplateId,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
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
}): Promise<TillDeviceRecord> {
  const sp = new URLSearchParams({ branchId: opts.branchId });
  const row = await apiRequest<TillDeviceRecord>(
    `/api/v1/till-devices/me?${sp.toString()}`,
    {
      method: "PATCH",
      body: { cashierTemplate: opts.cashierTemplate },
    },
  );
  return normalizeTillDevice(row);
}

export async function revokeTillDevice(id: string): Promise<void> {
  await apiRequest(`/api/v1/till-devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function tillDeviceErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return error instanceof Error ? error.message : "Request failed";
}

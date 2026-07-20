import { apiRequest, ApiRequestError } from "@/lib/api";
import { getOrCreateTillDeviceId } from "@/lib/till-device";

export type TillDeviceRecord = {
  id: string;
  branchId: string;
  deviceKey: string;
  label: string;
  registeredBy: string;
  registeredAt: string;
  revokedAt: string | null;
};

export type TillDeviceListResponse = {
  devices: TillDeviceRecord[];
};

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
  return Array.isArray(payload?.devices) ? payload.devices : [];
}

export async function registerTillDevice(opts: {
  branchId: string;
  deviceKey?: string;
  label?: string;
}): Promise<TillDeviceRecord> {
  const deviceKey =
    opts.deviceKey?.trim() || getOrCreateTillDeviceId() || undefined;
  return apiRequest<TillDeviceRecord>("/api/v1/till-devices", {
    method: "POST",
    body: {
      branchId: opts.branchId,
      deviceKey,
      label: opts.label?.trim() || undefined,
    },
  });
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

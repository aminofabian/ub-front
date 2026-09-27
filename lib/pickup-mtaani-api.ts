"use client";

import { apiRequest } from "@/lib/api";

const BASE = "/api/v1/integrations/pickup-mtaani";

/**
 * Merchant-visible Pickup Mtaani option. The API key is super-admin-owned, so
 * there is no credential surface here (scope §6). `status` explains why the
 * option may be unavailable.
 */
export type PickupMtaaniSettings = {
  enabled: boolean;
  businessName?: string | null;
  originAgentId?: number | null;
  originAgentName?: string | null;
  originLocationName?: string | null;
  feeMode: string;
  markupKes: number;
  agent: boolean;
  doorstep: boolean;
  bookOnDispatch: boolean;
  status: string;
  statusDetail?: string | null;
  ready: boolean;
};

export type PickupMtaaniGeoOption = {
  id: number;
  name?: string | null;
  zoneId?: number | null;
  areaId?: number | null;
  locationId?: number | null;
};

export type PickupMtaaniPatch = {
  enabled?: boolean;
  feeMode?: string;
  markupKes?: number;
  agent?: boolean;
  doorstep?: boolean;
  bookOnDispatch?: boolean;
  originAgentId?: number;
  originAgentName?: string;
  originLocationName?: string;
};

function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function fetchPickupMtaaniSettings(): Promise<PickupMtaaniSettings> {
  return apiRequest<PickupMtaaniSettings>(BASE, { toast: false });
}

export function updatePickupMtaaniSettings(
  patch: PickupMtaaniPatch,
): Promise<PickupMtaaniSettings> {
  return apiRequest<PickupMtaaniSettings>(BASE, {
    method: "PUT",
    body: patch,
    toast: false,
  });
}

export function fetchPickupMtaaniZones(): Promise<PickupMtaaniGeoOption[]> {
  return apiRequest<PickupMtaaniGeoOption[]>(`${BASE}/zones`, { toast: false });
}

export function fetchPickupMtaaniAreas(
  zoneId?: number,
): Promise<PickupMtaaniGeoOption[]> {
  return apiRequest<PickupMtaaniGeoOption[]>(
    withQuery(`${BASE}/areas`, { zoneId }),
    { toast: false },
  );
}

export function fetchPickupMtaaniLocations(params: {
  areaId?: number;
  purpose?: "origin" | "destination";
  q?: string;
}): Promise<PickupMtaaniGeoOption[]> {
  return apiRequest<PickupMtaaniGeoOption[]>(
    withQuery(`${BASE}/locations`, params),
    { toast: false },
  );
}

export function fetchPickupMtaaniAgents(params: {
  locationId?: number;
  purpose?: "origin" | "destination";
  q?: string;
}): Promise<PickupMtaaniGeoOption[]> {
  return apiRequest<PickupMtaaniGeoOption[]>(
    withQuery(`${BASE}/agents`, params),
    { toast: false },
  );
}

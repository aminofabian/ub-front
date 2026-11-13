"use client";

import { apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

/**
 * Client for the service-business endpoints: the service catalogue, staff who have no login,
 * and staff commission, tips and payouts. Shapes mirror `docs/openapi/phase-1.yaml`.
 */

export type ServiceCategoryRecord = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type CommissionType = "PERCENT" | "FIXED";

export type ServiceRecord = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  priceIsVariable: boolean;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  sortOrder: number;
  active: boolean;
  /** Staff profiles that may perform this service; empty means anyone. */
  staffProfileIds: string[];
  version: number;
};

export type ServicePayload = {
  name: string;
  categoryId?: string | null;
  description?: string | null;
  durationMinutes: number;
  price: number;
  priceIsVariable?: boolean;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
};

type Page<T> = { content: T[]; totalElements: number };

export async function fetchServiceCategories(): Promise<ServiceCategoryRecord[]> {
  return apiRequest<ServiceCategoryRecord[]>(API_ROUTES.serviceCategories);
}

export async function createServiceCategory(name: string): Promise<ServiceCategoryRecord> {
  return apiRequest<ServiceCategoryRecord>(API_ROUTES.serviceCategories, {
    method: "POST",
    body: { name },
  });
}

/** Every service of the business (the catalogue of a service shop is small). */
export async function fetchServices(opts?: { active?: boolean }): Promise<ServiceRecord[]> {
  const params = new URLSearchParams({ size: "200" });
  if (opts?.active != null) params.set("active", String(opts.active));
  const page = await apiRequest<Page<ServiceRecord>>(`${API_ROUTES.services}?${params.toString()}`);
  return page.content ?? [];
}

export async function createService(body: ServicePayload): Promise<ServiceRecord> {
  return apiRequest<ServiceRecord>(API_ROUTES.services, { method: "POST", body });
}

export type ServicePatch = Partial<ServicePayload> & {
  active?: boolean;
  clearCategory?: boolean;
  clearDescription?: boolean;
  clearCommission?: boolean;
  /** Send the version you loaded so a concurrent edit is refused instead of overwritten. */
  version?: number;
};

export async function updateService(id: string, body: ServicePatch): Promise<ServiceRecord> {
  return apiRequest<ServiceRecord>(`${API_ROUTES.services}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function setServiceStaff(id: string, staffProfileIds: string[]): Promise<ServiceRecord> {
  return apiRequest<ServiceRecord>(`${API_ROUTES.services}/${encodeURIComponent(id)}/staff`, {
    method: "PUT",
    body: { staffProfileIds },
  });
}

export async function deleteService(id: string): Promise<void> {
  await apiRequest<void>(`${API_ROUTES.services}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type ServicePerformerRecord = {
  staffProfileId: string;
  displayName: string;
};

/** Staff who serve customers — the till's "who did it" list. Open to anyone who can sell. */
export async function fetchServicePerformers(): Promise<ServicePerformerRecord[]> {
  return apiRequest<ServicePerformerRecord[]>(`${API_ROUTES.services}/performers`);
}

// ------------------------------------------------------------------ staff

export type CreateStaffPayload = {
  displayName: string;
  title?: string;
  phone?: string;
  bookable?: boolean;
};

/** Adds a staff member who has no login (for example a barber). Returns the new profile id. */
export async function createStaffWithoutLogin(body: CreateStaffPayload): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`${API_ROUTES.staff}/profiles`, { method: "POST", body });
}

export async function updateStaffProfileById(
  profileId: string,
  body: { displayName?: string; bookable?: boolean; employmentStatus?: "active" | "on_leave" | "terminated" },
): Promise<void> {
  await apiRequest<unknown>(`${API_ROUTES.staff}/profiles/${encodeURIComponent(profileId)}`, {
    method: "PATCH",
    body,
  });
}

// ------------------------------------------------------------ commissions

export type CommissionPlanRecord = {
  staffProfileId: string;
  displayName: string;
  bookable: boolean;
  /** False once the staff member has left. */
  current: boolean;
  type: CommissionType | null;
  rate: number | null;
  productRate: number | null;
};

export async function fetchCommissionPlans(): Promise<CommissionPlanRecord[]> {
  return apiRequest<CommissionPlanRecord[]>(`${API_ROUTES.commissions}/plans`);
}

export async function setCommissionPlan(
  staffProfileId: string,
  body: { type: CommissionType | null; rate: number | null; productRate: number | null },
): Promise<CommissionPlanRecord> {
  return apiRequest<CommissionPlanRecord>(
    `${API_ROUTES.commissions}/plans/${encodeURIComponent(staffProfileId)}`,
    { method: "PUT", body },
  );
}

export type CommissionStatementRow = {
  staffProfileId: string;
  displayName: string;
  current: boolean;
  servicesDone: number;
  serviceRevenue: number;
  opening: number;
  commission: number;
  tips: number;
  /** Negative: taken back by voids and refunds. */
  reversals: number;
  adjustments: number;
  /** Positive: paid to the staff member in the period. */
  paid: number;
  closing: number;
};

export type CommissionStatement = {
  from: string;
  to: string;
  rows: CommissionStatementRow[];
  ledgerTotal: number;
  generalLedgerTotal: number;
  /** False when the staff ledger and the books disagree — should never happen. */
  reconciled: boolean;
};

export async function fetchCommissionStatement(from: string, to: string): Promise<CommissionStatement> {
  const params = new URLSearchParams({ from, to });
  return apiRequest<CommissionStatement>(`${API_ROUTES.commissions}/statement?${params.toString()}`);
}

export type StaffLedgerEntryRecord = {
  id: string;
  staffProfileId: string;
  kind: "COMMISSION" | "TIP" | "REVERSAL" | "ADJUSTMENT" | "PAYOUT";
  bucket: "COMMISSION" | "TIPS";
  amount: number;
  baseAmount: number | null;
  rule: string | null;
  source: "SERVICE" | "PRODUCT" | null;
  saleId: string | null;
  reversesId: string | null;
  payoutMethod: PayoutMethod | null;
  reference: string | null;
  reason: string | null;
  occurredAt: string;
};

export async function fetchStaffLedgerEntries(
  staffProfileId: string,
  from: string,
  to: string,
): Promise<StaffLedgerEntryRecord[]> {
  const params = new URLSearchParams({ from, to });
  return apiRequest<StaffLedgerEntryRecord[]>(
    `${API_ROUTES.commissions}/staff/${encodeURIComponent(staffProfileId)}/entries?${params.toString()}`,
  );
}

export type PayoutMethod = "DRAWER" | "MPESA" | "OTHER";

/**
 * Pays a staff member. `idempotencyKey` must be created once per intended payout and reused on
 * retry, so a double tap or a dropped connection never pays twice.
 */
export async function payStaff(
  staffProfileId: string,
  body: { amount: number; method: PayoutMethod; branchId?: string; reference?: string; allowOverpay?: boolean },
  idempotencyKey: string,
): Promise<StaffLedgerEntryRecord[]> {
  return apiRequest<StaffLedgerEntryRecord[]>(
    `${API_ROUTES.commissions}/staff/${encodeURIComponent(staffProfileId)}/payouts`,
    { method: "POST", body, idempotencyKey, toast: false },
  );
}

export async function adjustStaffEarnings(
  staffProfileId: string,
  body: { amount: number; reason: string },
  idempotencyKey: string,
): Promise<StaffLedgerEntryRecord> {
  return apiRequest<StaffLedgerEntryRecord>(
    `${API_ROUTES.commissions}/staff/${encodeURIComponent(staffProfileId)}/adjustments`,
    { method: "POST", body, idempotencyKey, toast: false },
  );
}

export async function reverseStaffPayout(entryId: string): Promise<StaffLedgerEntryRecord[]> {
  return apiRequest<StaffLedgerEntryRecord[]>(
    `${API_ROUTES.commissions}/payouts/${encodeURIComponent(entryId)}/reverse`,
    { method: "POST", toast: false },
  );
}

// ---------------------------------------------------------------- helpers

/** What a barber earns on one service at a given price, the way the server rounds it. */
export function previewCommission(
  price: number,
  type: CommissionType | null,
  rate: number | null,
): number {
  if (!type || rate == null || !(price > 0) || rate < 0) return 0;
  const raw = type === "PERCENT" ? (price * rate) / 100 : rate;
  // Whole shillings, half up, never more than the price.
  return Math.min(Math.floor(raw + 0.5), Math.floor(price));
}

/** Today in Nairobi as YYYY-MM-DD — statement periods are Nairobi days. */
export function nairobiToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

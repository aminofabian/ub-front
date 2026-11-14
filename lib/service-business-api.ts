"use client";

import { ApiRequestError, apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";
import { withSetup } from "@/lib/setup-requirements";

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
  /** What the product for one service costs the shop, in shillings; null when it uses none. */
  productCost?: number | null;
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
  /** Whole shillings; 0 clears it. */
  productCost?: number;
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

/** How many chairs (stations, rooms) a branch has. They are numbered 1..count. */
export async function fetchStationCount(branchId: string): Promise<number> {
  const params = new URLSearchParams({ branchId });
  const res = await apiRequest<{ count: number }>(`${API_ROUTES.serviceStations}?${params.toString()}`);
  return res.count ?? 0;
}

export async function setStationCount(branchId: string, count: number): Promise<number> {
  const res = await apiRequest<{ count: number }>(API_ROUTES.serviceStations, {
    method: "PUT",
    body: { branchId, count },
  });
  return res.count ?? 0;
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

/**
 * Marks the signed-in user as someone who serves customers, creating their staff profile if they
 * have none. For an owner who works alone.
 */
export async function markSelfAsServingCustomers(userId: string): Promise<void> {
  const profile = await apiRequest<{ id: string }>(
    `${API_ROUTES.staff}/${encodeURIComponent(userId)}/profile`,
  );
  await updateStaffProfileById(profile.id, { bookable: true });
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
  /** Whether this person has a login and can see their own earnings. */
  canSignIn?: boolean;
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

/**
 * What the shop's service commission is worked out on: the whole price (`GROSS`), or the price
 * after the service's product cost (`NET_OF_PRODUCT`).
 */
export type ServicePayModel = "GROSS" | "NET_OF_PRODUCT";

/** The shop's pay model; the whole price when it cannot be read. */
export async function fetchPayModel(): Promise<ServicePayModel> {
  try {
    const res = await apiRequest<{ model: ServicePayModel }>(`${API_ROUTES.commissions}/pay-model`, { toast: false });
    return res.model === "NET_OF_PRODUCT" ? "NET_OF_PRODUCT" : "GROSS";
  } catch {
    return "GROSS";
  }
}

export async function setPayModel(model: ServicePayModel): Promise<ServicePayModel> {
  const res = await apiRequest<{ model: ServicePayModel }>(`${API_ROUTES.commissions}/pay-model`, {
    method: "PUT",
    body: { model },
    toast: false,
  });
  return res.model;
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

// ---------------------------------------------------------------- tickets

export type ServiceTicketStage =
  | "BOOKED"
  | "WAITING"
  | "IN_SERVICE"
  | "READY_TO_PAY"
  | "ABANDONED"
  | "NO_SHOW"
  | "REDO_DONE";

export type FloorStatus = "AVAILABLE" | "ON_BREAK" | "OFF";
export type DepositState = "HELD" | "APPLIED" | "CREDITED" | "FORFEITED";

export type ServiceTicketRecord = {
  id: string;
  branchId: string;
  ticketNumber: number;
  stage: ServiceTicketStage;
  status: "pending" | "completed" | "cancelled";
  stationNo: number | null;
  staffProfileId: string | null;
  staffName: string | null;
  customerId?: string | null;
  total: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  saleId: string | null;
  lines: {
    id: string;
    serviceId: string;
    name: string;
    unitPrice: number;
    lineTotal: number;
    /** Staff sharing this service with the person serving, each with their share in percent. */
    helpers?: { staffProfileId: string; sharePercent: number; amount?: number | null }[];
    /** What the person leading it is paid for this service when set at the till; null means by their plan. */
    performerAmount?: number | null;
    /** Who is doing, or did, this service; null until someone is chosen. */
    performerStaffProfileId?: string | null;
    performerName?: string | null;
    /** The chair, bed or room it uses; optional. */
    resourceId?: string | null;
    resourceName?: string | null;
    stage?: "WAITING" | "IN_SERVICE" | "DONE";
    startedAt?: string | null;
    finishedAt?: string | null;
    plannedMinutes?: number;
  }[];
  /** Bookings: when the customer is expected. Null for a walk-in. */
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  bookingName?: string | null;
  bookingPhone?: string | null;
  /** Above zero is served sooner; below zero was skipped to the back. */
  priority?: number;
  /** Rough minutes until a waiting customer is likely to start; null when it cannot be estimated. */
  estimatedWaitMinutes?: number | null;
  depositAmount?: number | null;
  depositState?: DepositState | null;
  /** Set on a free redo: the sale being put right. */
  redoOfSaleId?: string | null;
  sendReminder?: boolean;
  redeemedPackageId?: string | null;
  /** Products the customer is buying on this visit, paid for with the services. */
  products?: { id: string; itemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

export type FloorStaffRecord = { staffProfileId: string; displayName: string; floorStatus: FloorStatus };

/**
 * The team split by who can take a customer right now. Someone on a break or off for the day is
 * not offered when a customer is being added or seated: the cashier would be promising a person
 * who is not at their chair. Someone with no status recorded counts as here.
 */
export function teamByPresence<P extends { staffProfileId: string; displayName: string }>(
  team: readonly P[],
  statuses: Readonly<Record<string, FloorStatus>> | null | undefined,
): { here: P[]; onBreak: P[]; off: P[] } {
  const here: P[] = [];
  const onBreak: P[] = [];
  const off: P[] = [];
  for (const person of team) {
    const status = statuses?.[person.staffProfileId] ?? "AVAILABLE";
    (status === "ON_BREAK" ? onBreak : status === "OFF" ? off : here).push(person);
  }
  return { here, onBreak, off };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Someone";
const listNames = (people: readonly { displayName: string }[]) => {
  const names = people.map((p) => firstName(p.displayName));
  return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/** "Lenah is on a break. Mike and Peter are off today." Empty when everyone is here. */
export function awaySentence(
  onBreak: readonly { displayName: string }[],
  off: readonly { displayName: string }[],
): string {
  const parts: string[] = [];
  if (onBreak.length > 0) parts.push(`${listNames(onBreak)} ${onBreak.length === 1 ? "is" : "are"} on a break.`);
  if (off.length > 0) parts.push(`${listNames(off)} ${off.length === 1 ? "is" : "are"} off today.`);
  return parts.join(" ");
}

export type ServiceBoard = {
  branchId: string;
  /** Chairs at the branch, numbered 1..stationCount. */
  stationCount: number;
  tickets: ServiceTicketRecord[];
  /** Staff who serve customers, with whether each can take the next one. */
  staff?: FloorStaffRecord[];
};

const ticketPath = (id: string, action?: string) =>
  `${API_ROUTES.serviceTickets}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`;

export async function fetchServiceBoard(branchId: string): Promise<ServiceBoard> {
  const params = new URLSearchParams({ branchId });
  return apiRequest<ServiceBoard>(`${API_ROUTES.serviceTickets}?${params.toString()}`, { toast: false });
}

/** `clientTicketId` is made once per new customer and reused on retry, so a retry opens no second ticket. */
export async function createServiceTicket(body: {
  branchId: string;
  clientTicketId: string;
  customerId?: string | null;
  requestedStaffProfileId?: string | null;
  lines: { serviceId: string; unitPrice?: number }[];
  /** A free redo of the work on this sale. */
  redoOfSaleId?: string | null;
}): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(API_ROUTES.serviceTickets, { method: "POST", body, toast: false });
}

export async function startServiceTicket(
  id: string,
  body: { performerStaffProfileId: string; stationNo: number },
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "start"), { method: "POST", body, toast: false });
}

export async function finishServiceTicket(id: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "done"), { method: "POST", body: {}, toast: false });
}

export async function reopenServiceTicket(id: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "reopen"), { method: "POST", body: {}, toast: false });
}

export async function addServiceTicketLine(
  id: string,
  body: { serviceId: string; unitPrice?: number },
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "lines"), { method: "POST", body, toast: false });
}

export async function cancelServiceTicket(
  id: string,
  body: { reason?: string; abandoned?: boolean },
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "cancel"), { method: "POST", body, toast: false });
}

/** `idempotencyKey` is made once per ticket payment and reused on retry; a ticket is never rung twice. */
export async function payServiceTicket(
  id: string,
  body: {
    /** May be empty when a deposit or a prepaid session covers the whole ticket. */
    payments: { method: "cash" | "mpesa_manual"; amount: number; reference?: string }[];
    /** Use one session of this prepaid package toward the ticket. */
    packageId?: string;
    tips?: { staffProfileId: string; amount: number }[];
    cashReceived?: number;
    clientSoldAt?: string;
  },
  idempotencyKey: string,
): Promise<{ ticket: ServiceTicketRecord; sale: { id: string; receiptNo?: number | null } }> {
  // A till with no shift open, or not registered yet, gets the dialog that fixes it; then this runs again.
  return withSetup(() => apiRequest(ticketPath(id, "pay"), { method: "POST", body, idempotencyKey, toast: false }));
}

/** Moves a waiting customer up the queue (above zero) or to the back (below zero). */
export async function setServiceTicketPriority(id: string, priority: number): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "priority"), { method: "POST", body: { priority }, toast: false });
}

export async function setStaffFloorStatus(staffProfileId: string, status: FloorStatus): Promise<FloorStaffRecord> {
  return apiRequest<FloorStaffRecord>(
    `${API_ROUTES.serviceTickets}/staff/${encodeURIComponent(staffProfileId)}/floor-status`,
    { method: "POST", body: { status }, toast: false },
  );
}

/**
 * One helper on a service and how they are paid: by a role the owner set beforehand (`roleId`),
 * by an amount typed at the till (needs permission to set commission, unless it is the amount
 * already agreed for them), or by their own plan on a share of the service.
 */
export type ServiceLineHelperInput = {
  staffProfileId: string;
  roleId?: string;
  amount?: number;
  sharePercent?: number;
};

/**
 * Everyone who shared one service with the person serving. Leave `sharePercent` out for an equal
 * split; an empty list means they did it alone.
 */
export async function setServiceLineHelpers(
  ticketId: string,
  lineId: string,
  helpers: ServiceLineHelperInput[],
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(ticketId, `lines/${encodeURIComponent(lineId)}/helpers`), {
    method: "POST",
    body: { helpers },
    toast: false,
  });
}

export type TeamMemberInput = { staffProfileId: string; amount?: number | null };

/**
 * Everyone working on one service, in one go: the first leads, the rest help and share it
 * equally. An amount is what that person is paid for this service instead of their plan; sending
 * one needs permission to set commission.
 */
export async function setServiceLineTeam(
  ticketId: string,
  lineId: string,
  members: TeamMemberInput[],
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(ticketId, `lines/${encodeURIComponent(lineId)}/team`), {
    method: "POST",
    body: {
      members: members.map((m) => (m.amount != null ? { staffProfileId: m.staffProfileId, amount: m.amount } : { staffProfileId: m.staffProfileId })),
    },
    toast: false,
  });
}

/** The people on one service, lead first, with any amount set for each. */
export function lineTeam(line: ServiceTicketRecord["lines"][number]): TeamMemberInput[] {
  if (!line.performerStaffProfileId) return [];
  return [
    { staffProfileId: line.performerStaffProfileId, amount: line.performerAmount ?? null },
    ...(line.helpers ?? []).map((h) => ({ staffProfileId: h.staffProfileId, amount: h.amount ?? null })),
  ];
}

/**
 * The team after a tap on one person: added at the end if they were not on it, taken off if they
 * were. The last person cannot be taken off (a service is always somebody's), and amounts already
 * set for the others are kept.
 */
export function toggleTeamMember(team: readonly TeamMemberInput[], staffProfileId: string): TeamMemberInput[] {
  const on = team.some((m) => m.staffProfileId === staffProfileId);
  if (!on) return [...team, { staffProfileId, amount: null }];
  if (team.length === 1) return [...team];
  return team.filter((m) => m.staffProfileId !== staffProfileId);
}

// ------------------------------------------------------------ helper roles

/** A usual helper on a service and what they are paid for it, set once by the owner. */
export type HelperRole = {
  id: string;
  name: string;
  /** `PERCENT` of what the person leading earns on the service, or a set `AMOUNT` in whole shillings. */
  payKind: "PERCENT" | "AMOUNT";
  payValue: number;
};

export type HelperRoleInput = Pick<HelperRole, "name" | "payKind" | "payValue">;

/** The shop's helper roles. An empty list when there are none, or when they cannot be read. */
export async function fetchHelperRoles(): Promise<HelperRole[]> {
  try {
    const res = await apiRequest<{ roles: HelperRole[] }>(API_ROUTES.serviceHelperRoles, { toast: false });
    return res.roles ?? [];
  } catch {
    return [];
  }
}

export async function createHelperRole(body: HelperRoleInput): Promise<HelperRole> {
  return apiRequest<HelperRole>(API_ROUTES.serviceHelperRoles, { method: "POST", body, toast: false });
}

export async function updateHelperRole(id: string, body: HelperRoleInput): Promise<HelperRole> {
  return apiRequest<HelperRole>(`${API_ROUTES.serviceHelperRoles}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    toast: false,
  });
}

export async function deleteHelperRole(id: string): Promise<void> {
  await apiRequest<void>(`${API_ROUTES.serviceHelperRoles}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    toast: false,
  });
}

/**
 * What a role pays on a service where the person leading earns `leadEarns`, in whole shillings,
 * the way the server works it out: a set amount as it is, a percentage of the lead's part rounded
 * down. Either way it is paid out of the lead's part, never the shop's.
 */
export function helperRolePay(role: Pick<HelperRole, "payKind" | "payValue">, leadEarns: number): number {
  if (role.payKind === "AMOUNT") return Math.floor(role.payValue + 0.5);
  return leadEarns > 0 ? Math.floor((leadEarns * role.payValue) / 100) : 0;
}

/**
 * Who else worked on a ticket and what each gets, for one line of text: "Lenah Ksh 50, Peter 25%".
 * A set amount shows in shillings; otherwise the share they earn on by their plan. Someone on
 * two services of the ticket is named once per service. Empty when nobody helped.
 */
export function helpersSummary(
  ticket: Pick<ServiceTicketRecord, "lines">,
  names: ReadonlyMap<string, string>,
): string {
  const parts: string[] = [];
  for (const line of ticket.lines) {
    for (const helper of line.helpers ?? []) {
      const name = (names.get(helper.staffProfileId) ?? "Staff").split(/\s+/)[0];
      const pay =
        helper.amount != null
          ? `Ksh ${Math.round(helper.amount).toLocaleString("en-KE")}`
          : `${Math.round(helper.sharePercent * 100) / 100}%`;
      parts.push(`${name} ${pay}`);
    }
  }
  return parts.join(", ");
}

/** An equal split between the person serving and `helperCount` others, the way the server rounds it. */
export function equalSharePercent(helperCount: number): number {
  return helperCount <= 0 ? 0 : Math.floor(10000 / (helperCount + 1)) / 100;
}

// ----------------------------------------------------------- appointments

export async function fetchAppointments(branchId: string, fromIso: string, toIso: string): Promise<ServiceTicketRecord[]> {
  const params = new URLSearchParams({ branchId, from: fromIso, to: toIso });
  return apiRequest<ServiceTicketRecord[]>(`${API_ROUTES.serviceTickets}/appointments?${params.toString()}`, { toast: false });
}

/** `clientTicketId` is made once per booking and reused on retry, so a retry books nobody twice. */
export async function bookAppointment(body: {
  branchId: string;
  clientTicketId: string;
  staffProfileId: string;
  start: string;
  lines: { serviceId: string; unitPrice?: number }[];
  customerId?: string | null;
  name: string;
  phone?: string | null;
  sendReminder?: boolean;
  /** The chair, bed or room to hold for the booking; optional. */
  resourceId?: string | null;
}): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(`${API_ROUTES.serviceTickets}/appointments`, { method: "POST", body, toast: false });
}

export async function rescheduleAppointment(
  id: string,
  body: { start: string; staffProfileId?: string | null },
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "reschedule"), { method: "POST", body, toast: false });
}

export async function markAppointmentArrived(id: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "arrive"), { method: "POST", body: {}, toast: false });
}

/** A held deposit is kept by the shop unless `keepDepositAsCredit` hands it back as credit. */
export async function markAppointmentNoShow(id: string, keepDepositAsCredit = false): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id, "no-show"), {
    method: "POST",
    body: { keepDepositAsCredit },
    toast: false,
  });
}

/** Money taken in advance. Cash goes into the open shift's drawer. The ticket must name a customer. */
export async function takeTicketDeposit(
  id: string,
  body: { amount: number; method: "cash" | "mpesa_manual"; reference?: string },
): Promise<ServiceTicketRecord> {
  // A till with no shift open, or not registered yet, gets the dialog that fixes it; then this runs again.
  return withSetup(() => apiRequest<ServiceTicketRecord>(ticketPath(id, "deposit"), { method: "POST", body, toast: false }));
}

// ------------------------------------------------------- online booking hours

export const BOOKING_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type BookingDayKey = (typeof BOOKING_DAY_KEYS)[number];
export type BookingHours = {
  branchId: string;
  online: boolean;
  days: Partial<Record<BookingDayKey, { open: string; close: string }>>;
};

export async function fetchBookingHours(branchId: string): Promise<BookingHours> {
  const params = new URLSearchParams({ branchId });
  return apiRequest<BookingHours>(`${API_ROUTES.serviceBookingHours}?${params.toString()}`, { toast: false });
}

/** No days switches online booking off for the branch. */
export async function setBookingHours(branchId: string, days: BookingHours["days"]): Promise<BookingHours> {
  return apiRequest<BookingHours>(API_ROUTES.serviceBookingHours, { method: "PUT", body: { branchId, days }, toast: false });
}

// ----------------------------------------------------------------- packages

export type PackageOffer = {
  serviceId: string;
  serviceName: string;
  singlePrice: number;
  sessions: number;
  price: number;
  validDays: number | null;
};

export type CustomerPackage = {
  id: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  pricePaid: number;
  valueRemaining: number;
  expiresAt: string | null;
  expired: boolean;
  soldAt: string;
};

export async function fetchPackageOffers(): Promise<PackageOffer[]> {
  return apiRequest<PackageOffer[]>(`${API_ROUTES.servicePackages}/offers`, { toast: false });
}

/** `sessions: null` removes the offer. Packages already sold are not affected. */
export async function setPackageOffer(
  serviceId: string,
  body: { sessions: number | null; price?: number; validDays?: number | null },
): Promise<PackageOffer | null> {
  return apiRequest<PackageOffer | null>(`${API_ROUTES.servicePackages}/offers/${encodeURIComponent(serviceId)}`, {
    method: "PUT",
    body,
    toast: false,
  });
}

/** `idempotencyKey` is made once per sale and reused on retry; a package is never sold twice. */
export async function sellPackage(
  body: { branchId: string; customerId: string; serviceId: string; method: "cash" | "mpesa_manual"; reference?: string },
  idempotencyKey: string,
): Promise<CustomerPackage> {
  // A till with no shift open, or not registered yet, gets the dialog that fixes it; then this runs again.
  return withSetup(() =>
    apiRequest<CustomerPackage>(`${API_ROUTES.servicePackages}/sell`, {
      method: "POST",
      body,
      idempotencyKey,
      toast: false,
    }),
  );
}

export async function fetchCustomerPackages(customerId: string): Promise<CustomerPackage[]> {
  const params = new URLSearchParams({ customerId });
  return apiRequest<CustomerPackage[]>(`${API_ROUTES.servicePackages}?${params.toString()}`, { toast: false });
}

/** What one session of a package is worth toward a visit, the way the server works it out. */
export function packageSessionValue(pkg: CustomerPackage): number {
  if (pkg.sessionsRemaining <= 0) return 0;
  if (pkg.sessionsRemaining === 1) return pkg.valueRemaining;
  return Math.floor((pkg.pricePaid / pkg.sessionsTotal) * 100) / 100;
}

// ------------------------------------------------- one visit, service by service

export type ServiceVisitLine = ServiceTicketRecord["lines"][number];

const linePath = (ticketId: string, lineId: string, action?: string) =>
  ticketPath(ticketId, `lines/${encodeURIComponent(lineId)}${action ? `/${action}` : ""}`);

export async function fetchServiceTicket(id: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(id), { toast: false });
}

/** Who does one service and where, without starting it. A blank `resourceId` clears the place. */
export async function assignServiceLine(
  ticketId: string,
  lineId: string,
  body: { performerStaffProfileId?: string; resourceId?: string },
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(linePath(ticketId, lineId, "assign"), { method: "POST", body, toast: false });
}

/** Starts one service. Refused (409) when its person or its chair, bed or room is busy. */
export async function startServiceLine(
  ticketId: string,
  lineId: string,
  body: { performerStaffProfileId?: string; resourceId?: string } = {},
): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(linePath(ticketId, lineId, "start"), { method: "POST", body, toast: false });
}

export async function finishServiceLine(ticketId: string, lineId: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(linePath(ticketId, lineId, "done"), { method: "POST", body: {}, toast: false });
}

/** Only a service that has not started can be removed, and a visit keeps at least one. */
export async function removeServiceLine(ticketId: string, lineId: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(linePath(ticketId, lineId), { method: "DELETE", toast: false });
}

/** Adds a product to a visit at today's shelf price; the same product again adds to its quantity. */
export async function addVisitProduct(ticketId: string, itemId: string, quantity = 1): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(ticketId, "products"), {
    method: "POST",
    body: { itemId, quantity },
    toast: false,
  });
}

export async function removeVisitProduct(ticketId: string, productLineId: string): Promise<ServiceTicketRecord> {
  return apiRequest<ServiceTicketRecord>(ticketPath(ticketId, `products/${encodeURIComponent(productLineId)}`), {
    method: "DELETE",
    toast: false,
  });
}

/** What the services of a visit come to, without the products bought on it. */
export function visitServiceTotal(ticket: Pick<ServiceTicketRecord, "lines">): number {
  return Math.round(ticket.lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
}

export type VisitEarnings = {
  ticketId: string;
  serviceTotal: number;
  commissionTotal: number;
  shopShare: number;
  lines: {
    lineId: string;
    name: string;
    price: number;
    shares: { staffProfileId: string; staffName: string; commission: number; rule: string }[];
    shopShare: number;
  }[];
  staff: { staffProfileId: string; staffName: string; commission: number }[];
};

/** What the visit would pay out if paid now. Null when this user may not see staff earnings. */
export async function fetchVisitEarnings(ticketId: string): Promise<VisitEarnings | null> {
  try {
    return await apiRequest<VisitEarnings>(ticketPath(ticketId, "earnings"), { toast: false });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 403) return null;
    throw err;
  }
}

// ---------------------------------------------------------------- resources

export const RESOURCE_TYPES = [
  { id: "CHAIR", label: "Chair" },
  { id: "STATION", label: "Station" },
  { id: "BED", label: "Bed" },
  { id: "ROOM", label: "Room" },
  { id: "EQUIPMENT", label: "Equipment" },
] as const;
export type ResourceTypeId = (typeof RESOURCE_TYPES)[number]["id"];

export type ServiceResourceRecord = {
  id: string;
  branchId: string;
  name: string;
  resourceType: string;
  stationNo: number | null;
  active: boolean;
  cleanupMinutes: number;
  blockedUntil: string | null;
  blockedReason: string | null;
  /** The visit using it now, if any. */
  busyTicketId: string | null;
  /** Free again at this moment (being prepared, or out of use); null when free now or busy. */
  freeAt: string | null;
};

export async function fetchServiceResources(branchId: string): Promise<ServiceResourceRecord[]> {
  const params = new URLSearchParams({ branchId });
  const out = await apiRequest<{ resources: ServiceResourceRecord[] }>(
    `${API_ROUTES.serviceResources}?${params.toString()}`,
    { toast: false },
  );
  return out.resources;
}

export async function createServiceResource(body: {
  branchId: string;
  name: string;
  resourceType: string;
  cleanupMinutes?: number;
}): Promise<ServiceResourceRecord> {
  return apiRequest<ServiceResourceRecord>(API_ROUTES.serviceResources, { method: "POST", body, toast: false });
}

export async function updateServiceResource(
  id: string,
  body: {
    name?: string;
    resourceType?: string;
    active?: boolean;
    cleanupMinutes?: number;
    blockedUntil?: string;
    blockedReason?: string;
    clearBlock?: boolean;
  },
): Promise<ServiceResourceRecord> {
  return apiRequest<ServiceResourceRecord>(`${API_ROUTES.serviceResources}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    toast: false,
  });
}

/** Whether a resource can take a service right now. */
export function resourceIsFree(resource: ServiceResourceRecord, now: Date = new Date()): boolean {
  if (!resource.active || resource.busyTicketId) return false;
  return !resource.freeAt || new Date(resource.freeAt).getTime() <= now.getTime();
}

// --------------------------------------------------------------------- team

export type TeamMember = {
  staffProfileId: string;
  displayName: string;
  userId: string | null;
  email: string | null;
  canSignIn: boolean;
};

/**
 * Adds someone who serves customers. With an email and a PIN they can sign in and see their own
 * earnings; with neither they are a name on the team.
 */
export async function addTeamMember(body: {
  displayName: string;
  email?: string;
  pin?: string;
  phone?: string;
  branchId?: string | null;
}): Promise<TeamMember> {
  return apiRequest<TeamMember>(API_ROUTES.serviceTeam, { method: "POST", body, toast: false });
}

/** A sign-in that was made for a team member and sent to them. */
export type SentSignIn = {
  staffProfileId: string;
  displayName: string;
  email: string;
  /** Shown once, so it can be read out if neither message arrives. */
  pin: string;
  emailSent: boolean;
  smsSent: boolean;
  /** The number the text went to, masked; null when they have no usable number. */
  phoneMasked: string | null;
};

/**
 * Makes a team member's PIN and sends it to them by email and, with a mobile number, by text.
 * Their email is needed the first time. For someone who can already sign in it makes a new PIN.
 */
export async function sendTeamSignIn(
  staffProfileId: string,
  body: { email?: string; phone?: string; branchId?: string | null },
): Promise<SentSignIn> {
  return apiRequest<SentSignIn>(`${API_ROUTES.serviceTeam}/${encodeURIComponent(staffProfileId)}/send-sign-in`, {
    method: "POST",
    body: {
      ...(body.email ? { email: body.email } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.branchId ? { branchId: body.branchId } : {}),
    },
    toast: false,
  });
}

/** How a sign-in reached someone, in one plain sentence for the owner. */
export function signInSentSentence(sent: Pick<SentSignIn, "displayName" | "email" | "emailSent" | "smsSent" | "phoneMasked">): string {
  const first = sent.displayName.trim().split(/\s+/)[0] || "them";
  if (sent.smsSent && sent.emailSent) return `Texted to ${sent.phoneMasked} and emailed to ${sent.email}.`;
  if (sent.emailSent) {
    return sent.phoneMasked
      ? `Emailed to ${sent.email}. The text to ${sent.phoneMasked} did not go, so tell ${first} the PIN too.`
      : `Emailed to ${sent.email}. No mobile number, so no text was sent.`;
  }
  if (sent.smsSent) return `Texted to ${sent.phoneMasked}. The email did not go.`;
  return `Neither message went out. Tell ${first} the PIN yourself.`;
}

/** A Kenyan mobile number as people type it: 0712 345 678, 0110 123 456, +254 712 345 678. */
export function looksLikeKenyanMobile(text: string): boolean {
  return /^(?:\+?254|0)[17]\d{8}$/.test(text.replace(/[\s-]/g, ""));
}

/** Gives a sign-in to someone who was added by name only. What they earned stays theirs. */
export async function giveTeamMemberLogin(
  staffProfileId: string,
  body: { email: string; pin: string; branchId?: string | null },
): Promise<TeamMember> {
  return apiRequest<TeamMember>(`${API_ROUTES.serviceTeam}/${encodeURIComponent(staffProfileId)}/login`, {
    method: "POST",
    body,
    toast: false,
  });
}

export type MyEarnings = {
  staffProfileId: string;
  displayName: string;
  commissionType: CommissionType | null;
  commissionRate: number | null;
  owed: number;
  servicesToday: number;
  commissionToday: number;
  tipsToday: number;
  paidToday: number;
  entries: StaffLedgerEntryRecord[];
  bookingsToday: { ticketId: string; start: string; end: string; customerName: string; services: string }[];
};

/** The signed-in person's own earnings and bookings. Null when they do not serve customers. */
export async function fetchMyEarnings(): Promise<MyEarnings | null> {
  try {
    return await apiRequest<MyEarnings>(`${API_ROUTES.serviceTeam}/me`, { toast: false });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

/** A PIN a person can sign in with: 4 to 6 digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// ------------------------------------------------------------ products used

export type ServiceConsumables = {
  serviceId: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    /** Cost of one unit at the latest delivery; null when the product has never been received. */
    unitCost: number | null;
    cost: number | null;
  }[];
  costPerVisit: number;
};

const consumablesPath = (serviceId: string) => `${API_ROUTES.services}/${encodeURIComponent(serviceId)}/consumables`;

export async function fetchServiceConsumables(serviceId: string): Promise<ServiceConsumables> {
  return apiRequest<ServiceConsumables>(consumablesPath(serviceId), { toast: false });
}

/** Replaces the list; an empty list clears it. This records cost only and does not move stock. */
export async function setServiceConsumables(
  serviceId: string,
  items: { itemId: string; quantity: number }[],
): Promise<ServiceConsumables> {
  return apiRequest<ServiceConsumables>(consumablesPath(serviceId), { method: "PUT", body: { items }, toast: false });
}

// ------------------------------------------------------------------ reports

export type ServiceReport = {
  from: string;
  to: string;
  branchId: string | null;
  services: {
    serviceId: string;
    name: string;
    timesDone: number;
    revenue: number;
    commission: number;
    productCost: number;
    contribution: number;
    minutes: number;
  }[];
  staff: {
    staffProfileId: string;
    displayName: string;
    servicesDone: number;
    revenue: number;
    commission: number;
    tips: number;
    minutes: number;
    redos: number;
  }[];
  revenue: number;
  commission: number;
  productCost: number;
  contribution: number;
};

/**
 * Gives an account to every team member who was added by name only, so they show in Users and
 * Payroll. Safe to call again; `skipped` names anyone the plan's user limit kept out.
 */
export async function syncTeamAccounts(): Promise<{ created: number; skipped: string[] }> {
  return apiRequest(`${API_ROUTES.serviceTeam}/sync-accounts`, { method: "POST", body: {}, toast: false });
}

export type ChairReport = {
  from: string;
  to: string;
  branchId: string;
  chairs: {
    resourceId: string;
    name: string;
    resourceType: string;
    active: boolean;
    servicesDone: number;
    customers: number;
    revenue: number;
    minutes: number;
  }[];
  revenue: number;
  /** Paid services with no chair, bed or room recorded. */
  unplacedRevenue: number;
  unplacedServices: number;
};

/** What each chair, bed or room at a branch brought in over a period (paid visits only). */
export async function fetchChairReport(from: string, to: string, branchId: string): Promise<ChairReport> {
  const params = new URLSearchParams({ from, to, branchId });
  return apiRequest<ChairReport>(`${API_ROUTES.commissions}/reports/chairs?${params.toString()}`, { toast: false });
}

/**
 * How long each chair's bar is: its takings as a share of the best chair's, so the eye can rank
 * them. A chair that earned something always shows a sliver; one that earned nothing shows none.
 */
export function chairBarPercent(revenue: number, best: number): number {
  if (!(revenue > 0) || !(best > 0)) return 0;
  return Math.max(4, Math.min(100, Math.round((revenue / best) * 100)));
}

export async function fetchServiceReport(from: string, to: string, branchId?: string | null): Promise<ServiceReport> {
  const params = new URLSearchParams({ from, to });
  if (branchId) params.set("branchId", branchId);
  return apiRequest<ServiceReport>(`${API_ROUTES.commissions}/reports/services?${params.toString()}`, { toast: false });
}

/** Texts a staff member what they earned today and what they are owed. Uses the shop's SMS credits. */
export async function sendEarningsSms(
  staffProfileId: string,
): Promise<{ sent: boolean; phoneMasked: string; message: string }> {
  return apiRequest(`${API_ROUTES.commissions}/staff/${encodeURIComponent(staffProfileId)}/earnings-sms`, {
    method: "POST",
    body: {},
    toast: false,
  });
}

/** What the customer still hands over once a held deposit and a prepaid session are taken off. */
export function amountStillDue(total: number, tip: number, deposit: number, sessionValue: number): number {
  const covered = Math.min(Math.max(0, deposit) + Math.max(0, sessionValue), total);
  return Math.max(0, Math.round((total - covered + Math.max(0, tip)) * 100) / 100);
}

/** Minutes a customer has been waiting or in the chair, for the board. */
export function minutesSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 60000));
}

/** Minutes as people say them at the counter: "12 min", "1 h 5 min", "6 h". */
export function waitLabel(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
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

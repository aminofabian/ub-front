/**
 * Pharmacy API client: medicines and their dispensing class, stock safety (quarantine, expiry,
 * recall by lot), dispensing at the till, the dispensing log and the pharmacy profile.
 * Requests go through the shared `apiRequest` (proxy, tenant headers, auth refresh).
 */
import { apiRequest } from "@/lib/api";

export type DispensingClass = "UNCLASSIFIED" | "OTC" | "PRESCRIPTION_ONLY" | "CONTROLLED";

export const DISPENSING_CLASSES: readonly DispensingClass[] = [
  "UNCLASSIFIED",
  "OTC",
  "PRESCRIPTION_ONLY",
  "CONTROLLED",
];

export const DISPENSING_CLASS_LABEL: Record<DispensingClass, string> = {
  UNCLASSIFIED: "Not classified",
  OTC: "Over the counter",
  PRESCRIPTION_ONLY: "Prescription only",
  CONTROLLED: "Controlled",
};

export const DISPENSING_CLASS_HINT: Record<DispensingClass, string> = {
  UNCLASSIFIED: "Cannot be sold until a class is set.",
  OTC: "Sells like any other product.",
  PRESCRIPTION_ONLY: "Needs a dispensing record at the till. Not sold online.",
  CONTROLLED: "Blocked at the till unless you switch controlled sales on. Not sold online.",
};

export type MedicineRecord = {
  itemId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  itemTypeId: string | null;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  manufacturer: string | null;
  registrationNo: string | null;
  storageNote: string | null;
  dispensingClass: DispensingClass;
  restockOnRefund: boolean;
  classSetAt: string | null;
  /** Class the platform catalogue suggested on adoption; only meaningful while unclassified. */
  suggestedClass?: DispensingClass | null;
};

export type MedicinePage = {
  items: MedicineRecord[];
  total: number;
  page: number;
  size: number;
};

export type MedicineClassCounts = {
  total: number;
  unclassified: number;
  otc: number;
  prescriptionOnly: number;
  controlled: number;
};

export type MedicineDetailsInput = {
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  packSize?: string | null;
  manufacturer?: string | null;
  registrationNo?: string | null;
  storageNote?: string | null;
  dispensingClass?: DispensingClass | null;
  restockOnRefund?: boolean | null;
};

export function fetchMedicines(opts: {
  dispensingClass?: DispensingClass | null;
  q?: string;
  page?: number;
  size?: number;
}): Promise<MedicinePage> {
  const params = new URLSearchParams();
  if (opts.dispensingClass) params.set("dispensingClass", opts.dispensingClass);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 50));
  return apiRequest(`/api/v1/pharmacy/medicines?${params}`);
}

export function fetchMedicineCounts(): Promise<MedicineClassCounts> {
  return apiRequest("/api/v1/pharmacy/medicines/counts");
}

/** The medicine row for an item, or null when the item is not marked as a medicine. */
export async function fetchMedicineForItem(itemId: string): Promise<MedicineRecord | null> {
  try {
    return await apiRequest<MedicineRecord>(
      `/api/v1/pharmacy/medicines/${encodeURIComponent(itemId)}`,
      { toast: false },
    );
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}

export function saveMedicine(itemId: string, body: MedicineDetailsInput): Promise<MedicineRecord> {
  return apiRequest(`/api/v1/pharmacy/medicines/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    body,
  });
}

export function unmarkMedicine(itemId: string): Promise<void> {
  return apiRequest(`/api/v1/pharmacy/medicines/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

export function classifyMedicines(
  itemIds: string[],
  dispensingClass: DispensingClass,
): Promise<{ changed: number; skipped: number }> {
  return apiRequest("/api/v1/pharmacy/medicines/classify", {
    method: "POST",
    body: { itemIds, dispensingClass },
  });
}

/** Accepts the catalogue's suggested class for these unclassified medicines. */
export function confirmSuggestedClasses(itemIds: string[]): Promise<{ changed: number; skipped: number }> {
  return apiRequest("/api/v1/pharmacy/medicines/confirm-suggested", {
    method: "POST",
    body: { itemIds },
  });
}

export function markMedicines(body: {
  itemIds?: string[];
  itemTypeId?: string;
  dispensingClass?: DispensingClass;
}): Promise<{ changed: number; skipped: number }> {
  return apiRequest("/api/v1/pharmacy/medicines/mark", { method: "POST", body });
}

// ── Stock safety ──────────────────────────────────────────────────────

export type BatchSafetyView = "quarantined" | "expired" | "short_dated" | "missing_details";

export type BatchSafetyRow = {
  batchId: string;
  itemId: string;
  itemName: string;
  sku: string | null;
  branchId: string;
  branchName: string | null;
  batchNumber: string;
  lotNumber: string | null;
  expiryDate: string | null;
  quantityRemaining: number;
  unitCost: number | null;
  status: string;
  quarantineReason: string | null;
  quarantinedAt: string | null;
  receivedAt: string | null;
  medicine: boolean;
};

export type BatchSafetyList = { view: BatchSafetyView; rows: BatchSafetyRow[]; total: number };

export type BatchSafetyCounts = {
  quarantined: number;
  expired: number;
  shortDated: number;
  shortDatedDays: number;
  medicineMissingDetails: number;
};

export function fetchBatchSafety(opts: {
  view: BatchSafetyView;
  branchId?: string | null;
  days?: number;
}): Promise<BatchSafetyList> {
  const params = new URLSearchParams({ view: opts.view });
  if (opts.branchId) params.set("branchId", opts.branchId);
  if (opts.days) params.set("days", String(opts.days));
  return apiRequest(`/api/v1/inventory/batch-safety?${params}`);
}

export function quarantineBatch(batchId: string, reason: string): Promise<{ batchId: string; status: string }> {
  return apiRequest(`/api/v1/inventory/batch-safety/batches/${encodeURIComponent(batchId)}/quarantine`, {
    method: "POST",
    body: { reason },
  });
}

export function releaseBatch(batchId: string, reason: string): Promise<{ batchId: string; status: string }> {
  return apiRequest(`/api/v1/inventory/batch-safety/batches/${encodeURIComponent(batchId)}/release`, {
    method: "POST",
    body: { reason },
  });
}

export type DisposalReason =
  | "EXPIRED"
  | "RECALLED"
  | "CUSTOMER_RETURN"
  | "BREAKAGE"
  | "QUARANTINE_DISPOSAL";

export const DISPOSAL_REASON_LABEL: Record<DisposalReason, string> = {
  EXPIRED: "Expired",
  RECALLED: "Recalled",
  CUSTOMER_RETURN: "Returned by a customer",
  BREAKAGE: "Damaged",
  QUARANTINE_DISPOSAL: "Other",
};

export function disposeBatch(
  batchId: string,
  body: {
    quantity?: number | null;
    wastageReason: DisposalReason;
    note?: string;
    /** What the screen showed as left; the server refuses when it no longer matches. */
    expectedRemaining?: number;
  },
): Promise<unknown> {
  return apiRequest(`/api/v1/inventory/batch-safety/batches/${encodeURIComponent(batchId)}/dispose`, {
    method: "POST",
    body,
  });
}

export function editBatchDetails(
  batchId: string,
  body: { lotNumber?: string | null; expiryDate?: string | null },
): Promise<{ batchId: string; status: string }> {
  return apiRequest(`/api/v1/inventory/batch-safety/batches/${encodeURIComponent(batchId)}`, {
    method: "PATCH",
    body,
  });
}

export type RecallReport = {
  lotNumber: string;
  batches: BatchSafetyRow[];
  quantityOnSale: number;
  quantityQuarantined: number;
  sales: Array<{
    saleId: string;
    receiptNo: number | null;
    saleStatus: string | null;
    soldAt: string | null;
    branchId: string | null;
    itemId: string | null;
    itemName: string | null;
    quantity: number;
    customerId: string | null;
    customerName: string | null;
  }>;
  onlineOrders: Array<{
    orderId: string;
    at: string | null;
    itemId: string | null;
    itemName: string | null;
    quantity: number;
    customerName: string | null;
    customerPhone: string | null;
  }>;
  truncated: boolean;
};

export function fetchRecall(lot: string, itemId?: string | null): Promise<RecallReport> {
  const params = new URLSearchParams({ lot: lot.trim() });
  if (itemId) params.set("itemId", itemId);
  return apiRequest(`/api/v1/inventory/batch-safety/recall?${params}`);
}

export function quarantineLot(body: {
  lotNumber: string;
  itemId?: string | null;
  reason: string;
}): Promise<{ quarantinedBatchIds: string[] }> {
  return apiRequest("/api/v1/inventory/batch-safety/recall/quarantine", { method: "POST", body });
}

// ── Dispensing ────────────────────────────────────────────────────────

export type DispensingStanding = "ok" | "needs_record" | "unclassified" | "controlled_blocked";

export type DispensingCheck = {
  lines: Array<{
    itemId: string;
    name: string;
    dispensingClass: DispensingClass;
    status: DispensingStanding;
  }>;
  needsRecord: boolean;
  blocked: boolean;
  userMayDispense: boolean;
};

export function checkDispensing(itemIds: string[]): Promise<DispensingCheck> {
  return apiRequest("/api/v1/pharmacy/dispensing/check", {
    method: "POST",
    body: { itemIds },
    toast: false,
  });
}

export type DispensingApprover = { userId: string; name: string; title: string | null; hasPin: boolean };

export function fetchDispensingApprovers(): Promise<DispensingApprover[]> {
  return apiRequest("/api/v1/pharmacy/dispensing/approvers", { toast: false });
}

export type DispensingApproval = {
  approvalId: string;
  approverUserId: string;
  approverName: string;
  expiresAt: string;
};

export function approveDispensing(body: {
  approverUserId: string;
  pin: string;
  /** The medicines being approved and how many of each; the sale may hold less, never more. */
  lines: { itemId: string; quantity: number }[];
}): Promise<DispensingApproval> {
  return apiRequest("/api/v1/pharmacy/dispensing/approvals", {
    method: "POST",
    body,
    toast: false,
  });
}

export type DispensingRecord = {
  id: string;
  saleId: string;
  receiptNo: number | null;
  branchId: string;
  createdAt: string;
  dispensedByUserId: string | null;
  dispensedByName: string | null;
  dispensedByTitle: string | null;
  dispensedByRegistrationNo: string | null;
  soldByName: string | null;
  approvedByPin: boolean;
  prescriberName: string;
  prescriberRegNo: string | null;
  prescriptionRef: string | null;
  prescriptionDate: string | null;
  patientName: string | null;
  patientPhone: string | null;
  voidedAt: string | null;
  lines: Array<{
    itemId: string;
    itemName: string;
    dispensingClass: DispensingClass;
    quantity: number;
    instructions: string | null;
    lotNumbers: string | null;
    id?: string;
    /** Set when the prescription asked for more than this line supplied. */
    quantityPrescribed?: number | null;
    refillDueOn?: string | null;
    settlesLineId?: string | null;
  }>;
  patientId?: string | null;
  /** Who did the second check, when one was done. */
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  /** Notes added later saying what was written wrongly. The record itself is never edited. */
  corrections?: Array<{ id: string; note: string; byName: string | null; createdAt: string }>;
};

export type DispensingRecordPage = {
  records: DispensingRecord[];
  total: number;
  page: number;
  size: number;
};

export function fetchDispensingRecords(opts: {
  from?: string;
  to?: string;
  branchId?: string | null;
  page?: number;
  size?: number;
}): Promise<DispensingRecordPage> {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.branchId) params.set("branchId", opts.branchId);
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 25));
  return apiRequest(`/api/v1/pharmacy/dispensing/records?${params}`);
}

/** The second check. Refused for the person who dispensed, and for a record already checked. */
export function verifyDispensingRecord(recordId: string): Promise<DispensingRecord> {
  return apiRequest(`/api/v1/pharmacy/dispensing/records/${encodeURIComponent(recordId)}/verify`, {
    method: "POST",
    toast: false,
  });
}

export function addDispensingCorrection(recordId: string, note: string): Promise<DispensingRecord> {
  return apiRequest(`/api/v1/pharmacy/dispensing/records/${encodeURIComponent(recordId)}/corrections`, {
    method: "POST",
    body: { note },
    toast: false,
  });
}

// ── Profile and dashboard ─────────────────────────────────────────────

export type PharmacyStaff = {
  userId: string;
  name: string;
  title: string | null;
  registrationNo: string | null;
  hasPin: boolean;
};

export type PharmacyProfile = {
  premisesLicenceNo: string | null;
  licenceExpiresOn: string | null;
  licenceDaysLeft: number | null;
  superintendentUserId: string | null;
  superintendentName: string | null;
  controlledSalesEnabled: boolean;
  shortDatedDays: number;
  staff: PharmacyStaff[];
  /** A second person who may dispense checks each dispensing record. */
  secondCheckEnabled?: boolean;
};

export function fetchPharmacyProfile(): Promise<PharmacyProfile> {
  return apiRequest("/api/v1/pharmacy/profile");
}

export function savePharmacyProfile(body: {
  premisesLicenceNo?: string | null;
  licenceExpiresOn?: string | null;
  superintendentUserId?: string | null;
  controlledSalesEnabled?: boolean;
  shortDatedDays?: number;
  secondCheckEnabled?: boolean;
}): Promise<PharmacyProfile> {
  return apiRequest("/api/v1/pharmacy/profile", { method: "PUT", body });
}

export function savePharmacyStaffCredential(
  userId: string,
  body: { title?: string | null; registrationNo?: string | null },
): Promise<PharmacyProfile> {
  return apiRequest(`/api/v1/pharmacy/profile/staff/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body,
  });
}

export type PharmacyDashboard = {
  medicines: MedicineClassCounts;
  stock: BatchSafetyCounts;
  dispensedToday: number;
  /** Records from the last 30 days awaiting a second check; null when the shop does not use one. */
  awaitingSecondCheck?: number | null;
  premisesLicenceNo: string | null;
  licenceExpiresOn: string | null;
  licenceDaysLeft: number | null;
  controlledSalesEnabled: boolean;
  dispensingStaff: number;
  dispensingStaffWithoutPin: number;
  checklist: Array<{ key: string; label: string; done: boolean; hint: string | null }>;
};

export function fetchPharmacyDashboard(branchId?: string | null): Promise<PharmacyDashboard> {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  const qs = params.toString();
  return apiRequest(`/api/v1/pharmacy/profile/dashboard${qs ? `?${qs}` : ""}`);
}

// ── Receiving ─────────────────────────────────────────────────────────

/** Which of these products are medicines; receiving one needs a lot number and an expiry date. */
export function fetchMedicinesAmong(itemIds: string[]): Promise<Array<{ itemId: string; name: string }>> {
  return apiRequest("/api/v1/pharmacy/medicines/among", {
    method: "POST",
    body: { itemIds },
    toast: false,
  });
}

// ── Patients (Phase 2) ────────────────────────────────────────────────

export type PharmacyPatient = {
  id: string;
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  allergies: string | null;
  notes: string | null;
  reminderConsent: boolean;
  reminderConsentAt: string | null;
  createdAt: string;
};

export type PharmacyPatientInput = {
  name: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  allergies?: string | null;
  notes?: string | null;
  reminderConsent?: boolean;
};

export type PatientMatch = { id: string; name: string; phone: string | null; allergies: string | null };

export function fetchPatients(opts: { q?: string; page?: number; size?: number }): Promise<{
  patients: PharmacyPatient[];
  total: number;
  page: number;
  size: number;
}> {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 25));
  return apiRequest(`/api/v1/pharmacy/patients?${params}`, { toast: false });
}

export function fetchPatientHistory(
  patientId: string,
): Promise<{ patient: PharmacyPatient; records: DispensingRecord[] }> {
  return apiRequest(`/api/v1/pharmacy/patients/${encodeURIComponent(patientId)}`, { toast: false });
}

/** Exact phone match only; the till uses it to link a sale to a profile. */
export function lookupPatientsByPhone(phone: string): Promise<PatientMatch[]> {
  return apiRequest(`/api/v1/pharmacy/patients/lookup?phone=${encodeURIComponent(phone)}`, { toast: false });
}

export function createPatient(body: PharmacyPatientInput): Promise<PharmacyPatient> {
  return apiRequest("/api/v1/pharmacy/patients", { method: "POST", body });
}

export function updatePatient(patientId: string, body: PharmacyPatientInput): Promise<PharmacyPatient> {
  return apiRequest(`/api/v1/pharmacy/patients/${encodeURIComponent(patientId)}`, { method: "PUT", body });
}

export function removePatient(patientId: string): Promise<void> {
  return apiRequest(`/api/v1/pharmacy/patients/${encodeURIComponent(patientId)}`, { method: "DELETE" });
}

// ── Follow-ups (Phase 2) ──────────────────────────────────────────────

export type Owing = {
  lineId: string;
  recordId: string;
  saleId: string;
  branchId: string;
  dispensedAt: string;
  itemId: string;
  itemName: string;
  quantityPrescribed: number;
  quantitySupplied: number;
  quantityOutstanding: number;
  patientId: string | null;
  patientName: string | null;
  patientPhone: string | null;
  prescriberName: string | null;
  prescriptionRef: string | null;
};

export type RefillDue = {
  lineId: string;
  recordId: string;
  branchId: string;
  dueOn: string;
  itemId: string;
  itemName: string;
  patientId: string | null;
  patientName: string | null;
  patientPhone: string | null;
  reminderConsent: boolean;
};

export function fetchOwings(): Promise<Owing[]> {
  return apiRequest("/api/v1/pharmacy/follow-ups/owings", { toast: false });
}

export function fetchOwingsForPatient(patientId: string): Promise<Owing[]> {
  return apiRequest(
    `/api/v1/pharmacy/follow-ups/owings/for-patient?patientId=${encodeURIComponent(patientId)}`,
    { toast: false },
  );
}

export function fetchRefillsDue(): Promise<RefillDue[]> {
  return apiRequest("/api/v1/pharmacy/follow-ups/refills", { toast: false });
}

// ── Controlled register (Phase 2) ─────────────────────────────────────

export type ControlledItem = {
  itemId: string;
  name: string;
  strength: string | null;
  dosageForm: string | null;
  onRecord: number;
};

export type ControlledRegister = {
  itemId: string;
  name: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  truncated: boolean;
  entries: Array<{
    at: string;
    movementType: string;
    quantityIn: number | null;
    quantityOut: number | null;
    balance: number;
    lotNumber: string | null;
    byName: string | null;
    prescriberName: string | null;
    patientName: string | null;
    dispensedByName: string | null;
    note: string | null;
  }>;
};

export function fetchControlledItems(): Promise<ControlledItem[]> {
  return apiRequest("/api/v1/pharmacy/controlled-register/items", { toast: false });
}

export function fetchControlledRegister(itemId: string, from: string, to: string): Promise<ControlledRegister> {
  const params = new URLSearchParams({ from, to });
  return apiRequest(`/api/v1/pharmacy/controlled-register/${encodeURIComponent(itemId)}?${params}`, {
    toast: false,
  });
}

// ── Compliance logs (Phase 2) ─────────────────────────────────────────

export type TemperatureReading = {
  id: string;
  branchId: string;
  storageName: string;
  readingC: number;
  minC: number;
  maxC: number;
  outOfRange: boolean;
  actionNote: string | null;
  recordedByName: string | null;
  recordedAt: string;
};

export function fetchTemperatures(branchId: string | null, days = 30): Promise<TemperatureReading[]> {
  const params = new URLSearchParams({ days: String(days) });
  if (branchId) params.set("branchId", branchId);
  return apiRequest(`/api/v1/pharmacy/compliance/temperatures?${params}`, { toast: false });
}

export function recordTemperature(body: {
  branchId: string;
  storageName: string;
  readingC: number;
  minC: number;
  maxC: number;
  actionNote?: string;
}): Promise<TemperatureReading> {
  return apiRequest("/api/v1/pharmacy/compliance/temperatures", { method: "POST", body });
}

export type SupplierLicence = {
  supplierId: string;
  supplierName: string;
  licenceNo: string | null;
  expiresOn: string | null;
  daysLeft: number | null;
  note: string | null;
};

export function fetchSupplierLicences(): Promise<SupplierLicence[]> {
  return apiRequest("/api/v1/pharmacy/compliance/supplier-licences", { toast: false });
}

export function saveSupplierLicence(
  supplierId: string,
  body: { licenceNo?: string | null; expiresOn?: string | null; note?: string | null },
): Promise<SupplierLicence> {
  return apiRequest(`/api/v1/pharmacy/compliance/supplier-licences/${encodeURIComponent(supplierId)}`, {
    method: "PUT",
    body,
  });
}

export type AdverseEventSeverity = "MILD" | "MODERATE" | "SEVERE";

export type AdverseEvent = {
  id: string;
  occurredOn: string;
  itemId: string | null;
  productName: string;
  lotNumber: string | null;
  patientId: string | null;
  patientName: string | null;
  description: string;
  severity: AdverseEventSeverity;
  actionTaken: string | null;
  reportedExternally: boolean;
  externalRef: string | null;
  reportedAt: string | null;
  recordedByName: string | null;
  createdAt: string;
};

export function fetchAdverseEvents(): Promise<AdverseEvent[]> {
  return apiRequest("/api/v1/pharmacy/compliance/adverse-events", { toast: false });
}

export function recordAdverseEvent(body: {
  occurredOn: string;
  productName: string;
  lotNumber?: string;
  description: string;
  severity: AdverseEventSeverity;
  actionTaken?: string;
}): Promise<AdverseEvent> {
  return apiRequest("/api/v1/pharmacy/compliance/adverse-events", { method: "POST", body });
}

export function markAdverseEventReported(eventId: string, externalRef: string): Promise<AdverseEvent> {
  return apiRequest(`/api/v1/pharmacy/compliance/adverse-events/${encodeURIComponent(eventId)}/reported`, {
    method: "POST",
    body: { externalRef: externalRef.trim() || null },
  });
}

// ── Ordering and central purchasing (Phase 3) ─────────────────────────

export type BranchNeed = {
  branchId: string;
  soldInWindow: number;
  dailyRate: number;
  sellable: number;
  onOrder: number;
  /** Days the stock lasts at the current rate; null when nothing sold. */
  daysOfCover: number | null;
  /** Stock that will still be on the shelf when it expires, at the current rate. */
  expiringFirst: number;
  suggested: number;
};

export type ForecastRow = {
  itemId: string;
  name: string;
  medicine: boolean;
  unitCost: number | null;
  suggestedTotal: number;
  expiringFirstTotal: number;
  lowestDaysOfCover: number | null;
  branches: BranchNeed[];
};

export type OrderingForecast = {
  windowDays: number;
  leadDays: number;
  coverDays: number;
  truncated: boolean;
  rows: ForecastRow[];
};

/** `branchId` null asks for every branch. */
export function fetchOrderingForecast(branchId: string | null): Promise<OrderingForecast> {
  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return apiRequest(`/api/v1/pharmacy/ordering/forecast${q}`, { toast: false });
}

export function saveOrderingSettings(body: { leadDays: number; coverDays: number }): Promise<{
  leadDays: number;
  coverDays: number;
}> {
  return apiRequest("/api/v1/pharmacy/ordering/settings", { method: "PUT", body });
}

export function createCentralOrder(body: {
  supplierId: string;
  receivingBranchId: string;
  lines: Array<{ itemId: string; unitCost: number; shares: Array<{ branchId: string; quantity: number }> }>;
}): Promise<{ purchaseOrderId: string; poNumber: string; lines: number; branchesToSupply: number }> {
  return apiRequest("/api/v1/pharmacy/ordering/orders", { method: "POST", body, toast: false });
}

export type PendingSplit = {
  purchaseOrderId: string;
  poNumber: string;
  status: string;
  receivingBranchId: string;
  received: boolean;
  lines: Array<{ itemId: string; itemName: string; branchId: string; quantity: number }>;
};

export function fetchPendingSplits(): Promise<PendingSplit[]> {
  return apiRequest("/api/v1/pharmacy/ordering/splits", { toast: false });
}

export function draftSplitTransfers(purchaseOrderId: string): Promise<{ transferIds: string[] }> {
  return apiRequest(`/api/v1/pharmacy/ordering/splits/${encodeURIComponent(purchaseOrderId)}/transfers`, {
    method: "POST",
    toast: false,
  });
}

// ── Schemes and claims (Phase 3) ──────────────────────────────────────

export type PharmacyScheme = {
  id: string;
  name: string;
  contact: string | null;
  paymentTermsDays: number | null;
  active: boolean;
  outstanding: number;
  openClaims: number;
  /** The customer that stands for the scheme at the till. */
  creditCustomerId?: string | null;
  /** What is on the scheme's tab now, from the credit ledger. */
  tabBalance?: number | null;
};

export function fetchSchemes(): Promise<PharmacyScheme[]> {
  return apiRequest("/api/v1/pharmacy/schemes", { toast: false });
}

export function saveScheme(
  schemeId: string | null,
  body: { name: string; contact?: string | null; paymentTermsDays?: number | null; active?: boolean },
): Promise<PharmacyScheme> {
  return schemeId
    ? apiRequest(`/api/v1/pharmacy/schemes/${encodeURIComponent(schemeId)}`, { method: "PUT", body })
    : apiRequest("/api/v1/pharmacy/schemes", { method: "POST", body });
}

export type ClaimStatus = "OPEN" | "SUBMITTED" | "PAID" | "PART_PAID" | "REJECTED";

export type SchemeClaim = {
  id: string;
  schemeId: string;
  schemeName: string | null;
  recordId: string;
  saleId: string;
  receiptNo: number | null;
  branchId: string;
  patientName: string | null;
  prescriberName: string | null;
  medicines: string;
  memberNo: string;
  authorisationCode: string | null;
  amountClaimed: number;
  amountPaid: number;
  status: ClaimStatus;
  statusNote: string | null;
  createdAt: string;
  submittedAt: string | null;
  settledAt: string | null;
  ageDays: number;
};

export function fetchClaims(): Promise<SchemeClaim[]> {
  return apiRequest("/api/v1/pharmacy/claims", { toast: false });
}

export function createClaim(body: {
  schemeId: string;
  recordId: string;
  memberNo: string;
  authorisationCode?: string;
  amountClaimed: number;
}): Promise<SchemeClaim> {
  return apiRequest("/api/v1/pharmacy/claims", { method: "POST", body, toast: false });
}

export function setClaimStatus(
  claimId: string,
  body: { status: "SUBMITTED" | "PAID" | "REJECTED"; amountPaid?: number; note?: string },
): Promise<SchemeClaim> {
  return apiRequest(`/api/v1/pharmacy/claims/${encodeURIComponent(claimId)}/status`, {
    method: "POST",
    body,
    toast: false,
  });
}

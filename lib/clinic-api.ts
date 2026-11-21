/**
 * Clinic (ADR 0034): a visit is a held service ticket with a patient on it. These calls go to
 * /api/v1/clinic, which names the hat each one needs. Nothing here is cached: a visit moves
 * between screens, so every screen reads it fresh.
 */
import { apiRequest } from "@/lib/api";
import type { DispensingClass } from "@/lib/pharmacy-api";

export type ClinicHats = {
  reception: boolean;
  consult: boolean;
  prescribe: boolean;
  perform: boolean;
  dispense: boolean;
  cashier: boolean;
  manage: boolean;
  /** The signed-in person's own place on the service team, when they have one. */
  staffProfileId: string | null;
};

export type ClinicSettings = {
  enabled: boolean;
  feeFirst: boolean;
  freeReviewDays: number;
  consultationServiceId: string | null;
  reviewServiceId: string | null;
  performServiceIds: string[];
  secondPersonForGated: boolean;
  hats: ClinicHats;
};

export type ClinicSettingsInput = {
  enabled: boolean;
  feeFirst?: boolean;
  freeReviewDays?: number;
  consultationServiceId?: string | null;
  reviewServiceId?: string | null;
  performServiceIds?: string[];
  secondPersonForGated?: boolean;
};

export type ClinicService = {
  id: string;
  name: string;
  price: number;
  priceIsVariable: boolean;
  durationMinutes: number;
  /** A test or procedure, worked at the lab and treatment station. */
  perform: boolean;
  /** What it is called on the receipt; null when it is sold under its own name. */
  receiptName?: string | null;
};

export type ClinicRoom = { id: string; name: string };

export type Clinician = { staffProfileId: string; name: string };

export type ReceptionPatient = {
  id: string;
  patientNo: number | null;
  name: string;
  phone: string | null;
  ageYears: number | null;
};

export type VisitStation =
  | "booked"
  | "waiting"
  | "consult"
  | "lab"
  | "dispensary"
  | "pay"
  | "done"
  | "cancelled";

export type PrescriptionStatus = "OPEN" | "PREPARED" | "DECLINED" | "DISPENSED";

export type VisitLine = {
  id: string;
  serviceId: string;
  name: string;
  unitPrice: number;
  lineTotal: number;
  performerStaffProfileId: string | null;
  performerName: string | null;
  resourceId: string | null;
  resourceName: string | null;
  stage: "WAITING" | "IN_SERVICE" | "DONE";
  startedAt: string | null;
  finishedAt: string | null;
};

export type VisitProduct = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  givenHere: boolean;
  /** Null for an ordinary product. */
  dispensingClass: DispensingClass | null;
};

export type PrescriptionLine = {
  id: string;
  itemId: string | null;
  medicineName: string;
  quantity: number;
  instructions: string | null;
  dispensingClass: DispensingClass | null;
};

export type Prescription = {
  id: string;
  status: PrescriptionStatus;
  prescriberName: string;
  prescriberRegNo: string | null;
  prescribedOn: string;
  preparedByName: string | null;
  preparedAt: string | null;
  lines: PrescriptionLine[];
};

export type ClinicVisit = {
  id: string;
  branchId: string;
  number: number;
  station: VisitStation;
  status: string;
  priority: number;
  patient: {
    id: string;
    patientNo: number | null;
    name: string;
    phone: string | null;
    ageYears: number | null;
    /** Only sent to people working the visit clinically or dispensing. */
    allergies: string | null;
  };
  payerCustomerId: string | null;
  requestedStaffProfileId: string | null;
  requestedStaffName: string | null;
  lines: VisitLine[];
  products: VisitProduct[];
  total: number;
  depositAmount: number | null;
  depositState: string | null;
  review: boolean;
  /** Null when the reader may not see prescriptions, or there is none. */
  prescription: Prescription | null;
  /** Whether there is one at all, for people who may not read it. */
  prescriptionStatus: PrescriptionStatus | null;
  openedAt: string;
  scheduledStart: string | null;
  saleId: string | null;
  version: number;
  /** Every prescription-only medicine on the bill was prepared by a pharmacist: no PIN at the cash desk. */
  dispenserCleared?: boolean;
  /** The receipt of a paid visit. */
  receiptNo?: number | null;
};

export type ClinicTakings = {
  from: string;
  to: string;
  visits: number;
  services: number;
  products: number;
  rows: Array<{
    serviceId: string | null;
    serviceName: string;
    staffProfileId: string | null;
    staffName: string | null;
    times: number;
    total: number;
  }>;
};

export type BoardVisit = {
  id: string;
  number: number;
  firstName: string;
  station: VisitStation;
  priority: number;
  openedAt: string;
  since: string | null;
  clinicianStaffProfileId: string | null;
  clinicianName: string | null;
  roomName: string | null;
  linesDone: number;
  linesTotal: number;
  /** Only once the visit is ready to pay, and only for someone who takes money. */
  total: number | null;
  depositAmount: number | null;
  depositState: string | null;
  prescriptionStatus: PrescriptionStatus | null;
  review: boolean;
};

export type ClinicBoard = { branchId: string; visits: BoardVisit[]; finishedToday: number };

export type ClinicAppointment = {
  id: string;
  start: string;
  end: string | null;
  patientName: string;
  patientNo: number | null;
  staffProfileId: string | null;
  staffName: string | null;
  reminder: boolean;
};

export type VisitPayment = { method: string; amount: number; reference?: string | null };

const BASE = "/api/v1/clinic";
const visitPath = (id: string, rest = "") => `${BASE}/visits/${encodeURIComponent(id)}${rest}`;

export function fetchClinicSettings(): Promise<ClinicSettings> {
  return apiRequest(`${BASE}/settings`, { toast: false });
}

export function saveClinicSettings(body: ClinicSettingsInput): Promise<ClinicSettings> {
  return apiRequest(`${BASE}/settings`, { method: "PUT", body, toast: false });
}

export function fetchClinicServices(): Promise<ClinicService[]> {
  return apiRequest(`${BASE}/services`, { toast: false });
}

export function setServiceReceiptName(serviceId: string, receiptName: string | null): Promise<ClinicService[]> {
  return apiRequest(`${BASE}/services/${encodeURIComponent(serviceId)}/receipt-name`, {
    method: "PUT",
    body: { receiptName },
    toast: false,
  });
}

export function fetchClinicRooms(branchId: string): Promise<ClinicRoom[]> {
  return apiRequest(`${BASE}/rooms?branchId=${encodeURIComponent(branchId)}`, { toast: false });
}

export function fetchClinicians(): Promise<Clinician[]> {
  return apiRequest(`${BASE}/clinicians`, { toast: false });
}

export function searchClinicPatients(q: string, signal?: AbortSignal): Promise<ReceptionPatient[]> {
  return apiRequest(`${BASE}/patients?q=${encodeURIComponent(q)}`, { toast: false, signal });
}

export function addClinicPatient(body: {
  name: string;
  phone?: string | null;
  dateOfBirth?: string | null;
}): Promise<ReceptionPatient> {
  return apiRequest(`${BASE}/patients`, { method: "POST", body, toast: false });
}

export function fetchClinicBoard(branchId: string): Promise<ClinicBoard> {
  return apiRequest(`${BASE}/visits?branchId=${encodeURIComponent(branchId)}`, { toast: false });
}

export function openClinicVisit(body: {
  branchId: string;
  clientVisitId: string;
  patientId: string;
  serviceIds?: string[];
  requestedStaffProfileId?: string | null;
  review?: boolean;
  urgent?: boolean;
}): Promise<ClinicVisit> {
  return apiRequest(`${BASE}/visits`, { method: "POST", body, toast: false });
}

export function fetchClinicVisit(id: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id), { toast: false });
}

export function addVisitService(id: string, serviceId: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/services"), { method: "POST", body: { serviceId }, toast: false });
}

export function removeVisitService(id: string, lineId: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, `/services/${encodeURIComponent(lineId)}`), { method: "DELETE", toast: false });
}

export function startVisitService(id: string, lineId: string, resourceId?: string | null): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, `/services/${encodeURIComponent(lineId)}/start`), {
    method: "POST",
    body: resourceId ? { resourceId } : {},
    toast: false,
  });
}

export function finishVisitService(id: string, lineId: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, `/services/${encodeURIComponent(lineId)}/done`), {
    method: "POST",
    body: {},
    toast: false,
  });
}

export function giveVisitMedicine(id: string, itemId: string, quantity: number): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/medicines-given"), { method: "POST", body: { itemId, quantity }, toast: false });
}

export function addVisitProduct(id: string, itemId: string, quantity: number): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/products"), { method: "POST", body: { itemId, quantity }, toast: false });
}

export function removeVisitProduct(id: string, lineId: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, `/products/${encodeURIComponent(lineId)}`), { method: "DELETE", toast: false });
}

export type PrescriptionLineInput = {
  itemId?: string | null;
  medicineName: string;
  quantity: number;
  instructions?: string | null;
};

export function saveVisitPrescription(id: string, lines: PrescriptionLineInput[]): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/prescription"), { method: "PUT", body: { lines }, toast: false });
}

export function prepareVisitPrescription(
  id: string,
  lines: Array<{ lineId: string; quantity: number }>,
): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/prescription/prepare"), { method: "POST", body: { lines }, toast: false });
}

export function sendBackVisitPrescription(id: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/prescription/send-back"), { method: "POST", body: {}, toast: false });
}

export function declineVisitMedicines(id: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/prescription/decline"), { method: "POST", body: {}, toast: false });
}

export function takeVisitDeposit(
  id: string,
  body: { amount: number; method: string; reference?: string | null },
): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/deposit"), { method: "POST", body, toast: false });
}

/** The key must be made once per attempt to pay and sent again on a retry, so a visit is never rung twice. */
export function payClinicVisit(
  id: string,
  body: { payments: VisitPayment[]; cashReceived?: number | null; approvalId?: string | null },
  idempotencyKey: string,
): Promise<{ visit: ClinicVisit; sale: { id: string; receiptNo?: number | null } | null }> {
  return apiRequest(visitPath(id, "/pay"), { method: "POST", body, idempotencyKey, toast: false, timeoutMs: 45000 });
}

export function cancelClinicVisit(
  id: string,
  body: { reason?: string | null; leftWithoutBeingSeen?: boolean; depositBack?: string | null },
): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/cancel"), { method: "POST", body, toast: false });
}

export function claimClinicVisit(
  id: string,
  body: { schemeId: string; memberNo: string; authorisationCode?: string | null; amountClaimed: number },
): Promise<unknown> {
  return apiRequest(visitPath(id, "/claims"), { method: "POST", body, toast: false });
}

export function fetchClinicTakings(branchId: string, from: string, to: string): Promise<ClinicTakings> {
  const qs = new URLSearchParams({ branchId, from, to });
  return apiRequest(`${BASE}/takings?${qs}`, { toast: false });
}

export function fetchClinicAppointments(branchId: string, from: string, to: string): Promise<ClinicAppointment[]> {
  const qs = new URLSearchParams({ branchId, from, to });
  return apiRequest(`${BASE}/appointments?${qs}`, { toast: false });
}

export function bookClinicAppointment(body: {
  branchId: string;
  clientVisitId: string;
  patientId: string;
  staffProfileId: string;
  start: string;
  serviceIds?: string[];
  sendReminder?: boolean;
}): Promise<ClinicVisit> {
  return apiRequest(`${BASE}/appointments`, { method: "POST", body, toast: false });
}

export function arriveClinicVisit(id: string): Promise<ClinicVisit> {
  return apiRequest(visitPath(id, "/arrive"), { method: "POST", body: {}, toast: false });
}

/**
 * What the Clinic screens say about a visit (ADR 0034). Pure functions with no imports beyond
 * types, so the wording and the sums can be tested without a browser.
 */
import type { BoardVisit, ClinicHats, ClinicVisit, VisitStation } from "@/lib/clinic-api";

/** The columns of the Today list, in the order a visit moves through them. */
export const BOARD_STATIONS: readonly VisitStation[] = ["waiting", "consult", "lab", "dispensary", "pay"];

export const STATION_LABEL: Record<VisitStation, string> = {
  booked: "Booked",
  waiting: "Waiting",
  consult: "With a clinician",
  lab: "Lab and treatment",
  dispensary: "Dispensary",
  pay: "Ready to pay",
  done: "Finished",
  cancelled: "Cancelled",
};

/** The stations a person's hats let them act on. Someone with no clinic hat at all gets none. */
export function stationsForHats(hats: ClinicHats | null | undefined): VisitStation[] {
  if (!hats) return [];
  const mine: VisitStation[] = [];
  if (hats.reception) mine.push("waiting");
  if (hats.consult || hats.prescribe) mine.push("consult");
  if (hats.perform) mine.push("lab");
  if (hats.dispense) mine.push("dispensary");
  if (hats.cashier) mine.push("pay");
  return mine;
}

/** True for the person who does every step themselves: the one-person consulting corner. */
export function worksAlone(hats: ClinicHats | null | undefined): boolean {
  return !!hats && hats.reception && hats.consult && hats.cashier;
}

export function minutesSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 60000));
}

/** "4 min", "1 h 05 min". */
export function waitLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** A wait long enough that someone should look: 30 minutes without being started. */
export function waitedLong(station: VisitStation, minutes: number): boolean {
  return station === "waiting" && minutes >= 30;
}

/** What is still to pay once money held as a fee is counted. Never negative. */
export function amountDue(
  total: number | null | undefined,
  depositAmount: number | null | undefined,
  depositState: string | null | undefined,
): number {
  const t = total ?? 0;
  const held = depositState === "HELD" ? depositAmount ?? 0 : 0;
  return Math.max(0, Math.round((t - held) * 100) / 100);
}

export function feeHeld(depositAmount: number | null | undefined, depositState: string | null | undefined): number {
  return depositState === "HELD" ? depositAmount ?? 0 : 0;
}

/**
 * The line under a name on the Today list. It never says what the person came for: the list can
 * be seen by anyone at the desk.
 */
export function boardNote(v: BoardVisit): string {
  const parts: string[] = [];
  switch (v.station) {
    case "waiting":
      parts.push(v.clinicianName ? `For ${v.clinicianName}` : "Any clinician");
      if (v.review) parts.push("review visit");
      if (feeHeld(v.depositAmount, v.depositState) > 0) parts.push("fee paid");
      break;
    case "consult":
      parts.push(v.clinicianName ?? "Waiting for a clinician");
      if (v.roomName) parts.push(v.roomName);
      break;
    case "lab":
      parts.push(v.linesTotal > 1 ? `${v.linesDone} of ${v.linesTotal} done` : "Test or procedure");
      if (v.clinicianName) parts.push(v.clinicianName);
      break;
    case "dispensary":
      parts.push("Prescription to prepare");
      break;
    case "pay":
      if (v.prescriptionStatus === "PREPARED") parts.push("Medicines ready to hand over after payment");
      else if (v.prescriptionStatus === "DECLINED") parts.push("Not buying the medicines here");
      else parts.push("Bill ready");
      if (feeHeld(v.depositAmount, v.depositState) > 0) parts.push("fee already paid");
      break;
    default:
      break;
  }
  return parts.join(" · ");
}

/** Visits by column: urgent first, then whoever has been there longest. */
export function groupBoard(visits: readonly BoardVisit[]): Record<VisitStation, BoardVisit[]> {
  const out = {
    booked: [],
    waiting: [],
    consult: [],
    lab: [],
    dispensary: [],
    pay: [],
    done: [],
    cancelled: [],
  } as Record<VisitStation, BoardVisit[]>;
  for (const v of visits) out[v.station]?.push(v);
  for (const key of Object.keys(out) as VisitStation[]) {
    out[key].sort(
      (a, b) =>
        b.priority - a.priority ||
        Date.parse(a.since ?? a.openedAt) - Date.parse(b.since ?? b.openedAt) ||
        a.number - b.number,
    );
  }
  return out;
}

export function formatKsh(amount: number | null | undefined): string {
  const n = Number.isFinite(amount as number) ? (amount as number) : 0;
  return `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ageLabel(ageYears: number | null | undefined): string {
  if (ageYears == null || ageYears < 0) return "";
  if (ageYears < 1) return "under 1 year";
  return ageYears === 1 ? "1 year" : `${ageYears} years`;
}

/** Why payment cannot be taken yet, or null when it can. The server checks the same things. */
export function payBlockedReason(visit: ClinicVisit): string | null {
  if (visit.status !== "pending") return "This visit is closed.";
  if (visit.lines.length === 0) return "Add what was done before taking payment.";
  const unassigned = visit.lines.find((l) => !l.performerStaffProfileId);
  if (unassigned) return `Mark ${unassigned.name} done, so the bill shows who did it.`;
  if (visit.prescriptionStatus === "OPEN" && visit.station === "dispensary") {
    return "The prescription has not been prepared. Prepare it, or mark that the patient is not buying the medicines.";
  }
  return null;
}

/** Whether the bill carries a medicine the pharmacy rules will ask about at payment. */
export function billNeedsDispenser(visit: ClinicVisit): boolean {
  return visit.products.some(
    (p) => p.dispensingClass === "PRESCRIPTION_ONLY" || p.dispensingClass === "CONTROLLED",
  );
}

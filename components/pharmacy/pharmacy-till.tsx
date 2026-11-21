"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { DISPENSING_CLASS_LABEL, lookupPatientsByPhone, type PatientMatch } from "@/lib/pharmacy-api";
import {
  NO_PHARMACY_TILL,
  PharmacyTillStore,
  formatTillExpiry,
  tillBlockedReason,
  tillGenericLine,
  tillMedicineBlocked,
  type TillMedicine,
} from "@/lib/pharmacy-till";
import { cn } from "@/lib/utils";

const TillContext = createContext<PharmacyTillStore>(NO_PHARMACY_TILL);

/** The till's medicine store. With `enabled` false it answers "not a medicine" and fetches nothing. */
export function usePharmacyTillStore(enabled: boolean): PharmacyTillStore {
  return useMemo(() => (enabled ? new PharmacyTillStore(true) : NO_PHARMACY_TILL), [enabled]);
}

/** Wraps a till so its product rows and cart lines can read medicine details. */
export function PharmacyTillProvider({
  store,
  branchId,
  children,
}: {
  /** From {@link usePharmacyTillStore}, so the till itself can ask the same store. */
  store: PharmacyTillStore;
  branchId: string | null | undefined;
  children: React.ReactNode;
}) {
  useEffect(() => {
    store.setBranch(branchId ?? null);
  }, [store, branchId]);
  return <TillContext.Provider value={store}>{children}</TillContext.Provider>;
}

export function usePharmacyTill(): PharmacyTillStore {
  return useContext(TillContext);
}

/** The medicine behind a product row, or null when it is not one (or not known yet). */
export function useTillMedicine(itemId: string | null | undefined): TillMedicine | null {
  const store = useContext(TillContext);
  const id = itemId ?? "";
  useEffect(() => {
    if (id) store.request(id);
  }, [store, id]);
  return useSyncExternalStore(
    store.subscribe,
    () => (id ? store.get(id) : null),
    () => null,
  );
}

export function useTillPatient(): PatientMatch | null {
  const store = useContext(TillContext);
  return useSyncExternalStore(store.subscribe, store.patient, () => null);
}

/** True when this product must not be added to a sale. Safe to call for any product. */
export function useTillBlocked(itemId: string | null | undefined): boolean {
  return tillMedicineBlocked(useTillMedicine(itemId));
}

const WARN = "text-red-700 dark:text-red-400";
const CAUTION = "font-semibold text-amber-800 dark:text-amber-300";

/** Prescription medicines stand out; over the counter is the ordinary case and stays quiet. */
const CLASS_TEXT: Record<TillMedicine["dispensingClass"], string> = {
  OTC: "text-muted-foreground",
  PRESCRIPTION_ONLY: "font-semibold text-[var(--pos-primary,#0f766e)]",
  CONTROLLED: "font-semibold text-[var(--pos-primary,#0f766e)]",
  UNCLASSIFIED: cn("font-semibold", WARN),
};

/** Keeps "Expires Mar 2027" and the like from breaking in the middle when a row is narrow. */
function Part({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("whitespace-nowrap", className)}>{children}</span>;
}

/**
 * Under a product name: class, generic name, and where the next unit comes from. Renders spans
 * only, so it can sit inside a button row. Nothing for a product that is not a medicine.
 *
 * On the shelf it is one line that reads left to right in the order a cashier checks: may I
 * sell it, is it the right drug, is it in date. In the cart the drug is already chosen, so the
 * class shows only when payment will need the pharmacist, and the lot takes the generic's place.
 */
export function TillMedicineLine({
  itemId,
  where,
  className,
}: {
  itemId: string | null | undefined;
  where: "shelf" | "cart";
  className?: string;
}) {
  const m = useTillMedicine(itemId);
  if (!m) return null;
  const blocked = tillMedicineBlocked(m);
  const expiry = formatTillExpiry(m.nextExpiry);
  const generic = tillGenericLine(m);
  const base = cn("mt-0.5 block text-[11px] leading-[1.45] text-muted-foreground", className);
  const dated = expiry ? (
    <Part className={m.shortDated ? CAUTION : undefined}>Expires {expiry}</Part>
  ) : blocked ? null : (
    <Part className={CAUTION}>No dated stock here</Part>
  );

  if (where === "cart") {
    const needsPharmacist = m.status === "needs_record";
    return (
      <span className={base}>
        {blocked ? (
          <span className={cn("block font-semibold", WARN)}>{tillBlockedReason(m)}</span>
        ) : needsPharmacist ? (
          <span className={cn("block", CLASS_TEXT[m.dispensingClass])}>
            {DISPENSING_CLASS_LABEL[m.dispensingClass]}
          </span>
        ) : null}
        <span className="block">
          {m.nextLot ? <Part>Lot {m.nextLot}</Part> : null}
          {m.nextLot && dated ? " · " : null}
          {dated}
        </span>
      </span>
    );
  }

  // A medicine that cannot be sold says only that: its expiry is beside the point.
  if (blocked) {
    return (
      <span className={base}>
        <span className={cn("font-semibold", WARN)}>{tillBlockedReason(m)}</span>
      </span>
    );
  }

  return (
    <span className={base}>
      <Part className={CLASS_TEXT[m.dispensingClass]}>{DISPENSING_CLASS_LABEL[m.dispensingClass]}</Part>
      {generic ? <> · <span>{generic}</span></> : null}
      {dated ? <> · {dated}</> : null}
    </span>
  );
}

function useCartStanding(itemIds: string[]) {
  const store = useContext(TillContext);
  const key = [...new Set(itemIds)].sort().join(",");
  useEffect(() => {
    for (const id of key ? key.split(",") : []) store.request(id);
  }, [store, key]);
  // The snapshot is a string so it stays equal between renders until something really changes.
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => {
      let medicines = 0;
      let needs = 0;
      let blocked = 0;
      for (const id of key ? key.split(",") : []) {
        const m = store.get(id);
        if (!m) continue;
        medicines++;
        if (tillMedicineBlocked(m)) blocked++;
        else if (m.status === "needs_record") needs++;
      }
      return `${medicines}|${needs}|${blocked}|${store.mayDispense() ? 1 : 0}`;
    },
    () => "0|0|0|0",
  );
  const [medicines, needs, blocked, may] = snapshot.split("|").map(Number);
  return { medicines: medicines ?? 0, needs: needs ?? 0, blocked: blocked ?? 0, mayDispense: may === 1 };
}

/**
 * Sits above the lines of a sale in a pharmacy: who the sale is for, any allergy on their
 * profile, and what payment will ask for. Renders nothing outside a pharmacy till.
 */
export function PharmacyTillCartStrip({ itemIds, className }: { itemIds: string[]; className?: string }) {
  const store = useContext(TillContext);
  const patient = useTillPatient();
  const { medicines, needs, blocked, mayDispense } = useCartStanding(itemIds);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [matches, setMatches] = useState<PatientMatch[] | null>(null);
  const [busy, setBusy] = useState(false);

  const empty = itemIds.length === 0;
  useEffect(() => {
    // A finished or cleared sale must not hand its patient to the next customer.
    if (!empty) return;
    if (store.patient()) store.setPatient(null);
    // The sale that just finished may have used up a lot.
    store.refreshAll();
  }, [empty, store]);

  if (!store.enabled) return null;
  // Nothing to say about a sale with no medicine in it and no patient attached.
  if (medicines === 0 && !patient) return null;

  const find = () => {
    const value = phone.trim();
    if (value.replace(/\D/g, "").length < 7) {
      setMatches([]);
      return;
    }
    setBusy(true);
    lookupPatientsByPhone(value)
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setBusy(false));
  };

  const pick = (match: PatientMatch | null) => {
    store.setPatient(match);
    setOpen(false);
    setPhone("");
    setMatches(null);
  };

  const linkClass =
    "inline-flex min-h-9 shrink-0 items-center text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] underline underline-offset-4";

  return (
    <div
      className={cn(
        "border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2 py-2 text-[12px] leading-[1.45] dark:border-border/30",
        className,
      )}
    >
      {patient ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
              {patient.name}
              {patient.phone ? <span className="font-normal text-muted-foreground"> · {patient.phone}</span> : null}
            </p>
            <button type="button" className={linkClass} onClick={() => pick(null)}>
              Remove
            </button>
          </div>
          {patient.allergies?.trim() ? (
            <p role="alert" className={cn("font-semibold", WARN)}>
              Allergy on record: {patient.allergies.trim()}. Check before dispensing.
            </p>
          ) : null}
        </div>
      ) : open ? (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <label className="block">
            <span className="block text-muted-foreground">Patient phone number</span>
            <span className="mt-0.5 flex gap-1.5">
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setMatches(null);
                }}
                className="h-9 min-w-0 flex-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card px-2 text-[13px] text-foreground outline-none focus-visible:border-[var(--pos-primary,#0f766e)]"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-9 shrink-0 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2.5 text-[12px] font-semibold text-foreground disabled:opacity-50"
              >
                Find
              </button>
              <button type="button" className={linkClass} onClick={() => pick(null)}>
                Cancel
              </button>
            </span>
          </label>
          {matches && matches.length === 0 ? (
            <p className="text-muted-foreground">
              No patient profile has this number. You can still type their details at payment.
            </p>
          ) : null}
          {matches && matches.length > 0 ? (
            <ul>
              {matches.map((match) => (
                <li key={match.id}>
                  <button type="button" className={linkClass} onClick={() => pick(match)}>
                    {match.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : (
        <button type="button" className={linkClass} onClick={() => setOpen(true)}>
          Add the patient
        </button>
      )}
      {blocked > 0 ? (
        <p role="alert" className={cn("font-semibold", WARN)}>
          {blocked === 1 ? "One medicine in this sale" : `${blocked} medicines in this sale`} cannot be sold.
          Remove {blocked === 1 ? "it" : "them"}, or ask the pharmacist to set the class.
        </p>
      ) : needs > 0 ? (
        <p className="text-muted-foreground">
          {mayDispense
            ? "Prescription medicine in this sale. You record the dispensing details at payment."
            : "Prescription medicine in this sale. A pharmacist approves it with their PIN at payment."}
        </p>
      ) : null}
    </div>
  );
}

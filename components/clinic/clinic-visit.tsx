"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ClinicItemSearch } from "@/components/clinic/clinic-item-search";
import { ClinicPayDialog } from "@/components/clinic/clinic-pay-dialog";
import { patientDetail } from "@/components/clinic/clinic-patient-picker";
import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText, formatQty } from "@/components/pharmacy/pharmacy-ui";
import { Chip, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  addVisitProduct,
  addVisitService,
  cancelClinicVisit,
  claimClinicVisit,
  declineVisitMedicines,
  fetchClinicVisit,
  finishVisitService,
  giveVisitMedicine,
  prepareVisitPrescription,
  removeVisitProduct,
  removeVisitService,
  saveVisitPrescription,
  sendBackVisitPrescription,
  startVisitService,
  takeVisitDeposit,
  type ClinicRoom,
  type ClinicService,
  type ClinicSettings,
  type ClinicVisit,
  type Prescription,
  type PrescriptionLineInput,
} from "@/lib/clinic-api";
import { STATION_LABEL, amountDue, feeHeld, formatKsh, payBlockedReason } from "@/lib/clinic-visit";
import { APP_ROUTES } from "@/lib/config";
import { DISPENSING_CLASS_LABEL, fetchSchemes, type PharmacyScheme } from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .clinic-print, .clinic-print * { visibility: visible !important; }
  .clinic-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; color: #000; background: #fff; }
}
.clinic-print { display: none; }
@media print { .clinic-print { display: block; } }
`;

/**
 * One visit: who the patient is, what was done, the prescription, and one bill for all of it.
 * The same screen serves the chemist who does every step alone and each station of a larger
 * clinic; what a person can press follows the hats they hold (ADR 0034).
 */
export function ClinicVisitScreen({
  visitId,
  settings,
  services,
  rooms,
  shopName,
  canManageClaims,
  onBack,
}: {
  visitId: string;
  settings: ClinicSettings;
  services: ClinicService[];
  rooms: ClinicRoom[];
  shopName: string;
  canManageClaims: boolean;
  onBack: () => void;
}) {
  const hats = settings.hats;
  const clinical = hats.consult || hats.perform;
  const [visit, setVisit] = useState<ClinicVisit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [serviceId, setServiceId] = useState("");
  // The room the next service starts in. Kept between services: a clinician stays in their room.
  const [roomId, setRoomId] = useState("");

  const load = useCallback(() => {
    fetchClinicVisit(visitId)
      .then((v) => {
        setVisit(v);
        setLoadError(null);
      })
      .catch((err) => setLoadError(errorText(err, "Could not open this visit. Check the connection.")));
  }, [visitId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs one change, shows the visit as the server now has it, and says plainly when it did not happen. */
  const run = useCallback(
    async (action: () => Promise<ClinicVisit>, done?: string): Promise<boolean> => {
      setBusy(true);
      try {
        setVisit(await action());
        if (done) toast.success(done);
        return true;
      } catch (err) {
        toast.error(errorText(err, "That did not go through. Check the connection and try again."));
        // Someone at another station may have moved the visit on: show it as it now stands.
        load();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  if (loadError && !visit) {
    return (
      <div className="space-y-3">
        <BackButton onBack={onBack} />
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
        <Button type="button" variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!visit) {
    return <p className={cn("text-sm", RX_MUTED)}>Opening the visit…</p>;
  }

  const open = visit.status === "pending";
  const paid = visit.status === "completed";
  const due = amountDue(visit.total, visit.depositAmount, visit.depositState);
  const held = feeHeld(visit.depositAmount, visit.depositState);
  const blocked = payBlockedReason(visit);
  const addable = services.filter((s) => s.id !== settings.reviewServiceId);
  const rx = visit.prescription;
  const mayEditRx = open && hats.prescribe && (!visit.prescriptionStatus || visit.prescriptionStatus === "OPEN");

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <BackButton onBack={onBack} />

      <Panel>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="min-w-[14rem] flex-1">
            <p className={cn("text-[13px] tabular-nums", RX_MUTED)}>
              Visit {visit.number}
              {visit.review ? " · review visit" : ""}
              {visit.requestedStaffName ? ` · for ${visit.requestedStaffName}` : ""}
            </p>
            <h2 className={cn("font-serif text-[1.7rem] font-semibold leading-tight", RX_INK)}>{visit.patient.name}</h2>
            <p className={cn("mt-0.5 text-[13.5px] tabular-nums", RX_MUTED)}>
              {patientDetail(visit.patient) || "No number or phone recorded"}
            </p>
          </div>
          {visit.patient.allergies ? (
            <div className="min-w-[14rem] flex-1 rounded-[2px] border-2 border-[#b91c1c] px-3 py-2 text-[13.5px] text-[#8f1616]">
              <p className="font-bold">Allergy on file</p>
              <p>{visit.patient.allergies}. Kiosk does not check medicines against this.</p>
            </div>
          ) : null}
          <Chip tone={visit.station === "pay" ? "good" : visit.station === "cancelled" ? "warn" : "live"}>
            {STATION_LABEL[visit.station]}
          </Chip>
        </div>
      </Panel>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Panel title="What was done" description="Each one goes on the bill against the person who did it.">
            <ul className={cn("divide-y", RX_RULE)}>
              {visit.lines.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 first:pt-0">
                  <div className="min-w-[10rem] flex-1">
                    <p className={cn("font-medium", RX_INK)}>{line.name}</p>
                    <p className={cn("text-[13px]", RX_MUTED)}>
                      {line.stage === "DONE"
                        ? `Done${line.performerName ? ` by ${line.performerName}` : ""}`
                        : line.stage === "IN_SERVICE"
                          ? `In progress${line.performerName ? ` with ${line.performerName}` : ""}${line.resourceName ? ` · ${line.resourceName}` : ""}`
                          : `Waiting${line.performerName ? ` for ${line.performerName}` : ""}`}
                    </p>
                  </div>
                  <span className={cn("text-sm tabular-nums", RX_INK)}>{formatKsh(line.lineTotal)}</span>
                  {open && clinical && line.stage === "WAITING" && rooms.length > 0 ? (
                    <label className="block text-sm">
                      <span className="sr-only">Room for {line.name}</span>
                      <select
                        className={cn(RX_INPUT, "w-36")}
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                      >
                        <option value="">No room</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {open && clinical && line.stage === "WAITING" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => run(() => startVisitService(visit.id, line.id, roomId || null))}
                    >
                      Start
                    </Button>
                  ) : null}
                  {open && clinical && line.stage !== "DONE" ? (
                    <Button type="button" disabled={busy} onClick={() => run(() => finishVisitService(visit.id, line.id))}>
                      Done
                    </Button>
                  ) : null}
                  {open && (clinical || hats.reception) && line.stage === "WAITING" && visit.lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Remove ${line.name}`}
                      onClick={() => run(() => removeVisitService(visit.id, line.id))}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {open && (clinical || hats.reception) && addable.length > 0 ? (
              <div className={cn("mt-3 flex flex-wrap items-end gap-2 border-t pt-3", RX_RULE)}>
                <Field label="Add a service, test or procedure" className="min-w-[14rem] flex-1">
                  <select className={RX_INPUT} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    <option value="">Choose</option>
                    {addable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatKsh(s.price)}
                        {s.perform ? " · test or procedure" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !serviceId}
                  onClick={async () => {
                    if (await run(() => addVisitService(visit.id, serviceId))) setServiceId("");
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
          </Panel>

          {open && clinical ? (
            <GivenHere busy={busy} onGive={(itemId, quantity) => run(() => giveVisitMedicine(visit.id, itemId, quantity))} />
          ) : null}

          {mayEditRx ? (
            <PrescriptionEditor
              key={rx?.id ?? "new"}
              existing={rx}
              busy={busy}
              onSave={(lines) => run(() => saveVisitPrescription(visit.id, lines), "Prescription saved.")}
            />
          ) : rx ? (
            <PrescriptionView rx={rx} />
          ) : visit.prescriptionStatus ? (
            <Panel title="Prescription">
              <p className={cn("text-sm", RX_MUTED)}>
                {visit.prescriptionStatus === "OPEN"
                  ? "A prescription has been written. The dispensary prepares it."
                  : visit.prescriptionStatus === "DECLINED"
                    ? "A prescription was written. The patient is not buying the medicines here."
                    : "A prescription was written and prepared."}
              </p>
            </Panel>
          ) : null}

          {rx && open && rx.status === "OPEN" && hats.dispense ? (
            <PreparePanel
              rx={rx}
              busy={busy}
              onPrepare={(lines) =>
                run(() => prepareVisitPrescription(visit.id, lines), "On the bill. Hand over after payment.")
              }
            />
          ) : null}

          {rx ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Print prescription
              </Button>
              {open && rx.status === "OPEN" && (hats.dispense || hats.prescribe || hats.cashier) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => declineVisitMedicines(visit.id), "Marked: not buying the medicines here.")}
                >
                  Patient is not buying the medicines
                </Button>
              ) : null}
              {open && (rx.status === "PREPARED" || rx.status === "DECLINED") && (hats.dispense || hats.prescribe) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => sendBackVisitPrescription(visit.id), "Prescription open again.")}
                >
                  {rx.status === "PREPARED" ? "Send back to change" : "Open the prescription again"}
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className={cn("max-w-[70ch] text-[12.5px] leading-relaxed", RX_MUTED)}>
            No diagnosis, notes or results are kept in Kiosk. The prescription can be changed until it has been
            prepared.
          </p>
        </div>

        <aside className="min-w-0 space-y-3">
          <Panel title="The bill" description="One bill for the whole visit" flush>
            <ul>
              {visit.lines.map((line) => (
                <li key={line.id} className={cn("flex gap-3 border-b px-4 py-2.5", RX_RULE)}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", RX_INK)}>{line.name}</p>
                    <p className={cn("text-[12.5px]", RX_MUTED)}>
                      {line.performerName ?? "Nobody yet"}
                      {line.stage === "DONE" ? " · done" : ""}
                    </p>
                  </div>
                  <span className={cn("text-sm tabular-nums", RX_INK)}>{formatKsh(line.lineTotal)}</span>
                </li>
              ))}
              {visit.products.map((p) => (
                <li key={p.id} className={cn("flex gap-3 border-b px-4 py-2.5", RX_RULE)}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", RX_INK)}>
                      {p.name} <span className="tabular-nums">× {formatQty(p.quantity)}</span>
                    </p>
                    {p.dispensingClass || p.givenHere ? (
                      <p
                        className={cn(
                          "text-[12.5px]",
                          p.dispensingClass === "PRESCRIPTION_ONLY" || p.dispensingClass === "CONTROLLED"
                            ? "font-semibold text-[var(--op-accent,#1d4b3b)]"
                            : p.dispensingClass === "UNCLASSIFIED"
                              ? "font-semibold text-[#8f1616]"
                              : RX_MUTED,
                        )}
                      >
                        {[
                          p.dispensingClass === "UNCLASSIFIED"
                            ? "Not classified yet: cannot be sold"
                            : p.dispensingClass
                              ? DISPENSING_CLASS_LABEL[p.dispensingClass]
                              : null,
                          p.givenHere ? "given here" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {/* A medicine comes off the bill only by someone who works the visit or may dispense. */}
                    {open && (clinical || hats.dispense || (hats.cashier && !p.dispensingClass)) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => removeVisitProduct(visit.id, p.id))}
                        className="mt-0.5 min-h-8 text-[12.5px] font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-2 disabled:opacity-50"
                      >
                        Take off the bill
                      </button>
                    ) : null}
                  </div>
                  <span className={cn("text-sm tabular-nums", RX_INK)}>{formatKsh(p.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 p-4">
              <dl className="space-y-1 text-sm tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt className={RX_MUTED}>Bill</dt>
                  <dd className={RX_INK}>{formatKsh(visit.total)}</dd>
                </div>
                {held > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className={RX_MUTED}>Fee already paid</dt>
                    <dd className={RX_INK}>− {formatKsh(held)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 pt-1">
                  <dt className={cn("font-semibold", RX_INK)}>{paid ? "Paid" : "To pay"}</dt>
                  <dd className={cn("text-[24px] font-bold", RX_INK)}>{formatKsh(paid ? visit.total : due)}</dd>
                </div>
              </dl>

              {paid ? (
                <p className="rounded-[2px] border-2 border-[var(--op-accent,#1d4b3b)] px-3 py-2 text-sm text-[var(--op-accent,#1d4b3b)]">
                  <span className="font-bold">Paid.</span>{" "}
                  {visit.products.some((p) => !p.givenHere && p.dispensingClass)
                    ? "Hand over the medicines now."
                    : "The visit is finished."}
                </p>
              ) : null}
              {paid && visit.receiptNo != null ? (
                <p className={cn("text-[13px]", RX_MUTED)}>
                  Receipt {visit.receiptNo}. To reprint it, or to refund something that was not done,{" "}
                  <Link
                    href={`${APP_ROUTES.salesTransactions}?q=${visit.receiptNo}`}
                    className="font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-2"
                  >
                    open the sale
                  </Link>
                  .
                </p>
              ) : null}
              {visit.status === "cancelled" ? <p className="text-sm font-semibold text-[#8f1616]">This visit was cancelled.</p> : null}

              {open && hats.cashier ? (
                <>
                  {blocked ? <p className={cn("text-[13px]", RX_MUTED)}>{blocked}</p> : null}
                  <Button type="button" className="h-12 w-full text-[15px]" disabled={busy || !!blocked} onClick={() => setPaying(true)}>
                    {due > 0 ? `Take payment · ${formatKsh(due)}` : "Close the visit"}
                  </Button>
                  <p className={cn("text-[12.5px]", RX_MUTED)}>
                    Hand over the medicines after payment. The dispensing record is written then.
                  </p>
                  {/* The fee comes before the patient is seen; once work has started the bill is paid at the end. */}
                  {held === 0 && !visit.depositState && visit.lines.every((l) => l.stage === "WAITING") ? (
                    <FeeFirst
                      busy={busy}
                      suggested={visit.lines[0]?.lineTotal ?? 0}
                      prominent={settings.feeFirst}
                      onTake={(amount, method, reference) =>
                        run(() => takeVisitDeposit(visit.id, { amount, method, reference }), `Fee of ${formatKsh(amount)} taken.`)
                      }
                    />
                  ) : null}
                </>
              ) : null}
              {open && !hats.cashier ? (
                <p className={cn("text-[13px]", RX_MUTED)}>Payment is taken at the cash desk.</p>
              ) : null}
            </div>
          </Panel>

          {open && (clinical || hats.cashier || hats.dispense) ? (
            <Panel title="Add a product" description="Anything else they are buying on this visit.">
              <ClinicItemSearch
                label="Product"
                onPick={(item) => {
                  if (item.id) void run(() => addVisitProduct(visit.id, item.id as string, 1));
                }}
              />
            </Panel>
          ) : null}

          {paid && canManageClaims ? <ClaimPanel visit={visit} /> : null}

          {open && (hats.cashier || hats.reception) ? (
            <CancelVisit
              busy={busy}
              hasFee={held > 0}
              onCancel={(reason, left, depositBack) =>
                run(
                  () => cancelClinicVisit(visit.id, { reason, leftWithoutBeingSeen: left, depositBack }),
                  "Visit cancelled.",
                )
              }
            />
          ) : null}
        </aside>
      </div>

      {rx ? <PrintablePrescription rx={rx} visit={visit} shopName={shopName} /> : null}

      {paying ? (
        <ClinicPayDialog
          visit={visit}
          mayDispense={hats.dispense}
          onClose={() => setPaying(false)}
          onPaid={(v) => {
            setPaying(false);
            setVisit(v);
            toast.success(`Visit ${v.number} paid.`);
          }}
        />
      ) : null}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--op-accent,#1d4b3b)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Today
    </button>
  );
}

function GivenHere({ busy, onGive }: { busy: boolean; onGive: (itemId: string, quantity: number) => Promise<boolean> }) {
  const [item, setItem] = useState<{ id: string; name: string } | null>(null);
  const [qty, setQty] = useState("1");
  return (
    <Panel
      title="A medicine given here"
      description="An injection, a nebuliser, a cream put on in the room. It goes on the bill as a medicine, so its lot, expiry and class are checked at payment."
    >
      {item ? (
        <div className="flex flex-wrap items-end gap-2">
          <p className={cn("min-w-[12rem] flex-1 text-sm font-medium", RX_INK)}>{item.name}</p>
          <Field label="How many" className="w-28">
            <input className={RX_INPUT} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </Field>
          <Button
            type="button"
            disabled={busy || !(Number(qty) > 0)}
            onClick={async () => {
              if (await onGive(item.id, Number(qty))) {
                setItem(null);
                setQty("1");
              }
            }}
          >
            Put on the bill
          </Button>
          <Button type="button" variant="outline" onClick={() => setItem(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <ClinicItemSearch
          label="Medicine"
          placeholder="Type the medicine's name"
          onPick={(picked) => {
            if (picked.id) setItem({ id: picked.id, name: picked.name });
          }}
        />
      )}
    </Panel>
  );
}

type DraftLine = { key: string; itemId: string | null; medicineName: string; quantity: string; instructions: string };

function PrescriptionEditor({
  existing,
  busy,
  onSave,
}: {
  existing: Prescription | null;
  busy: boolean;
  onSave: (lines: PrescriptionLineInput[]) => Promise<boolean>;
}) {
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (existing?.lines ?? []).map((l) => ({
      key: l.id,
      itemId: l.itemId,
      medicineName: l.medicineName,
      quantity: String(l.quantity),
      instructions: l.instructions ?? "",
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const change = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  const save = async () => {
    const bad = lines.find((l) => !(Number(l.quantity) > 0));
    if (bad) {
      setProblem(`Enter how many of ${bad.medicineName}.`);
      return;
    }
    setProblem(null);
    const ok = await onSave(
      lines.map((l) => ({
        itemId: l.itemId,
        medicineName: l.medicineName,
        quantity: Number(l.quantity),
        instructions: l.instructions.trim() || null,
      })),
    );
    if (ok) setDirty(false);
  };

  return (
    <Panel
      title="Prescription"
      description="Written in your name. A medicine this shop does not stock stays on the printed prescription only."
    >
      {lines.length > 0 ? (
        <ul className={cn("mb-3 divide-y border-b", RX_RULE)}>
          {lines.map((l) => (
            <li key={l.key} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <div className="min-w-0">
                <p className={cn("font-medium", RX_INK)}>{l.medicineName}</p>
                {l.itemId ? null : <p className="text-[12.5px] font-medium text-[#8a3c0b]">Not stocked here</p>}
              </div>
              <label className="block text-sm">
                <span className="sr-only">Quantity of {l.medicineName}</span>
                <input
                  className={RX_INPUT}
                  value={l.quantity}
                  onChange={(e) => change(l.key, { quantity: e.target.value })}
                  inputMode="decimal"
                  placeholder="How many"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="sr-only">Directions for {l.medicineName}</span>
                <input
                  className={RX_INPUT}
                  value={l.instructions}
                  onChange={(e) => change(l.key, { instructions: e.target.value })}
                  maxLength={500}
                  placeholder="Directions: 1 tablet twice a day for 5 days"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setLines((prev) => prev.filter((x) => x.key !== l.key));
                  setDirty(true);
                }}
                className="min-h-8 justify-self-start text-[12.5px] font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-2"
              >
                Remove {l.medicineName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ClinicItemSearch
        label="Add a medicine"
        placeholder="Type the medicine's name"
        allowFreeText
        onPick={(item) => {
          if (!item.name) return;
          setLines((prev) => [
            ...prev,
            { key: `new-${prev.length}-${item.id ?? item.name}`, itemId: item.id, medicineName: item.name, quantity: "", instructions: "" },
          ]);
          setDirty(true);
        }}
      />
      {problem ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy || !dirty} onClick={save}>
          {existing ? "Save changes" : "Save prescription"}
        </Button>
        {dirty ? <span className="text-[13px] font-medium text-[#8a3c0b]">Not saved yet</span> : null}
      </div>
    </Panel>
  );
}

function PrescriptionView({ rx }: { rx: Prescription }) {
  return (
    <Panel
      title="Prescription"
      description={`Written by ${rx.prescriberName}${rx.prescriberRegNo ? `, reg. ${rx.prescriberRegNo}` : ""} on ${rx.prescribedOn}`}
      aside={
        <Chip tone={rx.status === "DISPENSED" || rx.status === "PREPARED" ? "good" : rx.status === "DECLINED" ? "quiet" : "live"}>
          {rx.status === "OPEN"
            ? "To prepare"
            : rx.status === "PREPARED"
              ? "Prepared"
              : rx.status === "DECLINED"
                ? "Not buying here"
                : "Dispensed"}
        </Chip>
      }
    >
      <ul className={cn("divide-y", RX_RULE)}>
        {rx.lines.map((l) => (
          <li key={l.id} className="py-2.5 first:pt-0 last:pb-0">
            <p className={cn("font-medium", RX_INK)}>
              {l.medicineName} <span className="tabular-nums">× {formatQty(l.quantity)}</span>
            </p>
            <p className={cn("text-[13px]", RX_MUTED)}>
              {[
                l.itemId ? (l.dispensingClass ? DISPENSING_CLASS_LABEL[l.dispensingClass] : "Not a medicine") : "Not stocked here",
                l.instructions ?? "No directions written",
              ].join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      {rx.preparedByName ? <p className={cn("mt-3 text-[13px]", RX_MUTED)}>Prepared by {rx.preparedByName}.</p> : null}
    </Panel>
  );
}

function PreparePanel({
  rx,
  busy,
  onPrepare,
}: {
  rx: Prescription;
  busy: boolean;
  onPrepare: (lines: Array<{ lineId: string; quantity: number }>) => Promise<boolean>;
}) {
  const stocked = rx.lines.filter((l) => l.itemId);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(stocked.map((l) => [l.id, String(l.quantity)])),
  );
  const [problem, setProblem] = useState<string | null>(null);
  if (stocked.length === 0) return null;
  const submit = async () => {
    for (const l of stocked) {
      const n = Number(qty[l.id] ?? "0");
      if (!Number.isFinite(n) || n < 0 || n > l.quantity) {
        setProblem(`${l.medicineName}: supply between 0 and ${formatQty(l.quantity)}.`);
        return;
      }
    }
    setProblem(null);
    await onPrepare(stocked.map((l) => ({ lineId: l.id, quantity: Number(qty[l.id] ?? "0") })));
  };
  return (
    <Panel
      title="Prepare this prescription"
      description="Check each medicine and how much you are supplying. Supplying less leaves a balance on the dispensing record. Nothing leaves stock until payment."
    >
      <ul className={cn("divide-y", RX_RULE)}>
        {stocked.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
            <div className="min-w-[12rem] flex-1">
              <p className={cn("font-medium", RX_INK)}>{l.medicineName}</p>
              <p className={cn("text-[13px]", l.dispensingClass === "UNCLASSIFIED" ? "font-semibold text-[#8f1616]" : RX_MUTED)}>
                {l.dispensingClass === "UNCLASSIFIED"
                  ? "Not classified yet. Classify it in Pharmacy, Medicines before it can be sold."
                  : `${formatQty(l.quantity)} prescribed · ${l.instructions ?? "no directions written"}`}
              </p>
            </div>
            <label className="block w-28 text-sm">
              <span className="sr-only">Quantity of {l.medicineName} to supply</span>
              <input
                className={RX_INPUT}
                value={qty[l.id] ?? ""}
                onChange={(e) => setQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
                inputMode="decimal"
              />
            </label>
          </li>
        ))}
      </ul>
      {problem ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <Button type="button" className="mt-3" disabled={busy} onClick={submit}>
        Put on the bill
      </Button>
    </Panel>
  );
}

function FeeFirst({
  busy,
  suggested,
  prominent,
  onTake,
}: {
  busy: boolean;
  suggested: number;
  prominent: boolean;
  onTake: (amount: number, method: string, reference: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : "");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  if (!open) {
    return (
      <Button type="button" variant={prominent ? "default" : "outline"} className="w-full" onClick={() => setOpen(true)}>
        Take the fee first
      </Button>
    );
  }
  return (
    <div className={cn("space-y-2 rounded-[2px] border p-3", RX_RULE)}>
      <p className={cn("text-[13px]", RX_MUTED)}>
        Held in the payer&apos;s name and taken off the bill at the end. If the visit is cancelled it is handed back or kept
        as credit.
      </p>
      <Field label="Fee">
        <input className={RX_INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Paid by">
        <select className={RX_INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="mpesa_manual">M-Pesa</option>
        </select>
      </Field>
      {method !== "cash" ? (
        <Field label="M-Pesa code">
          <input className={RX_INPUT} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} maxLength={32} />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !(Number(amount) >= 1)}
          onClick={async () => {
            if (await onTake(Number(amount), method, method === "cash" ? null : reference.trim() || null)) setOpen(false);
          }}
        >
          Take fee
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CancelVisit({
  busy,
  hasFee,
  onCancel,
}: {
  busy: boolean;
  hasFee: boolean;
  onCancel: (reason: string | null, left: boolean, depositBack: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [back, setBack] = useState("credit");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 text-[13px] font-medium text-[#8f1616] underline underline-offset-2"
      >
        Cancel this visit
      </button>
    );
  }
  return (
    <Panel title="Cancel this visit?" description="Nothing is charged. The visit leaves the Today list.">
      <div className="space-y-3">
        <Field label="Why" hint="For example: left before being seen.">
          <input className={RX_INPUT} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
        {hasFee ? (
          <Field label="The fee already paid">
            <select className={RX_INPUT} value={back} onChange={(e) => setBack(e.target.value)}>
              <option value="credit">Keep as credit for their next visit</option>
              <option value="cash">Hand back in cash</option>
              <option value="mpesa_manual">Send back by M-Pesa</option>
            </select>
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => onCancel(reason.trim() || null, /left|walk/i.test(reason), hasFee ? back : null)}
          >
            Cancel the visit
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Keep it open
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ClaimPanel({ visit }: { visit: ClinicVisit }) {
  const [schemes, setSchemes] = useState<PharmacyScheme[] | null>(null);
  const [schemeId, setSchemeId] = useState("");
  const [memberNo, setMemberNo] = useState("");
  const [auth, setAuth] = useState("");
  const [amount, setAmount] = useState(String(visit.total));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchSchemes()
      .then((list) => setSchemes(list.filter((s) => s.active)))
      .catch(() => setSchemes([]));
  }, []);
  if (!schemes || schemes.length === 0) return null;
  if (done) {
    return (
      <Panel title="Scheme claim">
        <p className={cn("text-sm", RX_INK)}>Claim recorded. Follow it up under Pharmacy, Scheme claims.</p>
      </Panel>
    );
  }
  const submit = async () => {
    if (!schemeId || !memberNo.trim() || !(Number(amount) > 0)) {
      setError("Choose the scheme and enter the member number and the amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await claimClinicVisit(visit.id, {
        schemeId,
        memberNo: memberNo.trim(),
        authorisationCode: auth.trim() || null,
        amountClaimed: Number(amount),
      });
      setDone(true);
    } catch (err) {
      setError(errorText(err, "Could not record the claim. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Scheme claim" description="An insurer's or employer's share of this bill, consultation included.">
      <div className="space-y-3">
        <Field label="Scheme">
          <select className={RX_INPUT} value={schemeId} onChange={(e) => setSchemeId(e.target.value)}>
            <option value="">Choose</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Member number">
          <input className={RX_INPUT} value={memberNo} onChange={(e) => setMemberNo(e.target.value)} maxLength={64} autoComplete="off" />
        </Field>
        <Field label="Authorisation code" hint="If the scheme gave one.">
          <input className={RX_INPUT} value={auth} onChange={(e) => setAuth(e.target.value)} maxLength={64} autoComplete="off" />
        </Field>
        <Field label="Amount claimed">
          <input className={RX_INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="button" disabled={busy} onClick={submit}>
          {busy ? "Recording…" : "Record claim"}
        </Button>
      </div>
    </Panel>
  );
}

function PrintablePrescription({ rx, visit, shopName }: { rx: Prescription; visit: ClinicVisit; shopName: string }) {
  return (
    <div className="clinic-print" aria-hidden="true">
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{shopName}</h1>
      <p style={{ margin: "4px 0 16px" }}>Prescription · {rx.prescribedOn}</p>
      <p style={{ margin: 0 }}>
        <strong>Patient:</strong> {visit.patient.name}
        {patientDetail({ ...visit.patient, phone: null }) ? ` (${patientDetail({ ...visit.patient, phone: null })})` : ""}
      </p>
      <p style={{ margin: "0 0 16px" }}>
        <strong>Prescribed by:</strong> {rx.prescriberName}
        {rx.prescriberRegNo ? `, reg. ${rx.prescriberRegNo}` : ""}
      </p>
      <ol style={{ paddingLeft: 20, margin: 0 }}>
        {rx.lines.map((l) => (
          <li key={l.id} style={{ marginBottom: 10 }}>
            <strong>
              {l.medicineName} × {formatQty(l.quantity)}
            </strong>
            <br />
            {l.instructions ?? ""}
          </li>
        ))}
      </ol>
      <p style={{ marginTop: 40 }}>Signature: ______________________</p>
    </div>
  );
}

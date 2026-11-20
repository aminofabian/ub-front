"use client";

import { ClipboardList } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  RX_INK,
  RX_META,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
  formatDate,
  formatDateTime,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  addDispensingCorrection,
  fetchDispensingRecords,
  fetchPharmacyProfile,
  verifyDispensingRecord,
  type DispensingRecord,
} from "@/lib/pharmacy-api";
import { SchemeClaimForm } from "@/components/pharmacy/pharmacy-claims";
import { printDispensingLabels } from "@/lib/pharmacy-labels";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PharmacyDispensingLog({ canDispense = false }: { canDispense?: boolean }) {
  const { branchId, business, me } = useDashboard();
  const [secondCheck, setSecondCheck] = useState(false);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPharmacyProfile()
      .then((p) => alive && setSecondCheck(p.secondCheckEnabled ?? false))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const replaceRecord = (updated: DispensingRecord) =>
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  const act = async (run: () => Promise<DispensingRecord>, fallback: string) => {
    setBusy(true);
    try {
      replaceRecord(await run());
      setActionError("");
      setNote("");
      setCorrecting(false);
    } catch (err) {
      setActionError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDay(d);
  });
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchDispensingRecords({ from, to, branchId: branchId || null, page, size: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setRecords(res.records);
        setTotal(res.total);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load the dispensing log.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to, branchId, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Panel
      title="Dispensing log"
      description="Every prescription dispensed at the till. Each time someone opens this log it is noted in the activity log."
      flush
    >
      <div className={cn("flex flex-wrap items-end gap-3 border-b px-4 py-3", RX_RULE)}>
        <Field label="From">
          <input className={RX_INPUT} type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </Field>
        <Field label="To">
          <input className={RX_INPUT} type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </Field>
        <p className={cn("pb-2 text-[13px]", RX_MUTED)}>
          {total} {total === 1 ? "record" : "records"}
        </p>
      </div>

      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {loading && records.length === 0 ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
      {!loading && records.length === 0 && !error ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing dispensed in this period"
          body="A record is written when a prescription-only medicine is sold at the till."
        />
      ) : null}

      {records.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className={cn("border-b", RX_RULE)}>
                <th className={RX_TH}>When</th>
                <th className={RX_TH}>Receipt</th>
                <th className={RX_TH}>Medicines</th>
                <th className={RX_TH}>Prescriber</th>
                <th className={RX_TH}>Dispensed by</th>
                <th className={RX_TH}>Status</th>
                <th className={cn(RX_TH, "text-right")}>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const expanded = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={RX_ROW}>
                      <td className={cn(RX_TD, RX_META)}>{formatDateTime(r.createdAt)}</td>
                      <td className={cn(RX_TD, "font-mono")}>
                        {r.receiptNo != null ? `#${r.receiptNo}` : r.saleId.slice(0, 8)}
                      </td>
                      <td className={RX_TD}>
                        {r.lines.map((l) => `${l.itemName} × ${formatQty(l.quantity)}`).join(", ")}
                      </td>
                      <td className={RX_TD}>{r.prescriberName}</td>
                      <td className={RX_TD}>
                        {r.dispensedByName ?? ""}
                        {r.approvedByPin ? <span className={cn("block text-[12px]", RX_MUTED)}>Approved by PIN</span> : null}
                      </td>
                      <td className={RX_TD}>
                        {r.voidedAt ? (
                          <Chip tone="warn">Voided</Chip>
                        ) : r.verifiedAt ? (
                          <Chip tone="good">Checked</Chip>
                        ) : secondCheck ? (
                          <Chip tone="live">Awaiting check</Chip>
                        ) : (
                          <Chip tone="quiet">Dispensed</Chip>
                        )}
                      </td>
                      <td className={cn(RX_TD, "text-right")}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 min-w-[5.5rem] rounded-[2px] px-3.5 sm:h-9"
                          aria-expanded={expanded}
                          onClick={() => {
                            setOpen(expanded ? null : r.id);
                            setNote("");
                            setActionError("");
                            setCorrecting(false);
                          }}
                        >
                          {expanded ? "Hide" : "Details"}
                        </Button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className={RX_ROW}>
                        <td colSpan={7} className="bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_3%,transparent)] px-4 py-4">
                          <ul className="space-y-2 text-sm">
                            {r.lines.map((l, i) => (
                              <li key={`${l.itemId}-${i}`} className="grid gap-x-4 sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                                <span>
                                  <span className={cn("font-medium", RX_INK)}>{l.itemName}</span>
                                  <span className="tabular-nums"> × {formatQty(l.quantity)}</span>
                                  {l.quantityPrescribed != null ? (
                                    <span className={cn("block text-[12.5px]", RX_MUTED)}>
                                      {formatQty(l.quantityPrescribed)} prescribed, {formatQty(l.quantityPrescribed - l.quantity)} still owed
                                    </span>
                                  ) : null}
                                </span>
                                <span className={RX_MUTED}>
                                  {l.instructions ?? "No directions recorded"}
                                  {l.lotNumbers ? <span className="ml-2 font-mono text-[12.5px]">Lot {l.lotNumbers}</span> : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <dl className={cn("mt-4 grid gap-x-8 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4", RX_RULE)}>
                            <Detail label="Patient" value={[r.patientName, r.patientPhone].filter(Boolean).join(", ")} />
                            <Detail label="Prescription" value={[r.prescriptionRef, formatDate(r.prescriptionDate)].filter(Boolean).join(", ")} />
                            <Detail label="Prescriber registration no." value={r.prescriberRegNo} />
                            <Detail label="Rung up by" value={r.soldByName} />
                            <Detail
                              label="Dispensed by"
                              value={[r.dispensedByName, r.dispensedByTitle, r.dispensedByRegistrationNo].filter(Boolean).join(", ")}
                            />
                            {r.verifiedAt || secondCheck ? (
                              <Detail
                                label="Second check"
                                value={r.verifiedAt ? [r.verifiedByName, formatDateTime(r.verifiedAt)].filter(Boolean).join(", ") : "Not done yet"}
                              />
                            ) : null}
                          </dl>
                          {(r.corrections ?? []).length > 0 ? (
                            <ul className={cn("mt-4 space-y-2 border-t pt-4 text-sm", RX_RULE)}>
                              {(r.corrections ?? []).map((c) => (
                                <li key={c.id}>
                                  <span className={cn("block text-[12.5px]", RX_MUTED)}>
                                    Correction by {[c.byName, formatDateTime(c.createdAt)].filter(Boolean).join(", ")}
                                  </span>
                                  <span className="whitespace-pre-wrap">{c.note}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className={cn("mt-4 flex flex-wrap items-start gap-2 border-t pt-4", RX_RULE)}>
                            {canDispense && !r.voidedAt && !r.verifiedAt && r.dispensedByUserId !== me?.id ? (
                              <Button
                                type="button"
                                className="h-11 rounded-[2px] px-3.5 sm:h-9"
                                disabled={busy}
                                onClick={() => void act(() => verifyDispensingRecord(r.id), "Could not mark this as checked.")}
                              >
                                I have checked this
                              </Button>
                            ) : null}
                            {!r.voidedAt ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-[2px] px-3.5 sm:h-9"
                                onClick={() => printDispensingLabels(r, business?.name?.trim() || "Pharmacy")}
                              >
                                Print labels
                              </Button>
                            ) : null}
                            {canDispense && !correcting ? (
                              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setCorrecting(true)}>
                                Add a correction
                              </Button>
                            ) : null}
                            {canDispense && !r.voidedAt ? <SchemeClaimForm key={r.id} recordId={r.id} /> : null}
                            {canDispense && correcting ? (
                              <form
                                className="flex basis-full flex-wrap items-end gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!note.trim()) {
                                    setActionError("Say what was written wrongly and what is right.");
                                    return;
                                  }
                                  void act(() => addDispensingCorrection(r.id, note.trim()), "Could not save the correction.");
                                }}
                              >
                                <Field
                                  label="What was written wrongly, and what is right"
                                  hint="The record is not changed. Your note is kept beside it with your name."
                                  className="min-w-[16rem] max-w-2xl flex-1"
                                >
                                  <input className={RX_INPUT} value={note} maxLength={1000} autoFocus onChange={(e) => setNote(e.target.value)} />
                                </Field>
                                <Button type="submit" className="mb-[1.6rem] h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
                                  Save correction
                                </Button>
                                <Button type="button" variant="outline" className="mb-[1.6rem] h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setCorrecting(false)}>
                                  Cancel
                                </Button>
                              </form>
                            ) : null}
                            {actionError ? <p role="alert" className="basis-full text-sm text-destructive">{actionError}</p> : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {total > PAGE_SIZE ? (
        <div className={cn("flex items-center justify-between border-t px-4 py-2.5 text-sm", RX_RULE, RX_MUTED)}>
          <span>
            Page {page + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className={cn("text-[12px]", RX_MUTED)}>{label}</dt>
      <dd className={RX_INK}>{value && value.trim() ? value : <span className={RX_MUTED}>Not recorded</span>}</dd>
    </div>
  );
}

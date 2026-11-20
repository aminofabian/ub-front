"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  fetchAdverseEvents,
  fetchSupplierLicences,
  fetchTemperatures,
  markAdverseEventReported,
  recordAdverseEvent,
  recordTemperature,
  saveSupplierLicence,
  type AdverseEvent,
  type AdverseEventSeverity,
  type SupplierLicence,
  type TemperatureReading,
} from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

/**
 * Starting ranges only. The pharmacist sets the range that the products in that storage need,
 * from their packs; these two are common defaults, not a rule Kiosk enforces.
 */
const STORAGE_PRESETS = [
  { name: "Fridge", min: "2", max: "8" },
  { name: "Shelves", min: "15", max: "25" },
];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The records a pharmacy keeps beside selling: storage temperatures, suppliers' licences, and
 * notes on suspected adverse reactions. Kiosk stores what you enter and reports nothing for you.
 */
export function PharmacyCompliance({
  canManage,
  canReadRecords,
}: {
  canManage: boolean;
  canReadRecords: boolean;
}) {
  return (
    <>
      <TemperaturePanel />
      <SupplierLicencePanel canManage={canManage} />
      <AdverseEventPanel canManage={canManage} canReadRecords={canReadRecords} />
    </>
  );
}

function TemperaturePanel() {
  const { branchId, branches } = useDashboard();
  const [rows, setRows] = useState<TemperatureReading[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [storage, setStorage] = useState(STORAGE_PRESETS[0]!.name);
  const [min, setMin] = useState(STORAGE_PRESETS[0]!.min);
  const [max, setMax] = useState(STORAGE_PRESETS[0]!.max);
  const [reading, setReading] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchTemperatures(branchId || null)
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load temperature readings.")));
    return () => {
      alive = false;
    };
  }, [branchId, reloadKey]);

  const readingN = reading.trim() === "" ? null : Number(reading);
  const minN = Number(min);
  const maxN = Number(max);
  const outOfRange =
    readingN != null && Number.isFinite(readingN) && Number.isFinite(minN) && Number.isFinite(maxN)
      ? readingN < minN || readingN > maxN
      : false;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "";

  const submit = async () => {
    if (!branchId) {
      setFormError("Choose a branch at the top of the page first.");
      return;
    }
    if (!storage.trim()) {
      setFormError("Say which fridge or shelf this is.");
      return;
    }
    if (readingN == null || !Number.isFinite(readingN) || !Number.isFinite(minN) || !Number.isFinite(maxN)) {
      setFormError("Enter the reading and the allowed range as numbers.");
      return;
    }
    if (minN > maxN) {
      setFormError("The lowest allowed temperature is above the highest.");
      return;
    }
    if (outOfRange && !note.trim()) {
      setFormError("This reading is outside the range. Say what you did about it.");
      return;
    }
    setBusy(true);
    try {
      await recordTemperature({
        branchId,
        storageName: storage.trim(),
        readingC: readingN,
        minC: minN,
        maxC: maxN,
        actionNote: note.trim() || undefined,
      });
      toast.success("Reading saved");
      setReading("");
      setNote("");
      setFormError("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errorText(err, "Could not save the reading."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Storage temperature"
      description="Log each fridge and shelf reading. A reading cannot be changed once saved. Set the range your products need from their packs."
      flush
    >
      <form
        className={cn("grid gap-3 border-b px-4 py-3 sm:grid-cols-2 lg:grid-cols-6", RX_RULE)}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Storage" className="lg:col-span-2">
          <input
            className={RX_INPUT}
            list="rx-storage-presets"
            value={storage}
            maxLength={64}
            onChange={(e) => {
              const value = e.target.value;
              setStorage(value);
              const preset = STORAGE_PRESETS.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
              if (preset) {
                setMin(preset.min);
                setMax(preset.max);
              }
            }}
          />
          <datalist id="rx-storage-presets">
            {STORAGE_PRESETS.map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Reading (°C)">
          <input className={RX_INPUT} inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} />
        </Field>
        <Field label="Lowest allowed">
          <input className={RX_INPUT} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
        </Field>
        <Field label="Highest allowed">
          <input className={RX_INPUT} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" className="w-full h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
            {busy ? "Saving…" : "Save reading"}
          </Button>
        </div>
        {outOfRange ? (
          <Field label="What did you do about it?" className="sm:col-span-2 lg:col-span-6">
            <input className={RX_INPUT} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : null}
        {formError ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-6">
            {formError}
          </p>
        ) : null}
      </form>

      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {rows == null && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
      {rows != null && rows.length === 0 ? (
        <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>No readings in the last 30 days.</p>
      ) : null}
      {rows != null && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className={cn("border-b", RX_RULE)}>
                <th className={RX_TH}>When</th>
                <th className={RX_TH}>Storage</th>
                <th className={cn(RX_TH, "text-right")}>Reading</th>
                <th className={RX_TH}>Allowed</th>
                <th className={RX_TH}>By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={RX_ROW}>
                  <td className={cn(RX_TD, RX_META)}>{formatDateTime(t.recordedAt)}</td>
                  <td className={RX_TD}>
                    {t.storageName}
                    {!branchId && branchName(t.branchId) ? (
                      <span className={cn("block text-[12.5px]", RX_MUTED)}>{branchName(t.branchId)}</span>
                    ) : null}
                    {t.actionNote ? <span className={cn("block text-[13px]", RX_MUTED)}>{t.actionNote}</span> : null}
                  </td>
                  <td className={cn(RX_TD, "text-right tabular-nums")}>
                    <span className={cn("font-semibold", t.outOfRange ? "text-[#8A4129]" : RX_INK)}>{t.readingC} °C</span>
                    {t.outOfRange ? (
                      <span className="ml-2">
                        <Chip tone="warn">Out of range</Chip>
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(RX_TD, "tabular-nums")}>
                    {t.minC} to {t.maxC} °C
                  </td>
                  <td className={RX_TD}>{t.recordedByName ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function SupplierLicencePanel({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<SupplierLicence[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [licenceNo, setLicenceNo] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSupplierLicences()
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load suppliers.")));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const save = async (supplierId: string) => {
    setBusy(true);
    try {
      await saveSupplierLicence(supplierId, { licenceNo: licenceNo.trim() || null, expiresOn: expiresOn || null });
      toast.success("Saved");
      setEditId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err, "Could not save the licence."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Supplier licences"
      description="The wholesale licence each supplier showed you. Kiosk records it and warns when it is about to lapse; it does not check it with the regulator."
      flush
    >
      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {rows == null && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
      {rows != null && rows.length === 0 ? (
        <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>No suppliers yet. Add them under Suppliers.</p>
      ) : null}
      {rows != null && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className={cn("border-b", RX_RULE)}>
                <th className={RX_TH}>Supplier</th>
                <th className={RX_TH}>Licence number</th>
                <th className={RX_TH}>Expires</th>
                <th className={cn(RX_TH, "text-right")}>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const editing = editId === s.supplierId;
                return (
                  <tr key={s.supplierId} className={RX_ROW}>
                    <td className={cn(RX_TD, "font-medium", RX_INK)}>{s.supplierName}</td>
                    <td className={RX_TD}>
                      {editing ? (
                        <input className={RX_INPUT} aria-label="Licence number" value={licenceNo} maxLength={64} onChange={(e) => setLicenceNo(e.target.value)} />
                      ) : (
                        s.licenceNo ?? <span className={RX_MUTED}>Not recorded</span>
                      )}
                    </td>
                    <td className={RX_TD}>
                      {editing ? (
                        <input className={RX_INPUT} aria-label="Expiry date" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
                      ) : s.expiresOn ? (
                        <>
                          {formatDate(s.expiresOn)}
                          {s.daysLeft != null && s.daysLeft < 0 ? (
                            <span className="ml-2">
                              <Chip tone="warn">Lapsed</Chip>
                            </span>
                          ) : s.daysLeft != null && s.daysLeft <= 60 ? (
                            <span className="ml-2">
                              <Chip tone="warn">{s.daysLeft} days left</Chip>
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className={RX_MUTED}>Not recorded</span>
                      )}
                    </td>
                    <td className={cn(RX_TD, "text-right")}>
                      {!canManage ? null : editing ? (
                        <span className="inline-flex gap-2">
                          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setEditId(null)}>
                            Cancel
                          </Button>
                          <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void save(s.supplierId)}>
                            Save
                          </Button>
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-[2px] px-3.5 sm:h-9"
                          onClick={() => {
                            setEditId(s.supplierId);
                            setLicenceNo(s.licenceNo ?? "");
                            setExpiresOn(s.expiresOn ?? "");
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

const SEVERITY_LABEL: Record<AdverseEventSeverity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
};

function AdverseEventPanel({ canManage, canReadRecords }: { canManage: boolean; canReadRecords: boolean }) {
  const [rows, setRows] = useState<AdverseEvent[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [productName, setProductName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [severity, setSeverity] = useState<AdverseEventSeverity>("MILD");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState("");

  useEffect(() => {
    if (!canReadRecords) return;
    let alive = true;
    fetchAdverseEvents()
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load the notes.")));
    return () => {
      alive = false;
    };
  }, [canReadRecords, reloadKey]);

  const submit = async () => {
    if (!productName.trim() || !description.trim()) {
      setFormError("Enter the product and what happened.");
      return;
    }
    setBusy(true);
    try {
      await recordAdverseEvent({
        occurredOn,
        productName: productName.trim(),
        lotNumber: lotNumber.trim() || undefined,
        description: description.trim(),
        severity,
        actionTaken: actionTaken.trim() || undefined,
      });
      toast.success("Note saved");
      setProductName("");
      setLotNumber("");
      setDescription("");
      setActionTaken("");
      setFormError("");
      setAdding(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errorText(err, "Could not save the note."));
    } finally {
      setBusy(false);
    }
  };

  const markReported = async (id: string) => {
    setBusy(true);
    try {
      await markAdverseEventReported(id, externalRef);
      setReportId(null);
      setExternalRef("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err, "Could not update the note."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Suspected reactions and quality complaints"
      description="Write down what a patient reports, or a fault you find in a product. Reporting it to the regulator or the manufacturer is yours to do; mark the note once you have."
      aside={
        !adding ? (
          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAdding(true)}>
            Add a note
          </Button>
        ) : null
      }
      flush
    >
      {adding ? (
      <form
        className={cn("grid gap-3 border-b px-4 py-3 sm:grid-cols-2 lg:grid-cols-4", RX_RULE)}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Product" className="lg:col-span-2">
          <input className={RX_INPUT} value={productName} maxLength={255} onChange={(e) => setProductName(e.target.value)} />
        </Field>
        <Field label="Lot number">
          <input className={RX_INPUT} value={lotNumber} maxLength={64} onChange={(e) => setLotNumber(e.target.value)} />
        </Field>
        <Field label="Date it happened">
          <input className={RX_INPUT} type="date" value={occurredOn} max={todayIso()} onChange={(e) => setOccurredOn(e.target.value)} />
        </Field>
        <Field label="What happened" className="sm:col-span-2 lg:col-span-3">
          <textarea className={cn(RX_INPUT, "h-20 py-2 sm:h-20")} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="How serious">
          <select className={RX_INPUT} value={severity} onChange={(e) => setSeverity(e.target.value as AdverseEventSeverity)}>
            {(Object.keys(SEVERITY_LABEL) as AdverseEventSeverity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What you did" className="sm:col-span-2 lg:col-span-3">
          <input className={RX_INPUT} value={actionTaken} maxLength={500} onChange={(e) => setActionTaken(e.target.value)} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" className="h-11 flex-1 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
            {busy ? "Saving…" : "Save note"}
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-4">
            {formError}
          </p>
        ) : null}
      </form>
      ) : null}

      {!canReadRecords ? (
        <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>
          You can add notes. Reading them needs permission to read dispensing records.
        </p>
      ) : null}
      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {canReadRecords && rows != null && rows.length === 0 ? (
        <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>No notes yet.</p>
      ) : null}
      {canReadRecords && rows != null && rows.length > 0 ? (
        <ul>
          {rows.map((e) => (
            <li key={e.id} className={cn("border-b px-4 py-3 text-sm last:border-0", RX_RULE)}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={cn("font-medium", RX_INK)}>{e.productName}</span>
                {e.lotNumber ? <span className={cn("font-mono text-[12.5px]", RX_MUTED)}>lot {e.lotNumber}</span> : null}
                <Chip tone={e.severity === "MILD" ? "quiet" : "warn"}>{SEVERITY_LABEL[e.severity]}</Chip>
                {e.reportedExternally ? (
                  <Chip tone="good">Reported{e.externalRef ? ` · ${e.externalRef}` : ""}</Chip>
                ) : (
                  <Chip tone="quiet">Not reported yet</Chip>
                )}
                <span className={cn("ml-auto text-[12.5px]", RX_MUTED)}>
                  {formatDate(e.occurredOn)}
                  {e.recordedByName ? ` · ${e.recordedByName}` : ""}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap">{e.description}</p>
              {e.actionTaken ? <p className={cn("mt-1 text-[13px]", RX_MUTED)}>Done: {e.actionTaken}</p> : null}
              {canManage && !e.reportedExternally ? (
                reportId === e.id ? (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Field label="Reference from the report (optional)">
                      <input className={RX_INPUT} value={externalRef} maxLength={64} onChange={(ev) => setExternalRef(ev.target.value)} />
                    </Field>
                    <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setReportId(null)}>
                      Cancel
                    </Button>
                    <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void markReported(e.id)}>
                      Mark as reported
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-11 rounded-[2px] px-3.5 sm:h-9"
                    onClick={() => {
                      setReportId(e.id);
                      setExternalRef("");
                    }}
                  >
                    I have reported this
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

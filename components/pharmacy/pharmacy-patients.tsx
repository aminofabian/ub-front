"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPatient,
  fetchPatientHistory,
  fetchPatients,
  removePatient,
  updatePatient,
  type DispensingRecord,
  type PharmacyPatient,
} from "@/lib/pharmacy-api";

const PAGE_SIZE = 25;

type Editing = { patient: PharmacyPatient | null };

/**
 * Patient profiles: who the pharmacy dispenses to regularly, what they are allergic to, and what
 * they have been given. Opening a profile is noted in the activity log.
 */
export function PharmacyPatients({ canWrite, canManage }: { canWrite: boolean; canManage: boolean }) {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(0);
  const [patients, setPatients] = useState<PharmacyPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPatients({ q: applied, page, size: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setPatients(res.patients);
        setTotal(res.total);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load patients.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [applied, page, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (openId) {
    return (
      <PatientHistory
        patientId={openId}
        canWrite={canWrite}
        canManage={canManage}
        onBack={() => {
          setOpenId(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <Panel
      title="Patients"
      description="Profiles for people you dispense to regularly. Each time someone opens this list or a profile, it is noted in the activity log."
      aside={
        canWrite ? (
          <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setEditing({ patient: null })}>
            Add patient
          </Button>
        ) : null
      }
      flush
    >
      <form
        className={cn("flex flex-wrap items-end gap-3 border-b px-4 py-3", RX_RULE)}
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setApplied(q);
        }}
      >
        <Field label="Find by name or phone" className="min-w-[14rem] flex-1">
          <input className={RX_INPUT} value={q} onChange={(e) => setQ(e.target.value)} maxLength={64} />
        </Field>
        <Button type="submit" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9">
          Search
        </Button>
        <p className={cn("pb-2 text-[13px]", RX_MUTED)}>
          {total} {total === 1 ? "patient" : "patients"}
        </p>
      </form>

      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {loading && patients.length === 0 ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
      {!loading && patients.length === 0 && !error ? (
        <EmptyState
          icon={Users}
          title={applied ? "No patient matches that" : "No patient profiles yet"}
          body="Add a profile for someone you dispense to regularly. At the till, typing their phone number links the sale to it."
        />
      ) : null}

      {patients.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className={cn("border-b", RX_RULE)}>
                <th className={RX_TH}>Name</th>
                <th className={RX_TH}>Phone</th>
                <th className={RX_TH}>Allergies</th>
                <th className={RX_TH}>Refill reminders</th>
                <th className={cn(RX_TH, "text-right")}>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className={RX_ROW}>
                  <td className={cn(RX_TD, "font-medium", RX_INK)}>{p.name}</td>
                  <td className={cn(RX_TD, "font-mono text-[13px]")}>{p.phone ?? ""}</td>
                  <td className={RX_TD}>{p.allergies ?? <span className={RX_MUTED}>None recorded</span>}</td>
                  <td className={RX_TD}>
                    {p.reminderConsent ? <Chip tone="good">Agreed</Chip> : <Chip tone="quiet">Not agreed</Chip>}
                  </td>
                  <td className={cn(RX_TD, "text-right")}>
                    <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setOpenId(p.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
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

      {editing ? (
        <PatientDialog
          patient={editing.patient}
          onDismiss={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setReloadKey((k) => k + 1);
            setOpenId(saved.id);
          }}
        />
      ) : null}
    </Panel>
  );
}

function PatientHistory({
  patientId,
  canWrite,
  canManage,
  onBack,
}: {
  patientId: string;
  canWrite: boolean;
  canManage: boolean;
  onBack: () => void;
}) {
  const [patient, setPatient] = useState<PharmacyPatient | null>(null);
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchPatientHistory(patientId)
      .then((res) => {
        if (!alive) return;
        setPatient(res.patient);
        setRecords(res.records);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not open this profile.")));
    return () => {
      alive = false;
    };
  }, [patientId, reloadKey]);

  const remove = async () => {
    setBusy(true);
    try {
      await removePatient(patientId);
      toast.success("Profile removed");
      onBack();
    } catch (err) {
      setError(errorText(err, "Could not remove this profile."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div>
        <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={onBack}>
          Back to patients
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {patient ? (
        <Panel
          title={patient.name}
          description={patient.phone ?? "No phone number recorded"}
          aside={
            <div className="flex gap-2">
              {canWrite ? (
                <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
              {canManage ? (
                <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setConfirmRemove(true)}>
                  Remove
                </Button>
              ) : null}
            </div>
          }
        >
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className={cn("text-[12px]", RX_MUTED)}>Allergies</dt>
              <dd className={cn(patient.allergies ? "font-medium text-[#8A4129]" : RX_MUTED)}>
                {patient.allergies ?? "None recorded"}
              </dd>
            </div>
            <div>
              <dt className={cn("text-[12px]", RX_MUTED)}>Date of birth</dt>
              <dd className={RX_INK}>{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : <span className={RX_MUTED}>Not recorded</span>}</dd>
            </div>
            <div>
              <dt className={cn("text-[12px]", RX_MUTED)}>Refill reminders</dt>
              <dd className={RX_INK}>
                {patient.reminderConsent
                  ? `Agreed${patient.reminderConsentAt ? ` on ${formatDate(patient.reminderConsentAt)}` : ""}`
                  : "Has not agreed"}
              </dd>
            </div>
            <div>
              <dt className={cn("text-[12px]", RX_MUTED)}>Notes</dt>
              <dd className={RX_INK}>{patient.notes ?? <span className={RX_MUTED}>None</span>}</dd>
            </div>
          </dl>
          {confirmRemove ? (
            <div className={cn("mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-sm", RX_RULE)}>
              <p className="min-w-0 flex-1">
                Remove this profile? Past dispensing records keep the name and phone typed on them.
              </p>
              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setConfirmRemove(false)}>
                Keep
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 text-[#8A4129] sm:h-9" disabled={busy} onClick={() => void remove()}>
                Remove profile
              </Button>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {patient ? (
        <Panel title="Dispensed to this patient" description="Newest first, up to 200 records." flush>
          {records.length === 0 ? (
            <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>
              Nothing yet. A sale is filed here when this profile is chosen in the dispensing dialog.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className={cn("border-b", RX_RULE)}>
                    <th className={RX_TH}>When</th>
                    <th className={RX_TH}>Medicines</th>
                    <th className={RX_TH}>Prescriber</th>
                    <th className={RX_TH}>Dispensed by</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className={RX_ROW}>
                      <td className={cn(RX_TD, RX_META)}>
                        {formatDateTime(r.createdAt)}
                        {r.voidedAt ? (
                          <span className="ml-2">
                            <Chip tone="warn">Voided</Chip>
                          </span>
                        ) : null}
                      </td>
                      <td className={RX_TD}>
                        {r.lines.map((l, i) => (
                          <span key={`${l.itemId}-${i}`} className="block">
                            {l.itemName} × {formatQty(l.quantity)}
                            {l.quantityPrescribed != null ? (
                              <span className={cn("ml-2 text-[12.5px]", RX_MUTED)}>of {formatQty(l.quantityPrescribed)} prescribed</span>
                            ) : null}
                            {l.instructions ? <span className={cn("block text-[12.5px]", RX_MUTED)}>{l.instructions}</span> : null}
                          </span>
                        ))}
                      </td>
                      <td className={RX_TD}>{r.prescriberName}</td>
                      <td className={RX_TD}>{r.dispensedByName ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {editing && patient ? (
        <PatientDialog
          patient={patient}
          onDismiss={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}
    </>
  );
}

function PatientDialog({
  patient,
  onDismiss,
  onSaved,
}: {
  patient: PharmacyPatient | null;
  onDismiss: () => void;
  onSaved: (saved: PharmacyPatient) => void;
}) {
  const [name, setName] = useState(patient?.name ?? "");
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? "");
  const [allergies, setAllergies] = useState(patient?.allergies ?? "");
  const [notes, setNotes] = useState(patient?.notes ?? "");
  const [consent, setConsent] = useState(patient?.reminderConsent ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setError("Enter the patient's name.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth || null,
        allergies: allergies.trim() || null,
        notes: notes.trim() || null,
        reminderConsent: consent,
      };
      const saved = patient ? await updatePatient(patient.id, body) : await createPatient(body);
      toast.success("Saved");
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, "Could not save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onDismiss();
      }}
    >
      <DialogContent side="center" className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle>{patient ? "Edit patient" : "Add patient"}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Record only what the patient told you and agreed to have kept.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <input className={RX_INPUT} value={name} onChange={(e) => setName(e.target.value)} maxLength={191} autoComplete="off" autoFocus />
            </Field>
            <Field label="Phone">
              <input className={RX_INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} inputMode="tel" autoComplete="off" />
            </Field>
            <Field label="Date of birth">
              <input className={RX_INPUT} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </Field>
            <Field label="Allergies" hint="Shown to whoever dispenses. Kiosk does not check medicines against this." className="sm:col-span-2">
              <input className={RX_INPUT} value={allergies} onChange={(e) => setAllergies(e.target.value)} maxLength={500} autoComplete="off" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                className={cn(RX_INPUT, "h-20 py-2 sm:h-20")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
              />
            </Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>The patient agreed to be contacted when a refill is due.</span>
            </label>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onDismiss}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

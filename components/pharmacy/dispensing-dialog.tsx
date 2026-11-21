"use client";

import { Pill } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTillPatient } from "@/components/pharmacy/pharmacy-till";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  approveDispensing,
  checkDispensing,
  fetchDispensingApprovers,
  fetchOwingsForPatient,
  lookupPatientsByPhone,
  patientMatchDetail,
  type DispensingApprover,
  type Owing,
  type PatientMatch,
  type DispensingCheck,
} from "@/lib/pharmacy-api";
import {
  cleanDispensingPayload,
  refillDueDate,
  type DispensingHint,
  type SaleDispensingPayload,
} from "@/lib/pharmacy-dispensing";

type Props = {
  /** Every item id in the cart; the dialog asks the server which of them are gated. */
  itemIds: string[];
  /** How many of each item the sale holds. A pharmacist's approval covers these amounts and no more. */
  quantities: Record<string, number>;
  /** What the server said was missing when it turned the sale away. */
  hint: DispensingHint;
  onConfirm: (dispensing: SaleDispensingPayload) => void;
  onDismiss: () => void;
  /**
   * What the till already knows about the cart, used when the server cannot be asked. Only
   * given for someone who may dispense themselves; the sale is then queued and sent later.
   */
  offlineCheck?: DispensingCheck | null;
  /**
   * Details from a previous attempt on this same cart, after a charge failed. They come back
   * filled in so nothing has to be retyped; a still-valid pharmacist approval is reused too.
   */
  initial?: SaleDispensingPayload | null;
};

/** Prescribers typed during this session, offered again as suggestions. Never stored. */
const recentPrescribers: string[] = [];

function rememberPrescriber(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const at = recentPrescribers.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (at >= 0) recentPrescribers.splice(at, 1);
  recentPrescribers.unshift(trimmed);
  recentPrescribers.length = Math.min(recentPrescribers.length, 12);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Shown when a sale holds a prescription-only or controlled medicine. It collects who
 * prescribed it and, when the person at the till may not dispense, a pharmacist's approval by
 * PIN. One dialog covers every gated medicine in the cart. On confirm the sale is sent again
 * with these details attached; nothing was recorded before that.
 */
export function DispensingDialog({ itemIds, quantities, hint, onConfirm, onDismiss, offlineCheck, initial }: Props) {
  const [check, setCheck] = useState<DispensingCheck | null>(null);
  const [usingOffline, setUsingOffline] = useState(false);
  const [approvers, setApprovers] = useState<DispensingApprover[]>([]);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [prescriberName, setPrescriberName] = useState(initial?.prescriberName ?? "");
  const [prescriberRegNo, setPrescriberRegNo] = useState(initial?.prescriberRegNo ?? "");
  const [prescriptionRef, setPrescriptionRef] = useState(initial?.prescriptionRef ?? "");
  const [prescriptionDate, setPrescriptionDate] = useState(initial?.prescriptionDate ?? "");
  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [patientPhone, setPatientPhone] = useState(initial?.patientPhone ?? "");
  /** A profile chosen on the failed attempt, kept unless the phone number is changed. */
  const [keptPatientId, setKeptPatientId] = useState(initial?.patientId ?? "");
  const [instructions, setInstructions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.lines ?? [])
        .filter((l) => l.instructions?.trim())
        .map((l) => [l.itemId, l.instructions!]),
    ),
  );
  /** Phase 2: a patient profile found by phone, the balances owed to them, and per-medicine extras. */
  const [matches, setMatches] = useState<PatientMatch[]>([]);
  const [linked, setLinked] = useState<PatientMatch | null>(null);
  const [owed, setOwed] = useState<Owing[]>([]);
  const [prescribed, setPrescribed] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.lines ?? [])
        .filter((l) => l.quantityPrescribed != null)
        .map((l) => [l.itemId, String(l.quantityPrescribed)]),
    ),
  );
  const [daysSupply, setDaysSupply] = useState<Record<string, string>>({});
  const [settle, setSettle] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (initial?.lines ?? []).filter((l) => l.settlesLineId).map((l) => [l.itemId, true]),
    ),
  );

  const [more, setMore] = useState(
    Boolean(initial?.prescriptionRef || initial?.prescriptionDate || initial?.prescriberRegNo),
  );
  const [approverId, setApproverId] = useState("");
  const [pin, setPin] = useState("");
  /**
   * A fresh approval from the failed attempt stands; ask for a new PIN only if it does not.
   * When the server has just turned an approval down (`hint: approve`), do not offer it again.
   */
  const [reuseApproval, setReuseApproval] = useState(
    Boolean(initial?.approvalId) && hint !== "approve",
  );

  const prescriberRef = useRef<HTMLInputElement | null>(null);
  const idsKey = useMemo(() => [...new Set(itemIds)].sort().join(","), [itemIds]);

  useEffect(() => {
    let alive = true;
    const ids = idsKey ? idsKey.split(",") : [];
    setCheck(null);
    setLoadError("");
    checkDispensing(ids)
      .then(async (result) => {
        if (!alive) return;
        setCheck(result);
        if (!result.userMayDispense) {
          const list = await fetchDispensingApprovers();
          if (!alive) return;
          setApprovers(list);
          const usable = list.filter((a) => a.hasPin);
          if (usable.length === 1) setApproverId(usable[0]!.userId);
        }
      })
      .catch((err) => {
        if (!alive) return;
        if (offlineCheck) {
          // Offline, and the till knows these medicines: carry on from what it knows.
          setCheck(offlineCheck);
          setUsingOffline(true);
          return;
        }
        setLoadError(errorMessage(err, "Could not check the medicines in this sale."));
      });
    return () => {
      alive = false;
    };
  }, [idsKey, offlineCheck]);

  useEffect(() => {
    if (check) prescriberRef.current?.focus();
  }, [check]);

  const findProfiles = () => {
    const phone = patientPhone.trim();
    if (linked || phone.replace(/\D/g, "").length < 7) return;
    lookupPatientsByPhone(phone)
      .then(setMatches)
      .catch(() => setMatches([]));
  };

  const linkProfile = (match: PatientMatch) => {
    setLinked(match);
    setMatches([]);
    if (!patientName.trim()) setPatientName(match.name);
    fetchOwingsForPatient(match.id)
      .then(setOwed)
      .catch(() => setOwed([]));
  };

  // A patient attached at the till arrives already linked, so nobody types the number twice.
  const tillPatient = useTillPatient();
  const tillPatientApplied = useRef(false);
  useEffect(() => {
    if (!tillPatient || tillPatientApplied.current) return;
    tillPatientApplied.current = true;
    setLinked(tillPatient);
    // The cart's patient is the one this sale is for; a profile kept from a failed attempt is
    // only a fallback when the till itself has nobody attached.
    setKeptPatientId("");
    setPatientName((prev) => prev.trim() || tillPatient.name);
    setPatientPhone((prev) => prev.trim() || (tillPatient.phone ?? ""));
    fetchOwingsForPatient(tillPatient.id)
      .then(setOwed)
      .catch(() => setOwed([]));
  }, [tillPatient]);

  const unlinkProfile = () => {
    setLinked(null);
    setKeptPatientId("");
    setOwed([]);
    setSettle({});
  };

  const gated = (check?.lines ?? []).filter((l) => l.status === "needs_record");
  const stopped = (check?.lines ?? []).filter(
    (l) => l.status === "unclassified" || l.status === "controlled_blocked",
  );
  const needsApproval = check ? !check.userMayDispense : hint === "approve";
  const usableApprovers = approvers.filter((a) => a.hasPin);

  const submit = async () => {
    setError("");
    if (!prescriberName.trim()) {
      setError("Enter the prescriber's name.");
      prescriberRef.current?.focus();
      return;
    }
    if (gated.length === 0) {
      setError("Nothing in this sale needs dispensing. Close this and charge again.");
      return;
    }
    let approvalId: string | undefined;
    setBusy(true);
    try {
      if (needsApproval) {
        if (reuseApproval && initial?.approvalId) {
          // The pharmacist approved these same medicines minutes ago and the cart has not
          // changed, so do not make them walk back to the till for a second PIN.
          approvalId = initial.approvalId;
        } else {
          if (!approverId) {
            setError("Choose the pharmacist who is approving.");
            return;
          }
          if (!pin.trim()) {
            setError("The pharmacist must enter their PIN.");
            return;
          }
          const approval = await approveDispensing({
            approverUserId: approverId,
            pin: pin.trim(),
            lines: gated.map((g) => ({ itemId: g.itemId, quantity: quantities[g.itemId] ?? 0 })),
          });
          approvalId = approval.approvalId;
        }
      }
      rememberPrescriber(prescriberName);
      onConfirm(
        cleanDispensingPayload({
          prescriberName,
          prescriberRegNo,
          prescriptionRef,
          prescriptionDate,
          patientName,
          patientPhone,
          approvalId,
          patientId: linked?.id ?? (keptPatientId || undefined),
          lines: gated.map((g) => {
            const supplying = quantities[g.itemId] ?? 0;
            const asked = Number(prescribed[g.itemId]);
            const days = Number(daysSupply[g.itemId]);
            const balance = owed.find((o) => o.itemId === g.itemId);
            const before = initial?.lines?.find((l) => l.itemId === g.itemId);
            // The fields above are prefilled from `before`, so a value cleared here stays
            // cleared. The refill date is the exception: it is held as a date, not the days
            // that produced it, so it is carried over unless the days are entered again.
            const settled =
              settle[g.itemId] === true
                ? (balance?.lineId ?? before?.settlesLineId)
                : settle[g.itemId] === false
                  ? undefined
                  : before?.settlesLineId;
            return {
              itemId: g.itemId,
              instructions: instructions[g.itemId] ?? "",
              quantityPrescribed: Number.isFinite(asked) && asked > supplying ? asked : undefined,
              refillDueOn: daysSupply[g.itemId]?.trim() ? refillDueDate(days) : before?.refillDueOn,
              settlesLineId: settled,
            };
          }),
        }),
      );
    } catch (err) {
      setPin("");
      // A reused approval that the server no longer accepts must fall back to the PIN fields.
      if (reuseApproval) setReuseApproval(false);
      setError(errorMessage(err, "Could not approve. Try again."));
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
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
            <span
              className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
              aria-hidden
            >
              <Pill className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1 pr-6">
              <DialogTitle>Dispense prescription medicines</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                This sale has medicines that need a dispensing record. Nothing has been charged yet.
              </DialogDescription>
            </div>
          </DialogHeader>

          {loadError ? (
            <p role="alert" className="text-sm text-destructive">
              {loadError}
            </p>
          ) : null}
          {!check && !loadError ? <p className="text-sm text-muted-foreground">Checking the cart…</p> : null}
          {usingOffline ? (
            <p className="rounded-[2px] border border-[#8a3c0b] px-3 py-2 text-[13px] text-[#8a3c0b]">
              This till is offline. The sale and its dispensing record are kept here and sent when it is back online.
              The patient&apos;s name and phone are not kept on the till, so write them on the prescription.
            </p>
          ) : null}

          {stopped.length > 0 ? (
            <div role="alert" className="rounded-[2px] border border-destructive/40 px-3 py-2 text-sm text-destructive">
              <p className="font-medium">These cannot be sold from this till:</p>
              <ul className="mt-1 list-disc pl-5">
                {stopped.map((l) => (
                  <li key={l.itemId}>
                    {l.name}
                    {l.status === "unclassified" ? " (no dispensing class yet)" : " (controlled medicine)"}
                  </li>
                ))}
              </ul>
              <p className="mt-1">Remove them from the sale, or ask whoever manages the pharmacy.</p>
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Prescriber</span>
              <Input
                ref={prescriberRef}
                value={prescriberName}
                onChange={(e) => setPrescriberName(e.target.value)}
                placeholder="Name of the doctor or clinic"
                maxLength={191}
                list="dispensing-recent-prescribers"
                autoComplete="off"
                required
              />
              <datalist id="dispensing-recent-prescribers">
                {recentPrescribers.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
          </div>

          {gated.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Medicines being dispensed</legend>
              {gated.map((g) => (
                <div key={g.itemId} className="space-y-1.5">
                <label className="block space-y-1 text-sm">
                  <span>
                    {g.name}
                    {quantities[g.itemId] ? (
                      <span className="ml-2 font-medium tabular-nums">× {quantities[g.itemId]}</span>
                    ) : null}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {g.dispensingClass === "CONTROLLED" ? "Controlled" : "Prescription only"}
                    </span>
                  </span>
                  <Input
                    value={instructions[g.itemId] ?? ""}
                    onChange={(e) => setInstructions((prev) => ({ ...prev, [g.itemId]: e.target.value }))}
                    placeholder="Directions for the label (optional)"
                    maxLength={500}
                    autoComplete="off"
                  />
                </label>
                {owed
                  .filter((o) => o.itemId === g.itemId)
                  .slice(0, 1)
                  .map((o) => (
                    <label key={o.lineId} className="flex items-start gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={settle[g.itemId] ?? false}
                        onChange={(e) => setSettle((prev) => ({ ...prev, [g.itemId]: e.target.checked }))}
                      />
                      <span>
                        This supplies the balance still owed to this patient ({o.quantityOutstanding} outstanding).
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Patient name</span>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Optional"
                maxLength={191}
                autoComplete="off"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Patient phone</span>
              <Input
                value={patientPhone}
                onChange={(e) => {
                  setPatientPhone(e.target.value);
                  if (linked || keptPatientId) unlinkProfile();
                }}
                onBlur={findProfiles}
                placeholder="Optional"
                maxLength={32}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            {linked ? (
              <div className="rounded-[2px] border px-3 py-2 text-[13px] sm:col-span-2">
                <p>
                  Filed under the profile of <span className="font-medium">{linked.name}</span>.{" "}
                  <button type="button" className="underline" onClick={unlinkProfile}>
                    Do not link
                  </button>
                </p>
                {linked.allergies ? (
                  <p role="alert" className="mt-1 font-medium text-[#8A4129]">
                    Allergies on record: {linked.allergies}
                  </p>
                ) : null}
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-1 text-[13px] sm:col-span-2">
                <p className="text-muted-foreground">
                  {matches.length > 1
                    ? `${matches.length} patient profiles share this number. Choose the one this is for:`
                    : "A patient profile has this number:"}
                </p>
                {matches.map((m) => {
                  const detail = patientMatchDetail(m);
                  return (
                    <Button
                      key={m.id}
                      type="button"
                      variant="outline"
                      className="mb-1 mr-2"
                      onClick={() => linkProfile(m)}
                    >
                      Use {m.name}
                      {detail ? <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{detail}</span> : null}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Patient details are optional. They are kept on the dispensing record only, and only staff
            allowed to read dispensing records can see them.
          </p>

          {more ? (
            <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Prescriber registration no.</span>
              <Input
                value={prescriberRegNo}
                onChange={(e) => setPrescriberRegNo(e.target.value)}
                placeholder="Optional"
                maxLength={64}
                autoComplete="off"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Prescription date</span>
              <Input
                type="date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Prescription reference</span>
              <Input
                value={prescriptionRef}
                onChange={(e) => setPrescriptionRef(e.target.value)}
                placeholder="Optional"
                maxLength={64}
                autoComplete="off"
              />
            </label>
              {gated.map((g) => (
                <div key={g.itemId} className="space-y-1.5 sm:col-span-2">
                  <p className="text-sm font-medium">{g.name}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-[13px]">
                    <span className="text-muted-foreground">Quantity prescribed, if more than this</span>
                    <Input
                      value={prescribed[g.itemId] ?? ""}
                      onChange={(e) => setPrescribed((prev) => ({ ...prev, [g.itemId]: e.target.value }))}
                      placeholder="Optional"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </label>
                  <label className="space-y-1 text-[13px]">
                    <span className="text-muted-foreground">Days this supply lasts</span>
                    <Input
                      value={daysSupply[g.itemId] ?? ""}
                      onChange={(e) => setDaysSupply((prev) => ({ ...prev, [g.itemId]: e.target.value }))}
                      placeholder="Optional"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className="self-start text-sm font-medium text-[var(--op-accent,#1d4b3b)] underline-offset-4 hover:underline"
              onClick={() => setMore(true)}
            >
              Add prescription details, part supply or refill date
            </button>
          )}


          {needsApproval && reuseApproval && initial?.approvalId ? (
            <fieldset className="space-y-2 rounded-[2px] border px-3 py-3">
              <legend className="px-1 text-sm font-medium">Pharmacist approval</legend>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                The pharmacist approved these medicines a moment ago, and the cart has not changed.
                Charge again to use that approval.
              </p>
              <Button type="button" variant="outline" onClick={() => setReuseApproval(false)}>
                Ask for a new PIN instead
              </Button>
            </fieldset>
          ) : needsApproval ? (
            <fieldset className="space-y-2 rounded-[2px] border px-3 py-3">
              <legend className="px-1 text-sm font-medium">Pharmacist approval</legend>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                You can ring this sale, but a pharmacist has to approve it. They choose their name and
                enter their own till PIN.
              </p>
              {check && usableApprovers.length === 0 ? (
                <p role="alert" className="text-sm text-destructive">
                  Nobody who may dispense has a till PIN yet. An owner or admin can set it under
                  Pharmacy, Settings, in Staff who may dispense.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Pharmacist</span>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {usableApprovers.map((a) => (
                        <option key={a.userId} value={a.userId}>
                          {a.name}
                          {a.title ? ` (${a.title})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Their PIN</span>
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={32}
                      autoComplete="off"
                    />
                  </label>
                </div>
              )}
            </fieldset>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onDismiss} disabled={busy}>
              Back to sale
            </Button>
            <Button type="submit" disabled={busy || !check || gated.length === 0 || stopped.length > 0}>
              {busy ? "Checking…" : "Dispense and charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

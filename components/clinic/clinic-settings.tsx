"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  saveClinicSettings,
  setServiceReceiptName,
  type ClinicService,
  type ClinicSettings,
  type Clinician,
} from "@/lib/clinic-api";
import { formatKsh } from "@/lib/clinic-visit";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * The clinic's services: which is the consultation a visit opens with, which are tests or
 * procedures (they go to the lab and treatment station), and who sees patients. Prices and the
 * team are kept in the shared service catalogue, so there is one price list, not two.
 */
export function ClinicServices({
  settings,
  services,
  clinicians,
  canManage,
  canManageCatalogue,
  onSaved,
  onServices,
}: {
  settings: ClinicSettings;
  services: ClinicService[];
  clinicians: Clinician[];
  canManage: boolean;
  canManageCatalogue: boolean;
  onSaved: (next: ClinicSettings) => void;
  onServices?: (next: ClinicService[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);

  const saveReceiptName = async () => {
    if (!naming) return;
    setBusyId(naming.id);
    try {
      onServices?.(await setServiceReceiptName(naming.id, naming.text.trim() || null));
      setNaming(null);
    } catch (err) {
      toast.error(errorText(err, "Could not save the receipt name. Check the connection and try again."));
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (service: ClinicService) => {
    const next = service.perform
      ? settings.performServiceIds.filter((id) => id !== service.id)
      : [...settings.performServiceIds, service.id];
    setBusyId(service.id);
    try {
      onSaved(
        await saveClinicSettings({
          enabled: settings.enabled,
          consultationServiceId: settings.consultationServiceId,
          reviewServiceId: settings.reviewServiceId,
          performServiceIds: next,
        }),
      );
    } catch (err) {
      toast.error(errorText(err, "Could not save. Check the connection and try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Services"
        description="Consultations, tests and procedures a visit can carry."
        aside={
          canManageCatalogue ? (
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.services}>Add or price services</Link>
            </Button>
          ) : undefined
        }
        flush
      >
        {services.length === 0 ? (
          <p className={cn("p-4 text-sm", RX_MUTED)}>
            No services yet. Add your consultation first, then any tests and procedures you charge for.
          </p>
        ) : (
          <ul>
            {services.map((s) => (
              <li key={s.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 last:border-0", RX_RULE)}>
                <span className="min-w-[12rem] flex-1">
                  <span className={cn("font-medium", RX_INK)}>{s.name}</span>
                  <span className={cn("block text-[13px]", RX_MUTED)}>
                    {s.id === settings.consultationServiceId
                      ? "A visit opens with this"
                      : s.id === settings.reviewServiceId
                        ? "Used for a review visit"
                        : s.perform
                          ? "Test or procedure: goes to Lab and treatment"
                          : "Consultation"}
                    {s.receiptName ? ` · on the receipt: ${s.receiptName}` : ""}
                  </span>
                  {naming?.id === s.id ? (
                    <span className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="block min-w-[14rem] flex-1 text-sm">
                        <span className={cn("block text-[13px]", RX_MUTED)}>
                          Name on the receipt. Leave empty to print “{s.name}”.
                        </span>
                        <input
                          className={RX_INPUT}
                          value={naming.text}
                          onChange={(e) => setNaming({ id: s.id, text: e.target.value })}
                          maxLength={191}
                          placeholder="For example: Laboratory test"
                          autoFocus
                        />
                      </label>
                      <Button type="button" disabled={busyId === s.id} onClick={saveReceiptName}>
                        Save
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setNaming(null)}>
                        Cancel
                      </Button>
                    </span>
                  ) : null}
                </span>
                <span className={cn("text-sm tabular-nums", RX_INK)}>{formatKsh(s.price)}</span>
                {canManage && onServices && naming?.id !== s.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNaming({ id: s.id, text: s.receiptName ?? "" })}
                  >
                    {s.receiptName ? "Change receipt name" : "Receipt name"}
                  </Button>
                ) : null}
                {canManage && s.id !== settings.consultationServiceId && s.id !== settings.reviewServiceId ? (
                  <Button type="button" variant="outline" disabled={busyId === s.id} onClick={() => toggle(s)}>
                    {s.perform ? "Make it a consultation" : "Make it a test or procedure"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Who sees patients"
        description="Clinicians and nurses on the service team. Each needs a staff profile that can be booked."
        aside={
          canManageCatalogue ? (
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.servicesSetup}>Set up the team</Link>
            </Button>
          ) : undefined
        }
      >
        {clinicians.length === 0 ? (
          <p className={cn("text-sm", RX_MUTED)}>
            Nobody yet. Until someone is on the team, a service cannot be marked done and a visit cannot be paid.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {clinicians.map((c) => (
              <li key={c.staffProfileId} className={RX_INK}>
                {c.name}
              </li>
            ))}
          </ul>
        )}
        <p className={cn("mt-3 text-[12.5px] leading-relaxed", RX_MUTED)}>
          A clinician&apos;s title and registration number, printed on prescriptions, are kept under Pharmacy, Settings,
          as each person gives them. Kiosk does not check them against a register.
        </p>
      </Panel>
    </div>
  );
}

export function ClinicSettingsForm({
  settings,
  services,
  canManage,
  onSaved,
}: {
  settings: ClinicSettings;
  services: ClinicService[];
  canManage: boolean;
  onSaved: (next: ClinicSettings) => void;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [consultation, setConsultation] = useState(settings.consultationServiceId ?? "");
  const [review, setReview] = useState(settings.reviewServiceId ?? "");
  const [reviewDays, setReviewDays] = useState(String(settings.freeReviewDays));
  const [feeFirst, setFeeFirst] = useState(settings.feeFirst);
  const [secondPerson, setSecondPerson] = useState(settings.secondPersonForGated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const days = Number(reviewDays || "0");
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      setError("Free review days must be a whole number from 0 to 90.");
      return;
    }
    if (enabled && !consultation) {
      setError("Choose the service a visit opens with.");
      return;
    }
    if (days > 0 && !review) {
      setError("Choose the service used for a review visit, or set the days to 0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await saveClinicSettings({
          enabled,
          feeFirst,
          freeReviewDays: days,
          consultationServiceId: consultation || null,
          reviewServiceId: review || null,
          performServiceIds: settings.performServiceIds,
          secondPersonForGated: secondPerson,
        }),
      );
      toast.success(enabled ? "Clinic settings saved." : "Clinic switched off.");
    } catch (err) {
      setError(errorText(err, "Could not save. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <Panel title="Settings">
        <p className={cn("text-sm", RX_MUTED)}>The owner or a manager changes how the clinic runs.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="How this clinic runs"
      description="One design for a consulting corner and a clinic with several rooms: what differs is these settings and who is signed in."
    >
      <div className="max-w-xl space-y-5">
        <label className="flex min-h-11 items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>
            <span className={cn("font-medium", RX_INK)}>Clinic is switched on</span>
            <span className={cn("block text-[13px]", RX_MUTED)}>
              While it is on, this business uses the online till; the desktop till is not offered.
            </span>
          </span>
        </label>

        {services.length === 0 ? (
          <p className="text-sm font-medium text-[#8a3c0b]">
            Add a consultation to your services first. A visit cannot open without one.
          </p>
        ) : null}

        <Field label="A visit opens with" hint="Usually your consultation. Reception can choose something else.">
          <select className={RX_INPUT} value={consultation} onChange={(e) => setConsultation(e.target.value)}>
            <option value="">Choose</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatKsh(s.price)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Field label="Free review for" hint="Days. 0 switches it off.">
            <input className={RX_INPUT} value={reviewDays} onChange={(e) => setReviewDays(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="A review visit opens with" hint="A service priced at 0, for example “Review visit”.">
            <select className={RX_INPUT} value={review} onChange={(e) => setReview(e.target.value)}>
              <option value="">None</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatKsh(s.price)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex min-h-11 items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={feeFirst} onChange={(e) => setFeeFirst(e.target.checked)} />
          <span>
            <span className={cn("font-medium", RX_INK)}>Take the fee first</span>
            <span className={cn("block text-[13px]", RX_MUTED)}>
              Reception is offered the fee before the patient is seen; the rest is paid at the end. Off: everything is
              paid at the end.
            </span>
          </span>
        </label>

        <label className="flex min-h-11 items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={secondPerson} onChange={(e) => setSecondPerson(e.target.checked)} />
          <span>
            <span className={cn("font-medium", RX_INK)}>A second person for prescription-only medicines</span>
            <span className={cn("block text-[13px]", RX_MUTED)}>
              Whoever wrote the prescription cannot also take payment for it without another pharmacist&apos;s approval.
              Leave off where one person does everything.
            </span>
          </span>
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </Panel>
  );
}

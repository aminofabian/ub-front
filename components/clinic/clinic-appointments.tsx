"use client";

import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClinicPatientPicker } from "@/components/clinic/clinic-patient-picker";
import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  arriveClinicVisit,
  bookClinicAppointment,
  fetchClinicAppointments,
  type ClinicAppointment,
  type ClinicService,
  type ClinicSettings,
  type Clinician,
  type ReceptionPatient,
} from "@/lib/clinic-api";
import { formatPatientNo } from "@/lib/pharmacy-patient-no";
import { cn } from "@/lib/utils";

function dayBounds(day: string): { from: string; to: string } {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Bookings by clinician for one day. Reception books, and marks a patient as arrived to put them on Today. */
export function ClinicAppointments({
  branchId,
  settings,
  services,
  clinicians,
}: {
  branchId: string;
  settings: ClinicSettings;
  services: ClinicService[];
  clinicians: Clinician[];
}) {
  const [day, setDay] = useState(todayLocal);
  const [rows, setRows] = useState<ClinicAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!branchId || !day) return;
    const { from, to } = dayBounds(day);
    fetchClinicAppointments(branchId, from, to)
      .then((list) => {
        setRows(list);
        setError(null);
      })
      .catch((err) => setError(errorText(err, "Could not load the bookings. Check the connection.")));
  }, [branchId, day]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const byClinician = useMemo(() => {
    const map = new Map<string, ClinicAppointment[]>();
    for (const a of rows ?? []) {
      const key = a.staffName ?? "No clinician chosen";
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const arrive = async (a: ClinicAppointment) => {
    setBusyId(a.id);
    try {
      await arriveClinicVisit(a.id);
      toast.success(`${a.patientName} is on the Today list.`);
      load();
    } catch (err) {
      toast.error(errorText(err, "Could not mark them as arrived. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Day" className="w-48">
          <input className={RX_INPUT} type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        {settings.hats.reception ? (
          <Button type="button" onClick={() => setBooking(true)} disabled={clinicians.length === 0}>
            Book a patient
          </Button>
        ) : null}
      </div>
      {clinicians.length === 0 ? (
        <p className={cn("text-sm", RX_MUTED)}>
          Nobody is set up to see patients yet. Add your clinicians to the service team first (Clinic, Services).
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {rows && rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nobody is booked for this day" body="Walk-ins do not need a booking: open a visit from Today." />
      ) : null}
      {byClinician.map(([name, list]) => (
        <Panel key={name} title={name} description={`${list.length} booked`} flush>
          <ul>
            {list.map((a) => (
              <li key={a.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 last:border-0", RX_RULE)}>
                <span className={cn("w-14 font-mono text-[14px] tabular-nums", RX_INK)}>{timeOf(a.start)}</span>
                <span className="min-w-[10rem] flex-1">
                  <span className={cn("font-medium", RX_INK)}>{a.patientName}</span>{" "}
                  <span className={cn("text-[13px] tabular-nums", RX_MUTED)}>{formatPatientNo(a.patientNo)}</span>
                </span>
                {a.reminder ? <span className={cn("text-[13px]", RX_MUTED)}>Reminder on</span> : null}
                {settings.hats.reception ? (
                  <Button type="button" variant="outline" disabled={busyId === a.id} onClick={() => arrive(a)}>
                    Arrived
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
      {booking ? (
        <BookDialog
          branchId={branchId}
          day={day}
          settings={settings}
          services={services}
          clinicians={clinicians}
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function BookDialog({
  branchId,
  day,
  settings,
  services,
  clinicians,
  onClose,
  onBooked,
}: {
  branchId: string;
  day: string;
  settings: ClinicSettings;
  services: ClinicService[];
  clinicians: Clinician[];
  onClose: () => void;
  onBooked: () => void;
}) {
  const [patient, setPatient] = useState<ReceptionPatient | null>(null);
  const [staffId, setStaffId] = useState(clinicians.length === 1 ? clinicians[0].staffProfileId : "");
  const [date, setDate] = useState(day);
  const [time, setTime] = useState("09:00");
  const [serviceId, setServiceId] = useState(settings.consultationServiceId ?? "");
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientVisitId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}-${Math.random()}`,
  );

  const submit = async () => {
    if (!patient || !staffId || !date || !time) {
      setError("Choose the patient, the clinician, the day and the time.");
      return;
    }
    const start = new Date(`${date}T${time}:00`);
    if (!(start.getTime() > Date.now())) {
      setError("Choose a time that has not passed.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await bookClinicAppointment({
        branchId,
        clientVisitId,
        patientId: patient.id,
        staffProfileId: staffId,
        start: start.toISOString(),
        serviceIds: serviceId ? [serviceId] : undefined,
        sendReminder: remind,
      });
      toast.success(`${patient.name} booked for ${date} at ${time}.`);
      onBooked();
    } catch (err) {
      setError(errorText(err, "Could not book. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a patient</DialogTitle>
          <DialogDescription>The booking holds the clinician&apos;s time. Nothing is charged until the visit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ClinicPatientPicker value={patient} onChange={setPatient} />
          {patient ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="To see" className="sm:col-span-2">
                <select className={RX_INPUT} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">Choose</option>
                  {clinicians.map((c) => (
                    <option key={c.staffProfileId} value={c.staffProfileId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day">
                <input className={RX_INPUT} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Time">
                <input className={RX_INPUT} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="For" className="sm:col-span-2">
                <select className={RX_INPUT} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services
                    .filter((s) => s.id !== settings.reviewServiceId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
              <label className="flex min-h-11 items-start gap-2.5 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-1 size-4" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                <span>
                  <span className={cn("font-medium", RX_INK)}>Text a reminder</span>
                  <span className={cn("block text-[13px]", RX_MUTED)}>
                    Sent only if the patient has a phone number and agreed to reminders. It gives the time and the
                    clinician, never what the visit is for. Uses SMS credits.
                  </span>
                </span>
              </label>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !patient}>
            {busy ? "Booking…" : "Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

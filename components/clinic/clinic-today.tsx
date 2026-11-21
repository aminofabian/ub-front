"use client";

import { CalendarClock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClinicPatientPicker } from "@/components/clinic/clinic-patient-picker";
import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { EmptyState } from "@/components/sms-hub/sms-hub-ui";
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
  fetchClinicBoard,
  openClinicVisit,
  type BoardVisit,
  type ClinicBoard,
  type ClinicService,
  type ClinicSettings,
  type Clinician,
  type ReceptionPatient,
  type VisitStation,
} from "@/lib/clinic-api";
import {
  BOARD_STATIONS,
  STATION_LABEL,
  amountDue,
  boardNote,
  formatKsh,
  groupBoard,
  minutesSince,
  stationsForHats,
  waitLabel,
  waitedLong,
} from "@/lib/clinic-visit";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20000;

/**
 * Today: every open visit at this branch, in the column of the station it is waiting at. A
 * card shows a queue number and a first name, never what the person came for, because this
 * screen sits where others can see it (ADR 0034, decision 4).
 */
export function ClinicToday({
  branchId,
  settings,
  services,
  clinicians,
  onOpenVisit,
}: {
  branchId: string;
  settings: ClinicSettings;
  services: ClinicService[];
  clinicians: Clinician[];
  onOpenVisit: (visitId: string) => void;
}) {
  const hats = settings.hats;
  const mine = useMemo(() => stationsForHats(hats), [hats]);
  const [board, setBoard] = useState<ClinicBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [everyStation, setEveryStation] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [opening, setOpening] = useState(false);

  const load = useCallback(() => {
    if (!branchId) return;
    fetchClinicBoard(branchId)
      .then((b) => {
        setBoard(b);
        setError(null);
        setNow(Date.now());
      })
      .catch((err) => setError(errorText(err, "Could not load today's visits. Check the connection.")));
  }, [branchId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const visits = (board?.visits ?? []).filter(
      (v) => !onlyMine || !hats.staffProfileId || v.clinicianStaffProfileId === hats.staffProfileId || v.station === "waiting",
    );
    return groupBoard(visits);
  }, [board, onlyMine, hats.staffProfileId]);

  const columns: VisitStation[] =
    everyStation || mine.length === 0 ? [...BOARD_STATIONS] : BOARD_STATIONS.filter((s) => mine.includes(s));
  const open = board?.visits.length ?? 0;

  if (!branchId) {
    return <p className={cn("text-sm", RX_MUTED)}>Choose a branch to see its visits.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className={cn("text-[13.5px] tabular-nums", RX_MUTED)}>
          {board ? `${open} ${open === 1 ? "visit" : "visits"} open · ${board.finishedToday} finished today` : "Loading…"}
        </p>
        <div className="flex flex-wrap gap-2">
          {mine.length > 0 && mine.length < BOARD_STATIONS.length ? (
            <Button type="button" variant="outline" aria-pressed={everyStation} onClick={() => setEveryStation((v) => !v)}>
              {everyStation ? "My stations only" : "Every station"}
            </Button>
          ) : null}
          {hats.staffProfileId && (hats.consult || hats.perform) ? (
            <Button type="button" variant="outline" aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
              {onlyMine ? "Everyone's patients" : "My patients"}
            </Button>
          ) : null}
          {hats.reception ? (
            <Button type="button" onClick={() => setOpening(true)}>
              New visit
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {board && open === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No visits open"
          body={
            hats.reception
              ? "Open a visit when a patient arrives. It appears here for whoever sees them next."
              : "Visits appear here when reception opens them."
          }
          action={
            hats.reception ? (
              <Button type="button" onClick={() => setOpening(true)}>
                New visit
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {board && open > 0 ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
        >
          {columns.map((station) => (
            <section key={station} aria-label={STATION_LABEL[station]} className="min-w-0 space-y-2">
              <div
                className={cn(
                  "flex items-baseline gap-2 border-b-2 pb-1.5",
                  station === "pay" ? "border-[var(--op-accent,#1d4b3b)]" : "border-[var(--op-ink,#121a16)]",
                )}
              >
                <h2
                  className={cn(
                    "flex-1 text-[14px] font-semibold",
                    station === "pay" ? "text-[var(--op-accent,#1d4b3b)]" : RX_INK,
                  )}
                >
                  {STATION_LABEL[station]}
                </h2>
                <span className={cn("text-[13px] tabular-nums", RX_MUTED)}>{grouped[station].length}</span>
              </div>
              {grouped[station].length === 0 ? (
                <p className={cn("px-1 py-2 text-[13px]", RX_MUTED)}>Nobody here.</p>
              ) : (
                <ul className="space-y-2">
                  {grouped[station].map((v) => (
                    <li key={v.id}>
                      <VisitCard visit={v} now={now} actionable={mine.includes(v.station)} onOpen={() => onOpenVisit(v.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}

      <p className={cn("max-w-[70ch] text-[12.5px] leading-relaxed", RX_MUTED)}>
        This list shows a number and a first name. What each person came for is shown only inside the visit, to the
        people working it.
      </p>

      {opening ? (
        <NewVisitDialog
          branchId={branchId}
          settings={settings}
          services={services}
          clinicians={clinicians}
          onClose={() => setOpening(false)}
          onOpened={(visitId, stay) => {
            setOpening(false);
            load();
            if (!stay) onOpenVisit(visitId);
          }}
        />
      ) : null}
    </div>
  );
}

function VisitCard({
  visit,
  now,
  actionable,
  onOpen,
}: {
  visit: BoardVisit;
  now: number;
  actionable: boolean;
  onOpen: () => void;
}) {
  const minutes = minutesSince(visit.since ?? visit.openedAt, now);
  const long = waitedLong(visit.station, minutes);
  const urgent = visit.priority > 0 && visit.station === "waiting";
  const due = visit.total != null ? amountDue(visit.total, visit.depositAmount, visit.depositState) : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-[2px] border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
        "hover:bg-[var(--op-hover,rgba(18,26,22,0.04))] active:scale-[0.99]",
        urgent
          ? "border-2 border-[#b91c1c]"
          : actionable
            ? "border-[var(--op-ink,#121a16)] bg-[var(--op-surface,#FCFAF5)]"
            : cn(RX_RULE, "bg-transparent"),
      )}
    >
      <span className="flex items-baseline gap-2">
        <span className={cn("text-[20px] font-bold tabular-nums leading-none", RX_INK)}>{visit.number}</span>
        <span className={cn("min-w-0 flex-1 truncate font-medium", RX_INK)}>{visit.firstName}</span>
        <span className={cn("text-[13px] tabular-nums", long ? "font-semibold text-[#8a3c0b]" : RX_MUTED)}>
          {waitLabel(minutes)}
        </span>
      </span>
      {urgent ? <span className="text-[13px] font-bold text-[#8f1616]">See first</span> : null}
      <span className={cn("text-[13px] leading-snug", RX_MUTED)}>{boardNote(visit)}</span>
      {due != null ? (
        <span className={cn("mt-1 text-[14px] font-semibold tabular-nums", RX_INK)}>
          {due === 0 ? "Nothing more to pay" : `${formatKsh(due)} to pay`}
        </span>
      ) : null}
    </button>
  );
}

function NewVisitDialog({
  branchId,
  settings,
  services,
  clinicians,
  onClose,
  onOpened,
}: {
  branchId: string;
  settings: ClinicSettings;
  services: ClinicService[];
  clinicians: Clinician[];
  onClose: () => void;
  onOpened: (visitId: string, stayOnList: boolean) => void;
}) {
  const [patient, setPatient] = useState<ReceptionPatient | null>(null);
  const [serviceId, setServiceId] = useState(settings.consultationServiceId ?? "");
  const [staffId, setStaffId] = useState("");
  const [review, setReview] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per dialog: pressing the button twice opens one visit, not two.
  const [clientVisitId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `v-${Date.now()}-${Math.random()}`,
  );
  const reviewsOn = settings.freeReviewDays > 0 && !!settings.reviewServiceId;
  // Someone who also sees patients goes straight into the visit; a receptionist stays on the list.
  const goesIn = settings.hats.consult || settings.hats.perform;

  const submit = async () => {
    if (!patient) {
      setError("Choose the patient first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const visit = await openClinicVisit({
        branchId,
        clientVisitId,
        patientId: patient.id,
        serviceIds: review || !serviceId ? undefined : [serviceId],
        requestedStaffProfileId: staffId || null,
        review,
        urgent,
      });
      toast.success(`Visit ${visit.number} opened for ${patient.name}.`);
      onOpened(visit.id, !goesIn);
    } catch (err) {
      setError(errorText(err, "Could not open the visit. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New visit</DialogTitle>
          <DialogDescription>
            The visit stays open until it is paid. Everything done for the patient goes on one bill.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ClinicPatientPicker value={patient} onChange={setPatient} />
          {patient ? (
            <>
              {reviewsOn ? (
                <label className="flex min-h-11 items-start gap-2.5 text-sm">
                  <input type="checkbox" className="mt-1 size-4" checked={review} onChange={(e) => setReview(e.target.checked)} />
                  <span>
                    <span className={cn("font-medium", RX_INK)}>Review visit</span>
                    <span className={cn("block text-[13px]", RX_MUTED)}>
                      Free within {settings.freeReviewDays} days of their last paid visit.
                    </span>
                  </span>
                </label>
              ) : null}
              {!review ? (
                <Field label="Here for">
                  <select className={RX_INPUT} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatKsh(s.price)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {clinicians.length > 1 ? (
                <Field label="To see">
                  <select className={RX_INPUT} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                    <option value="">Whoever is free</option>
                    {clinicians.map((c) => (
                      <option key={c.staffProfileId} value={c.staffProfileId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <label className="flex min-h-11 items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                <span>
                  <span className={cn("font-medium", RX_INK)}>See first</span>
                  <span className={cn("block text-[13px]", RX_MUTED)}>Goes to the top of the waiting list.</span>
                </span>
              </label>
            </>
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
            {busy ? "Opening…" : "Open visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

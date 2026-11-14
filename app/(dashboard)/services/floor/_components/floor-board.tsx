"use client";

import Link from "next/link";
import { Armchair, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { CloseShiftModal } from "@/components/shifts/shift-action-modals";
import {
  ApiRequestError,
  createCustomer,
  fetchCurrentShift,
  fetchCustomers,
  fetchSaleByReceiptNo,
  type ShiftRecord,
} from "@/lib/api";
import { OPEN_POS_SHIFT_EVENT, POS_GUIDANCE_RESOLVED_EVENT, notifyPosGuidance } from "@/lib/pos-guidance";
import { requestSetup } from "@/lib/setup-requirements";
import { isShiftsDisabled } from "@/lib/shift-settings";
import { isServiceOnlyBusiness, serviceStationLabel } from "@/lib/business-store-type";
import { isServiceCashier } from "@/lib/service-nav";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  amountStillDue,
  cancelServiceTicket,
  createServiceTicket,
  fetchAppointments,
  fetchCustomerPackages,
  fetchPackageOffers,
  markAppointmentArrived,
  markAppointmentNoShow,
  nairobiToday,
  fetchServiceBoard,
  fetchServicePerformers,
  fetchServices,
  finishServiceTicket,
  helpersSummary,
  minutesSince,
  packageSessionValue,
  payServiceTicket,
  reopenServiceTicket,
  sellPackage,
  setServiceTicketPriority,
  setStaffFloorStatus,
  awaySentence,
  teamByPresence,
  startServiceTicket,
  type CustomerPackage,
  type FloorStatus,
  type PackageOffer,
  type ServiceBoard,
  type ServicePerformerRecord,
  type ServiceRecord,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { cn } from "@/lib/utils";

import { BookingDialog } from "../../appointments/_components/appointments-workspace";
import { FloorTillView } from "./floor-till-view";
import { HelpersDialog } from "./helpers-dialog";

const kes = (n: number) => formatMoney(n, "KES");
const REFRESH_MS = 15000;

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

/**
 * The floor of a service business: who is waiting, who is in which chair, who is ready to pay.
 * Every change is a tap on a button (no dragging), and the board refreshes itself so two
 * devices at the counter stay in step.
 */
export function FloorBoard({ variant = "dashboard" }: { variant?: "dashboard" | "till" }) {
  const { branchId, business, me } = useDashboard();
  const till = variant === "till";
  // Typing what a helper is paid, and saying what the usual helpers get, are commission decisions.
  const canManageRoles = hasPermission(me?.permissions, Permission.CommissionsPlansManage);
  const canSetPay = canManageRoles || hasPermission(me?.permissions, Permission.CommissionsAdjust);
  const chairWord = serviceStationLabel(business);
  const [board, setBoard] = useState<ServiceBoard | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  /** The free chair that opened the new-customer dialog, so that dialog also seats them. */
  const [addingChair, setAddingChair] = useState<number | null>(null);
  const [starting, setStarting] = useState<ServiceTicketRecord | null>(null);
  // The chair tapped on the till to seat the next customer; the start dialog opens on it.
  const [startChair, setStartChair] = useState<number | null>(null);
  const [paying, setPaying] = useState<ServiceTicketRecord | null>(null);
  const [selling, setSelling] = useState(false);
  const [sharing, setSharing] = useState<ServiceTicketRecord | null>(null);
  const [offers, setOffers] = useState<PackageOffer[]>([]);
  const [, setTick] = useState(0);

  // The till's own shift: a cashier who works only here opens and closes it here.
  const shiftsOff = isShiftsDisabled(useFeatureFlags());
  const [shift, setShift] = useState<ShiftRecord | null | undefined>(undefined);
  const [closingShift, setClosingShift] = useState(false);
  const loadShift = useCallback(async () => {
    if (!till || shiftsOff || !branchId) return;
    try {
      const current = await fetchCurrentShift(branchId, { toast: false });
      setShift(current && current.status === "open" ? current : null);
    } catch {
      // No shift is open on this branch (or it could not be read): offer to open one.
      setShift(null);
    }
  }, [till, shiftsOff, branchId]);
  const openShift = useCallback(() => {
    void requestSetup({ requirement: "shift" }).then(() => loadShift());
  }, [loadShift]);
  useEffect(() => {
    if (!till || shiftsOff) return;
    void loadShift();
    // The banner's "Open shift here" and a shift opened or closed by a dialog both land here.
    const onShiftChanged = () => void loadShift();
    window.addEventListener(OPEN_POS_SHIFT_EVENT, openShift);
    window.addEventListener(POS_GUIDANCE_RESOLVED_EVENT, onShiftChanged);
    return () => {
      window.removeEventListener(OPEN_POS_SHIFT_EVENT, openShift);
      window.removeEventListener(POS_GUIDANCE_RESOLVED_EVENT, onShiftChanged);
    };
  }, [till, shiftsOff, loadShift, openShift]);

  // Today's bookings still to come, shown on the till so the person at the counter can mark an
  // arrival or take a new booking without leaving it.
  const [bookedToday, setBookedToday] = useState<ServiceTicketRecord[]>([]);
  const [booking, setBooking] = useState(false);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    try {
      setBoard(await fetchServiceBoard(branchId));
      setLoadError(null);
    } catch {
      setLoadError("Could not load the floor. Check your connection.");
    }
    if (till) {
      const start = new Date(`${nairobiToday()}T00:00:00+03:00`);
      const end = new Date(start.getTime() + 86400000);
      try {
        const rows = await fetchAppointments(branchId, start.toISOString(), end.toISOString());
        setBookedToday(
          rows
            .filter((row) => row.stage === "BOOKED" && row.status === "pending")
            .sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "")),
        );
      } catch {
        // The floor still works without the bookings list; it is read again on the next refresh.
      }
    }
  }, [branchId, till]);

  useEffect(() => {
    void refresh();
    void fetchServices({ active: true }).then(setServices).catch(() => setServices([]));
    void fetchServicePerformers().then(setPerformers).catch(() => setPerformers([]));
    void fetchPackageOffers().then(setOffers).catch(() => setOffers([]));
    const timer = window.setInterval(() => {
      void refresh();
      setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const run = useCallback(
    async (ticketId: string, action: () => Promise<unknown>, failure: string) => {
      setBusy(ticketId);
      setNotice(null);
      try {
        await action();
      } catch (err) {
        setNotice(message(err, failure));
      } finally {
        setBusy(null);
        await refresh();
      }
    },
    [refresh],
  );

  const waiting = useMemo(() => (board?.tickets ?? []).filter((t) => t.stage === "WAITING"), [board]);
  const ready = useMemo(() => (board?.tickets ?? []).filter((t) => t.stage === "READY_TO_PAY"), [board]);
  const staffNames = useMemo(() => new Map(performers.map((p) => [p.staffProfileId, p.displayName])), [performers]);
  const byChair = useMemo(() => {
    const map = new Map<number, ServiceTicketRecord>();
    for (const t of board?.tickets ?? []) {
      if (t.stage === "IN_SERVICE" && t.stationNo != null) map.set(t.stationNo, t);
    }
    return map;
  }, [board]);

  // Visits whose service in progress is not on one of the numbered chairs (a bed, a room, or no
  // place at all): they must still be visible on the floor.
  const elsewhere = (board?.tickets ?? []).filter(
    (t) => t.stage === "IN_SERVICE" && (t.stationNo == null || t.stationNo > (board?.stationCount ?? 0)),
  );

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Choose a branch</p>
          <p className={dashboardHintClass()}>Pick a branch at the top of the page to see its floor.</p>
        </div>
      </div>
    );
  }
  if (loadError && !board) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Floor" message={loadError} onRetry={() => void refresh()} />
      </div>
    );
  }
  if (!board) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading the floor…" />
      </div>
    );
  }

  const chairs = Array.from({ length: board.stationCount }, (_, i) => i + 1);
  const freeChairs = chairs.filter((n) => !byChair.has(n));

  // Who is here today, for the dialogs that offer a person to a customer.
  const floorStatuses: Record<string, FloorStatus> = Object.fromEntries(
    (board.staff ?? []).map((member) => [member.staffProfileId, member.floorStatus]),
  );
  const markBack = (staffProfileId: string) =>
    run(staffProfileId, () => setStaffFloorStatus(staffProfileId, "AVAILABLE"), "Could not update.");

  const cancelTicket = (ticket: ServiceTicketRecord) => {
    const reason = window.prompt(`Cancel ticket ${ticket.ticketNumber}? Say why.`);
    if (!reason?.trim()) return;
    void run(
      ticket.id,
      () => cancelServiceTicket(ticket.id, { reason: reason.trim() }),
      "Only a manager can cancel a ticket once the customer has been served.",
    );
  };

  return (
    <div className={till ? "contents" : DASHBOARD_MAX}>
      {till ? (
        <FloorTillView
          board={board}
          waiting={waiting}
          ready={ready}
          byChair={byChair}
          elsewhere={elsewhere}
          chairWord={chairWord}
          busy={busy}
          canSellPackage={offers.length > 0}
          manyPerformers={performers.length > 1}
          staffNames={staffNames}
          tillOnly={isServiceCashier(me?.role?.key, isServiceOnlyBusiness(business))}
          shift={shiftsOff ? "off" : shift === undefined ? "unknown" : shift ? "open" : "closed"}
          shiftOpenedAt={shift?.openedAt ?? null}
          onOpenShift={openShift}
          onCloseShift={() => setClosingShift(true)}
          bookedToday={bookedToday}
          onBook={() => setBooking(true)}
          onArrived={(ticket) =>
            void run(ticket.id, () => markAppointmentArrived(ticket.id), "Could not mark the arrival.")
          }
          onNoShow={(ticket) => {
            const who = ticket.bookingName ?? "this customer";
            if (!window.confirm(`Did ${who} not come? The booking is closed.`)) return;
            // Money already paid for the booking: the shop keeps it unless it is handed back as credit.
            const held = ticket.depositState === "HELD" && (ticket.depositAmount ?? 0) > 0;
            const asCredit = held
              ? window.confirm(`${who} paid a deposit. OK gives it back as credit; Cancel keeps it for the shop.`)
              : false;
            void run(ticket.id, () => markAppointmentNoShow(ticket.id, asCredit), "Could not close the booking.");
          }}
          notice={notice}
          stale={loadError}
          onNewCustomer={(chair) => {
            setAddingChair(chair ?? null);
            setAdding(true);
          }}
          onSellPackage={() => setSelling(true)}
          onStart={(ticket, chair) => {
            setStartChair(chair ?? null);
            setStarting(ticket);
          }}
          onPriority={(ticket, priority) =>
            void run(ticket.id, () => setServiceTicketPriority(ticket.id, priority), "Could not move the ticket.")
          }
          onLeft={(ticket) => {
            if (!window.confirm(`Ticket ${ticket.ticketNumber}: did the customer leave?`)) return;
            void run(ticket.id, () => cancelServiceTicket(ticket.id, { abandoned: true }), "Could not update the ticket.");
          }}
          onDone={(ticket) => void run(ticket.id, () => finishServiceTicket(ticket.id), "Could not finish the ticket.")}
          onShare={setSharing}
          onCancel={cancelTicket}
          onPay={setPaying}
          onReopen={(ticket) => void run(ticket.id, () => reopenServiceTicket(ticket.id), "Could not undo.")}
          onStaffStatus={(staffProfileId, status) =>
            void run(staffProfileId, () => setStaffFloorStatus(staffProfileId, status), "Could not update.")
          }
        />
      ) : null}
      {till ? null : (
        <>
        <DashboardPageHero icon={Armchair} title="Floor" description="Who is waiting, who is being served, who is ready to pay.">
          <div className="flex flex-wrap gap-1.5">
            {offers.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => setSelling(true)}>
                Sell a package
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href={APP_ROUTES.servicesAppointments}>Bookings</Link>
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              New customer
            </Button>
          </div>
        </DashboardPageHero>

      {(board.staff ?? []).length > 0 ? (
        <section className={cn(DASHBOARD_SECTION_SURFACE, "flex flex-wrap items-center gap-x-4 gap-y-2")} aria-label="Team">
          <h2 className={dashboardLabelClass()}>Team</h2>
          {(board.staff ?? []).map((member) => (
            <label key={member.staffProfileId} className="flex items-center gap-1.5 text-sm">
              <span className="font-medium">{member.displayName}</span>
              <select
                className={dashboardSelectClass(false, "h-8 w-auto text-sm")}
                aria-label={`${member.displayName} is`}
                value={member.floorStatus}
                disabled={busy === member.staffProfileId}
                onChange={(e) =>
                  void run(
                    member.staffProfileId,
                    () => setStaffFloorStatus(member.staffProfileId, e.target.value as FloorStatus),
                    "Could not update.",
                  )
                }
              >
                <option value="AVAILABLE">Here</option>
                <option value="ON_BREAK">On a break</option>
                <option value="OFF">Off today</option>
              </select>
            </label>
          ))}
        </section>
      ) : null}

      {loadError ? (
        <p role="status" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm")}>
          {loadError} Showing the last known floor.
        </p>
      ) : null}
      {notice ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm text-red-700")}>
          {notice}
        </p>
      ) : null}

      {board.stationCount === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Say how many {chairWord.toLowerCase()}s you have</p>
          <p className={dashboardHintClass()}>The floor shows one column for each.</p>
          <Link className="mt-2 inline-block text-sm font-medium underline" href={APP_ROUTES.servicesSetup}>
            Set up the shop
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-[16rem_minmax(0,1fr)_16rem]">
          <section className={DASHBOARD_SECTION_SURFACE} aria-label="Waiting">
            <h2 className={dashboardLabelClass()}>Waiting ({waiting.length})</h2>
            {waiting.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>No one is waiting.</p>
            ) : (
              <ol className="mt-1 divide-y">
                {waiting.map((ticket, i) => (
                  <li key={ticket.id} className="py-2">
                    <TicketSummary ticket={ticket} position={i + 1} sinceIso={ticket.createdAt} sinceLabel="waiting" />
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy === ticket.id || freeChairs.length === 0}
                        onClick={() => setStarting(ticket)}
                      >
                        Start
                      </Button>
                      {i > 0 || (ticket.priority ?? 0) < 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy === ticket.id}
                          onClick={() =>
                            void run(ticket.id, () => setServiceTicketPriority(ticket.id, 1), "Could not move the ticket.")
                          }
                        >
                          Next
                        </Button>
                      ) : null}
                      {waiting.length > 1 && (ticket.priority ?? 0) >= 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy === ticket.id}
                          onClick={() =>
                            void run(ticket.id, () => setServiceTicketPriority(ticket.id, -1), "Could not move the ticket.")
                          }
                        >
                          Skip
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === ticket.id}
                        onClick={() => {
                          if (!window.confirm(`Ticket ${ticket.ticketNumber}: did the customer leave?`)) return;
                          void run(
                            ticket.id,
                            () => cancelServiceTicket(ticket.id, { abandoned: true }),
                            "Could not update the ticket.",
                          );
                        }}
                      >
                        Left
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {elsewhere.length > 0 ? (
              <div className="mt-3 border-t pt-2">
                <h2 className={dashboardLabelClass()}>Being served elsewhere ({elsewhere.length})</h2>
                <ul className="mt-1 divide-y">
                  {elsewhere.map((ticket) => (
                    <li key={ticket.id} className="py-1.5 text-sm">
                      <span className="font-medium">Ticket {ticket.ticketNumber}</span>
                      <span className={cn("block", dashboardHintClass())}>
                        {ticket.lines
                          .filter((l) => l.stage === "IN_SERVICE")
                          .map((l) => `${l.name} · ${l.performerName ?? "Staff"}${l.resourceName ? ` · ${l.resourceName}` : ""}`)
                          .join("; ")}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link className="mt-1 inline-block text-sm underline" href={APP_ROUTES.servicesSell}>
                  Open the visits
                </Link>
              </div>
            ) : null}
            {waiting.length > 0 && freeChairs.length === 0 ? (
              <p className={cn("mt-1", dashboardHintClass())}>Every {chairWord.toLowerCase()} is taken.</p>
            ) : null}
          </section>

          <section
            aria-label={`${chairWord}s`}
            className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            {chairs.map((n) => {
              const ticket = byChair.get(n);
              return (
                <div key={n} className={cn(DASHBOARD_SECTION_SURFACE, "min-h-[8rem]")}>
                  <h3 className={dashboardLabelClass()}>
                    {chairWord} {n}
                  </h3>
                  {ticket ? (
                    <>
                      <p className="mt-1 text-lg font-semibold leading-tight">{ticket.staffName ?? "Staff"}</p>
                      <TicketSummary ticket={ticket} sinceIso={ticket.startedAt} sinceLabel="in the chair" />
                      <Button
                        className="mt-2 w-full"
                        disabled={busy === ticket.id}
                        onClick={() => void run(ticket.id, () => finishServiceTicket(ticket.id), "Could not finish the ticket.")}
                      >
                        {ticket.redoOfSaleId ? "Done · no charge" : "Done"}
                      </Button>
                      {performers.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1"
                          disabled={busy === ticket.id}
                          onClick={() => setSharing(ticket)}
                        >
                          {ticket.lines.some((l) => (l.helpers ?? []).length > 0) ? "Shared work" : "Others helped"}
                        </Button>
                      ) : null}
                      <CancelButton ticket={ticket} busy={busy === ticket.id} run={run} />
                    </>
                  ) : (
                    <p className={cn("mt-2", dashboardHintClass())}>Free</p>
                  )}
                </div>
              );
            })}
          </section>

          <section className={DASHBOARD_SECTION_SURFACE} aria-label="Ready to pay">
            <h2 className={dashboardLabelClass()}>Ready to pay ({ready.length})</h2>
            {ready.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>No one is waiting to pay.</p>
            ) : (
              <ul className="mt-1 divide-y">
                {ready.map((ticket) => (
                  <li key={ticket.id} className="py-2">
                    <TicketSummary ticket={ticket} sinceIso={ticket.finishedAt} sinceLabel="since done" />
                    <p className={dashboardHintClass()}>
                      {ticket.staffName ?? "Staff"}
                      {helpersSummary(ticket, staffNames) ? ` · with ${helpersSummary(ticket, staffNames)}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Button size="sm" disabled={busy === ticket.id} onClick={() => setPaying(ticket)}>
                        Take {kes(ticket.total)}
                      </Button>
                      {performers.length > 1 ? (
                        <Button variant="ghost" size="sm" disabled={busy === ticket.id} onClick={() => setSharing(ticket)}>
                          {ticket.lines.some((l) => (l.helpers ?? []).length > 0) ? "Shared work" : "Others helped"}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === ticket.id}
                        onClick={() => void run(ticket.id, () => reopenServiceTicket(ticket.id), "Could not undo.")}
                      >
                        Not done
                      </Button>
                      <CancelButton ticket={ticket} busy={busy === ticket.id} run={run} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
        </>
      )}

      {till && booking ? (
        <BookingDialog
          branchId={branchId}
          date={nairobiToday()}
          services={services}
          performers={performers}
          onClose={() => setBooking(false)}
          onDone={async () => {
            setBooking(false);
            await refresh();
          }}
        />
      ) : null}
      {till && closingShift && shift ? (
        <CloseShiftModal
          open
          onClose={() => setClosingShift(false)}
          shift={shift}
          onClosed={() => {
            setClosingShift(false);
            setShift(null);
            // The till needs a shift again before the next payment: say so in the banner.
            notifyPosGuidance("open-shift");
            void loadShift();
          }}
        />
      ) : null}
      {adding ? (
        <NewCustomerDialog
          branchId={branchId}
          services={services}
          performers={performers}
          statuses={floorStatuses}
          onMarkBack={markBack}
          seat={
            addingChair == null
              ? null
              : { chairWord, freeChairs, chair: addingChair }
          }
          onClose={() => {
            setAdding(false);
            setAddingChair(null);
          }}
          onDone={async () => {
            setAdding(false);
            setAddingChair(null);
            await refresh();
          }}
        />
      ) : null}
      {sharing ? (
        <HelpersDialog
          ticket={sharing}
          performers={performers}
          services={services}
          canSetPay={canSetPay}
          canManageRoles={canManageRoles}
          onClose={() => setSharing(null)}
          onDone={async () => {
            setSharing(null);
            await refresh();
          }}
        />
      ) : null}
      {selling ? <SellPackageDialog branchId={branchId} offers={offers} onClose={() => setSelling(false)} /> : null}
      {starting ? (
        <StartDialog
          ticket={starting}
          chairWord={chairWord}
          freeChairs={freeChairs}
          initialChair={startChair}
          performers={performers}
          statuses={floorStatuses}
          onMarkBack={markBack}
          onClose={() => setStarting(null)}
          onDone={async () => {
            setStarting(null);
            await refresh();
          }}
        />
      ) : null}
      {paying ? (
        <PayDialog
          ticket={paying}
          onChanged={async (text) => {
            // The ticket was changed under us (a price update): show why and the new total.
            setPaying(null);
            setNotice(text);
            await refresh();
          }}
          onClose={() => setPaying(null)}
          onDone={async () => {
            setPaying(null);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/** Says who is not offered and why; someone on a break can be marked back with one tap. */
function AwayNote({
  presence,
  onMarkBack,
}: {
  presence: { onBreak: ServicePerformerRecord[]; off: ServicePerformerRecord[] };
  onMarkBack?: (staffProfileId: string) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const sentence = awaySentence(presence.onBreak, presence.off);
  if (!sentence) return null;
  return (
    <div className="grid gap-1.5 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2.5 py-2">
      <p className={dashboardHintClass()}>{sentence} They are not offered until they are back.</p>
      {onMarkBack && presence.onBreak.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {presence.onBreak.map((person) => (
            <Button
              key={person.staffProfileId}
              size="sm"
              variant="outline"
              disabled={busy != null}
              onClick={() => {
                setBusy(person.staffProfileId);
                void Promise.resolve(onMarkBack(person.staffProfileId)).finally(() => setBusy(null));
              }}
            >
              {busy === person.staffProfileId ? "Updating…" : `${person.displayName.trim().split(/\s+/)[0]} is back`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NobodyHere() {
  return (
    <p className={dashboardHintClass()}>
      Nobody is marked as here. Set who is in today at the top of the till, then choose them.
    </p>
  );
}

/** Cancels a ticket that has been started. The server only allows it for a manager. */
function CancelButton({
  ticket,
  busy,
  run,
}: {
  ticket: ServiceTicketRecord;
  busy: boolean;
  run: (ticketId: string, action: () => Promise<unknown>, failure: string) => Promise<void>;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mt-1"
      disabled={busy}
      onClick={() => {
        const reason = window.prompt(`Cancel ticket ${ticket.ticketNumber}? Say why.`);
        if (reason == null) return;
        if (!reason.trim()) return;
        void run(
          ticket.id,
          () => cancelServiceTicket(ticket.id, { reason: reason.trim() }),
          "Only a manager can cancel a ticket once the customer has been served.",
        );
      }}
    >
      Cancel ticket
    </Button>
  );
}

function TicketSummary({
  ticket,
  position,
  sinceIso,
  sinceLabel,
}: {
  ticket: ServiceTicketRecord;
  position?: number;
  sinceIso: string | null;
  sinceLabel: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">
        {position != null ? `${position}. ` : ""}Ticket {ticket.ticketNumber}
        {ticket.bookingName ? ` · ${ticket.bookingName}` : ""}
      </p>
      <p className="text-sm">{ticket.lines.map((l) => l.name).join(", ")}</p>
      <p className={dashboardHintClass()}>
        <span className="font-mono tabular-nums">{minutesSince(sinceIso)} min</span> {sinceLabel}
        {position != null && ticket.staffName ? ` · asked for ${ticket.staffName}` : ""}
        {position != null && ticket.estimatedWaitMinutes != null
          ? ` · about ${ticket.estimatedWaitMinutes} min to go`
          : ""}
      </p>
      {ticket.redoOfSaleId ? <p className={dashboardHintClass()}>Redo · no charge</p> : null}
      {ticket.depositState === "HELD" && ticket.depositAmount ? (
        <p className={dashboardHintClass()}>Deposit paid {kes(ticket.depositAmount)}</p>
      ) : null}
    </div>
  );
}

/** Whole shillings, the way the till reads them aloud. */
const tillKes = (amount: number) => kes(amount).replace(/\.00$/, "");

const SLIP_DIALOG =
  "max-h-[min(92dvh,44rem)] w-[calc(100vw-1.5rem)] max-w-[26.5rem] gap-0 overflow-hidden p-0 [scrollbar-color:rgba(18,26,22,0.28)_transparent] [scrollbar-width:thin]";

const SLIP_HEAD = "border-b border-[var(--op-rule)] px-5 pb-3 pt-4";
const SLIP_FOOT =
  "gap-3 border-t border-[var(--op-rule)] bg-[var(--op-surface)] px-5 py-3 sm:flex-col sm:items-stretch";
const SLIP_SCROLL = "min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(18,26,22,0.28)_transparent] [scrollbar-width:thin]";

function pickMarkClass(on: boolean) {
  return cn(
    "grid size-4 shrink-0 place-items-center rounded-[2px] border",
    on
      ? "border-[var(--op-accent)] bg-[var(--op-accent)] text-[var(--op-surface)]"
      : "border-[color-mix(in_srgb,var(--op-ink)_32%,transparent)] bg-[var(--op-surface)]",
  );
}

function lineAmount(service: ServiceRecord, typed: string): number | null {
  if (!service.priceIsVariable) return service.price;
  const entered = Number(typed);
  if (entered > 0) return entered;
  if (service.price > 0) return service.price;
  return null;
}

type SlipFigure = { kind: "free" } | { kind: "open" } | { kind: "total"; amount: number };

/** What the footer should say before the customer is seated. Null until a service is chosen. */
function slipFigure(
  catalog: ServiceRecord[],
  picked: readonly string[],
  prices: Readonly<Record<string, string>>,
  redo: boolean,
): SlipFigure | null {
  if (redo) return { kind: "free" };
  if (picked.length === 0) return null;
  let total = 0;
  for (const id of picked) {
    const service = catalog.find((row) => row.id === id);
    if (!service) continue;
    const amount = lineAmount(service, prices[id] ?? "");
    if (amount == null) return { kind: "open" };
    total += amount;
  }
  return { kind: "total", amount: total };
}

function ServicePickRow({
  service,
  on,
  price,
  onToggle,
  onPrice,
}: {
  service: ServiceRecord;
  on: boolean;
  price: string;
  onToggle: (checked: boolean) => void;
  onPrice: (value: string) => void;
}) {
  return (
    <li className={cn("border-b border-[var(--op-rule)]", on && "bg-[var(--op-accent-soft)]")}>
      <div className="flex items-center gap-3 px-5">
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5">
          <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onToggle(e.target.checked)} />
          <span aria-hidden className={pickMarkClass(on)}>
            {on ? <Check className="size-3" strokeWidth={2.75} /> : null}
          </span>
          <span className={cn("truncate text-[14px] text-[var(--op-ink)]", on && "font-medium")}>{service.name}</span>
        </label>
        <ServicePrice service={service} on={on} price={price} onPrice={onPrice} />
      </div>
    </li>
  );
}

function ServicePrice({
  service,
  on,
  price,
  onPrice,
}: {
  service: ServiceRecord;
  on: boolean;
  price: string;
  onPrice: (value: string) => void;
}) {
  if (service.priceIsVariable && on) {
    return (
      <input
        className={dashboardInputClass(false, "h-9 w-24 text-right font-mono tabular-nums sm:h-8")}
        inputMode="decimal"
        placeholder="Price"
        aria-label={`Price for ${service.name}`}
        value={price}
        onChange={(e) => onPrice(e.target.value.replace(/[^0-9.]/g, ""))}
      />
    );
  }
  if (service.priceIsVariable) {
    return <span className="font-mono text-[12px] text-[var(--op-muted)]">At the till</span>;
  }
  return (
    <span className={cn("font-mono text-[13px] tabular-nums", on ? "font-medium text-[var(--op-ink)]" : "text-[var(--op-muted)]")}>
      {tillKes(service.price)}
    </span>
  );
}

function ServingField({
  legend,
  note,
  people,
  value,
  onPick,
}: {
  legend: string;
  note?: string | null;
  people: ServicePerformerRecord[];
  value: string;
  onPick: (staffProfileId: string) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className={dashboardLabelClass()}>{legend}</legend>
      {note ? <p className={dashboardHintClass()}>{note}</p> : null}
      {people.length === 0 ? <NobodyHere /> : null}
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const pressed = value === person.staffProfileId;
          return (
            <button
              key={person.staffProfileId}
              type="button"
              aria-pressed={pressed}
              onClick={() => onPick(person.staffProfileId)}
              className={cn(
                "h-11 rounded-[2px] border px-3 text-[14px] font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
                pressed
                  ? "border-[var(--op-accent)] bg-[var(--op-accent-soft)] text-[var(--op-accent)]"
                  : "border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-ink)] hover:bg-[var(--op-bg)]",
              )}
            >
              {person.displayName}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ChairField({
  word,
  chairs,
  value,
  onPick,
}: {
  word: string;
  chairs: readonly number[];
  value: number | null;
  onPick: (chair: number) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className={dashboardLabelClass()}>{word}</legend>
      <div className="flex flex-wrap gap-2">
        {chairs.map((number) => {
          const pressed = value === number;
          return (
            <button
              key={number}
              type="button"
              aria-pressed={pressed}
              aria-label={`${word} ${number}`}
              onClick={() => onPick(number)}
              className={cn(
                "grid size-11 place-items-center rounded-[2px] border font-mono text-[16px] font-semibold tabular-nums",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
                pressed
                  ? "border-[var(--op-accent)] bg-[var(--op-accent)] text-[var(--op-surface)]"
                  : "border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-ink)] hover:bg-[var(--op-bg)]",
              )}
            >
              {number}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function NewCustomerDialog({
  branchId,
  services,
  performers,
  seat = null,
  statuses,
  onMarkBack,
  onClose,
  onDone,
}: {
  branchId: string;
  services: ServiceRecord[];
  performers: ServicePerformerRecord[];
  /** Who is here, on a break or off today, by staff profile. People not here are not offered. */
  statuses?: Readonly<Record<string, FloorStatus>>;
  /** Marks someone back from their break, so they can be chosen. */
  onMarkBack?: (staffProfileId: string) => Promise<void> | void;
  /** Set when a free chair opened this dialog: the same form also seats them there. */
  seat?: { chairWord: string; freeChairs: number[]; chair: number } | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const presence = teamByPresence(performers, statuses);
  const [staffId, setStaffId] = useState("");
  const [servingId, setServingId] = useState(presence.here.length === 1 ? presence.here[0]!.staffProfileId : "");
  // Someone chosen and then marked on a break or off is no longer a choice.
  const asked = presence.here.some((p) => p.staffProfileId === staffId) ? staffId : "";
  const serving = presence.here.some((p) => p.staffProfileId === servingId) ? servingId : "";
  const [seatChair, setSeatChair] = useState<number | null>(
    seat && seat.freeChairs.includes(seat.chair) ? seat.chair : null,
  );
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [redo, setRedo] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One id per new customer: a retry after a dropped connection opens no second ticket.
  const clientIdRef = useRef<string>(nextIdempotencyKey());
  const createdRef = useRef<ServiceTicketRecord | null>(null);

  async function save() {
    if (picked.length === 0) return setError("Choose at least one service");
    const lines: { serviceId: string; unitPrice?: number }[] = [];
    for (const id of picked) {
      const service = services.find((s) => s.id === id);
      if (!service) continue;
      if (service.priceIsVariable) {
        const price = Number(prices[id] ?? "");
        if (!(price > 0) && !(service.price > 0)) return setError(`Enter the price for ${service.name}`);
        lines.push(price > 0 ? { serviceId: id, unitPrice: price } : { serviceId: id });
      } else {
        lines.push({ serviceId: id });
      }
    }
    const receiptNo = Number(receipt);
    if (redo && !(Number.isInteger(receiptNo) && receiptNo > 0)) {
      return setError("Enter the receipt number of the visit being put right");
    }
    if (seat && !serving) return setError("Choose who is serving them");
    if (seat && (seatChair == null || !seat.freeChairs.includes(seatChair))) {
      return setError(`Choose a ${seat.chairWord.toLowerCase()}`);
    }
    setError(null);
    setSaving(true);
    try {
      let redoOfSaleId: string | null = null;
      if (redo) {
        try {
          redoOfSaleId = (await fetchSaleByReceiptNo(receiptNo)).id;
        } catch (err) {
          setError(
            err instanceof ApiRequestError && err.status === 404
              ? `There is no receipt ${receiptNo}. Check the number on the customer's receipt.`
              : "Could not look up that receipt. Check your connection and try again.",
          );
          return;
        }
      }
      const customerId = phone.trim() ? await findOrCreateCustomer(phone, name) : null;
      const ticket =
        createdRef.current ??
        (await createServiceTicket({
          branchId,
          clientTicketId: clientIdRef.current,
          customerId,
          requestedStaffProfileId: asked || null,
          lines,
          redoOfSaleId,
        }));
      createdRef.current = ticket;
      if (seat && seatChair != null) {
        await startServiceTicket(ticket.id, { performerStaffProfileId: serving, stationNo: seatChair });
      }
      await onDone();
    } catch (err) {
      setError(
        message(
          err,
          createdRef.current && seat
            ? "They're on the bench. Seating didn't go through — try again."
            : "Could not add the customer. Try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const figure = slipFigure(services, picked, prices, redo);

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className={SLIP_DIALOG}>
        <DialogHeader className={SLIP_HEAD}>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>
            {seat
              ? `What do they want? They go straight to ${seat.chairWord.toLowerCase()} ${seatChair ?? seat.chair}.`
              : "What do they want, and did they ask for someone?"}
          </DialogDescription>
        </DialogHeader>
        <div className={SLIP_SCROLL}>
          {services.length === 0 ? (
            <p className="px-5 py-4 text-[14px] text-[var(--op-ink)]">
              There are no services yet.{" "}
              <Link className="text-[var(--op-accent)] underline decoration-[var(--op-rule)] underline-offset-2" href={APP_ROUTES.services}>
                Add a service
              </Link>
            </p>
          ) : (
            <ul>
              {services.map((service) => (
                <ServicePickRow
                  key={service.id}
                  service={service}
                  on={picked.includes(service.id)}
                  price={prices[service.id] ?? ""}
                  onToggle={(checked) => {
                    setPicked((prev) => (checked ? [...prev, service.id] : prev.filter((id) => id !== service.id)));
                    setError(null);
                  }}
                  onPrice={(value) => setPrices((prev) => ({ ...prev, [service.id]: value }))}
                />
              ))}
            </ul>
          )}
          <div className="grid gap-3 border-b border-[var(--op-rule)] bg-[var(--op-bg)] px-5 py-4">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Asked for</span>
              <select className={dashboardSelectClass()} value={asked} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Next available</option>
                {presence.here.map((person) => (
                  <option key={person.staffProfileId} value={person.staffProfileId}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
            <AwayNote presence={presence} onMarkBack={onMarkBack} />
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Phone (optional)</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ""))}
                />
              </label>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Name (optional)</span>
                <input className={dashboardInputClass(false)} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <p className={dashboardHintClass()}>Add a phone number to use a package they have paid for.</p>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] text-[var(--op-ink)]">
              <input
                type="checkbox"
                className="sr-only"
                checked={redo}
                onChange={(e) => {
                  setRedo(e.target.checked);
                  setError(null);
                }}
              />
              <span aria-hidden className={cn("mt-0.5", pickMarkClass(redo))}>
                {redo ? <Check className="size-3" strokeWidth={2.75} /> : null}
              </span>
              <span>
                Free redo of an earlier visit
                <span className={cn("block", dashboardHintClass())}>
                  The work was not right and is being done again. Nothing is charged and no commission is earned.
                </span>
              </span>
            </label>
            {redo ? (
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Receipt number of that visit</span>
                <input
                  className={dashboardInputClass(false, "w-32 font-mono")}
                  inputMode="numeric"
                  value={receipt}
                  onChange={(e) => {
                    setReceipt(e.target.value.replace(/[^0-9]/g, ""));
                    setError(null);
                  }}
                />
              </label>
            ) : null}
          </div>
          {seat ? (
            <div className="grid gap-4 px-5 py-4">
              <ServingField
                legend="Who is serving them"
                people={presence.here}
                value={serving}
                onPick={(id) => {
                  setServingId(id);
                  setError(null);
                }}
              />
              <ChairField
                word={seat.chairWord}
                chairs={seat.freeChairs}
                value={seatChair}
                onPick={(number) => {
                  setSeatChair(number);
                  setError(null);
                }}
              />
            </div>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="border-t border-[var(--op-rule)] px-5 py-2 text-[13px] text-[var(--op-highlight)]">
            {error}
          </p>
        ) : null}
        <DialogFooter className={SLIP_FOOT}>
          {figure?.kind === "total" ? (
            <p className="text-right font-mono text-[15px] font-semibold tabular-nums leading-none text-[var(--op-ink)]">
              {tillKes(figure.amount)}
            </p>
          ) : null}
          {figure?.kind === "free" ? (
            <p className="text-right text-[13px] font-medium leading-none text-[var(--op-muted)]">Free</p>
          ) : null}
          {figure?.kind === "open" ? (
            <p className="text-right text-[13px] font-medium leading-none text-[var(--op-muted)]">Enter the price</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3 shadow-none sm:h-10" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" className="h-11 rounded-[2px] px-3.5 shadow-none sm:h-10" disabled={saving || services.length === 0} onClick={() => void save()}>
              {saving ? (seat ? "Seating…" : "Adding…") : seat ? "Seat them" : redo ? "Add the redo to the queue" : "Add to the queue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartDialog({
  ticket,
  chairWord,
  freeChairs,
  initialChair,
  performers,
  statuses,
  onMarkBack,
  onClose,
  onDone,
}: {
  ticket: ServiceTicketRecord;
  chairWord: string;
  freeChairs: number[];
  statuses?: Readonly<Record<string, FloorStatus>>;
  onMarkBack?: (staffProfileId: string) => Promise<void> | void;
  /** The chair the cashier tapped, when they started from a free chair. */
  initialChair?: number | null;
  performers: ServicePerformerRecord[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const presence = teamByPresence(performers, statuses);
  const isHere = (id: string | null | undefined) => presence.here.some((p) => p.staffProfileId === id);
  const [picked, setStaffId] = useState(
    // The person they asked for, when that person is here; the only person here, when there is one.
    isHere(ticket.staffProfileId) ? ticket.staffProfileId! : presence.here.length === 1 ? presence.here[0]!.staffProfileId : "",
  );
  const staffId = isHere(picked) ? picked : "";
  const askedForAway =
    ticket.staffProfileId && !isHere(ticket.staffProfileId)
      ? performers.find((p) => p.staffProfileId === ticket.staffProfileId)?.displayName ?? null
      : null;
  const [chair, setChair] = useState<number | null>(
    initialChair != null && freeChairs.includes(initialChair) ? initialChair : freeChairs.length === 1 ? freeChairs[0]! : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function start() {
    if (!staffId) return setError("Choose who is serving them");
    if (chair == null) return setError(`Choose a ${chairWord.toLowerCase()}`);
    setError(null);
    setSaving(true);
    try {
      await startServiceTicket(ticket.id, { performerStaffProfileId: staffId, stationNo: chair });
      await onDone();
    } catch (err) {
      setError(message(err, "Could not start. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start ticket {ticket.ticketNumber}</DialogTitle>
          <DialogDescription>{ticket.lines.map((l) => l.name).join(", ")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <fieldset className="grid gap-1.5">
            <legend className={dashboardLabelClass()}>Who is serving them</legend>
            {askedForAway ? (
              <p className={dashboardHintClass()}>
                They asked for {askedForAway.split(/\s+/)[0]}, who is not here now. Choose someone else, or seat them when{" "}
                {askedForAway.split(/\s+/)[0]} is back.
              </p>
            ) : null}
            {presence.here.length === 0 ? <NobodyHere /> : null}
            <div className="grid grid-cols-2 gap-2">
              {presence.here.map((p) => (
                <Button
                  key={p.staffProfileId}
                  variant={staffId === p.staffProfileId ? "default" : "outline"}
                  aria-pressed={staffId === p.staffProfileId}
                  onClick={() => {
                    setStaffId(p.staffProfileId);
                    setError(null);
                  }}
                >
                  {p.displayName}
                </Button>
              ))}
            </div>
          </fieldset>
          <AwayNote presence={presence} onMarkBack={onMarkBack} />
          <fieldset className="grid gap-1.5">
            <legend className={dashboardLabelClass()}>{chairWord}</legend>
            <div className="flex flex-wrap gap-2">
              {freeChairs.map((n) => (
                <Button
                  key={n}
                  variant={chair === n ? "default" : "outline"}
                  aria-pressed={chair === n}
                  onClick={() => {
                    setChair(n);
                    setError(null);
                  }}
                >
                  {n}
                </Button>
              ))}
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void start()}>
            {saving ? "Starting…" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({
  ticket,
  onClose,
  onDone,
  onChanged,
}: {
  ticket: ServiceTicketRecord;
  onClose: () => void;
  onDone: () => Promise<void> | void;
  onChanged: (text: string) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [tip, setTip] = useState("");
  const [cash, setCash] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per ticket payment: a retry never rings the ticket twice.
  const keyRef = useRef<string>(nextIdempotencyKey());

  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [packageId, setPackageId] = useState("");
  const customerId = ticket.customerId ?? null;

  useEffect(() => {
    if (!customerId) return;
    let live = true;
    void fetchCustomerPackages(customerId)
      .then((rows) => {
        if (!live) return;
        const serviceIds = new Set(ticket.lines.map((l) => l.serviceId));
        setPackages(rows.filter((p) => p.sessionsRemaining > 0 && !p.expired && serviceIds.has(p.serviceId)));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [customerId, ticket.lines]);

  const tipNumber = parseMoney(tip) ?? 0;
  const deposit = ticket.depositState === "HELD" ? (ticket.depositAmount ?? 0) : 0;
  const chosenPackage = packages.find((p) => p.id === packageId) ?? null;
  const sessionValue = chosenPackage ? packageSessionValue(chosenPackage) : 0;
  const toPay = amountStillDue(ticket.total, tipNumber > 0 ? tipNumber : 0, deposit, sessionValue);
  const cashNumber = parseMoney(cash);
  const change = method === "cash" && cashNumber != null && cashNumber >= toPay ? cashNumber - toPay : null;

  async function pay() {
    if (method === "cash" && cashNumber != null && cashNumber < toPay) return setError(`That is less than ${kes(toPay)}`);
    setError(null);
    setSaving(true);
    try {
      await payServiceTicket(
        ticket.id,
        {
          payments:
            toPay > 0
              ? [
                  {
                    method,
                    amount: toPay,
                    ...(method === "mpesa_manual" && reference.trim() ? { reference: reference.trim().toUpperCase() } : {}),
                  },
                ]
              : [],
          ...(chosenPackage ? { packageId: chosenPackage.id } : {}),
          ...(tipNumber > 0 && ticket.staffProfileId
            ? { tips: [{ staffProfileId: ticket.staffProfileId, amount: tipNumber }] }
            : {}),
          ...(method === "cash" && cashNumber != null && cashNumber >= toPay ? { cashReceived: cashNumber } : {}),
          clientSoldAt: new Date().toISOString(),
        },
        keyRef.current,
      );
      await onDone();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        // The total on screen is out of date; nothing was charged.
        await onChanged(message(err, "This ticket has changed. Check it and take payment again."));
        return;
      }
      setError(message(err, "The payment was not recorded. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ticket {ticket.ticketNumber}</DialogTitle>
          <DialogDescription>
            {ticket.lines.map((l) => l.name).join(", ")} · {ticket.staffName ?? "Staff"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Tip for {ticket.staffName ?? "staff"}</span>
            <input
              className={dashboardInputClass(false, "w-24 text-right font-mono")}
              inputMode="decimal"
              placeholder="0"
              value={tip}
              onChange={(e) => {
                setTip(cleanMoneyText(e.target.value));
                setError(null);
              }}
            />
          </label>
          {packages.length > 0 ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Use a package</span>
              <select className={dashboardSelectClass()} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                <option value="">Do not use one</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.serviceName}: {p.sessionsRemaining} of {p.sessionsTotal} left
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <dl className="grid gap-0.5 text-sm">
            <div className="flex justify-between">
              <dt>Services</dt>
              <dd className="font-mono tabular-nums">{kes(ticket.total)}</dd>
            </div>
            {deposit > 0 ? (
              <div className="flex justify-between">
                <dt>Deposit already paid</dt>
                <dd className="font-mono tabular-nums">−{kes(Math.min(deposit, ticket.total))}</dd>
              </div>
            ) : null}
            {sessionValue > 0 ? (
              <div className="flex justify-between">
                <dt>Package session</dt>
                <dd className="font-mono tabular-nums">
                  −{kes(Math.min(sessionValue, Math.max(0, ticket.total - Math.min(deposit, ticket.total))))}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex justify-between text-base font-semibold">
            <span>To pay</span>
            <span className="font-mono tabular-nums">{kes(toPay)}</span>
          </div>
          {toPay > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {(["cash", "mpesa_manual"] as const).map((m) => (
                <Button key={m} variant={method === m ? "default" : "outline"} aria-pressed={method === m} onClick={() => setMethod(m)}>
                  {m === "cash" ? "Cash" : "M-Pesa"}
                </Button>
              ))}
            </div>
          ) : (
            <p className={dashboardHintClass()}>Nothing more to collect.</p>
          )}
          {toPay <= 0 ? null : method === "cash" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash received (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={cash}
                onChange={(e) => {
                  setCash(cleanMoneyText(e.target.value));
                  setError(null);
                }}
              />
              {change != null && change > 0 ? (
                <span className="text-sm">
                  Change <span className="font-mono tabular-nums">{kes(change)}</span>
                </span>
              ) : null}
            </label>
          ) : (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono uppercase")}
                value={reference}
                maxLength={20}
                onChange={(e) => setReference(e.target.value)}
              />
              <span className={dashboardHintClass()}>Check the payment on your phone before you confirm.</span>
            </label>
          )}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void pay()}>
            {saving ? "Recording…" : toPay > 0 ? `Take ${kes(toPay)}` : "Close the ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The customer with this phone number, made if the shop has not seen them before. A package and
 * a deposit are both held in a customer's name, so a ticket that will use either needs one.
 */
export async function findOrCreateCustomer(phone: string, name: string): Promise<string> {
  const digits = phone.replace(/[^0-9+]/g, "");
  const found = await fetchCustomers(digits);
  if (found.length > 0) return found[0]!.id;
  const created = await createCustomer({
    name: name.trim() || "Customer",
    phones: [{ phone: digits, primary: true }],
  });
  return created.id;
}

function SellPackageDialog({
  branchId,
  offers,
  onClose,
}: {
  branchId: string;
  offers: PackageOffer[];
  onClose: () => void;
}) {
  const [serviceId, setServiceId] = useState(offers.length === 1 ? offers[0]!.serviceId : "");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per package sale: a retry never takes the money twice.
  const keyRef = useRef<string>(nextIdempotencyKey());
  const offer = offers.find((o) => o.serviceId === serviceId) ?? null;

  async function sell() {
    if (!offer) return setError("Choose a package");
    if (phone.replace(/[^0-9]/g, "").length < 9) return setError("Enter the customer's phone number");
    setError(null);
    setSaving(true);
    try {
      const customerId = await findOrCreateCustomer(phone, name);
      const sold = await sellPackage(
        {
          branchId,
          customerId,
          serviceId: offer.serviceId,
          method,
          ...(method === "mpesa_manual" && reference.trim() ? { reference: reference.trim().toUpperCase() } : {}),
        },
        keyRef.current,
      );
      setDone(`Sold: ${sold.sessionsTotal} × ${sold.serviceName} for ${kes(sold.pricePaid)}.`);
    } catch (err) {
      setError(message(err, "The package was not sold. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell a package</DialogTitle>
          <DialogDescription>The customer pays now and uses one visit at a time.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p role="status" className="text-sm">
            {done} It will be offered when they next pay for that service.
          </p>
        ) : (
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Package</span>
              <select className={dashboardSelectClass()} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Choose…</option>
                {offers.map((o) => (
                  <option key={o.serviceId} value={o.serviceId}>
                    {o.sessions} × {o.serviceName} — {kes(o.price)}
                  </option>
                ))}
              </select>
              {offer ? (
                <span className={dashboardHintClass()}>
                  One visit is normally {kes(offer.singlePrice)}
                  {offer.validDays ? ` · use within ${offer.validDays} days` : ""}
                </span>
              ) : null}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Customer phone</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ""))}
                />
              </label>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Name</span>
                <input className={dashboardInputClass(false)} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["cash", "mpesa_manual"] as const).map((m) => (
                <Button key={m} variant={method === m ? "default" : "outline"} aria-pressed={method === m} onClick={() => setMethod(m)}>
                  {m === "cash" ? "Cash" : "M-Pesa"}
                </Button>
              ))}
            </div>
            {method === "mpesa_manual" ? (
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
                <input
                  className={dashboardInputClass(false, "font-mono uppercase")}
                  value={reference}
                  maxLength={20}
                  onChange={(e) => setReference(e.target.value)}
                />
                <span className={dashboardHintClass()}>Check the payment on your phone before you confirm.</span>
              </label>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {done ? null : (
            <Button disabled={saving} onClick={() => void sell()}>
              {saving ? "Recording…" : offer ? `Take ${kes(offer.price)}` : "Sell"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

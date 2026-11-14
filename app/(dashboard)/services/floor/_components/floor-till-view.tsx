import { ArrowDown, ArrowUp, CalendarPlus, Check, DoorOpen, Plus, Users, UserX, X } from "lucide-react";
import Link from "next/link";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import {
  helpersSummary,
  minutesSince,
  waitLabel,
  type FloorStatus,
  type ServiceBoard,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

/** Whole shillings read as the till says them: "Ksh 300", not "Ksh 300.00". */
const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");

const PANEL = "overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]";
const RULE = "border-[var(--op-rule)]";
const HEAD = "flex items-baseline justify-between border-b border-[var(--op-rule)] px-3 py-1.5 text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]";
const ACTION = "h-10 rounded-[2px] shadow-none sm:h-8";
const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] text-[var(--op-muted)] sm:size-8 " +
  "hover:bg-[var(--op-bg)] hover:text-[var(--op-ink)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] disabled:opacity-40";

const STATUS_DOT: Record<FloorStatus, string> = {
  AVAILABLE: "bg-[var(--op-accent)]",
  ON_BREAK: "bg-[var(--op-highlight)]",
  OFF: "bg-[var(--op-faint)]",
};

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

/**
 * The floor as the cashier's till. Below the figures, three columns: the chairs take half the
 * width on the left, and the bench and paying split the right. A free chair opens a new customer.
 * It holds no state of its own: {@link FloorBoard} owns the data, the dialogs and the calls.
 */
export function FloorTillView({
  board,
  waiting,
  ready,
  byChair,
  elsewhere,
  chairWord,
  busy,
  canSellPackage,
  manyPerformers,
  staffNames,
  tillOnly,
  shift,
  shiftOpenedAt,
  onOpenShift,
  onCloseShift,
  bookedToday,
  onBook,
  onArrived,
  onNoShow,
  notice,
  stale,
  onNewCustomer,
  onSellPackage,
  onStart,
  onPriority,
  onLeft,
  onDone,
  onShare,
  onCancel,
  onPay,
  onReopen,
  onStaffStatus,
}: {
  board: ServiceBoard;
  waiting: ServiceTicketRecord[];
  ready: ServiceTicketRecord[];
  byChair: ReadonlyMap<number, ServiceTicketRecord>;
  elsewhere: ServiceTicketRecord[];
  chairWord: string;
  /** The ticket or staff member a call is running for. */
  busy: string | null;
  canSellPackage: boolean;
  manyPerformers: boolean;
  /** Everyone who serves, by staff profile, for naming who helped on a ticket. */
  staffNames: ReadonlyMap<string, string>;
  /** This person works at the till only (a cashier in a service shop): no links that leave it. */
  tillOnly: boolean;
  /** The till's shift: open, closed, not yet known, or switched off for this shop. */
  shift: "open" | "closed" | "unknown" | "off";
  shiftOpenedAt: string | null;
  onOpenShift: () => void;
  onCloseShift: () => void;
  /** Today's bookings that have not arrived yet, earliest first. */
  bookedToday: ServiceTicketRecord[];
  onBook: () => void;
  onArrived: (ticket: ServiceTicketRecord) => void;
  onNoShow: (ticket: ServiceTicketRecord) => void;
  notice: string | null;
  /** Set when the last refresh failed and the screen shows what it knew before. */
  stale: string | null;
  onNewCustomer: (chair?: number) => void;
  onSellPackage: () => void;
  /** Seats someone from the bench. A chair number is set when the cashier picked the chair. */
  onStart: (ticket: ServiceTicketRecord, chair?: number) => void;
  onPriority: (ticket: ServiceTicketRecord, priority: 1 | -1) => void;
  onLeft: (ticket: ServiceTicketRecord) => void;
  onDone: (ticket: ServiceTicketRecord) => void;
  onShare: (ticket: ServiceTicketRecord) => void;
  onCancel: (ticket: ServiceTicketRecord) => void;
  onPay: (ticket: ServiceTicketRecord) => void;
  onReopen: (ticket: ServiceTicketRecord) => void;
  onStaffStatus: (staffProfileId: string, status: FloorStatus) => void;
}) {
  const chairs = Array.from({ length: board.stationCount }, (_, i) => i + 1);
  const freeCount = chairs.filter((n) => !byChair.has(n)).length;
  const toCollect = ready.reduce((sum, t) => sum + t.total, 0);
  const word = chairWord.toLowerCase();
  const staff = board.staff ?? [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-3 pb-4">
      <TillHeader
        waiting={waiting.length}
        busyChairs={byChair.size}
        stationCount={board.stationCount}
        chairWord={chairWord}
        toCollect={toCollect}
        staff={staff}
        busy={busy}
        shift={shift}
        shiftOpenedAt={shiftOpenedAt}
        tillOnly={tillOnly}
        canSellPackage={canSellPackage}
        onStaffStatus={onStaffStatus}
        onOpenShift={onOpenShift}
        onCloseShift={onCloseShift}
        onBook={onBook}
        onSellPackage={onSellPackage}
        onNewCustomer={onNewCustomer}
      />

      {stale ? (
        <p role="status" className={cn(PANEL, "px-3 py-2 text-[13px] text-[var(--op-ink)]")}>
          {stale} Showing the last known floor.
        </p>
      ) : null}
      {notice ? (
        <p role="alert" className={cn(PANEL, "px-3 py-2 text-[13px] text-[var(--op-highlight)]")}>
          {notice}
        </p>
      ) : null}

      {board.stationCount === 0 ? (
        <EmptyFloor word={word} tillOnly={tillOnly} />
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <ChairFloor
            chairs={chairs}
            byChair={byChair}
            chairWord={chairWord}
            busy={busy}
            manyPerformers={manyPerformers}
            staffNames={staffNames}
            onNewCustomer={onNewCustomer}
            onDone={onDone}
            onShare={onShare}
            onCancel={onCancel}
          />
          <Bench
            waiting={waiting}
            freeCount={freeCount}
            word={word}
            busy={busy}
            bookedToday={bookedToday}
            elsewhere={elsewhere}
            tillOnly={tillOnly}
            onStart={onStart}
            onPriority={onPriority}
            onLeft={onLeft}
            onArrived={onArrived}
            onNoShow={onNoShow}
          />
          <PayingLane
            ready={ready}
            toCollect={toCollect}
            busy={busy}
            manyPerformers={manyPerformers}
            staffNames={staffNames}
            onShare={onShare}
            onPay={onPay}
            onReopen={onReopen}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
}

function TillHeader({
  waiting,
  busyChairs,
  stationCount,
  chairWord,
  toCollect,
  staff,
  busy,
  shift,
  shiftOpenedAt,
  tillOnly,
  canSellPackage,
  onStaffStatus,
  onOpenShift,
  onCloseShift,
  onBook,
  onSellPackage,
  onNewCustomer,
}: {
  waiting: number;
  busyChairs: number;
  stationCount: number;
  chairWord: string;
  toCollect: number;
  staff: NonNullable<ServiceBoard["staff"]>;
  busy: string | null;
  shift: "open" | "closed" | "unknown" | "off";
  shiftOpenedAt: string | null;
  tillOnly: boolean;
  canSellPackage: boolean;
  onStaffStatus: (staffProfileId: string, status: FloorStatus) => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onBook: () => void;
  onSellPackage: () => void;
  onNewCustomer: (chair?: number) => void;
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <dl className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-[2px] bg-[var(--op-rule)] ring-1 ring-[var(--op-rule)] sm:max-w-xl">
          <Figure label="On the bench" value={String(waiting)} />
          <Figure label={`${chairWord}s busy`} value={`${busyChairs} of ${stationCount}`} />
          <Figure label="To collect" value={kes(toCollect)} hot={toCollect > 0} />
        </dl>
        <div className="flex flex-wrap items-center gap-1">
          {shift === "open" ? (
            <Button
              size="sm"
              variant="ghost"
              className={ACTION}
              onClick={onCloseShift}
              title={shiftOpenedAt ? `Open since ${clock(shiftOpenedAt)}` : undefined}
            >
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--op-accent)]" />
              Close shift
            </Button>
          ) : shift === "closed" ? (
            <Button size="sm" variant="outline" className={ACTION} onClick={onOpenShift}>
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--op-highlight)]" />
              Open shift
            </Button>
          ) : null}
          {tillOnly ? null : (
            <>
              <Button size="sm" variant="ghost" className={ACTION} asChild>
                <Link href={APP_ROUTES.servicesSell}>Slips</Link>
              </Button>
              <Button size="sm" variant="ghost" className={ACTION} asChild>
                <Link href={APP_ROUTES.servicesAppointments}>Bookings</Link>
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className={ACTION} onClick={onBook}>
            <CalendarPlus className="size-3.5" aria-hidden /> Book
          </Button>
          {canSellPackage ? (
            <Button size="sm" variant="ghost" className={ACTION} onClick={onSellPackage}>
              Sell a package
            </Button>
          ) : null}
          <Button size="sm" className={ACTION} onClick={() => onNewCustomer()}>
            <Plus className="size-3.5" aria-hidden /> New customer
          </Button>
        </div>
      </div>
      {staff.length > 0 ? <TeamStrip staff={staff} busy={busy} onStaffStatus={onStaffStatus} /> : null}
    </header>
  );
}

function Figure({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="bg-[var(--op-surface)] px-3 py-2">
      <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
          hot ? "text-[var(--op-highlight)]" : "text-[var(--op-ink)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TeamStrip({
  staff,
  busy,
  onStaffStatus,
}: {
  staff: NonNullable<ServiceBoard["staff"]>;
  busy: string | null;
  onStaffStatus: (staffProfileId: string, status: FloorStatus) => void;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label="Team">
      {staff.map((member) => (
        <li key={member.staffProfileId}>
          <label
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] pl-2 text-[13px] sm:h-8",
              member.floorStatus !== "AVAILABLE" && "opacity-70",
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[member.floorStatus])} />
            <span className="font-medium text-[var(--op-ink)]">{member.displayName.split(/\s+/)[0]}</span>
            <select
              className="h-full cursor-pointer rounded-[2px] bg-transparent pr-1 text-[13px] text-[var(--op-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]"
              aria-label={`${member.displayName} is`}
              value={member.floorStatus}
              disabled={busy === member.staffProfileId}
              onChange={(e) => onStaffStatus(member.staffProfileId, e.target.value as FloorStatus)}
            >
              <option value="AVAILABLE">here</option>
              <option value="ON_BREAK">on a break</option>
              <option value="OFF">off today</option>
            </select>
          </label>
        </li>
      ))}
    </ul>
  );
}

function EmptyFloor({ word, tillOnly }: { word: string; tillOnly: boolean }) {
  return (
    <div className={cn(PANEL, "px-3 py-4")}>
      <p className="text-[13px] font-semibold text-[var(--op-ink)]">Say how many {word}s you have</p>
      <p className={cn("mt-1", dashboardHintClass())}>The till shows one tile for each.</p>
      {tillOnly ? (
        <p className={cn("mt-1", dashboardHintClass())}>Ask the owner or a manager to set this up.</p>
      ) : (
        <Link className="mt-2 inline-block text-[13px] font-medium underline" href={APP_ROUTES.servicesSetup}>
          Set up the shop
        </Link>
      )}
    </div>
  );
}

function ChairFloor({
  chairs,
  byChair,
  chairWord,
  busy,
  manyPerformers,
  staffNames,
  onNewCustomer,
  onDone,
  onShare,
  onCancel,
}: {
  chairs: number[];
  byChair: ReadonlyMap<number, ServiceTicketRecord>;
  chairWord: string;
  busy: string | null;
  manyPerformers: boolean;
  staffNames: ReadonlyMap<string, string>;
  onNewCustomer: (chair?: number) => void;
  onDone: (ticket: ServiceTicketRecord) => void;
  onShare: (ticket: ServiceTicketRecord) => void;
  onCancel: (ticket: ServiceTicketRecord) => void;
}) {
  return (
    <section aria-label={`${chairWord}s`} className="min-w-0">
      <ol className={cn("grid grid-cols-2 border-l border-t sm:grid-cols-3 lg:grid-cols-2", RULE)}>
        {chairs.map((n) => (
          <ChairPlate
            key={n}
            number={n}
            chairWord={chairWord}
            ticket={byChair.get(n) ?? null}
            busy={busy}
            manyPerformers={manyPerformers}
            staffNames={staffNames}
            onNewCustomer={onNewCustomer}
            onDone={onDone}
            onShare={onShare}
            onCancel={onCancel}
          />
        ))}
      </ol>
    </section>
  );
}

function ChairPlate({
  number,
  chairWord,
  ticket,
  busy,
  manyPerformers,
  staffNames,
  onNewCustomer,
  onDone,
  onShare,
  onCancel,
}: {
  number: number;
  chairWord: string;
  ticket: ServiceTicketRecord | null;
  busy: string | null;
  manyPerformers: boolean;
  staffNames: ReadonlyMap<string, string>;
  onNewCustomer: (chair?: number) => void;
  onDone: (ticket: ServiceTicketRecord) => void;
  onShare: (ticket: ServiceTicketRecord) => void;
  onCancel: (ticket: ServiceTicketRecord) => void;
}) {
  if (!ticket) {
    return (
      <li className={cn("border-b border-r bg-[var(--op-surface)]", RULE)}>
        <button
          type="button"
          aria-label={`${chairWord} ${number} is free. New customer, then seat them`}
          onClick={() => onNewCustomer(number)}
          className="flex h-full min-h-[7.5rem] w-full flex-col justify-between p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)] hover:bg-[var(--op-bg)]"
        >
          <StationMark number={number} chairWord={chairWord} />
          <span>
            <span className="block text-[13px] text-[var(--op-faint)]">Free</span>
            <span className="block truncate text-[13px] font-semibold text-[var(--op-accent)]">New customer</span>
          </span>
        </button>
      </li>
    );
  }

  const minutes = minutesSince(ticket.startedAt);
  return (
    <li className={cn("flex min-h-[7.5rem] flex-col border-b border-r bg-[var(--op-surface)] p-2.5 lg:min-h-0", RULE)}>
      <div className="flex items-start justify-between gap-2">
        <StationMark number={number} chairWord={chairWord} />
        <span className="font-mono text-[12px] tabular-nums text-[var(--op-muted)]">{waitLabel(minutes)}</span>
      </div>
      <p className="mt-1 truncate text-[15px] font-semibold leading-tight text-[var(--op-ink)]">{ticket.staffName ?? "Staff"}</p>
      <TicketLines ticket={ticket} quiet />
      <HelpedBy ticket={ticket} staffNames={staffNames} />
      <div className="mt-auto flex items-center gap-0.5 pt-2">
        <Button size="sm" className={cn(ACTION, "flex-1")} disabled={busy === ticket.id} onClick={() => onDone(ticket)}>
          <Check className="size-3.5" aria-hidden /> {ticket.redoOfSaleId ? "Done · free" : "Done"}
        </Button>
        {manyPerformers ? <ShareButton ticket={ticket} busy={busy} onShare={onShare} /> : null}
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={busy === ticket.id}
          title="Cancel ticket"
          aria-label={`Cancel ticket ${ticket.ticketNumber}`}
          onClick={() => onCancel(ticket)}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function StationMark({ number, chairWord }: { number: number; chairWord: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.04em] text-[var(--op-ink)]">
        {number}
      </span>
      <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">{chairWord}</span>
    </span>
  );
}

/** Opens "who else worked on it"; lit once somebody is named. */
function ShareButton({
  ticket,
  busy,
  onShare,
}: {
  ticket: ServiceTicketRecord;
  busy: string | null;
  onShare: (ticket: ServiceTicketRecord) => void;
}) {
  const shared = ticket.lines.some((l) => (l.helpers ?? []).length > 0);
  return (
    <button
      type="button"
      className={cn(ICON_BUTTON, shared && "text-[var(--op-accent)]")}
      disabled={busy === ticket.id}
      title={shared ? "Change who helped" : "Add who else worked on it"}
      aria-label={`Ticket ${ticket.ticketNumber}: who else worked on it`}
      onClick={() => onShare(ticket)}
    >
      <Users className="size-4" aria-hidden />
    </button>
  );
}

/** Who helped on the ticket and what each gets; nothing when the person serving did it alone. */
function HelpedBy({ ticket, staffNames }: { ticket: ServiceTicketRecord; staffNames: ReadonlyMap<string, string> }) {
  const helped = helpersSummary(ticket, staffNames);
  if (!helped) return null;
  return (
    <p className="truncate text-[12px] text-[var(--op-muted)]" title={`With ${helped}`}>
      with <span className="font-medium text-[var(--op-ink)]">{helped}</span>
    </p>
  );
}

function PayingLane({
  ready,
  toCollect,
  busy,
  manyPerformers,
  staffNames,
  onShare,
  onPay,
  onReopen,
  onCancel,
}: {
  ready: ServiceTicketRecord[];
  toCollect: number;
  busy: string | null;
  manyPerformers: boolean;
  staffNames: ReadonlyMap<string, string>;
  onShare: (ticket: ServiceTicketRecord) => void;
  onPay: (ticket: ServiceTicketRecord) => void;
  onReopen: (ticket: ServiceTicketRecord) => void;
  onCancel: (ticket: ServiceTicketRecord) => void;
}) {
  return (
    <section className={cn(PANEL, "min-w-0")} aria-label="Paying">
      <h2 className={HEAD}>
        <span>Paying</span>
        <span className={cn("font-mono text-[13px] font-semibold tabular-nums", toCollect > 0 && "text-[var(--op-highlight)]")}>
          {toCollect > 0 ? kes(toCollect) : ready.length}
        </span>
      </h2>
      {ready.length === 0 ? (
        <p className={cn("px-3 py-3", dashboardHintClass())}>Nobody is waiting to pay.</p>
      ) : (
        <ul>
          {ready.map((ticket) => (
            <li key={ticket.id} className={cn("border-t px-3 py-2", RULE)}>
              <TicketLines ticket={ticket} />
              <p className={cn("truncate", dashboardHintClass())}>
                {ticket.staffName ?? "Staff"} · done <span className="tabular-nums">{waitLabel(minutesSince(ticket.finishedAt))}</span> ago
              </p>
              <HelpedBy ticket={ticket} staffNames={staffNames} />
              <div className="mt-1.5 flex items-center gap-0.5">
                <Button className={cn(ACTION, "mr-1 h-11 flex-1 font-mono text-[15px] tabular-nums sm:h-10")} disabled={busy === ticket.id} onClick={() => onPay(ticket)}>
                  Take {kes(ticket.total)}
                </Button>
                <Button variant="ghost" size="sm" className={ACTION} disabled={busy === ticket.id} onClick={() => onReopen(ticket)}>
                  Not done
                </Button>
                {manyPerformers ? <ShareButton ticket={ticket} busy={busy} onShare={onShare} /> : null}
                <button
                  type="button"
                  className={ICON_BUTTON}
                  disabled={busy === ticket.id}
                  title="Cancel ticket"
                  aria-label={`Cancel ticket ${ticket.ticketNumber}`}
                  onClick={() => onCancel(ticket)}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Bench({
  waiting,
  freeCount,
  word,
  busy,
  bookedToday,
  elsewhere,
  tillOnly,
  onStart,
  onPriority,
  onLeft,
  onArrived,
  onNoShow,
}: {
  waiting: ServiceTicketRecord[];
  freeCount: number;
  word: string;
  busy: string | null;
  bookedToday: ServiceTicketRecord[];
  elsewhere: ServiceTicketRecord[];
  tillOnly: boolean;
  onStart: (ticket: ServiceTicketRecord) => void;
  onPriority: (ticket: ServiceTicketRecord, priority: 1 | -1) => void;
  onLeft: (ticket: ServiceTicketRecord) => void;
  onArrived: (ticket: ServiceTicketRecord) => void;
  onNoShow: (ticket: ServiceTicketRecord) => void;
}) {
  return (
    <section className={cn(PANEL, "min-w-0")} aria-label="On the bench">
      <h2 className={HEAD}>
        <span>On the bench</span>
        <span className="font-mono text-[13px] tabular-nums">{waiting.length}</span>
      </h2>
      {waiting.length === 0 ? (
        <p className={cn("px-3 py-3", dashboardHintClass())}>The bench is empty.</p>
      ) : (
        <ol>
          {waiting.map((ticket, i) => (
            <li key={ticket.id} className={cn("grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 border-t px-3 py-2", RULE)}>
              <span
                className={cn(
                  "pt-0.5 font-mono text-[15px] font-semibold tabular-nums leading-none",
                  i === 0 ? "text-[var(--op-accent)]" : "text-[var(--op-faint)]",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <TicketLines ticket={ticket} />
                <p className={cn("truncate", dashboardHintClass())}>
                  <span className="tabular-nums">{waitLabel(minutesSince(ticket.createdAt))}</span>
                  {ticket.staffName ? ` · wants ${ticket.staffName.split(/\s+/)[0]}` : ""}
                  {ticket.estimatedWaitMinutes != null && ticket.estimatedWaitMinutes > 0
                    ? ` · about ${waitLabel(ticket.estimatedWaitMinutes)} to go`
                    : ""}
                </p>
                <div className="mt-1 flex items-center gap-0.5">
                  <Button
                    size="sm"
                    className={cn(ACTION, "mr-1")}
                    disabled={busy === ticket.id || freeCount === 0}
                    title={freeCount === 0 ? `Every ${word} is taken` : undefined}
                    onClick={() => onStart(ticket)}
                  >
                    Seat
                  </Button>
                  {i > 0 || (ticket.priority ?? 0) < 0 ? (
                    <button
                      type="button"
                      className={ICON_BUTTON}
                      disabled={busy === ticket.id}
                      title="Serve next"
                      aria-label={`Serve ticket ${ticket.ticketNumber} next`}
                      onClick={() => onPriority(ticket, 1)}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  {waiting.length > 1 && (ticket.priority ?? 0) >= 0 ? (
                    <button
                      type="button"
                      className={ICON_BUTTON}
                      disabled={busy === ticket.id}
                      title="Let others go first"
                      aria-label={`Let others go before ticket ${ticket.ticketNumber}`}
                      onClick={() => onPriority(ticket, -1)}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={cn(ICON_BUTTON, "ml-auto")}
                    disabled={busy === ticket.id}
                    title="Customer left"
                    aria-label={`Ticket ${ticket.ticketNumber}: the customer left`}
                    onClick={() => onLeft(ticket)}
                  >
                    <DoorOpen className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {waiting.length > 0 && freeCount === 0 ? (
        <p className={cn("border-t px-3 py-2", RULE, dashboardHintClass())}>Every {word} is taken.</p>
      ) : null}
      <BookedToday bookedToday={bookedToday} busy={busy} onArrived={onArrived} onNoShow={onNoShow} />
      <Elsewhere elsewhere={elsewhere} tillOnly={tillOnly} />
    </section>
  );
}

function BookedToday({
  bookedToday,
  busy,
  onArrived,
  onNoShow,
}: {
  bookedToday: ServiceTicketRecord[];
  busy: string | null;
  onArrived: (ticket: ServiceTicketRecord) => void;
  onNoShow: (ticket: ServiceTicketRecord) => void;
}) {
  if (bookedToday.length === 0) return null;
  return (
    <div className={cn("border-t", RULE)}>
      <h3 className={cn(HEAD, "border-b-0")}>
        <span>Booked today</span>
        <span className="font-mono text-[13px] tabular-nums">{bookedToday.length}</span>
      </h3>
      <ul>
        {bookedToday.map((ticket) => {
          const late = ticket.scheduledStart ? minutesSince(ticket.scheduledStart) : 0;
          return (
            <li key={ticket.id} className={cn("border-t px-3 py-2", RULE)}>
              <p className="truncate text-[13px] font-semibold text-[var(--op-ink)]">
                <span className="font-mono font-normal tabular-nums">{ticket.scheduledStart ? clock(ticket.scheduledStart) : ""}</span>{" "}
                {ticket.bookingName ?? "Customer"}
              </p>
              <p className={cn("truncate", dashboardHintClass())}>
                {ticket.lines.map((l) => l.name).join(", ")}
                {ticket.staffName ? ` · ${ticket.staffName.split(/\s+/)[0]}` : ""}
                {late >= 10 ? ` · ${waitLabel(late)} late` : ""}
              </p>
              <div className="mt-1 flex items-center gap-0.5">
                <Button size="sm" variant="outline" className={cn(ACTION, "mr-1")} disabled={busy === ticket.id} onClick={() => onArrived(ticket)}>
                  Arrived
                </Button>
                <button
                  type="button"
                  className={cn(ICON_BUTTON, "ml-auto")}
                  disabled={busy === ticket.id}
                  title="Did not come"
                  aria-label={`${ticket.bookingName ?? "The customer"} did not come`}
                  onClick={() => onNoShow(ticket)}
                >
                  <UserX className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Elsewhere({ elsewhere, tillOnly }: { elsewhere: ServiceTicketRecord[]; tillOnly: boolean }) {
  if (elsewhere.length === 0) return null;
  return (
    <div className={cn("border-t px-3 py-2", RULE)}>
      <h3 className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">
        Being served elsewhere · {elsewhere.length}
      </h3>
      <ul className="mt-1 grid gap-1 text-[13px]">
        {elsewhere.map((ticket) => (
          <li key={ticket.id} className="truncate text-[var(--op-ink)]">
            <span className="font-mono tabular-nums">#{ticket.ticketNumber}</span>{" "}
            {ticket.lines
              .filter((l) => l.stage === "IN_SERVICE")
              .map((l) => `${l.name} · ${l.performerName ?? "Staff"}${l.resourceName ? ` · ${l.resourceName}` : ""}`)
              .join("; ")}
          </li>
        ))}
      </ul>
      {tillOnly ? null : (
        <Link className="mt-1 inline-block text-[13px] underline" href={APP_ROUTES.servicesSell}>
          Open the slips
        </Link>
      )}
    </div>
  );
}

/** Ticket number, who, and what they are having, on one or two tight lines. */
function TicketLines({ ticket, quiet = false }: { ticket: ServiceTicketRecord; quiet?: boolean }) {
  const counts = new Map<string, number>();
  for (const line of ticket.lines) counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
  const what = [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(", ");
  return (
    <>
      <p className={cn("truncate text-[13px]", quiet ? "text-[var(--op-muted)]" : "font-semibold text-[var(--op-ink)]")}>
        <span className="font-mono tabular-nums">#{ticket.ticketNumber}</span>
        {ticket.bookingName ? ` ${ticket.bookingName}` : ""} · {what}
      </p>
      {ticket.redoOfSaleId || (ticket.depositState === "HELD" && ticket.depositAmount) ? (
        <p className="truncate text-[12px] font-medium text-[var(--op-highlight)]">
          {ticket.redoOfSaleId ? "Redo · no charge" : ""}
          {ticket.redoOfSaleId && ticket.depositState === "HELD" && ticket.depositAmount ? " · " : ""}
          {ticket.depositState === "HELD" && ticket.depositAmount ? `Deposit paid ${kes(ticket.depositAmount)}` : ""}
        </p>
      ) : null}
    </>
  );
}

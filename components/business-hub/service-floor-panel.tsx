"use client";

import { Scissors } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { serviceStationLabel } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import {
  chairBarPercent,
  fetchAppointments,
  fetchChairReport,
  fetchCommissionStatement,
  fetchServiceBoard,
  fetchServiceReport,
  minutesSince,
  nairobiToday,
  waitLabel,
  type ChairReport,
  type ServiceBoard,
  type ServiceReport,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

/** Whole shillings read as people say them: "Ksh 1,800", not "Ksh 1,800.00". */
const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");
const REFRESH_MS = 30000;

const RULE = "border-[var(--op-rule)]";
const PANEL = cn("rounded-[2px] border bg-[var(--op-surface)]", RULE);
const HINT = "text-[13px] leading-snug text-[var(--op-muted)]";
const ACTION = "h-10 rounded-[2px] px-2.5 text-[13px] shadow-none sm:h-8";
const SECTION = "text-[13px] font-semibold tracking-[-0.02em]";

const time = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(iso))
    : "";

/** `days` back from today, as the first day of the period (today itself counts as one). */
function daysAgo(today: string, days: number): string {
  const at = new Date(`${today}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() - (days - 1));
  return at.toISOString().slice(0, 10);
}

type Period = "today" | "week";

type Tile = {
  key: string;
  name: string;
  made: ChairReport["chairs"][number] | null;
  stationNo: number | null;
};

type Snapshot = {
  board: ServiceBoard | null;
  bookings: ServiceTicketRecord[];
  report: ServiceReport | null;
  chairs: ChairReport | null;
  owedToTeam: number | null;
  /** What each person is owed right now, commission and tips together; null when it could not be read. */
  owedByStaff: ReadonlyMap<string, number> | null;
};

function floorStatus(input: {
  serving: number;
  stationCount: number;
  word: string;
  onFloor: number;
  waiting: number;
}): string {
  const plural = input.stationCount === 1 ? "" : "s";
  const places =
    input.stationCount > 0
      ? `${input.serving} of ${input.stationCount} ${input.word}${plural} busy`
      : `Say how many ${input.word}s you have to see the floor here`;
  const parts = [places];
  if (input.onFloor > 0) parts.push(`${input.onFloor} of the team here`);
  if (input.waiting > 0) parts.push(`${input.waiting} on the bench`);
  return `${parts.join(". ")}.`;
}

function whoIsIn(ticket: ServiceTicketRecord): string {
  const line = ticket.lines.find((entry) => entry.stage === "IN_SERVICE") ?? null;
  const name = (line?.performerName ?? ticket.staffName ?? "Busy").split(/\s+/)[0];
  const waited = waitLabel(minutesSince(line?.startedAt ?? ticket.startedAt ?? null));
  return `${name} · ${waited}`;
}

/**
 * The business page of a shop that sells services: what the floor is doing now, what each chair
 * has made, what the team earned and who is coming next. Each part loads on its own, so a person
 * without one permission still sees the rest. Product shops never render this.
 */
export function ServiceFloorPanel({
  branchId,
  business,
  shopName,
  canSell,
  canSeeMoney,
}: {
  branchId: string | null;
  business: Parameters<typeof serviceStationLabel>[0];
  shopName: string;
  canSell: boolean;
  canSeeMoney: boolean;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const [snap, setSnap] = useState<Snapshot>({
    board: null,
    bookings: [],
    report: null,
    chairs: null,
    owedToTeam: null,
    owedByStaff: null,
  });
  const chairWord = serviceStationLabel(business);
  const word = chairWord.toLowerCase();

  useEffect(() => {
    if (!branchId) return;
    let live = true;
    const load = async () => {
      const today = nairobiToday();
      const from = period === "today" ? today : daysAgo(today, 7);
      const startOfDay = new Date(`${today}T00:00:00+03:00`);
      const endOfDay = new Date(startOfDay.getTime() + 86400000);
      const [board, bookings, report, chairs, statement] = await Promise.all([
        canSell ? fetchServiceBoard(branchId).catch(() => null) : Promise.resolve(null),
        canSell
          ? fetchAppointments(branchId, startOfDay.toISOString(), endOfDay.toISOString()).catch(() => [])
          : Promise.resolve([]),
        canSeeMoney ? fetchServiceReport(from, today, branchId).catch(() => null) : Promise.resolve(null),
        canSeeMoney ? fetchChairReport(from, today, branchId).catch(() => null) : Promise.resolve(null),
        canSeeMoney ? fetchCommissionStatement(today, today).catch(() => null) : Promise.resolve(null),
      ]);
      if (!live) return;
      setSnap({
        board,
        bookings: bookings.filter((b) => b.stage === "BOOKED" && b.status === "pending"),
        report,
        chairs,
        owedToTeam: statement ? statement.ledgerTotal : null,
        owedByStaff: statement ? new Map(statement.rows.map((row) => [row.staffProfileId, row.closing])) : null,
      });
    };
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [branchId, canSell, canSeeMoney, period]);

  if (!branchId || (!canSell && !canSeeMoney)) return null;

  const tickets = snap.board?.tickets ?? [];
  const waiting = tickets.filter((t) => t.stage === "WAITING");
  const serving = tickets.filter((t) => t.stage === "IN_SERVICE");
  const toPay = tickets.filter((t) => t.stage === "READY_TO_PAY");
  const toCollect = toPay.reduce((sum, t) => sum + t.total, 0);
  const stationCount = snap.board?.stationCount ?? 0;
  const onFloor = (snap.board?.staff ?? []).filter((s) => s.floorStatus === "AVAILABLE").length;
  const next = snap.bookings.slice(0, 5);
  const periodWord = period === "today" ? "today" : "in the last 7 days";
  const shop = shopName.trim() || "Your shop";

  // One tile per place. With the money report: every chair, bed or room and what it made. Without
  // it (a seller's view): the numbered chairs and who is in them, no money.
  const made = snap.chairs?.chairs ?? null;
  const best = made ? Math.max(0, ...made.map((c) => c.revenue)) : 0;
  const tiles: Tile[] = made
    ? made.map((c) => {
        const match = /^.*\s(\d+)$/.exec(c.name);
        return { key: c.resourceId, name: c.name, made: c, stationNo: match ? Number(match[1]) : null };
      })
    : Array.from({ length: stationCount }, (_, i) => ({
        key: `n${i + 1}`,
        name: `${chairWord} ${i + 1}`,
        made: null,
        stationNo: i + 1,
      }));
  const inPlace = (tile: Tile) =>
    serving.find(
      (t) =>
        t.lines.some((l) => l.stage === "IN_SERVICE" && (l.resourceName === tile.name || l.resourceId === tile.key)) ||
        (tile.stationNo != null && t.stationNo === tile.stationNo),
    ) ?? null;

  const team = (snap.report?.staff ?? [])
    // Someone who only helped has no service of their own, but earned on one.
    .filter((s) => s.servicesDone > 0 || s.tips > 0 || s.commission > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <section aria-label={`${shop} today`} className="min-w-0">
      <FloorHeader
        shop={shop}
        status={floorStatus({ serving: serving.length, stationCount, word, onFloor, waiting: waiting.length })}
        period={period}
        canSell={canSell}
        canSeeMoney={canSeeMoney}
        onPeriod={setPeriod}
      />

      <div className={cn(PANEL, "mt-3")}>
        {canSeeMoney ? (
          <FloorFigures
            period={period}
            report={snap.report}
            owedToTeam={snap.owedToTeam}
            toCollect={canSell ? toCollect : null}
            waitingToPay={toPay.length}
          />
        ) : null}
        <ChairSection
          word={word}
          periodWord={periodWord}
          tiles={tiles}
          best={best}
          canSell={canSell}
          showMoney={made != null}
          inPlace={inPlace}
          unplaced={
            snap.chairs && snap.chairs.unplacedServices > 0
              ? { revenue: snap.chairs.unplacedRevenue, services: snap.chairs.unplacedServices }
              : null
          }
        />
        <FloorLower
          canSeeMoney={canSeeMoney}
          canSell={canSell}
          periodWord={periodWord}
          team={team}
          owedByStaff={snap.owedByStaff}
          next={next}
          later={snap.bookings.length - next.length}
        />
      </div>
    </section>
  );
}

function FloorHeader({
  shop,
  status,
  period,
  canSell,
  canSeeMoney,
  onPeriod,
}: {
  shop: string;
  status: string;
  period: Period;
  canSell: boolean;
  canSeeMoney: boolean;
  onPeriod: (period: Period) => void;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-cormorant)] text-[clamp(1.5rem,2.2vw,1.9rem)] font-normal leading-none tracking-[-0.02em] text-[var(--op-ink)]">
          {shop}, on the floor
        </h1>
        <p className={cn("mt-1 max-w-[65ch]", HINT)}>{status}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {canSeeMoney ? <PeriodSwitch period={period} onPeriod={onPeriod} /> : null}
        {canSell ? (
          <Button asChild size="sm" className={ACTION}>
            <Link href={APP_ROUTES.cashier}>
              <Scissors className="size-3.5" aria-hidden /> Open the till
            </Link>
          </Button>
        ) : null}
        {canSell ? <FloorLink href={APP_ROUTES.servicesAppointments}>Bookings</FloorLink> : null}
        {canSell ? <FloorLink href={APP_ROUTES.servicesCalendar}>Calendar</FloorLink> : null}
        {canSeeMoney ? <FloorLink href={APP_ROUTES.commissions}>Commissions</FloorLink> : null}
      </div>
    </header>
  );
}

function PeriodSwitch({ period, onPeriod }: { period: Period; onPeriod: (period: Period) => void }) {
  return (
    <div className={cn("mr-1 flex h-10 items-center rounded-[2px] border bg-[var(--op-surface)] p-0.5 sm:h-8", RULE)} role="group" aria-label="Show amounts for">
      {(
        [
          ["today", "Today"],
          ["week", "7 days"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={period === id}
          onClick={() => onPeriod(id)}
          className={cn(
            "h-full rounded-[1px] px-2.5 text-[13px] font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
            period === id ? "bg-[var(--op-ink)] text-white" : "text-[var(--op-muted)] hover:text-[var(--op-ink)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FloorLink({ href, children }: { href: string; children: string }) {
  return (
    <Button asChild size="sm" variant="ghost" className={ACTION}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function FloorFigures({
  period,
  report,
  owedToTeam,
  toCollect,
  waitingToPay,
}: {
  period: Period;
  report: ServiceReport | null;
  owedToTeam: number | null;
  toCollect: number | null;
  waitingToPay: number;
}) {
  const keeps = report?.contribution ?? 0;
  return (
    <dl className="grid grid-cols-2 gap-px bg-[var(--op-rule)] lg:grid-cols-4">
      <Figure label={period === "today" ? "Sold today" : "Sold in 7 days"} value={report ? kes(report.revenue) : "…"} />
      <Figure
        label="The shop keeps"
        value={report ? kes(keeps) : "…"}
        note={report && report.commission > 0 ? `after ${kes(report.commission)} commission` : undefined}
        tone={report != null && keeps > 0 ? "accent" : "ink"}
      />
      <Figure
        label="At the counter now"
        value={toCollect != null ? kes(toCollect) : "…"}
        note={waitingToPay > 0 ? `${waitingToPay} waiting to pay` : undefined}
        tone={toCollect != null && toCollect > 0 ? "hot" : "ink"}
      />
      <Figure
        label="Owed to the team"
        value={owedToTeam != null ? kes(owedToTeam) : "…"}
        note={owedToTeam ? "commission and tips" : undefined}
      />
    </dl>
  );
}

function Figure({
  label,
  value,
  note,
  tone = "ink",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ink" | "accent" | "hot";
}) {
  return (
    <div className="bg-[var(--op-surface)] px-3 py-2">
      <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate font-mono text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
          tone === "accent" && "text-[var(--op-accent)]",
          tone === "hot" && "text-[var(--op-highlight)]",
          tone === "ink" && "text-[var(--op-ink)]",
        )}
      >
        {value}
      </dd>
      {note ? <dd className="mt-1 text-[11px] leading-snug text-[var(--op-muted)]">{note}</dd> : null}
    </div>
  );
}

function ChairSection({
  word,
  periodWord,
  tiles,
  best,
  canSell,
  showMoney,
  inPlace,
  unplaced,
}: {
  word: string;
  periodWord: string;
  tiles: Tile[];
  best: number;
  canSell: boolean;
  showMoney: boolean;
  inPlace: (tile: Tile) => ServiceTicketRecord | null;
  unplaced: { revenue: number; services: number } | null;
}) {
  return (
    <div className={cn("border-t", RULE)}>
      <h2 className={cn(SECTION, "px-3 pt-2.5 sm:px-3.5")}>
        {showMoney ? `What each ${word} made ${periodWord}` : `The ${word}s`}
      </h2>
      {tiles.length === 0 ? (
        <p className={cn("mt-1.5 px-3 pb-2.5 sm:px-3.5", HINT)}>
          No {word}s yet.{" "}
          <Link className="underline" href={APP_ROUTES.servicesSetup}>
            Set up the shop
          </Link>
        </p>
      ) : (
        <ol className={cn("mt-2 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] border-l border-t", RULE)}>
          {tiles.map((tile) => (
            <ChairCell
              key={tile.key}
              tile={tile}
              ticket={canSell ? inPlace(tile) : null}
              best={best}
              canSell={canSell}
            />
          ))}
        </ol>
      )}
      {unplaced ? (
        <p className={cn("px-3 py-2 sm:px-3.5", HINT)}>
          {kes(unplaced.revenue)} more came from {unplaced.services}{" "}
          {unplaced.services === 1 ? "service" : "services"} with no {word} recorded. Choose the {word} when starting a
          service and it is counted here.
        </p>
      ) : null}
    </div>
  );
}

function ChairCell({
  tile,
  ticket,
  best,
  canSell,
}: {
  tile: Tile;
  ticket: ServiceTicketRecord | null;
  best: number;
  canSell: boolean;
}) {
  const top = tile.made != null && best > 0 && tile.made.revenue === best;
  const quiet = tile.made != null && !tile.made.active;
  return (
    <li className={cn("border-b border-r bg-[var(--op-surface)] px-2.5 py-2", RULE, quiet && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--op-ink)]">{tile.name}</span>
        {canSell ? (
          <span
            className={cn(
              "max-w-[9rem] shrink-0 truncate text-right text-[12px]",
              ticket ? "font-medium text-[var(--op-accent)]" : "text-[var(--op-faint)]",
            )}
          >
            {ticket ? whoIsIn(ticket) : "Free"}
          </span>
        ) : null}
      </div>
      {tile.made ? <ChairTakings made={tile.made} best={best} top={top} /> : null}
    </li>
  );
}

function ChairTakings({
  made,
  best,
  top,
}: {
  made: NonNullable<Tile["made"]>;
  best: number;
  top: boolean;
}) {
  const services = made.servicesDone === 1 ? "service" : "services";
  const customers = made.customers === 1 ? "customer" : "customers";
  return (
    <>
      <p
        className={cn(
          "mt-1.5 font-mono text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
          top ? "text-[var(--op-highlight)]" : "text-[var(--op-ink)]",
        )}
      >
        {kes(made.revenue)}
      </p>
      <div aria-hidden className="mt-1.5 h-0.5">
        {made.revenue > 0 ? (
          <div
            className={cn("h-full", top ? "bg-[var(--op-highlight)]" : "bg-[var(--op-accent)]")}
            style={{ width: `${chairBarPercent(made.revenue, best)}%` }}
          />
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-[12px] text-[var(--op-muted)]">
        {top ? <span className="font-medium text-[var(--op-highlight)]">Best. </span> : null}
        {made.servicesDone === 0 ? "Nothing yet" : `${made.servicesDone} ${services}, ${made.customers} ${customers}`}
      </p>
    </>
  );
}

function FloorLower({
  canSeeMoney,
  canSell,
  periodWord,
  team,
  owedByStaff,
  next,
  later,
}: {
  canSeeMoney: boolean;
  canSell: boolean;
  periodWord: string;
  team: ServiceReport["staff"];
  owedByStaff: ReadonlyMap<string, number> | null;
  next: ServiceTicketRecord[];
  later: number;
}) {
  return (
    <div className={cn("grid border-t", RULE, canSeeMoney && canSell && "2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
      {canSeeMoney ? <TeamTable periodWord={periodWord} team={team} owedByStaff={owedByStaff} split={canSell} /> : null}
      {canSell ? <ComingNext next={next} later={later} /> : null}
    </div>
  );
}

/**
 * What each person did and earned in the period: services, what they brought in, commission and
 * tips side by side, and what the shop owes them right now (whatever the period).
 */
function TeamTable({
  periodWord,
  team,
  owedByStaff,
  split,
}: {
  periodWord: string;
  team: ServiceReport["staff"];
  owedByStaff: ReadonlyMap<string, number> | null;
  split: boolean;
}) {
  const sum = (pick: (member: ServiceReport["staff"][number]) => number) => team.reduce((total, m) => total + pick(m), 0);
  const tips = sum((m) => m.tips);
  const head = "py-1 pl-3 text-right font-semibold";
  const cell = "py-1.5 pl-3 text-right font-mono tabular-nums";
  const none = <span className="text-[var(--op-faint)]">–</span>;
  return (
    <div className={cn("min-w-0 px-3 py-2.5 sm:px-3.5", split && cn("border-b 2xl:border-b-0 2xl:border-r", RULE))}>
      <h2 className={SECTION}>The team {periodWord}</h2>
      {team.length === 0 ? (
        <p className={cn("mt-1.5", HINT)}>Nobody has done a service or been tipped {periodWord}.</p>
      ) : (
        <div className="mt-1.5 overflow-x-auto">
          <table className="w-full min-w-[27rem] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--op-rule)] text-left text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">
                <th scope="col" className="py-1 pr-2 font-semibold">Who</th>
                <th scope="col" className="py-1 text-right font-semibold">Done</th>
                <th scope="col" className={head}>Brought in</th>
                <th scope="col" className={head}>Commission</th>
                <th scope="col" className={head}>Tips</th>
                {owedByStaff ? <th scope="col" className={head}>Owed now</th> : null}
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const owed = owedByStaff?.get(member.staffProfileId) ?? 0;
                return (
                  <tr key={member.staffProfileId} className="border-t border-[var(--op-rule)]">
                    <th scope="row" className="max-w-[9rem] truncate py-1.5 pr-2 text-left font-medium">{member.displayName}</th>
                    <td className="py-1.5 text-right font-mono tabular-nums">{member.servicesDone}</td>
                    <td className={cell}>{kes(member.revenue)}</td>
                    <td className={cell}>{member.commission > 0 ? kes(member.commission) : none}</td>
                    <td className={cn(cell, member.tips > 0 && "font-semibold text-[var(--op-accent)]")}>
                      {member.tips > 0 ? kes(member.tips) : none}
                    </td>
                    {owedByStaff ? (
                      <td className={cn(cell, owed > 0 && "font-semibold text-[var(--op-ink)]")}>{owed !== 0 ? kes(owed) : none}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            {team.length > 1 ? (
              <tfoot>
                <tr className="border-t border-[var(--op-ink)] text-[var(--op-ink)]">
                  <th scope="row" className="py-1.5 pr-2 text-left font-semibold">All</th>
                  <td className="py-1.5 text-right font-mono font-semibold tabular-nums">{sum((m) => m.servicesDone)}</td>
                  <td className={cn(cell, "font-semibold")}>{kes(sum((m) => m.revenue))}</td>
                  <td className={cn(cell, "font-semibold")}>{kes(sum((m) => m.commission))}</td>
                  <td className={cn(cell, "font-semibold")}>{tips > 0 ? kes(tips) : none}</td>
                  {owedByStaff ? (
                    <td className={cn(cell, "font-semibold")}>
                      {kes(team.reduce((total, m) => total + (owedByStaff.get(m.staffProfileId) ?? 0), 0))}
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
      {team.length > 0 ? (
        <p className={cn("mt-1.5", HINT)}>
          Tips are never the shop&apos;s money; they are owed to the person tipped.{" "}
          <Link className="underline" href={APP_ROUTES.commissions}>
            Pay the team
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function ComingNext({ next, later }: { next: ServiceTicketRecord[]; later: number }) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-3.5">
      <h2 className={SECTION}>Coming next</h2>
      {next.length === 0 ? (
        <p className={cn("mt-1.5", HINT)}>
          Nobody else is booked today.{" "}
          <Link className="underline" href={APP_ROUTES.servicesAppointments}>
            Take a booking
          </Link>
        </p>
      ) : (
        <ul className="mt-1 text-[13px]">
          {next.map((booking, index) => (
            <li key={booking.id} className={cn("flex items-baseline gap-3 py-1.5", index > 0 && "border-t border-[var(--op-rule)]")}>
              <span className="w-[4.75rem] shrink-0 font-mono tabular-nums">{time(booking.scheduledStart)}</span>
              <span className="min-w-0 flex-1 truncate">
                {booking.bookingName ?? "Customer"} · {booking.lines.map((line) => line.name).join(", ")}
              </span>
              <span className="shrink-0 text-[var(--op-muted)]">{(booking.staffName ?? "Anyone").split(/\s+/)[0]}</span>
            </li>
          ))}
        </ul>
      )}
      {later > 0 ? <p className={cn("mt-1", HINT)}>and {later} more later today</p> : null}
    </div>
  );
}

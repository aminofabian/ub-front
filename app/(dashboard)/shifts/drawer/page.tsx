"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, DoorOpen } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchCashDrawerOpenLog,
  fetchShifts,
  type CashDrawerOpenLogResponse,
  type CashDrawerOpenLogRow,
  type CashDrawerOpenLogTender,
  type ShiftListItem,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const NAIROBI_TIME_ZONE = "Africa/Nairobi";
const SHIFT_LIST_SIZE = 40;
const OPEN_SHIFT_STATUS = "open";
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const CASH_KIND = "CASH";
const DRAWOUT_KIND = "DRAWOUT";
const RULE = "border-[var(--op-border,#E7E1D6)]";
const PAPER = "bg-[var(--op-surface,#FCFAF5)]";
const INK = "text-[var(--op-ink,#121A16)]";
const MUTED = "text-[var(--op-muted,#556159)]";
const MATCHED_WASH = "bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_8%,transparent)]";
const FOREST_FILL = "bg-[var(--op-accent,#1D4B3B)]";
const HAIRLINE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
const COLUMN_SCROLL = "min-h-0 lg:max-h-[min(70dvh,36rem)] lg:overflow-y-auto";

const WHEN_FORMAT = new Intl.DateTimeFormat("en-KE", {
  timeZone: NAIROBI_TIME_ZONE,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-KE", {
  timeZone: NAIROBI_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const DAY_FORMAT = new Intl.DateTimeFormat("en-KE", {
  timeZone: NAIROBI_TIME_ZONE,
  day: "2-digit",
  month: "short",
});

const HOW_LABEL: Record<CashDrawerOpenLogRow["reason"], string> = {
  KEY: "Key",
  CASH_SALE: "Till, cash sale",
  REPRINT: "Till, reprint",
  UNKNOWN: "Opened, no sale",
};

export default function DrawerOpenLogPage() {
  const { me } = useDashboard();
  const { branchId } = useSessionBranch();
  const { formatMoney } = useFormatMoney();
  const allowed =
    hasPermission(me?.permissions, Permission.ShiftsOpen) ||
    hasPermission(me?.permissions, Permission.ShiftsClose) ||
    hasPermission(me?.permissions, Permission.ShiftsRead);
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [shiftsError, setShiftsError] = useState<string | null>(null);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [log, setLog] = useState<CashDrawerOpenLogResponse | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingShifts(true);
    setShiftsError(null);
    fetchShifts({ branchId: branchId || undefined, size: SHIFT_LIST_SIZE })
      .then((page) => {
        if (cancelled) return;
        const rows = page.shifts ?? [];
        setShifts(rows);
        setShiftId((current) => keepOrPickShift(current, rows));
      })
      .catch((err: unknown) => {
        if (!cancelled) setShiftsError(messageOf(err, "Could not load shifts."));
      })
      .finally(() => {
        if (!cancelled) setLoadingShifts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!shiftId) {
      setLog(null);
      return;
    }
    let cancelled = false;
    setLoadingLog(true);
    setLog(null);
    setLogError(null);
    fetchCashDrawerOpenLog(shiftId)
      .then((body) => {
        if (!cancelled) setLog(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLog(null);
          setLogError(messageOf(err, "Could not load the drawer log."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Drawer log"
        description="You need access to shifts to see when the drawer opened."
        backHref={APP_ROUTES.shifts}
        backLabel="Shifts"
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "flex flex-col gap-3")}>
      <DashboardPageHero
        icon={DoorOpen}
        title="Drawer log"
        description="Openings down the left. Cash and drawouts in the columns beside them."
        showActiveScope
      >
        <ShiftPicker
          shifts={shifts}
          shiftId={shiftId}
          disabled={loadingShifts || shifts.length === 0}
          onChange={setShiftId}
        />
      </DashboardPageHero>
      {shiftsError ? <DashboardFeedback kind="error" text={shiftsError} /> : null}
      {logError ? <DashboardFeedback kind="error" text={logError} /> : null}
      <LogBody
        loadingShifts={loadingShifts}
        loadingLog={loadingLog}
        shiftId={shiftId}
        shifts={shifts}
        log={log}
        formatMoney={formatMoney}
      />
    </div>
  );
}

function ShiftPicker({
  shifts,
  shiftId,
  disabled,
  onChange,
}: {
  shifts: ShiftListItem[];
  shiftId: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-[var(--op-muted,#7A7368)]">Shift</span>
      <select
        className={cn(
          "h-8 min-w-64 rounded-[2px] border px-2",
          RULE,
          PAPER,
          "focus-visible:border-[var(--op-accent,#1D4B3B)] focus-visible:outline-none",
        )}
        value={shiftId}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {shifts.length === 0 ? <option value="">No shifts yet</option> : null}
        {shifts.map((shift) => (
          <option key={shift.id} value={shift.id}>
            {shiftOptionLabel(shift)}
          </option>
        ))}
      </select>
    </label>
  );
}

function LogBody({
  loadingShifts,
  loadingLog,
  shiftId,
  shifts,
  log,
  formatMoney,
}: {
  loadingShifts: boolean;
  loadingLog: boolean;
  shiftId: string;
  shifts: ShiftListItem[];
  log: CashDrawerOpenLogResponse | null;
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  if (loadingShifts || (shiftId && loadingLog && !log)) {
    return <DashboardLoading label="Loading the drawer log…" />;
  }
  if (!shiftId || shifts.length === 0) {
    return <p className={cn("text-[13px]", INK)}>No shifts on this branch yet.</p>;
  }
  if (!log) return null;
  const tenders = log.tenders ?? [];
  const cash = tenders.filter((row) => row.kind === CASH_KIND);
  const drawouts = tenders.filter((row) => row.kind === DRAWOUT_KIND);
  return (
    <div className="flex flex-col gap-3">
      <CountStrip log={log} cash={cash} />
      <div
        className={cn(
          DASHBOARD_TABLE_SURFACE,
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <OpeningColumn rows={log.rows} formatMoney={formatMoney} />
        <TenderColumn
          title="Cash"
          rows={cash}
          formatMoney={formatMoney}
          empty="No cash payments on this shift."
          className={cn("border-b md:border-r md:border-b-0", HAIRLINE)}
        />
        <TenderColumn
          title="Drawouts"
          rows={drawouts}
          formatMoney={formatMoney}
          empty="No drawouts on this shift."
        />
      </div>
    </div>
  );
}

function CountStrip({
  log,
  cash,
}: {
  log: CashDrawerOpenLogResponse;
  cash: CashDrawerOpenLogTender[];
}) {
  const linedUp = log.rows.filter((row) => row.matched).length;
  const quiet = cash.filter((row) => !row.coincided).length;
  const cells: { label: string; value: number; mark?: ReactNode }[] = [
    { label: "Openings", value: log.rows.length },
    { label: "Lined up", value: linedUp, mark: <TickMark /> },
    { label: "No sale", value: log.unmatched, mark: <QuietMark /> },
    { label: "Drawer shut", value: quiet },
  ];
  return (
    <dl className={cn(DASHBOARD_TABLE_SURFACE, "grid grid-cols-2 sm:grid-cols-4")}>
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-2.5",
            index % 2 === 0 && "border-r",
            index === 1 && "sm:border-r",
            index < 2 && "border-b sm:border-b-0",
            HAIRLINE,
          )}
        >
          <dt className={cn("inline-flex items-center gap-1.5 text-[12px]", MUTED)}>
            {cell.mark}
            {cell.label}
          </dt>
          <dd className={cn("font-mono text-[15px] font-semibold tabular-nums", INK)}>{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OpeningColumn({
  rows,
  formatMoney,
}: {
  rows: CashDrawerOpenLogRow[];
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <LedgerColumn
      title="Openings"
      count={rows.length}
      className={cn(
        "border-b md:col-span-2 lg:col-span-1 lg:border-r lg:border-b-0",
        HAIRLINE,
      )}
    >
      {rows.length === 0 ? (
        <EmptyLine text="This shift has no drawer openings yet." />
      ) : (
        <ol className="m-0 list-none p-0">
          {rows.map((row, index) => (
            <OpeningEntry
              key={row.id}
              row={row}
              showDay={index === 0 || dayOf(rows[index - 1].openedAt) !== dayOf(row.openedAt)}
              first={index === 0}
              last={index === rows.length - 1}
              formatMoney={formatMoney}
            />
          ))}
        </ol>
      )}
    </LedgerColumn>
  );
}

function OpeningEntry({
  row,
  showDay,
  first,
  last,
  formatMoney,
}: {
  row: CashDrawerOpenLogRow;
  showDay: boolean;
  first: boolean;
  last: boolean;
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[4.5rem_0.75rem_minmax(0,1fr)] gap-x-2 border-b px-3 py-2.5 last:border-b-0",
        HAIRLINE,
        row.matched && MATCHED_WASH,
      )}
    >
      <div className="pt-0.5">
        <p className={cn("font-mono text-[12px] tabular-nums leading-none", INK)}>{clockOf(row.openedAt)}</p>
        {showDay ? <p className={cn("mt-1 text-[11px]", MUTED)}>{dayOf(row.openedAt)}</p> : null}
      </div>
      <RailDot matched={row.matched} drawout={row.matchKind === DRAWOUT_KIND} first={first} last={last} />
      <div className="min-w-0">
        <p className={cn("text-[13px] font-medium leading-tight", INK)}>{howLabel(row)}</p>
        <p className={cn("mt-0.5 text-[12px] leading-snug", MUTED)}>{closedNote(row)}</p>
        <p className={cn("mt-1 inline-flex items-start gap-1.5 text-[12px] leading-snug", row.matched ? INK : MUTED)}>
          {row.matched ? <TickMark /> : <QuietMark />}
          {matchText(row, formatMoney)}
        </p>
      </div>
    </li>
  );
}

function RailDot({
  matched,
  drawout,
  first,
  last,
}: {
  matched: boolean;
  drawout: boolean;
  first: boolean;
  last: boolean;
}) {
  return (
    <span className="relative flex h-full justify-center" aria-hidden>
      <span
        className={cn(
          "absolute w-px bg-[color-mix(in_srgb,var(--order-ink,#121A16)_35%,transparent)]",
          first ? "top-1.5" : "-top-2.5",
          last ? "bottom-1.5" : "-bottom-2.5",
        )}
      />
      <span
        className={cn(
          "relative z-10 mt-1 size-2 shrink-0 border",
          drawout ? "rounded-[1px]" : "rounded-full",
          matched ? cn(FOREST_FILL, "border-transparent") : cn(PAPER, "border-[var(--op-ink,#121A16)]"),
        )}
      />
    </span>
  );
}

function TenderColumn({
  title,
  rows,
  formatMoney,
  empty,
  className,
}: {
  title: string;
  rows: CashDrawerOpenLogTender[];
  formatMoney: (amount: number | string | null | undefined) => string;
  empty: string;
  className?: string;
}) {
  return (
    <LedgerColumn title={title} count={rows.length} className={className}>
      {rows.length === 0 ? (
        <EmptyLine text={empty} />
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((row) => (
            <TenderEntry key={`${row.kind}-${row.id}`} row={row} title={title} formatMoney={formatMoney} />
          ))}
        </ul>
      )}
    </LedgerColumn>
  );
}

function TenderEntry({
  row,
  title,
  formatMoney,
}: {
  row: CashDrawerOpenLogTender;
  title: string;
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 border-b px-3 py-2.5 last:border-b-0",
        HAIRLINE,
        row.coincided && MATCHED_WASH,
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-[13px] font-medium leading-tight", INK)}>{row.label || title}</p>
        <p className="mt-1 text-[12px] leading-snug">
          <CoincideMark tender={row} />
        </p>
        <p className={cn("mt-0.5 font-mono text-[11px] tabular-nums", MUTED)}>
          {row.at ? clockOf(row.at) : "—"}
        </p>
      </div>
      <p className={cn("shrink-0 font-mono text-[13px] tabular-nums", INK)}>{formatMoney(row.amount)}</p>
    </li>
  );
}

function LedgerColumn({
  title,
  count,
  className,
  children,
}: {
  title: string;
  count: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex h-full min-w-0 flex-col", className)}>
      <header className={cn(DASHBOARD_TABLE_HEAD, "flex items-baseline justify-between")}>
        <h2 className={cn("text-[15px] font-semibold", INK)}>{title}</h2>
        <span className={cn("font-mono text-[12px] tabular-nums", MUTED)}>{count}</span>
      </header>
      <div className={COLUMN_SCROLL}>{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className={cn("px-3 py-6 text-[13px]", MUTED)}>{text}</p>;
}

function CoincideMark({ tender }: { tender: CashDrawerOpenLogTender }) {
  if (!tender.coincided) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", MUTED)}>
        <QuietMark />
        Drawer stayed shut
      </span>
    );
  }
  const when = tender.drawerOpenedAt ? clockOf(tender.drawerOpenedAt) : "";
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", INK)}>
      <TickMark />
      {when ? `Opened ${when}` : "Drawer opened"}
    </span>
  );
}

function TickMark() {
  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-white",
        FOREST_FILL,
      )}
      aria-hidden
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}

function QuietMark() {
  return (
    <span
      className="inline-flex size-4 shrink-0 rounded-full border border-[var(--op-ink,#121A16)]"
      aria-hidden
    />
  );
}

function keepOrPickShift(current: string, rows: ShiftListItem[]): string {
  if (current && rows.some((row) => row.id === current)) return current;
  const open = rows.find((row) => row.status === OPEN_SHIFT_STATUS);
  return open?.id ?? rows[0]?.id ?? "";
}

function shiftOptionLabel(shift: ShiftListItem): string {
  const state = shift.status === OPEN_SHIFT_STATUS ? "Open" : "Closed";
  const parts = [state, shift.shiftNumber?.trim(), formatWhen(shift.openedAt), shift.cashierName?.trim()];
  return parts.filter(Boolean).join(" · ");
}

function howLabel(row: CashDrawerOpenLogRow): string {
  if (row.source === "KEY") return "Key";
  return HOW_LABEL[row.reason] ?? "Till";
}

function closedNote(row: CashDrawerOpenLogRow): string {
  if (!row.closedAt) return "Still open";
  const held = heldOpen(row.openedAt, row.closedAt);
  const clock = clockOf(row.closedAt);
  return held ? `Shut ${clock} · ${held}` : `Shut ${clock}`;
}

function heldOpen(openedAt: string, closedAt: string): string {
  const ms = Date.parse(closedAt) - Date.parse(openedAt);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const seconds = Math.round(ms / MS_PER_SECOND);
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s open`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return `${minutes}m ${seconds % SECONDS_PER_MINUTE}s open`;
}

function matchText(
  row: CashDrawerOpenLogRow,
  formatMoney: (amount: number | string | null | undefined) => string,
): string {
  if (!row.matched || !row.matchKind) return "No sale or drawout";
  const kind = row.matchKind === DRAWOUT_KIND ? "Drawout" : "Cash";
  const when = row.matchAt ? clockOf(row.matchAt) : "";
  return [kind, row.matchLabel, formatMoney(row.matchAmount), when].filter(Boolean).join(" · ");
}

function clockOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return CLOCK_FORMAT.format(date);
}

function dayOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return DAY_FORMAT.format(date);
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return WHEN_FORMAT.format(date);
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

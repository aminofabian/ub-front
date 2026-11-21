"use client";

import { useEffect, useState } from "react";
import { Check, DoorOpen, X } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
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
const UNMATCHED_ROW = "bg-red-50 text-red-800";
const TICKED_ROW = "bg-emerald-50/70";
const CASH_KIND = "CASH";
const DRAWOUT_KIND = "DRAWOUT";

const WHEN_FORMAT = new Intl.DateTimeFormat("en-KE", {
  timeZone: NAIROBI_TIME_ZONE,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const HOW_LABEL: Record<CashDrawerOpenLogRow["reason"], string> = {
  KEY: "Key",
  CASH_SALE: "Till, cash sale",
  REPRINT: "Till, reprint",
  UNKNOWN: "Till",
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
        description="Cash that opened the drawer gets a green tick. An opening with nothing behind it stays red."
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
        className="h-8 min-w-64 rounded-none border border-[var(--op-border,#E7E1D6)] bg-[var(--op-surface,#FCFAF5)] px-2"
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
    return <p className="text-[13px]">No shifts on this branch yet.</p>;
  }
  if (!log) return null;
  const tenders = log.tenders ?? [];
  return (
    <>
      <LogSummary unmatched={log.unmatched} total={log.rows.length} tenders={tenders} />
      <TenderTable
        title="Cash payments"
        rows={tenders.filter((row) => row.kind === CASH_KIND)}
        formatMoney={formatMoney}
        empty="No cash payments on this shift."
      />
      <TenderTable
        title="Drawouts"
        rows={tenders.filter((row) => row.kind === DRAWOUT_KIND)}
        formatMoney={formatMoney}
      />
      {log.rows.length === 0 ? (
        <p className="text-[13px]">This shift has no drawer openings yet.</p>
      ) : (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-[13px] font-medium">Drawer openings</h2>
          <LogTable rows={log.rows} formatMoney={formatMoney} />
        </section>
      )}
    </>
  );
}

function LogSummary({
  unmatched,
  total,
  tenders,
}: {
  unmatched: number;
  total: number;
  tenders: CashDrawerOpenLogTender[];
}) {
  const cash = tenders.filter((row) => row.kind === CASH_KIND);
  const ticked = cash.filter((row) => row.coincided).length;
  const quiet = cash.length - ticked;
  if (total === 0 && cash.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
      {ticked > 0 ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
          <TickMark />
          {ticked} cash {ticked === 1 ? "payment lines" : "payments line"} up
        </span>
      ) : null}
      {quiet > 0 ? (
        <span className="text-[var(--op-muted,#7A7368)]">
          {quiet} cash {quiet === 1 ? "payment" : "payments"} with the drawer shut
        </span>
      ) : null}
      {unmatched > 0 ? (
        <span className="font-medium text-red-800">
          {unmatched} {unmatched === 1 ? "opening has" : "openings have"} no cash payment or drawout
        </span>
      ) : null}
      {total > 0 && unmatched === 0 ? (
        <span>Every opening lines up with a cash payment or a drawout.</span>
      ) : null}
    </div>
  );
}

function LogTable({
  rows,
  formatMoney,
}: {
  rows: CashDrawerOpenLogRow[];
  formatMoney: (amount: number | string | null | undefined) => string;
}) {
  return (
    <div className={DASHBOARD_TABLE_SURFACE}>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--op-border,#E7E1D6)] text-[12px] uppercase tracking-wide text-[var(--op-muted,#7A7368)]">
            <th className="px-3 py-2 font-medium">Opened</th>
            <th className="px-3 py-2 font-medium">Closed</th>
            <th className="px-3 py-2 font-medium">How</th>
            <th className="px-3 py-2 font-medium">Matches</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-[var(--op-border,#E7E1D6)] last:border-b-0",
                row.matched && row.matchKind === CASH_KIND && TICKED_ROW,
                !row.matched && UNMATCHED_ROW,
              )}
            >
              <td className="px-3 py-2 whitespace-nowrap">{formatWhen(row.openedAt)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{closedLabel(row)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{howLabel(row)}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  {row.matched ? <TickMark /> : <MissMark />}
                  {matchText(row, formatMoney)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TenderTable({
  title,
  rows,
  formatMoney,
  empty,
}: {
  title: string;
  rows: CashDrawerOpenLogTender[];
  formatMoney: (amount: number | string | null | undefined) => string;
  empty?: string;
}) {
  if (rows.length === 0) {
    return empty ? <p className="text-[13px]">{empty}</p> : null;
  }
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[13px] font-medium">{title}</h2>
      <div className={DASHBOARD_TABLE_SURFACE}>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--op-border,#E7E1D6)] text-[12px] uppercase tracking-wide text-[var(--op-muted,#7A7368)]">
              <th className="px-3 py-2 font-medium">Drawer</th>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">What</th>
              <th className="px-3 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.kind}-${row.id}`}
                className={cn(
                  "border-b border-[var(--op-border,#E7E1D6)] last:border-b-0",
                  row.coincided && TICKED_ROW,
                )}
              >
                <td className="px-3 py-2">
                  <CoincideMark tender={row} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.at ? formatWhen(row.at) : "—"}
                </td>
                <td className="px-3 py-2">{row.label || title}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CoincideMark({ tender }: { tender: CashDrawerOpenLogTender }) {
  if (!tender.coincided) {
    return (
      <span className="inline-flex items-center gap-2 text-[var(--op-muted,#7A7368)]">
        <QuietMark />
        Drawer stayed shut
      </span>
    );
  }
  const when = tender.drawerOpenedAt ? formatWhen(tender.drawerOpenedAt) : "";
  return (
    <span className="inline-flex items-center gap-2 font-medium text-emerald-800">
      <TickMark />
      {when ? `Opened ${when}` : "Drawer opened"}
    </span>
  );
}

function TickMark() {
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
      aria-hidden
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

function QuietMark() {
  return (
    <span
      className="inline-flex size-5 shrink-0 rounded-full border border-[var(--op-border,#C9C2B4)]"
      aria-hidden
    />
  );
}

function MissMark() {
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-red-700 text-white"
      aria-hidden
    >
      <X className="size-3.5" strokeWidth={3} />
    </span>
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

function closedLabel(row: CashDrawerOpenLogRow): string {
  if (!row.closedAt) return "Still open";
  const held = heldOpen(row.openedAt, row.closedAt);
  return held ? `${formatWhen(row.closedAt)} · ${held}` : formatWhen(row.closedAt);
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
  if (!row.matched || !row.matchKind) return "No cash payment or drawout";
  const kind = row.matchKind === "DRAWOUT" ? "Drawout" : "Cash";
  const when = row.matchAt ? formatWhen(row.matchAt) : "";
  return [kind, row.matchLabel, formatMoney(row.matchAmount), when].filter(Boolean).join(" · ");
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

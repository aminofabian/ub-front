"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { ProfitPocketDrawer } from "@/components/business-hub/profit-pocket-drawer";
import { FormDrawer } from "@/components/form-drawer";
import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchProfitPocketCalendar,
  recordProfitPocketDay,
  skipProfitPocketDay,
  unskipProfitPocketDay,
  type ProfitPocketCalendar,
  type ProfitPocketCalendarDay,
  type ProfitPocketingInsight,
  type ProfitPocketMonthSummary,
} from "@/lib/api";
import { fmtMoney } from "@/lib/business-hub/formatters";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const TONE: Record<string, string> = {
  full: "bg-[#14532d] text-white",
  high: "bg-[#166534] text-white",
  medium: "bg-[#3f6212] text-white",
  low: "bg-[#dcfce7] text-[#14532d]",
  missed: "bg-[#ffedd5] text-[#9a3412]",
  unreviewed: "bg-[#f5f5f4] text-[#44403c]",
  skipped: "bg-[#e7e5e4] text-[#44403c]",
  no_profit: "bg-[#fafaf9] text-[#57534e]",
  loss: "bg-[#fee2e2] text-[#991b1b]",
  future: "bg-white text-[#78716c]",
  withdrawal: "bg-[#ffedd5] text-[#9a3412]",
};

const STATUS_LABEL: Record<string, string> = {
  full: "All of the profit pocketed",
  high: "Most of the profit pocketed",
  medium: "About half pocketed",
  low: "A little pocketed",
  missed: "Profit earned, nothing pocketed",
  unreviewed: "Not reviewed yet",
  skipped: "Left in the shop on purpose",
  no_profit: "No profit to pocket",
  loss: "Loss day",
  future: "Still ahead",
  withdrawal: "Withdrawal above profit",
};

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All days" },
  { id: "pocketed", label: "Pocketed" },
  { id: "partial", label: "Partial" },
  { id: "missed", label: "Not pocketed" },
  { id: "unreviewed", label: "Not reviewed" },
  { id: "skipped", label: "Left in shop" },
  { id: "no_profit", label: "No profit" },
];

const LEGEND: { status: string; label: string }[] = [
  { status: "full", label: "100%" },
  { status: "high", label: "75–99%" },
  { status: "medium", label: "50–74%" },
  { status: "low", label: "1–49%" },
  { status: "missed", label: "None" },
  { status: "unreviewed", label: "Open" },
  { status: "skipped", label: "Skipped" },
  { status: "no_profit", label: "No profit" },
];

function num(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rateLabel(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const parsed = num(value);
  return `${parsed.toFixed(1)}%`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const next = new Date(year, mon - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function matchesFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "pocketed") {
    return ["full", "high", "medium", "low", "withdrawal"].includes(status);
  }
  if (filter === "partial") return ["high", "medium", "low"].includes(status);
  if (filter === "no_profit") return status === "no_profit" || status === "loss";
  return status === filter;
}

function cellFigure(day: ProfitPocketCalendarDay): string {
  if (day.status === "skipped") return "Skip";
  if (day.status === "loss") return "Loss";
  if (day.status === "missed") return "0%";
  if (day.status === "withdrawal") return "Out";
  if (day.pocketingPercentage != null && num(day.pocketedAmount) > 0) {
    return `${num(day.pocketingPercentage).toFixed(0)}%`;
  }
  return "";
}

function insightText(
  item: ProfitPocketingInsight,
  money: (value: number | string | null | undefined) => string,
): string {
  const delta = num(item.delta);
  switch (item.code) {
    case "rate_up":
      return `Pocketing rate is up ${delta.toFixed(1)} points from last month.`;
    case "rate_down":
      return `Pocketing rate is down ${delta.toFixed(1)} points from last month.`;
    case "amount_up":
      return `The amount pocketed rose from ${money(item.previous)} to ${money(item.current)}. A higher amount can come from higher profit, even when the rate stays flat.`;
    case "amount_down":
      return `The amount pocketed fell from ${money(item.previous)} to ${money(item.current)}.`;
    case "profit_up_rate_down":
      return "Profit earned is higher than last month, and a smaller share of it was pocketed.";
    case "retained_up":
      return `More profit stayed in the business than last month (${money(item.current)} retained).`;
    case "retained_down":
      return `Less profit stayed in the business than last month (${money(item.current)} retained).`;
    case "consistency_up":
      return `Pocketing was recorded on ${delta.toFixed(0)} more days than last month.`;
    case "consistency_down":
      return `Pocketing was recorded on ${delta.toFixed(0)} fewer days than last month.`;
    case "milestone_pocketed":
      return `${money(item.current)} was pocketed this month.`;
    case "milestone_days":
      return `Pocketing was recorded on ${num(item.current)} days.`;
    default:
      return "";
  }
}

export function PocketingCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loading: dashLoading,
    canReadFinanceReports,
    canWriteFinanceExpenses,
    branchId,
    business,
  } = useDashboard();
  const currency = business?.currency ?? "KES";
  const money = useCallback(
    (value: number | string | null | undefined) => fmtMoney(value, currency),
    [currency],
  );

  const month = searchParams.get("month") || currentMonth();
  const [view, setView] = useState<"calendar" | "months">("calendar");
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState<ProfitPocketCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cashOpen, setCashOpen] = useState(false);

  const canOpen = canReadFinanceReports || canWriteFinanceExpenses;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchProfitPocketCalendar({
        month,
        branchId: branchId || undefined,
      });
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pocketing.");
    } finally {
      setLoading(false);
    }
  }, [month, branchId]);

  useEffect(() => {
    if (!canOpen || dashLoading) return;
    void load();
  }, [canOpen, dashLoading, load]);

  const goMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.replace(`${APP_ROUTES.profitPocketing}?${params.toString()}`);
  };

  const byDate = useMemo(() => {
    const map = new Map<string, ProfitPocketCalendarDay>();
    for (const day of data?.days ?? []) map.set(day.date, day);
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const first = new Date(year, mon - 1, 1);
    const pad = (first.getDay() + 6) % 7;
    const count = new Date(year, mon, 0).getDate();
    const slots: ({ day: number; iso: string } | null)[] = [];
    for (let i = 0; i < pad; i++) slots.push(null);
    for (let day = 1; day <= count; day++) {
      const iso = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      slots.push({ day, iso });
    }
    return slots;
  }, [month]);

  const selected = selectedDate ? byDate.get(selectedDate) ?? null : null;
  const todayDay = data ? byDate.get(data.today) : undefined;
  const summary = data?.summary;

  if (dashLoading) return <DashboardLoading label="Loading pocketing…" />;
  if (!canOpen) {
    return (
      <DashboardAccessDenied
        title="Pocketing calendar"
        description="You need finance report or expense access to see how profit was pocketed."
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "gap-4 px-3 pt-3 sm:px-4")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[var(--order-ink,#15231f)]">
            Pocketing calendar
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
            How much of each day’s profit was taken home, and how much stayed
            in the shop. Pocketing does not change sales or expenses.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="rounded-none px-2"
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[9.5rem] text-center text-sm font-semibold">
            {summary?.label ?? month}
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-none px-2"
            onClick={() => goMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex gap-1" role="tablist" aria-label="Pocketing views">
        {(
          [
            ["calendar", "Calendar"],
            ["months", "Months"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={cn(
              "h-8 border px-3 text-xs font-semibold",
              HAIRLINE,
              view === id
                ? "bg-[var(--order-ink,#15231f)] text-white"
                : "bg-white text-[var(--order-ink,#15231f)]",
            )}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && !data ? (
        <DashboardLoadError
          title="Pocketing calendar"
          message={error}
          onRetry={() => void load()}
        />
      ) : null}

      {loading && !data ? <DashboardLoading label="Loading the month…" /> : null}

      {data && summary ? (
        <>
          <section
            className={cn("grid grid-cols-2 gap-px border bg-[#e7e5e4] sm:grid-cols-4", HAIRLINE)}
            aria-label="This month"
          >
            <Stat label="Profit" value={money(summary.totalProfit)} />
            <Stat
              label="Pocketed"
              value={money(summary.totalPocketed)}
              hint={rateLabel(summary.overallPercentage)}
            />
            <Stat label="Kept in shop" value={money(summary.totalRetained)} />
            <Stat
              label="Streak"
              value={data.currentStreak > 0 ? `${data.currentStreak} days` : "—"}
              hint={`Longest ${data.longestStreak}`}
            />
            <Stat
              label="Days pocketed"
              value={String(summary.pocketingDays)}
              hint={`${summary.fullDays} at 100%`}
            />
            <Stat label="Not pocketed" value={String(summary.missedDays)} />
            <Stat label="Still open" value={String(summary.unreviewedDays)} />
            <Stat
              label="Left on purpose"
              value={String(summary.skippedDays)}
              hint={
                summary.highestPocketDate
                  ? `Best day ${money(summary.highestPocketAmount)}`
                  : `${summary.noProfitDays} days with no profit`
              }
            />
          </section>

          {todayDay && month === data.today.slice(0, 7) ? (
            <section className={cn("flex flex-wrap items-center justify-between gap-3 border bg-white px-3 py-3", HAIRLINE)}>
              <div>
                <p className="text-xs font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
                  Today
                </p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                  {money(todayDay.profitAmount)}
                </p>
                <p className="text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]">
                  Pocketed {money(todayDay.pocketedAmount)}
                  {todayDay.pocketingPercentage != null
                    ? ` (${rateLabel(todayDay.pocketingPercentage)})`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                className="rounded-none bg-[#0f766e] hover:bg-[#0d6b63]"
                onClick={() => setSelectedDate(todayDay.date)}
              >
                {num(todayDay.pocketedAmount) > 0 ? "Update pocketing" : "Record pocketing"}
              </Button>
            </section>
          ) : null}

          {view === "calendar" ? (
            <section className="space-y-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter days">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    className={cn(
                      "h-7 border px-2 text-[11px] font-semibold",
                      HAIRLINE,
                      filter === item.id
                        ? "bg-[#0f766e] text-white"
                        : "bg-white text-[var(--order-ink,#15231f)]",
                    )}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className={cn("border bg-white", HAIRLINE)}>
                <div className="grid grid-cols-7 border-b text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="py-1.5">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-[#e7e5e4] p-px">
                  {cells.map((slot, index) => {
                    if (!slot) {
                      return <div key={`pad-${index}`} className="min-h-14 bg-white sm:min-h-[4.75rem]" />;
                    }
                    const day = byDate.get(slot.iso);
                    const status = day?.status ?? "no_profit";
                    const dim = filter !== "all" && !matchesFilter(status, filter);
                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setSelectedDate(slot.iso)}
                        className={cn(
                          "flex min-h-14 flex-col items-start px-1.5 py-1 text-left transition-opacity sm:min-h-[4.75rem] sm:px-2",
                          TONE[status] ?? TONE.no_profit,
                          dim && "opacity-30",
                          selectedDate === slot.iso && "ring-2 ring-[#0f766e] ring-offset-1",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]",
                        )}
                        aria-label={`${formatDay(slot.iso)}. ${STATUS_LABEL[status] ?? status}. Profit ${money(day?.profitAmount)}. Pocketed ${money(day?.pocketedAmount)}.`}
                      >
                        <span className="text-[11px] font-semibold tabular-nums sm:text-xs">
                          {slot.day}
                        </span>
                        <span className="mt-auto font-mono text-[10px] font-semibold tabular-nums sm:text-xs">
                          {day ? cellFigure(day) : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]">
                {LEGEND.map((item) => (
                  <li key={item.status} className="flex items-center gap-1.5">
                    <span
                      className={cn("inline-block size-3 border border-black/10", TONE[item.status])}
                      aria-hidden
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
              {loading ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Updating…
                </p>
              ) : null}
            </section>
          ) : (
            <MonthsPanel months={data.months} insights={data.insights} money={money} />
          )}
        </>
      ) : null}

      <DayDrawer
        day={selected}
        canWrite={canWriteFinanceExpenses}
        money={money}
        branchId={branchId || undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
        onSaved={(next) => {
          setData(next);
        }}
        onMoveCash={() => setCashOpen(true)}
      />

      {selected ? (
        <ProfitPocketDrawer
          open={cashOpen}
          onOpenChange={setCashOpen}
          from={selected.date}
          to={selected.date}
          branchId={branchId || null}
          periodLabel={formatDay(selected.date)}
          onPocketed={() => void load()}
        />
      ) : null}

      <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
        Rates use the profit snapshot from when you logged the day. A day with
        no sales is not counted as missed.{" "}
        <Link href={APP_ROUTES.expenses} className="font-semibold underline">
          Expenses & profit
        </Link>
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--order-ink,#15231f)] sm:text-base">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function MonthsPanel({
  months,
  insights,
  money,
}: {
  months: ProfitPocketMonthSummary[];
  insights: ProfitPocketingInsight[];
  money: (value: number | string | null | undefined) => string;
}) {
  const peak = Math.max(...months.map((month) => num(month.totalProfit)), 1);
  const lines = insights
    .map((item) => insightText(item, money))
    .filter(Boolean);

  return (
    <section className="space-y-4">
      <div className={cn("space-y-3 border bg-white p-3", HAIRLINE)}>
        {months.map((month) => {
          const profitWidth = Math.max(0, (num(month.totalProfit) / peak) * 100);
          const pocketWidth = Math.max(0, (num(month.totalPocketed) / peak) * 100);
          return (
            <div key={month.month}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold">{month.label}</span>
                <span className="font-mono tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_70%,transparent)]">
                  {rateLabel(month.overallPercentage)} · {month.pocketingDays} days
                </span>
              </div>
              <div className="space-y-1">
                <Bar width={profitWidth} className="bg-[#d6d3d1]" label={`${month.label} profit`} />
                <Bar width={pocketWidth} className="bg-[#166534]" label={`${month.label} pocketed`} />
              </div>
            </div>
          );
        })}
        <p className="flex flex-wrap gap-3 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_65%,transparent)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 bg-[#d6d3d1]" aria-hidden />
            Profit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 bg-[#166534]" aria-hidden />
            Pocketed
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-[0.04em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
              <th className="py-2 pr-3 font-semibold">Month</th>
              <th className="py-2 pr-3 font-semibold">Profit</th>
              <th className="py-2 pr-3 font-semibold">Pocketed</th>
              <th className="py-2 pr-3 font-semibold">Kept</th>
              <th className="py-2 pr-3 font-semibold">Rate</th>
              <th className="py-2 pr-3 font-semibold">Days</th>
              <th className="py-2 font-semibold">Not pocketed</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month} className="border-b border-black/5">
                <th className="py-2 pr-3 font-semibold">{month.label}</th>
                <td className="py-2 pr-3 font-mono tabular-nums">{money(month.totalProfit)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{money(month.totalPocketed)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{money(month.totalRetained)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{rateLabel(month.overallPercentage)}</td>
                <td className="py-2 pr-3 tabular-nums">{month.pocketingDays}</td>
                <td className="py-2 tabular-nums">{month.missedDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lines.length > 0 ? (
        <ul className={cn("space-y-2 border bg-white px-3 py-3 text-sm", HAIRLINE)}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
          Log a few days and the next month will show whether the rate, the
          amount, or both moved.
        </p>
      )}
    </section>
  );
}

function Bar({
  width,
  className,
  label,
}: {
  width: number;
  className: string;
  label: string;
}) {
  return (
    <div className="h-2 bg-[#f5f5f4]" role="img" aria-label={label}>
      <div className={cn("h-full", className)} style={{ width: `${width}%` }} />
    </div>
  );
}

function DayDrawer({
  day,
  canWrite,
  money,
  branchId,
  onOpenChange,
  onSaved,
  onMoveCash,
}: {
  day: ProfitPocketCalendarDay | null;
  canWrite: boolean;
  money: (value: number | string | null | undefined) => string;
  branchId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: ProfitPocketCalendar) => void;
  onMoveCash: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [allowAbove, setAllowAbove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    const pocketed = num(day.pocketedAmount);
    setAmount(pocketed > 0 ? String(pocketed) : "");
    setNote(day.note ?? "");
    setReason(day.skipReason ?? "");
    setAllowAbove(day.aboveProfit);
    setError(null);
  }, [day]);

  if (!day) return null;

  const profit = num(day.profitAmount);
  const amountN = Number(amount);
  const above =
    Number.isFinite(amountN) &&
    amountN > 0 &&
    (profit <= 0 || amountN > profit + 0.009);
  const share = profit > 0 && Number.isFinite(amountN) ? (amountN / profit) * 100 : null;
  const locked = day.status === "future";

  const save = async () => {
    if (!Number.isFinite(amountN) || amountN < 0) {
      setError("Enter the amount pocketed, or 0 if nothing was taken.");
      return;
    }
    if (above && !allowAbove) {
      setError("This is above the day’s profit. Confirm it as a separate withdrawal.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await recordProfitPocketDay({
        date: day.date,
        branchId,
        pocketedAmount: amountN,
        note: note.trim() || undefined,
        allowAboveProfit: above ? true : undefined,
      });
      onSaved(next);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pocketing.");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await skipProfitPocketDay({
        date: day.date,
        branchId,
        reason: reason.trim() || undefined,
      });
      onSaved(next);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip this day.");
    } finally {
      setBusy(false);
    }
  };

  const unskip = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await unskipProfitPocketDay({ date: day.date, branchId });
      onSaved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear the skip.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open
      onOpenChange={onOpenChange}
      title={formatDay(day.date)}
      description={STATUS_LABEL[day.status] ?? day.status}
      width="default"
      appearance="sharp"
      headerDensity="compact"
      footer={
        canWrite && !locked ? (
          <div className="flex flex-wrap justify-end gap-2">
            {day.status === "skipped" ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                disabled={busy}
                onClick={() => void unskip()}
              >
                Clear skip
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                disabled={busy || num(day.pocketedAmount) > 0}
                onClick={() => void skip()}
              >
                Leave in the shop
              </Button>
            )}
            <Button
              type="button"
              className="rounded-none bg-[#0f766e] hover:bg-[#0d6b63]"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save pocketing
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4 px-1 pb-2">
        <div className={cn("grid grid-cols-2 gap-px border bg-[#e7e5e4]", HAIRLINE)}>
          <Stat label="Profit" value={money(day.profitAmount)} />
          <Stat label="Pocketed" value={money(day.pocketedAmount)} hint={rateLabel(day.pocketingPercentage)} />
          <Stat label="Remaining" value={money(day.remainingProfit)} />
          <Stat label="Sales" value={String(day.saleCount)} />
        </div>

        {day.profitMoved ? (
          <p className="text-xs text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]">
            Books now show {money(day.liveProfit)}. This day’s rate still uses
            the {money(day.profitAmount)} snapshot from when it was logged.
          </p>
        ) : null}

        {locked ? (
          <p className="text-sm">This day has not happened yet.</p>
        ) : canWrite ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Amount pocketed
              </span>
              <input
                className="h-10 border border-input bg-background px-3 font-mono text-sm"
                value={amount}
                inputMode="decimal"
                disabled={busy}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAllowAbove(false);
                }}
              />
            </label>
            {share != null && Number.isFinite(amountN) ? (
              <p className="text-xs text-muted-foreground">
                {share.toFixed(1)}% of this day’s profit.
                {profit - amountN >= 0
                  ? ` ${money(profit - amountN)} stays in the business.`
                  : ""}
              </p>
            ) : null}
            {above ? (
              <label className="flex items-start gap-2 text-xs text-[#9a3412]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={allowAbove}
                  onChange={(e) => setAllowAbove(e.target.checked)}
                />
                Record this as a separate withdrawal, above the day’s profit.
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Note</span>
              <input
                className="h-10 border border-input bg-background px-3 text-sm"
                value={note}
                maxLength={500}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Reason, if you are leaving it in the shop
              </span>
              <input
                className="h-10 border border-input bg-background px-3 text-sm"
                value={reason}
                maxLength={240}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="text-left text-xs font-semibold underline"
              onClick={onMoveCash}
            >
              Also move this cash out of the till
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can review this day. Recording pocketing needs expense access.
          </p>
        )}

        {error ? <p className="text-sm text-[#9a3412]">{error}</p> : null}

        {day.entries.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Cash movements</p>
            <ul className="mt-1 space-y-1 text-sm">
              {day.entries.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-3 font-mono tabular-nums">
                  <span>{money(entry.attributedAmount)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.destinationSummary || "Owner drawings"}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {day.revisions.length > 1 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Edits</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {[...day.revisions].reverse().slice(0, 6).map((revision) => (
                <li key={revision.at}>
                  {money(revision.pocketedAmount)}
                  {revision.note ? ` — ${revision.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </FormDrawer>
  );
}

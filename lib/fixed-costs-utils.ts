export type ExpenseFrequency = "daily" | "weekly" | "monthly";
export type ExpenseCategoryType = "fixed" | "variable";
export type ExpensePaymentMethod = "cash" | "mpesa_manual" | "bank";

export const EXPENSE_FREQUENCY_OPTIONS = [
  { value: "monthly" as const, label: "Monthly" },
  { value: "weekly" as const, label: "Weekly" },
  { value: "daily" as const, label: "Daily" },
];

export const EXPENSE_PAYMENT_METHOD_OPTIONS = [
  { value: "mpesa_manual" as const, label: "M-Pesa" },
  { value: "bank" as const, label: "Bank transfer" },
  { value: "cash" as const, label: "Cash" },
];

export const FIXED_COST_PRESETS = [
  { id: "shop_rent", label: "Shop rent", name: "Shop rent", categoryType: "fixed" as const },
  { id: "stall_rent", label: "Stall rent", name: "Stall rent", categoryType: "fixed" as const },
  { id: "kplc", label: "KPLC / power", name: "KPLC / power", categoryType: "variable" as const },
  { id: "water", label: "Water", name: "Water", categoryType: "variable" as const },
  { id: "security", label: "Security", name: "Security", categoryType: "fixed" as const },
  { id: "internet", label: "Internet", name: "Internet", categoryType: "fixed" as const },
  { id: "loan", label: "Loan repayment", name: "Loan repayment", categoryType: "fixed" as const },
  { id: "other", label: "Other", name: "", categoryType: "fixed" as const },
] as const;

export function formatFixedCostMoney(n: number): string {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fixedCostMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function shiftFixedCostMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function frequencyLabel(frequency: string): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return frequency;
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "mpesa_manual":
      return "M-Pesa";
    case "bank":
      return "Bank";
    default:
      return method;
  }
}

export function categoryTypeLabel(category: string): string {
  return category === "variable" ? "Variable" : "Fixed";
}

function clampDayOfMonth(year: number, month: number, day: number): number {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

function parseIsoDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mirrors backend RecurringExpenseService.isDueOn for monthly/weekly/daily. */
export function isScheduleDueOn(
  frequency: ExpenseFrequency,
  startDate: string,
  date: Date,
): boolean {
  const start = parseIsoDate(startDate);
  if (date < start) return false;
  if (frequency === "daily") return true;
  if (frequency === "weekly") {
    const msPerDay = 86400000;
    const days = Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        msPerDay,
    );
    return days % 7 === 0;
  }
  if (frequency === "monthly") {
    const anchor = start.getDate();
    const day = clampDayOfMonth(date.getFullYear(), date.getMonth() + 1, anchor);
    return date.getDate() === day;
  }
  return false;
}

export function nextDueDate(
  frequency: ExpenseFrequency,
  startDate: string,
  afterIso: string | null,
): string | null {
  const start = parseIsoDate(startDate);
  let cursor = afterIso ? parseIsoDate(afterIso) : start;
  if (!afterIso) {
    if (isScheduleDueOn(frequency, startDate, cursor)) {
      return toIsoDate(cursor);
    }
  }
  for (let i = 0; i < 400; i++) {
    cursor = advanceDueDate(frequency, startDate, cursor);
    if (isScheduleDueOn(frequency, startDate, cursor)) {
      return toIsoDate(cursor);
    }
  }
  return null;
}

function advanceDueDate(
  frequency: ExpenseFrequency,
  startDate: string,
  current: Date,
): Date {
  if (frequency === "daily") {
    return new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
  }
  if (frequency === "weekly") {
    return new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
  }
  const start = parseIsoDate(startDate);
  const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  const anchor = start.getDate();
  const day = clampDayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth() + 1, anchor);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
}

export function nextDueFromSchedule(schedule: {
  frequency: string;
  startDate: string;
  endDate: string | null;
  lastGeneratedOn: string | null;
  active: boolean;
}): string | null {
  if (!schedule.active) return null;
  const today = toIsoDate(new Date());
  const freq = schedule.frequency as ExpenseFrequency;
  let candidate =
    nextDueDate(freq, schedule.startDate, schedule.lastGeneratedOn) ??
    schedule.startDate;
  if (candidate < today) {
    candidate = nextDueDate(freq, schedule.startDate, candidate) ?? candidate;
  }
  if (schedule.endDate && candidate > schedule.endDate.slice(0, 10)) {
    return null;
  }
  return candidate;
}

/** Count due occurrences in a calendar month (for commitment estimate). */
export function occurrencesInMonth(
  frequency: ExpenseFrequency,
  startDate: string,
  endDate: string | null,
  year: number,
  month: number,
): number {
  const start = parseIsoDate(startDate);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d < start) continue;
    if (endDate && toIsoDate(d) > endDate.slice(0, 10)) continue;
    if (isScheduleDueOn(frequency, startDate, d)) count++;
  }
  return count;
}

export function monthlyCommitmentForSchedule(schedule: {
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
  year: number;
  month: number;
}): number {
  if (!schedule.active) return 0;
  const freq = schedule.frequency as ExpenseFrequency;
  const count = occurrencesInMonth(
    freq,
    schedule.startDate,
    schedule.endDate,
    schedule.year,
    schedule.month,
  );
  return count * Number(schedule.amount);
}

export function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportFixedCostSchedulesCsv(
  rows: Array<{
    name: string;
    branchName: string | null;
    amount: number;
    frequency: string;
    nextDue: string | null;
    paymentMethod: string;
    categoryType: string;
    includeInCashDrawer: boolean;
  }>,
): void {
  const csv = [
    ["Name", "Branch", "Amount", "Frequency", "Next due", "Payment", "Category", "Drawer"],
    ...rows.map((row) => [
      row.name,
      row.branchName ?? "",
      Number(row.amount).toFixed(2),
      frequencyLabel(row.frequency),
      row.nextDue ?? "",
      paymentMethodLabel(row.paymentMethod),
      categoryTypeLabel(row.categoryType),
      row.includeInCashDrawer ? "Yes" : "No",
    ]),
  ]
    .map((line) => line.map(escapeCsvCell).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fixed-costs-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function daysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

export function formatFixedCostDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.slice(0, 10));
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const FIXED_COST_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export function fixedCostCalendarMonthName(month: number): string {
  return FIXED_COST_MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

export function occurrenceStatusLabel(status: string): string {
  switch (status) {
    case "posted":
      return "Posted";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    case "due":
      return "Due";
    case "upcoming":
      return "Upcoming";
    default:
      return status;
  }
}

export function fixedCostCalendarStatusLabel(status: string): string {
  switch (status) {
    case "posted":
      return "All posted";
    case "pending":
      return "Due remaining";
    case "failed":
      return "Needs attention";
    case "future":
      return "Upcoming";
    case "empty":
      return "No bills";
    default:
      return status;
  }
}

export function fixedCostCalendarStatusHint(month: {
  status: string;
  dueCount: number;
  postedCount: number;
  failedCount: number;
  skippedCount: number;
}): string {
  switch (month.status) {
    case "posted":
      return `${month.postedCount} posted${month.skippedCount > 0 ? ` · ${month.skippedCount} skipped` : ""}`;
    case "pending":
      return `${month.postedCount} posted · ${Math.max(0, month.dueCount - month.postedCount - month.skippedCount)} due`;
    case "failed":
      return `${month.failedCount} failed · ${month.postedCount} posted`;
    case "future":
      return month.dueCount > 0 ? `${month.dueCount} due dates` : "Not due yet";
    case "empty":
      return "No schedules this month";
    default:
      return "";
  }
}

export function fixedCostCalendarCellClass(status: string): string {
  switch (status) {
    case "posted":
      return "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15";
    case "pending":
      return "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15";
    case "failed":
      return "border-red-500/40 bg-red-500/10 hover:bg-red-500/15";
    case "future":
      return "border-border/60 bg-muted/20 hover:bg-muted/30";
    case "empty":
      return "border-border/40 bg-muted/10 hover:bg-muted/20";
    default:
      return "border-border/60 bg-muted/20";
  }
}

export function fixedCostCalendarDotClass(status: string): string {
  switch (status) {
    case "posted":
      return "bg-emerald-500";
    case "pending":
      return "bg-amber-500";
    case "failed":
      return "bg-red-500";
    case "future":
      return "bg-muted-foreground/40";
    case "empty":
      return "bg-muted-foreground/25";
    default:
      return "bg-muted-foreground/40";
  }
}

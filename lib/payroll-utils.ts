export type AdvanceRepaymentMode =
  | "full_balance"
  | "percent_of_original"
  | "fixed_per_pay"
  | "manual";

/** How the join month is paid once salaries unlock on the 25th. */
export type JoinPayMode = "full" | "half" | "prorate" | "deferred";

export const JOIN_PAY_MODES: Array<{
  value: JoinPayMode;
  label: string;
  hint: string;
}> = [
  {
    value: "full",
    label: "Full salary",
    hint: "They receive the full monthly salary for their first month",
  },
  {
    value: "half",
    label: "Half salary",
    hint: "Half of the monthly salary for their first month",
  },
  {
    value: "prorate",
    label: "Prorated by days",
    hint: "Calculated from their start date and days worked",
  },
  {
    value: "deferred",
    label: "No salary until next payroll",
    hint: "First month stays at zero — salary starts next cycle",
  },
];

export function joinPayModeLabel(mode: string | null | undefined): string {
  return (
    JOIN_PAY_MODES.find((m) => m.value === mode)?.label ?? "Half salary"
  );
}

/** True when the given start date falls inside the labeled pay month. */
export function payrollIsJoinMonth(
  startDate: string | null | undefined,
  year: number,
  month: number,
): boolean {
  if (!startDate) return false;
  const d = new Date(`${startDate}T00:00:00`);
  return !Number.isNaN(d.getTime())
    && d.getFullYear() === year
    && d.getMonth() + 1 === month;
}

export const ADVANCE_REPAYMENT_MODES: Array<{
  value: AdvanceRepaymentMode;
  label: string;
  hint: string;
  needsValue: boolean;
  valueLabel?: string;
  valuePlaceholder?: string;
  valueMax?: number;
}> = [
  {
    value: "full_balance",
    label: "Full balance",
    hint: "Deduct as much as the pay pool allows until cleared",
    needsValue: false,
  },
  {
    value: "percent_of_original",
    label: "Percentage each pay",
    hint: "Fixed slice of the original advance every run",
    needsValue: true,
    valueLabel: "Percent of original (%)",
    valuePlaceholder: "e.g. 25",
    valueMax: 100,
  },
  {
    value: "fixed_per_pay",
    label: "Fixed amount each pay",
    hint: "Same KES amount every pay run until cleared",
    needsValue: true,
    valueLabel: "Amount per pay (KES)",
    valuePlaceholder: "e.g. 5000",
  },
  {
    value: "manual",
    label: "Manual each pay",
    hint: "Skipped on pay-all — you choose when confirming payment",
    needsValue: false,
  },
];

export function advanceRepaymentModeSummary(
  mode: string | null | undefined,
  value: number | null | undefined,
  originalAmount?: number | null,
): string {
  switch (mode) {
    case "percent_of_original": {
      if (value == null || value <= 0) return "Percent / pay";
      const pct = `${value}%`;
      if (originalAmount != null && originalAmount > 0) {
        const slice = roundMoney((originalAmount * value) / 100);
        return `${pct} of ${formatPayrollMoney(originalAmount)} (${formatPayrollMoney(slice)}/pay)`;
      }
      return `${pct} of original / pay`;
    }
    case "fixed_per_pay":
      return value != null && value > 0
        ? `${formatPayrollMoney(value)} / pay`
        : "Fixed / pay";
    case "manual":
      return "Manual at pay time";
    default:
      return "Full balance when paid";
  }
}

export function parseRepaymentPercentInput(raw: string): string {
  return raw.replace(/%/g, "").replace(/[^\d.]/g, "").trim();
}

export function parseRepaymentMoneyInput(raw: string): string {
  return raw.replace(/[^\d.]/g, "").trim();
}

export function advanceRepaymentPreview(
  advance: Pick<
    AdvanceRepaymentInput,
    "amount" | "balanceOutstanding" | "repaymentMode" | "repaymentValue"
  >,
  mode: AdvanceRepaymentMode,
  rawValue: string,
): {
  perPay: number;
  paysRemaining: number | null;
  summary: string;
} {
  const balance = roundMoney(Math.max(0, Number(advance.balanceOutstanding ?? advance.amount)));
  const original = roundMoney(Math.max(0, Number(advance.amount)));
  const parsedPercent = Number(parseRepaymentPercentInput(rawValue)) || 0;
  const parsedFixed = Number(parseRepaymentMoneyInput(rawValue)) || 0;

  let perPay = 0;
  if (mode === "percent_of_original" && parsedPercent > 0) {
    perPay = advanceRepaymentCap(
      {
        amount: original,
        balanceOutstanding: balance,
        repaymentMode: mode,
        repaymentValue: parsedPercent,
      },
      false,
    );
  } else if (mode === "fixed_per_pay" && parsedFixed > 0) {
    perPay = advanceRepaymentCap(
      {
        amount: original,
        balanceOutstanding: balance,
        repaymentMode: mode,
        repaymentValue: parsedFixed,
      },
      false,
    );
  } else if (mode === "full_balance") {
    perPay = balance;
  }

  const paysRemaining =
    perPay > 0 && balance > 0 ? Math.ceil(balance / perPay) : null;

  let summary = "";
  if (mode === "percent_of_original" && parsedPercent > 0) {
    summary = `${parsedPercent}% → ${formatPayrollMoney(perPay)} each pay`;
  } else if (mode === "fixed_per_pay" && parsedFixed > 0) {
    summary = `${formatPayrollMoney(parsedFixed)} each pay`;
  } else if (mode === "full_balance") {
    summary = `Up to ${formatPayrollMoney(balance)} this pay`;
  } else if (mode === "manual") {
    summary = "You choose the amount when marking paid";
  }

  return { perPay, paysRemaining, summary };
}

export type AdvanceRepaymentInput = {
  id: string;
  amount: number;
  balanceOutstanding: number;
  repaymentMode?: string | null;
  repaymentValue?: number | null;
  advancedOn?: string;
  note?: string | null;
};

function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

export function advanceRepaymentCap(
  advance: Pick<
    AdvanceRepaymentInput,
    "amount" | "balanceOutstanding" | "repaymentMode" | "repaymentValue"
  >,
  manualOverride = false,
): number {
  const balance = roundMoney(Math.max(0, Number(advance.balanceOutstanding)));
  if (balance <= 0) return 0;

  const mode = advance.repaymentMode ?? "full_balance";
  const value = Number(advance.repaymentValue) || 0;

  switch (mode) {
    case "manual":
      return manualOverride ? balance : 0;
    case "percent_of_original": {
      const pct = Math.min(100, Math.max(0, value));
      const slice = roundMoney((Number(advance.amount) * pct) / 100);
      return roundMoney(Math.min(balance, slice));
    }
    case "fixed_per_pay":
      return value > 0 ? roundMoney(Math.min(balance, value)) : balance;
    default:
      return balance;
  }
}

export function allocateAdvanceRepayments(
  pool: number,
  advances: AdvanceRepaymentInput[],
  manualOverride = false,
): { allocations: Array<{ advanceId: string; amount: number }>; total: number } {
  let remaining = roundMoney(Math.max(0, pool));
  const allocations: Array<{ advanceId: string; amount: number }> = [];

  const ordered = [...advances].sort((a, b) =>
    (a.advancedOn ?? "").localeCompare(b.advancedOn ?? ""),
  );

  for (const advance of ordered) {
    if (remaining <= 0) break;
    const balance = roundMoney(Math.max(0, Number(advance.balanceOutstanding)));
    if (balance <= 0) continue;
    const cap = advanceRepaymentCap(advance, manualOverride);
    if (cap <= 0) continue;
    const applied = roundMoney(Math.min(remaining, Math.min(balance, cap)));
    if (applied <= 0) continue;
    allocations.push({ advanceId: advance.id, amount: applied });
    remaining = roundMoney(remaining - applied);
  }

  const total = roundMoney(
    allocations.reduce((sum, row) => sum + row.amount, 0),
  );
  return { allocations, total };
}

export type StaffAdvancePayPreviewLine = {
  id: string;
  advancedOn: string;
  originalAmount: number;
  amountRepaid: number;
  balanceOutstanding: number;
  arrangementCap: number;
  allocatedThisRun: number;
  repaymentMode: string;
  repaymentValue: number | null;
  status: string;
};

export type StaffAdvancePayPreview = {
  lines: StaffAdvancePayPreviewLine[];
  totalOutstanding: number;
  totalArrangementCap: number;
  totalAllocatedThisRun: number;
  payPool: number;
  poolLimited: boolean;
  netAfterAdvances: number;
};

/** Realistic pay-run preview: pool-limited, oldest advance first. */
export function buildStaffAdvancePayPreview(
  baseSalary: number,
  statutoryTotal: number,
  otherDeductions: number,
  advances: Array<{
    id: string;
    amount: number;
    amountRepaid: number;
    balanceOutstanding: number;
    advancedOn: string;
    repaymentMode?: string | null;
    repaymentValue?: number | null;
    status: string;
  }>,
): StaffAdvancePayPreview {
  const open = advances
    .filter(
      (a) =>
        (a.status === "outstanding" || Number(a.balanceOutstanding) > 0) &&
        Number(a.balanceOutstanding) > 0,
    )
    .map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      amountRepaid: Number(a.amountRepaid) || 0,
      balanceOutstanding: roundMoney(Number(a.balanceOutstanding)),
      advancedOn: a.advancedOn,
      repaymentMode: a.repaymentMode,
      repaymentValue: a.repaymentValue,
      status: a.status,
    }));

  const payPool = roundMoney(
    Math.max(0, Number(baseSalary) - Number(statutoryTotal) - Number(otherDeductions)),
  );

  const inputs: AdvanceRepaymentInput[] = open.map((a) => ({
    id: a.id,
    amount: a.amount,
    balanceOutstanding: a.balanceOutstanding,
    repaymentMode: a.repaymentMode,
    repaymentValue: a.repaymentValue,
    advancedOn: a.advancedOn,
  }));

  const { allocations, total: totalAllocatedThisRun } = allocateAdvanceRepayments(
    payPool,
    inputs,
    false,
  );
  const allocationById = new Map(allocations.map((a) => [a.advanceId, a.amount]));

  const lines: StaffAdvancePayPreviewLine[] = open
    .sort((a, b) => a.advancedOn.localeCompare(b.advancedOn))
    .map((a) => ({
      id: a.id,
      advancedOn: a.advancedOn,
      originalAmount: a.amount,
      amountRepaid: a.amountRepaid,
      balanceOutstanding: a.balanceOutstanding,
      arrangementCap: advanceRepaymentCap(
        {
          amount: a.amount,
          balanceOutstanding: a.balanceOutstanding,
          repaymentMode: a.repaymentMode,
          repaymentValue: a.repaymentValue,
        },
        false,
      ),
      allocatedThisRun: allocationById.get(a.id) ?? 0,
      repaymentMode: a.repaymentMode ?? "full_balance",
      repaymentValue: a.repaymentValue ?? null,
      status: a.status,
    }));

  const totalOutstanding = roundMoney(
    open.reduce((sum, a) => sum + a.balanceOutstanding, 0),
  );
  const totalArrangementCap = roundMoney(
    lines.reduce((sum, line) => sum + line.arrangementCap, 0),
  );
  const poolLimited = totalArrangementCap > payPool && totalAllocatedThisRun < totalArrangementCap;

  return {
    lines,
    totalOutstanding,
    totalArrangementCap,
    totalAllocatedThisRun,
    payPool,
    poolLimited,
    netAfterAdvances: roundMoney(Math.max(0, payPool - totalAllocatedThisRun)),
  };
}

export function advanceBalanceLabel(
  originalAmount: number,
  amountRepaid: number,
  balanceOutstanding: number,
): string {
  if (amountRepaid > 0 && balanceOutstanding > 0) {
    return `${formatPayrollMoney(balanceOutstanding)} left · repaid ${formatPayrollMoney(amountRepaid)} of ${formatPayrollMoney(originalAmount)}`;
  }
  if (balanceOutstanding <= 0) {
    return "Cleared";
  }
  return formatPayrollMoney(balanceOutstanding);
}

export function formatPayrollMoney(n: number): string {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Pay cycle unlocks on this day of the labeled month. */
export const PAYROLL_SALARY_UNLOCK_DAY = 25;

/** From the 25th onward, payroll UI defaults to the next pay period. */
export const PAYROLL_FOCUS_DAY = 24;

/** Default pay period when opening payroll — next month from the 25th. */
export function defaultPayrollPeriod(from: Date = new Date()): {
  year: number;
  month: number;
} {
  if (from.getDate() > PAYROLL_FOCUS_DAY) {
    return shiftPayrollMonth(from.getFullYear(), from.getMonth() + 1, 1);
  }
  return { year: from.getFullYear(), month: from.getMonth() + 1 };
}

export function payrollPeriodDayCount(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isPayrollMonthReleased(
  year: number,
  month: number,
  from: Date = new Date(),
): boolean {
  const unlock = new Date(year, month - 1, PAYROLL_SALARY_UNLOCK_DAY);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return today.getTime() >= unlock.getTime();
}

/** Label like "17/30 days" when a payroll row is calendar-day prorated. */
export function payrollProrationDaysLabel(
  factor: number | null | undefined,
  year: number,
  month: number,
): string | null {
  if (factor == null || !(factor > 0) || !(factor < 1)) return null;
  if (Math.abs(factor - 0.5) < 0.0001) return "Half month";
  const daysInPeriod = payrollPeriodDayCount(year, month);
  const payableDays = Math.round(factor * daysInPeriod);
  if (payableDays <= 0 || payableDays >= daysInPeriod) return null;
  return `${payableDays}/${daysInPeriod} days`;
}

export function payrollMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function payrollShortMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function shiftPayrollMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isPayrollFocusPeriod(year: number, month: number, from: Date = new Date()): boolean {
  const focus = defaultPayrollPeriod(from);
  return year === focus.year && month === focus.month;
}

export type PayrollArrearPeriod = {
  year: number;
  month: number;
  baseSalary: number;
  statutoryTotal: number;
  payeSuggested: number;
  nssfSuggested: number;
  shifSuggested: number;
  housingLevySuggested: number;
  netBeforeAdvances: number;
};

export function payrollCombinedBase(row: {
  baseSalary: number;
  arrearsBaseTotal?: number;
}): number {
  return Number(row.baseSalary) + Number(row.arrearsBaseTotal ?? 0);
}

export function payrollArrearsNet(row: {
  arrearPeriods?: PayrollArrearPeriod[];
}): number {
  return (row.arrearPeriods ?? []).reduce(
    (sum, period) => sum + Number(period.netBeforeAdvances),
    0,
  );
}

export function payrollArrearMonthsLabel(periods: PayrollArrearPeriod[]): string {
  if (!periods.length) return "";
  return periods.map((p) => payrollShortMonth(p.year, p.month)).join(" + ");
}

export function payrollArrearSummary(row: {
  arrearPeriods?: PayrollArrearPeriod[];
  arrearsBaseTotal?: number;
}): string | null {
  const periods = row.arrearPeriods ?? [];
  if (!periods.length) return null;
  const total = Number(row.arrearsBaseTotal ?? 0);
  const label = payrollArrearMonthsLabel(periods);
  return `${label} · ${formatPayrollMoney(total)} gross`;
}

export function formatPayrollDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPayrollDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function employmentStatusLabel(status: string): string {
  switch (status) {
    case "on_leave":
      return "On leave";
    case "terminated":
      return "Terminated";
    default:
      return "Active";
  }
}

export const PAYROLL_MONTHS = [
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

export type PayrollCalendarStatus =
  | "future"
  | "empty"
  | "missing_salary"
  | "pending"
  | "paid";

export function payrollCalendarMonthName(month: number): string {
  return PAYROLL_MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

export function payrollCalendarShortMonth(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString(undefined, {
    month: "short",
  });
}

export function payrollCalendarMonthProgress(month: {
  headcount: number;
  paidCount: number;
}): number {
  if (month.headcount <= 0) return 0;
  return Math.round((month.paidCount / month.headcount) * 100);
}

export function payrollCalendarStatusLabel(status: PayrollCalendarStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "missing_salary":
      return "Missing salary";
    case "future":
      return "Upcoming";
    case "empty":
      return "No staff";
    default:
      return status;
  }
}

export function payrollCalendarStatusHint(
  month: {
    status: PayrollCalendarStatus;
    paidCount: number;
    pendingCount: number;
    missingSalaryCount: number;
    onLeaveCount: number;
    headcount: number;
  },
): string {
  switch (month.status) {
    case "paid":
      return month.onLeaveCount > 0
        ? `${month.paidCount} paid · ${month.onLeaveCount} on leave`
        : `${month.paidCount} paid`;
    case "pending":
      return `${month.pendingCount} pending · ${month.paidCount} paid`;
    case "missing_salary":
      return `${month.missingSalaryCount} missing salary`;
    case "future":
      return month.headcount > 0 ? `${month.headcount} staff` : "Not due yet";
    case "empty":
      return "No eligible staff";
    default:
      return "";
  }
}

export function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? "").replace(/"/g, '""');
  // Neutralize Excel/LibreOffice formula injection (=, +, -, @, tab, CR prefixes)
  // — note fields are user-typed and end up in spreadsheets verbatim.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe}"`;
}

export function downloadPayrollCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const csv = [headers, ...rows]
    .map((line) => line.map(escapeCsvCell).join(","))
    .join("\n");
  // BOM keeps non-ASCII staff names readable when opened in Excel.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportPayrollRunCsv(
  rows: Array<{
    displayName: string;
    title: string | null;
    branchName: string | null;
    employmentStatus: string;
    baseSalary: number;
    arrearsBaseTotal?: number;
    arrearPeriods?: PayrollArrearPeriod[];
    advancesOutstanding: number;
    suggestedNet: number;
    alreadyPaid: boolean;
    paidAt: string | null;
    statutoryTotal?: number;
    payeSuggested?: number;
    nssfSuggested?: number;
    shifSuggested?: number;
    housingLevySuggested?: number;
    arrearsStatutoryTotal?: number;
  }>,
  year: number,
  month: number,
  withStatutory = false,
): void {
  const headers = [
    "Employee",
    "Title",
    "Branch",
    "Status",
    "Base",
    "Arrears",
    "Arrear months",
    "Advances",
    ...(withStatutory
      ? [
          "Statutory total",
          "Arrears statutory",
          "PAYE",
          "NSSF",
          "SHIF",
          "Housing levy",
        ]
      : []),
    "Net",
    "Run status",
    "Paid on",
  ];
  downloadPayrollCsv(
    `payroll-${year}-${String(month).padStart(2, "0")}.csv`,
    headers,
    rows.map((row) => [
      row.displayName,
      row.title ?? "",
      row.branchName ?? "",
      employmentStatusLabel(row.employmentStatus),
      row.baseSalary.toFixed(2),
      Number(row.arrearsBaseTotal ?? 0).toFixed(2),
      payrollArrearMonthsLabel(row.arrearPeriods ?? []),
      row.advancesOutstanding.toFixed(2),
      ...(withStatutory
        ? [
            Number(row.statutoryTotal ?? 0).toFixed(2),
            Number(row.arrearsStatutoryTotal ?? 0).toFixed(2),
            Number(row.payeSuggested ?? 0).toFixed(2),
            Number(row.nssfSuggested ?? 0).toFixed(2),
            Number(row.shifSuggested ?? 0).toFixed(2),
            Number(row.housingLevySuggested ?? 0).toFixed(2),
          ]
        : []),
      row.suggestedNet.toFixed(2),
      row.alreadyPaid ? "Paid" : "Pending",
      row.paidAt ? formatPayrollDate(row.paidAt) : "",
    ]),
  );
}

export function advanceStatusLabel(row: {
  status: string;
  amountRepaid?: number;
}): string {
  if (row.status === "repaid") return "Repaid";
  if (Number(row.amountRepaid) > 0) return "Partial";
  return "Outstanding";
}

export function exportAdvanceLedgerCsv(
  rows: Array<{
    advancedOn: string;
    displayName: string;
    branchName: string | null;
    amount: number;
    amountRepaid?: number;
    balanceOutstanding?: number;
    status: string;
    note: string | null;
  }>,
): void {
  downloadPayrollCsv(
    `salary-advances-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Date",
      "Staff",
      "Branch",
      "Original",
      "Repaid",
      "Balance",
      "Status",
      "Note",
    ],
    rows.map((row) => [
      row.advancedOn,
      row.displayName,
      row.branchName ?? "",
      Number(row.amount).toFixed(2),
      Number(row.amountRepaid ?? 0).toFixed(2),
      Number(row.balanceOutstanding ?? row.amount).toFixed(2),
      advanceStatusLabel(row),
      row.note ?? "",
    ]),
  );
}

export function exportPayslipHistoryCsv(
  rows: Array<{
    displayName: string;
    periodYear: number;
    periodMonth: number;
    baseSalary: number;
    advancesDeducted: number;
    otherDeductions: number;
    payeDeducted?: number;
    nssfDeducted?: number;
    shifDeducted?: number;
    housingLevyDeducted?: number;
    netPaid: number;
    paidAt: string;
    note: string | null;
  }>,
  year: number,
  month: number,
): void {
  downloadPayrollCsv(
    `payslips-${year}-${String(month).padStart(2, "0")}.csv`,
    [
      "Employee",
      "Period",
      "Base",
      "Advances deducted",
      "Other deductions",
      "PAYE",
      "NSSF",
      "SHIF",
      "Housing levy",
      "Net paid",
      "Paid on",
      "Note",
    ],
    rows.map((row) => [
      row.displayName,
      payrollMonthLabel(row.periodYear, row.periodMonth),
      Number(row.baseSalary).toFixed(2),
      Number(row.advancesDeducted).toFixed(2),
      Number(row.otherDeductions).toFixed(2),
      Number(row.payeDeducted ?? 0).toFixed(2),
      Number(row.nssfDeducted ?? 0).toFixed(2),
      Number(row.shifDeducted ?? 0).toFixed(2),
      Number(row.housingLevyDeducted ?? 0).toFixed(2),
      Number(row.netPaid).toFixed(2),
      formatPayrollDateTime(row.paidAt),
      row.note ?? "",
    ]),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type PayslipDocumentOptions = {
  /** Tenant display name — shown in the masthead. */
  shopName?: string | null;
  /** Tenant logo URL — rendered at the top of the document when present. */
  logoUrl?: string | null;
  /** Brand hex used for section bands and the net-pay strip. */
  accent?: string | null;
  /** Employee identity fields shown in the details grid; omit what you don't have. */
  employee?: {
    code?: string | null;
    designation?: string | null;
    bankName?: string | null;
    accountMasked?: string | null;
  };
};

const DEFAULT_PAYSLIP_ACCENT = "#0f766e";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function payslipPaymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "mpesa_manual":
      return "M-Pesa";
    case "bank":
      return "Bank transfer";
    case "cash":
      return "Cash";
    default:
      return method ? method.replace(/_/g, " ") : "";
  }
}

/** Payslip fields needed to render the document (print HTML or PDF). */
export type PayslipDocumentData = {
  periodYear: number;
  periodMonth: number;
  paidAt: string;
  baseSalary: number;
  advancesDeducted: number;
  otherDeductions: number;
  payeDeducted?: number;
  nssfDeducted?: number;
  shifDeducted?: number;
  housingLevyDeducted?: number;
  netPaid: number;
  note?: string | null;
  paymentMethod?: string | null;
  payslipNumber?: string | null;
};

export type PayslipModel = {
  period: string;
  paidOn: string;
  payslipNumber: string | null;
  staffName: string;
  shopName: string;
  logoUrl: string | null;
  accent: string;
  leftDetails: Array<[string, string]>;
  rightDetails: Array<[string, string]>;
  earnings: Array<{ label: string; value: number }>;
  deductions: Array<{ label: string; value: number }>;
  totalEarnings: number;
  totalDeductions: number;
  net: number;
  note: string | null;
};

/** Shared shaping for every payslip rendering — print HTML, PDF, on-screen. */
export function buildPayslipModel(
  payslip: PayslipDocumentData,
  staffName: string,
  options: PayslipDocumentOptions = {},
): PayslipModel {
  const period = payrollMonthLabel(payslip.periodYear, payslip.periodMonth);
  const accent = hexToRgb(options.accent ?? "")
    ? (options.accent as string).trim()
    : DEFAULT_PAYSLIP_ACCENT;
  const shopName = (options.shopName ?? "").trim();
  const employee = options.employee ?? {};

  const paidOn = formatPayrollDateTime(payslip.paidAt);
  const totalEarnings = roundMoney(Number(payslip.baseSalary));
  const earnings = [{ label: "Basic salary", value: totalEarnings }];

  const deductions: Array<{ label: string; value: number }> = [];
  if (Number(payslip.payeDeducted) > 0) {
    deductions.push({ label: "PAYE (income tax)", value: Number(payslip.payeDeducted) });
  }
  if (Number(payslip.nssfDeducted) > 0) {
    deductions.push({ label: "NSSF pension", value: Number(payslip.nssfDeducted) });
  }
  if (Number(payslip.shifDeducted) > 0) {
    deductions.push({ label: "SHIF (health insurance)", value: Number(payslip.shifDeducted) });
  }
  if (Number(payslip.housingLevyDeducted) > 0) {
    deductions.push({ label: "Affordable Housing Levy", value: Number(payslip.housingLevyDeducted) });
  }
  if (Number(payslip.advancesDeducted) > 0) {
    deductions.push({ label: "Salary advance repayment", value: Number(payslip.advancesDeducted) });
  }
  if (Number(payslip.otherDeductions) > 0) {
    deductions.push({ label: "Other deductions", value: Number(payslip.otherDeductions) });
  }
  const totalDeductions = roundMoney(
    deductions.reduce((sum, d) => sum + d.value, 0),
  );

  const paidVia = payslipPaymentMethodLabel(payslip.paymentMethod);
  const bankLine = employee.bankName
    ? [employee.bankName, employee.accountMasked].filter(Boolean).join(" · ")
    : "";

  // Left column: employee identity · right column: pay info. Optional rows
  // collapse away cleanly.
  const leftDetails: Array<[string, string]> = [["Employee name", staffName]];
  if (employee.code) {
    leftDetails.push(["Employee ID", employee.code]);
  }
  if (employee.designation) {
    leftDetails.push(["Designation", employee.designation]);
  }
  const rightDetails: Array<[string, string]> = [
    ["Pay period", period],
    ["Pay date", paidOn],
  ];
  if (bankLine) {
    rightDetails.push(["Bank", bankLine]);
  } else if (paidVia) {
    rightDetails.push(["Paid via", paidVia]);
  }

  return {
    period,
    paidOn,
    payslipNumber: payslip.payslipNumber?.trim() || null,
    staffName,
    shopName,
    logoUrl: options.logoUrl?.trim() || null,
    accent,
    leftDetails,
    rightDetails,
    earnings,
    deductions,
    totalEarnings,
    totalDeductions,
    net: roundMoney(Number(payslip.netPaid)),
    note: payslip.note?.trim() || null,
  };
}

export function payslipDocumentHtml(
  payslip: PayslipDocumentData,
  staffName: string,
  options: PayslipDocumentOptions = {},
): string {
  const m = buildPayslipModel(payslip, staffName, options);
  const period = m.period;
  const safeName = escapeHtml(m.staffName);
  const accent = m.accent;
  const [ar, ag, ab] = hexToRgb(accent) ?? [15, 118, 110];
  const shopName = m.shopName;

  const earnings = m.earnings.map(
    (d) => [d.label, formatPayrollMoney(d.value)] as [string, string],
  );
  const deductionRows = m.deductions.map(
    (d) => [d.label, d.value] as [string, number],
  );
  const paidOn = m.paidOn;
  const bankLine = m.rightDetails.some(([label]) => label === "Bank")
    ? (m.rightDetails.find(([label]) => label === "Bank")?.[1] ?? "")
    : "";

  // Left column: employee identity · right column: pay info (matches the
  // reference payslip layout). Optional rows collapse away cleanly.
  const leftDetailRows: Array<[string, string]> = [["Employee name", staffName]];
  if (employee.code) {
    leftDetailRows.push(["Employee ID", employee.code]);
  }
  if (employee.designation) {
    leftDetailRows.push(["Designation", employee.designation]);
  }
  const rightDetailRows: Array<[string, string]> = [
    ["Pay period", period],
    ["Pay date", paidOn],
  ];
  if (bankLine) {
    rightDetailRows.push(["Bank", bankLine]);
  } else if (paidVia) {
    rightDetailRows.push(["Paid via", paidVia]);
  }

  const detailCell = ([label, value]: [string, string]) =>
    `<div class="detail"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(value)}</span></div>`;
  const detailsHtml =
    `<div class="detail-col">${leftDetailRows.map(detailCell).join("")}</div>` +
    `<div class="detail-col">${rightDetailRows.map(detailCell).join("")}</div>`;

  const tableRow = (
    label: string,
    value: string,
    opts: { total?: boolean } = {},
  ) =>
    `<tr class="${opts.total ? "total" : ""}"><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;

  const earningsHtml = earnings
    .map(([label, value]) => tableRow(label, value))
    .join("");
  const deductionsHtml =
    deductionRows
      .map(([label, value]) => tableRow(label, formatPayrollMoney(value)))
      .join("") || tableRow("Deductions", formatPayrollMoney(0));

  const note = payslip.note
    ? `<div class="note"><span class="note-label">Note</span>${escapeHtml(payslip.note)}</div>`
    : "";
  const logo = options.logoUrl
    ? `<img class="logo" src="${escapeHtml(options.logoUrl)}" alt="" />`
    : "";
  const brandName = shopName
    ? `<div class="brand"><span class="brand-name">${escapeHtml(shopName)}</span><span class="brand-sub">Payroll</span></div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip — ${safeName} · ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #eceff3; color: #16202b;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 760px; margin: 28px auto; background: #fff; padding: 34px 38px 26px; }
  .masthead { display: flex; align-items: center; gap: 14px; padding-bottom: 18px; border-bottom: 3px solid ${accent}; }
  .logo { height: 46px; width: 46px; object-fit: contain; border-radius: 8px; }
  .brand { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
  .brand-sub { font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; }
  .doc-title { margin-left: auto; text-align: right; }
  .doc-title h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: ${accent}; }
  .doc-title p { font-size: 12px; color: #64748b; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .band {
    margin-top: 22px; background: ${accent}; color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
    padding: 6px 12px;
  }
  .details { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #dbe3ec; border-top: none; }
  .detail-col { display: flex; flex-direction: column; }
  .detail-col + .detail-col { border-left: 1px solid #dbe3ec; }
  .detail { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #edf1f6; font-size: 13px; }
  .detail-col .detail:last-child { border-bottom: none; }
  .detail-label { color: #5c6b7c; }
  .detail-value { font-weight: 600; text-align: right; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #dbe3ec; border-top: none; }
  td { padding: 7px 10px; border-bottom: 1px solid #edf1f6; }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.total td { background: rgba(${ar}, ${ag}, ${ab}, 0.08); border-top: 2px solid ${accent}; border-bottom: none; font-weight: 700; }
  .net {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    margin-top: 20px; background: ${accent}; color: #fff; padding: 12px 16px;
  }
  .net-label { font-size: 12px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
  .net-amount { font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .note { margin-top: 14px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 9px 12px; font-size: 12px; color: #334155; }
  .note-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
  .foot { margin-top: 18px; text-align: center; font-size: 11px; font-style: italic; color: #8494a5; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; max-width: none; padding: 24px 28px 18px; }
  }
</style></head><body>
  <div class="sheet">
    <div class="masthead">
      ${logo}
      ${brandName}
      <div class="doc-title">
        <h1>Monthly Payslip</h1>
        <p>${escapeHtml(period)}</p>
      </div>
    </div>

    <div class="band">Employee &amp; Payroll Details</div>
    <div class="details">${detailsHtml}</div>

    <div class="cols">
      <div>
        <div class="band">Earnings</div>
        <table>
          ${earningsHtml}
          ${tableRow("Total earnings", formatPayrollMoney(totalEarnings), { total: true })}
        </table>
      </div>
      <div>
        <div class="band">Deductions</div>
        <table>
          ${deductionsHtml}
          ${tableRow("Total deductions", formatPayrollMoney(totalDeductions), { total: true })}
        </table>
      </div>
    </div>

    <div class="net">
      <span class="net-label">Net salary payable</span>
      <span class="net-amount">${escapeHtml(formatPayrollMoney(Number(payslip.netPaid)))}</span>
    </div>

    ${note}
    <p class="foot">This is a computer-generated document and does not require a signature.</p>
  </div>
</body></html>`;
}

export function printPayslipDocument(html: string): void {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 1000);
}

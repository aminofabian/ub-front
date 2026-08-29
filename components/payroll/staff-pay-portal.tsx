"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Loader2,
  Moon,
  Printer,
  Sun,
  Wallet,
  X,
} from "lucide-react";

import {
  fetchStaffPaySelf,
  type StaffPaySelfAdvance,
  type StaffPaySelfPayslip,
  type StaffPaySelfPortal,
} from "@/lib/api";
import {
  advanceStatusLabel,
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollDateTime,
  formatPayrollMoney,
  payrollMonthLabel,
  payslipDocumentHtml,
  printPayslipDocument,
} from "@/lib/payroll-utils";
import { buildStorefrontThemeVars, parseStorefrontHex } from "@/lib/storefront-theme";
import { phonesMatchKenyan, toKenyanLocal07 } from "@/lib/kenyan-phone";
import styles from "@/components/payroll/staff-pay-portal.module.css";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

type Props = {
  branding: Branding;
  /** When set, verify the loaded profile phone matches this segment. */
  phoneSegment?: string | null;
  backHref?: string | null;
};

type PortalTheme = "light" | "dark";
const THEME_STORAGE_KEY = "palmart-staff-pay-theme";

export function StaffPayPortal({
  branding,
  phoneSegment,
  backHref,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portal, setPortal] = useState<StaffPaySelfPortal | null>(null);
  const [theme, setTheme] = useState<PortalTheme>("light");
  const [selected, setSelected] = useState<StaffPaySelfPayslip | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") setTheme(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffPaySelf();
      if (phoneSegment) {
        const expected = toKenyanLocal07(phoneSegment);
        const actual = toKenyanLocal07(data.phone ?? "");
        if (expected && actual && !phonesMatchKenyan(expected, actual)) {
          throw new Error("This payslip link is for a different phone number.");
        }
      }
      setPortal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your pay details");
      setPortal(null);
    } finally {
      setLoading(false);
    }
  }, [phoneSegment]);

  useEffect(() => {
    void load();
  }, [load]);

  const shellStyle = useMemo(() => {
    const primary =
      parseStorefrontHex(branding.primaryHex) ?? "#16a34a";
    const isDark = theme === "dark";
    const storefrontVars = buildStorefrontThemeVars(
      branding.primaryHex,
      branding.accentHex,
    );
    return {
      ...storefrontVars,
      ["--tab-bg" as string]: isDark
        ? `color-mix(in oklab, ${primary} 14%, #0a0c0b)`
        : `color-mix(in oklab, ${primary} 7%, #f3f4f2)`,
      ["--tab-fg" as string]: isDark ? "#f7faf8" : "#122017",
      ["--tab-muted" as string]: isDark
        ? `color-mix(in oklab, ${primary} 22%, #c5cdc8)`
        : `color-mix(in oklab, ${primary} 18%, #4b554f)`,
      ["--tab-card" as string]: isDark
        ? `color-mix(in oklab, ${primary} 8%, #121614)`
        : "#ffffff",
      ["--tab-border" as string]: isDark
        ? `color-mix(in oklab, ${primary} 22%, #2a2e2c)`
        : `color-mix(in oklab, ${primary} 14%, #d5d8d4)`,
      ["--tab-focus" as string]: primary,
      backgroundColor: "var(--tab-bg)",
      color: "var(--tab-fg)",
    } as CSSProperties;
  }, [branding.accentHex, branding.primaryHex, theme]);

  const latestPayslip = portal?.payslips[0] ?? null;
  const heroAmount = latestPayslip
    ? Number(latestPayslip.netPaid)
    : Number(portal?.currentSalary ?? 0);
  const heroCaption = latestPayslip
    ? `Last paid · ${payrollMonthLabel(latestPayslip.periodYear, latestPayslip.periodMonth)}`
    : portal?.currentSalary
      ? "Your monthly salary"
      : "Pay details will appear here after your first payslip.";

  const toggleTheme = () => {
    const next: PortalTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className={styles.loading} style={shellStyle}>
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span className="sr-only">Loading your pay details…</span>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className={styles.shell} style={shellStyle}>
        <div className={styles.top}>
          <div className={styles.identity}>
            <div className={styles.mark} aria-hidden>
              <Banknote className="size-4" />
            </div>
            <div>
              <p className={styles.shop}>{branding.shopName}</p>
              <p className={styles.whose}>My pay</p>
            </div>
          </div>
        </div>
        <div className={styles.standing}>
          <p className={styles.caption}>{error ?? "Something went wrong."}</p>
          {backHref ? (
            <Link href={backHref} className={styles.back}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to app
            </Link>
          ) : null}
          <button type="button" className={styles.printBtn} onClick={() => void load()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.shell} style={shellStyle}>
        <div className={styles.top}>
          <div className={styles.identity}>
            <div className={styles.mark}>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" />
              ) : (
                <Banknote className="size-4" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className={styles.shop}>{portal.shopName || branding.shopName}</p>
              <p className={styles.whose}>
                {portal.displayName}
                {portal.title ? ` · ${portal.title}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.theme}
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="size-4" aria-hidden />
            ) : (
              <Sun className="size-4" aria-hidden />
            )}
          </button>
        </div>

        <div className={styles.standing}>
          {backHref ? (
            <Link href={backHref} className={styles.back}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to app
            </Link>
          ) : null}
          <p className={styles.amount}>{formatPayrollMoney(heroAmount)}</p>
          <p className={styles.caption}>{heroCaption}</p>
        </div>

        <div className={styles.panel}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Monthly salary</p>
              <p className={styles.statValue}>
                {Number(portal.currentSalary) > 0
                  ? formatPayrollMoney(Number(portal.currentSalary))
                  : "—"}
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Advance balance</p>
              <p className={styles.statValue}>
                {Number(portal.advancesOutstanding) > 0
                  ? formatPayrollMoney(Number(portal.advancesOutstanding))
                  : "Clear"}
              </p>
            </div>
          </div>

          {portal.sharePath ? (
            <div className={styles.share}>
              <span>Bookmark on this phone</span>
              <span className={styles.shareLink}>{portal.sharePath}</span>
            </div>
          ) : null}

          {portal.advances.length > 0 ? (
            <>
              <div className={styles.sectionHead}>
                <p className={styles.sectionTitle}>Salary advances</p>
                <Wallet className="size-4 text-[var(--tab-muted)]" aria-hidden />
              </div>
              <div className={styles.list}>
                {portal.advances.map((row) => (
                  <AdvanceRow key={row.id} row={row} />
                ))}
              </div>
            </>
          ) : null}

          <div className={styles.sectionHead}>
            <p className={styles.sectionTitle}>Payslip history</p>
          </div>
          {portal.payslips.length === 0 ? (
            <p className={styles.empty}>
              No payslips yet. When payroll is run, your payslips will show up here.
            </p>
          ) : (
            <div className={styles.list}>
              {portal.payslips.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={styles.row}
                  onClick={() => setSelected(row)}
                >
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>
                      {payrollMonthLabel(row.periodYear, row.periodMonth)}
                    </p>
                    <p className={styles.rowSub}>
                      Paid {formatPayrollDateTime(row.paidAt)}
                    </p>
                  </div>
                  <span className={styles.rowAmount}>
                    {formatPayrollMoney(Number(row.netPaid))}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className={styles.empty}>
            Status: {employmentStatusLabel(portal.employmentStatus)}
            {portal.startDate
              ? ` · Started ${formatPayrollDate(portal.startDate)}`
              : ""}
          </p>
        </div>
      </div>

      {selected ? (
        <PayslipSheet
          payslip={selected}
          staffName={portal.displayName}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function AdvanceRow({ row }: { row: StaffPaySelfAdvance }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <p className={styles.rowTitle}>
          {formatPayrollMoney(Number(row.balanceOutstanding ?? row.amount))}{" "}
          <span style={{ fontWeight: 500, color: "var(--tab-muted)" }}>
            of {formatPayrollMoney(Number(row.amount))}
          </span>
        </p>
        <p className={styles.rowSub}>
          {formatPayrollDate(row.advancedOn)} · {advanceStatusLabel(row)}
        </p>
      </div>
    </div>
  );
}

function PayslipSheet({
  payslip,
  staffName,
  onClose,
}: {
  payslip: StaffPaySelfPayslip;
  staffName: string;
  onClose: () => void;
}) {
  const lines: Array<{ label: string; value: string; muted?: boolean }> = [
    { label: "Base salary", value: formatPayrollMoney(Number(payslip.baseSalary)) },
    {
      label: "Advances deducted",
      value: formatPayrollMoney(Number(payslip.advancesDeducted)),
    },
    {
      label: "Other deductions",
      value: formatPayrollMoney(Number(payslip.otherDeductions)),
    },
  ];
  if (Number(payslip.payeDeducted) > 0) {
    lines.push({
      label: "PAYE",
      value: formatPayrollMoney(Number(payslip.payeDeducted)),
    });
  }
  if (Number(payslip.nssfDeducted) > 0) {
    lines.push({
      label: "NSSF",
      value: formatPayrollMoney(Number(payslip.nssfDeducted)),
    });
  }
  if (Number(payslip.shifDeducted) > 0) {
    lines.push({
      label: "SHIF",
      value: formatPayrollMoney(Number(payslip.shifDeducted)),
    });
  }
  if (Number(payslip.housingLevyDeducted) > 0) {
    lines.push({
      label: "Housing levy",
      value: formatPayrollMoney(Number(payslip.housingLevyDeducted)),
    });
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close payslip"
        onClick={onClose}
      />
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <div>
            <p className={styles.sheetTitle}>
              {payrollMonthLabel(payslip.periodYear, payslip.periodMonth)}
            </p>
            <p className={styles.rowSub}>
              Paid {formatPayrollDateTime(payslip.paidAt)}
            </p>
          </div>
          <button type="button" className={styles.theme} onClick={onClose}>
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {lines.map((line) => (
          <div key={line.label} className={styles.line}>
            <span className={styles.lineLabel}>{line.label}</span>
            <span className={styles.lineValue}>{line.value}</span>
          </div>
        ))}
        <div className={`${styles.line} ${styles.lineTotal}`}>
          <span>Net paid</span>
          <span className={styles.lineValue}>
            {formatPayrollMoney(Number(payslip.netPaid))}
          </span>
        </div>
        {payslip.note ? (
          <p className={styles.rowSub} style={{ marginTop: "0.75rem" }}>
            {payslip.note}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.printBtn}
          onClick={() =>
            printPayslipDocument(payslipDocumentHtml(payslip, staffName))
          }
        >
          <Printer className="size-4" aria-hidden />
          Print payslip
        </button>
      </div>
    </div>
  );
}

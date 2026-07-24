"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  Receipt,
  Smartphone,
  Store,
  Wallet,
} from "lucide-react";

import { looksLikeKenyanMobilePath, toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicCustomerTab,
  fetchPublicTabStkStatus,
  initiatePublicTabStk,
  submitPublicTabManualPayment,
  type PublicCustomerTab,
  type PublicTabPurchaseRow,
} from "@/lib/public-customer-tab";
import {
  buildStorefrontThemeVars,
  STOREFRONT_ON_PRIMARY,
} from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

type Props = {
  phoneSegment: string;
  branding: Branding;
};

type PayMode = "stk" | "manual";
type AppScreen = "purchases" | "pay";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoney(toNum(amount), resolveCurrencyCode(currency));
}

function fmtQty(v: unknown): string {
  const n = toNum(v);
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en", { maximumFractionDigits: 3 });
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fmtShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtRelativeVisit(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfVisit = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    );
    const diffDays = Math.round(
      (startOfToday.getTime() - startOfVisit.getTime()) / 86_400_000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return fmtShortDate(iso);
  } catch {
    return iso;
  }
}

type TabStats = {
  purchaseCount: number;
  totalCredit: number;
  monthCount: number;
  monthAmount: number;
  lastPurchaseAt: string | null;
  avgPurchase: number;
};

function computeTabStats(purchases: PublicTabPurchaseRow[]): TabStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let totalCredit = 0;
  let monthCount = 0;
  let monthAmount = 0;
  let lastPurchaseAt: string | null = null;

  for (const purchase of purchases) {
    const amount = toNum(purchase.creditAmount);
    totalCredit += amount;

    const soldAt = new Date(purchase.soldAt);
    if (!Number.isNaN(soldAt.getTime()) && soldAt >= monthStart) {
      monthCount += 1;
      monthAmount += amount;
    }

    if (
      !lastPurchaseAt ||
      soldAt.getTime() > new Date(lastPurchaseAt).getTime()
    ) {
      lastPurchaseAt = purchase.soldAt;
    }
  }

  return {
    purchaseCount: purchases.length,
    totalCredit,
    monthCount,
    monthAmount,
    lastPurchaseAt,
    avgPurchase: purchases.length > 0 ? totalCredit / purchases.length : 0,
  };
}

function tabStatItems(stats: TabStats, currency: string) {
  return [
    {
      label: "Purchases",
      value: String(stats.purchaseCount),
      hint:
        stats.avgPurchase > 0
          ? `Avg ${fmtMoney(stats.avgPurchase, currency)}`
          : undefined,
    },
    {
      label: "Total on tab",
      value: fmtMoney(stats.totalCredit, currency),
      hint: "Lifetime credit",
    },
    {
      label: "This month",
      value: fmtMoney(stats.monthAmount, currency),
      hint:
        stats.monthCount > 0
          ? `${stats.monthCount} purchase${stats.monthCount === 1 ? "" : "s"}`
          : "No purchases yet",
    },
    {
      label: "Last visit",
      value: stats.lastPurchaseAt
        ? fmtRelativeVisit(stats.lastPurchaseAt)
        : "—",
      hint: stats.lastPurchaseAt
        ? fmtShortDate(stats.lastPurchaseAt)
        : undefined,
    },
  ];
}

/** Mobile: horizontal metric strip — no card chrome. */
function TabStatsStrip({
  stats,
  currency,
}: {
  stats: TabStats;
  currency: string;
}) {
  if (stats.purchaseCount === 0) return null;
  const items = tabStatItems(stats, currency);

  return (
    <div className="relative -mx-4 md:hidden">
      <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "min-w-[7.25rem] shrink-0 px-3 py-1",
              i > 0 && "border-l border-border/50",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 truncate font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.15rem] font-semibold leading-none tabular-nums tracking-tight">
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {item.hint}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

/** Desktop: compact 4-up grid. */
function TabStatsBar({
  stats,
  currency,
}: {
  stats: TabStats;
  currency: string;
}) {
  if (stats.purchaseCount === 0) return null;
  const items = tabStatItems(stats, currency);

  return (
    <div className="mt-4 hidden grid-cols-4 gap-3 border-t border-border/70 pt-4 md:grid">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-1 py-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight tabular-nums md:text-base">
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-border/80 bg-muted/25 px-3.5 py-3.5 text-[16px] text-foreground outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 md:rounded-md md:bg-background";

const btnClass = "rounded-xl md:rounded-md";

function PurchaseRow({
  row,
  currency,
}: {
  row: PublicTabPurchaseRow;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const lines = row.lines ?? [];
  const headline =
    lines.length === 0
      ? "Purchase"
      : lines.length === 1
        ? lines[0].itemName?.trim() || "Item"
        : `${lines[0].itemName?.trim() || "Item"} +${lines.length - 1}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-muted/40 md:px-6 md:py-4 md:hover:bg-muted/30"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-medium text-foreground">
              {headline}
            </p>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {fmtDate(row.soldAt)}
            {row.receiptNo != null ? (
              <span> · #{row.receiptNo}</span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
          {fmtMoney(row.creditAmount, currency)}
        </p>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {lines.length > 0 ? (
            <ul className="space-y-2 border-t border-border/40 bg-muted/15 px-4 py-3.5 md:px-6">
              {lines.map((line, i) => (
                <li
                  key={`${row.saleId}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 text-muted-foreground">
                    <span className="text-foreground/90">
                      {line.itemName?.trim() || "Item"}
                    </span>
                    {toNum(line.quantity) !== 1 ? (
                      <span className="ml-1.5 tabular-nums opacity-70">
                        ×{fmtQty(line.quantity)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmtMoney(line.lineTotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function SegmentedControl({
  mode,
  setMode,
  disabled,
}: {
  mode: PayMode;
  setMode: (m: PayMode) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="relative flex rounded-2xl bg-muted/70 p-1 md:rounded-lg md:border md:border-border md:bg-muted/40 md:p-0.5"
      role="tablist"
      aria-label="Payment method"
    >
      {(
        [
          { id: "stk" as const, label: "M-Pesa", icon: Smartphone },
          { id: "manual" as const, label: "Already paid", icon: Receipt },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => setMode(id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition duration-200 disabled:opacity-45 md:rounded-md md:py-2.5 md:font-medium",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function QuickAmounts({
  owed,
  currency,
  amountNum,
  disabled,
  onPick,
}: {
  owed: number;
  currency: string;
  amountNum: number;
  disabled: boolean;
  onPick: (n: number) => void;
}) {
  const presets = [500, 1000, 2000].filter((n) => n < owed);
  const chips = owed > 0 ? [owed, ...presets] : presets;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((n) => {
        const active = Math.abs(amountNum - n) < 0.01;
        const isFull = n === owed;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPick(n)}
            className={cn(
              btnClass,
              "shrink-0 border px-3.5 py-2.5 text-[13px] font-semibold tabular-nums transition duration-150 active:scale-[0.97] disabled:opacity-40",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-background text-foreground",
              isFull && !active && "border-primary/35 text-primary",
            )}
            style={
              active ? { color: STOREFRONT_ON_PRIMARY } : undefined
            }
          >
            {isFull ? "Full balance" : fmtMoney(n, currency)}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        btnClass,
        "flex w-full items-center justify-center gap-2 bg-primary py-4 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition duration-150 active:scale-[0.985] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none md:py-3.5 md:shadow-none",
      )}
      style={{ color: STOREFRONT_ON_PRIMARY }}
    >
      {children}
    </button>
  );
}

function MobileBottomNav({
  screen,
  onNavigate,
  purchaseCount,
  showPay,
}: {
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
  purchaseCount: number;
  showPay: boolean;
}) {
  if (!showPay) return null;

  const tabs: {
    id: AppScreen;
    label: string;
    icon: typeof Wallet;
    badge: string | null;
  }[] = [
    {
      id: "pay",
      label: "Pay",
      icon: Wallet,
      badge: null,
    },
    {
      id: "purchases",
      label: "Purchases",
      badge: purchaseCount > 0 ? String(purchaseCount) : null,
      icon: History,
    },
  ];

  return (
    <nav
      className="shrink-0 border-t border-border/60 bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
      aria-label="Tab navigation"
    >
      <div className="grid grid-cols-2 gap-1">
        {tabs.map(({ id, label, icon: Icon, badge }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition duration-200",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl transition duration-200",
                  active && "bg-primary/10",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide">
                {label}
                {badge ? (
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              {active ? (
                <span
                  className="absolute inset-x-8 -bottom-0.5 h-0.5 rounded-full bg-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ManualPayPanel({
  currency,
  amount,
  setAmount,
  reference,
  setReference,
  owed,
  payDisabled,
  amountValid,
  amountNum,
  busy,
  submitted,
  cleared,
  error,
  onSubmit,
  onClearError,
  fieldIdPrefix,
}: {
  currency: string;
  amount: string;
  setAmount: (v: string) => void;
  reference: string;
  setReference: (v: string) => void;
  owed: number;
  payDisabled: boolean;
  amountValid: boolean;
  amountNum: number;
  busy: boolean;
  submitted: boolean;
  cleared: boolean;
  error: string | null;
  onSubmit: () => void;
  onClearError: () => void;
  fieldIdPrefix: string;
}) {
  const amountId = `${fieldIdPrefix}-amount`;
  const refId = `${fieldIdPrefix}-ref`;

  return (
    <div className="space-y-5 md:space-y-4">
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:hidden">
          Quick amount
        </p>
        <QuickAmounts
          owed={owed}
          currency={currency}
          amountNum={amountNum}
          disabled={payDisabled || submitted}
          onPick={(n) => {
            setAmount(String(Math.round(n * 100) / 100));
            onClearError();
          }}
        />
      </div>

      <div>
        <label
          htmlFor={amountId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          Amount paid
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
            {currency}
          </span>
          <input
            id={amountId}
            type="number"
            inputMode="decimal"
            min={1}
            step="1"
            max={owed}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              onClearError();
            }}
            disabled={payDisabled || submitted}
            className={cn(fieldClass, "pl-12 text-xl font-semibold tabular-nums")}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={refId}
          className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
        >
          M-Pesa code <span className="font-normal">(optional)</span>
        </label>
        <input
          id={refId}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. QGH1ABC234"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            onClearError();
          }}
          disabled={payDisabled || submitted}
          className={cn(fieldClass, "uppercase tracking-wide")}
        />
      </div>

      <PrimaryButton
        disabled={payDisabled || !amountValid || submitted}
        onClick={onSubmit}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : submitted ? (
          <>
            <CheckCircle2 className="size-4" />
            Submitted for review
          </>
        ) : (
          <>
            <Receipt className="size-4 opacity-90" />
            {amountValid
              ? `Submit ${fmtMoney(amountNum, currency)}`
              : "Submit payment"}
          </>
        )}
      </PrimaryButton>

      {submitted ? (
        <p className="text-[13px] leading-snug text-muted-foreground">
          The shop will review your payment and update your balance.
        </p>
      ) : null}

      {cleared ? (
        <p className="text-[13px] font-medium leading-snug text-emerald-700">
          Payment cleared by cashier — balance updated.
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PayPanel({
  currency,
  payPhone,
  setPayPhone,
  amount,
  setAmount,
  owed,
  payDisabled,
  amountValid,
  amountNum,
  busy,
  promptSent,
  paid,
  statusMsg,
  error,
  primary,
  onPay,
  onClearError,
  fieldIdPrefix,
}: {
  currency: string;
  phone: string;
  payPhone: string;
  setPayPhone: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  owed: number;
  payDisabled: boolean;
  amountValid: boolean;
  amountNum: number;
  busy: boolean;
  promptSent: boolean;
  paid: boolean;
  statusMsg: string | null;
  error: string | null;
  primary: string;
  onPay: () => void;
  onClearError: () => void;
  fieldIdPrefix: string;
}) {
  const inputId = `${fieldIdPrefix}-amount`;
  const phoneId = `${fieldIdPrefix}-phone`;
  const phoneOk = looksLikeKenyanMobilePath(payPhone);

  return (
    <div className="space-y-5 md:space-y-4">
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:hidden">
          Quick amount
        </p>
        <QuickAmounts
          owed={owed}
          currency={currency}
          amountNum={amountNum}
          disabled={payDisabled}
          onPick={(n) => {
            setAmount(String(Math.round(n * 100) / 100));
            onClearError();
          }}
        />
      </div>

      <div className="grid gap-4">
        <div>
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
          >
            M-Pesa number
          </label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={payPhone}
              onChange={(e) => {
                setPayPhone(e.target.value);
                onClearError();
              }}
              disabled={payDisabled}
              className={cn(fieldClass, "pl-10 tabular-nums")}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
          >
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
              {currency}
            </span>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              min={1}
              step="1"
              max={owed}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                onClearError();
              }}
              disabled={payDisabled}
              className={cn(
                fieldClass,
                "pl-12 font-[family-name:var(--font-cormorant),Georgia,serif] text-2xl font-semibold tabular-nums md:text-xl",
              )}
            />
          </div>
        </div>
      </div>

      <PrimaryButton
        disabled={payDisabled || !amountValid || !phoneOk}
        onClick={onPay}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending prompt…
          </>
        ) : promptSent ? (
          <>
            <Smartphone className="size-4 animate-pulse" />
            Enter PIN on your phone
          </>
        ) : (
          <>
            <Smartphone className="size-4 opacity-90" />
            {amountValid
              ? `Pay ${fmtMoney(amountNum, currency)}`
              : "Pay with M-Pesa"}
          </>
        )}
      </PrimaryButton>

      {promptSent ? (
        <p className="text-[13px] leading-snug" style={{ color: primary }}>
          {statusMsg}
        </p>
      ) : null}

      {paid ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" />
          {statusMsg}
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CustomerTabPortal({ phoneSegment, branding }: Props) {
  const fieldIdPrefix = useId().replace(/:/g, "");
  const phone = useMemo(
    () => toKenyanLocal07(phoneSegment) ?? phoneSegment.trim(),
    [phoneSegment],
  );

  const [tab, setTab] = useState<PublicCustomerTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [payPhone, setPayPhone] = useState(phone);
  const [payMode, setPayMode] = useState<PayMode>("stk");
  const [appScreen, setAppScreen] = useState<AppScreen>("pay");
  const [reference, setReference] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [manualClaimId, setManualClaimId] = useState<string | null>(null);
  const [manualBalanceAtSubmit, setManualBalanceAtSubmit] = useState<
    number | null
  >(null);
  const [manualCleared, setManualCleared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex;
  const shopName = branding.shopName || "Shop";

  const themeStyle = useMemo(
    () => buildStorefrontThemeVars(primary, accent),
    [primary, accent],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchPublicCustomerTab(phone);
    if (!data) {
      setNotFound(true);
      setTab(null);
    } else {
      setNotFound(false);
      setTab(data);
      const nextOwed = toNum(data.balanceOwed);
      setAmount(nextOwed > 0 ? String(Math.round(nextOwed)) : "");
      const display =
        toKenyanLocal07(data.phoneDisplay) || data.phoneDisplay || phone;
      setPayPhone(display);
    }
    setLoading(false);
  }, [phone]);

  const silentReload = useCallback(async () => {
    const data = await fetchPublicCustomerTab(phone);
    if (!data) {
      setNotFound(true);
      setTab(null);
      return;
    }
    setNotFound(false);
    setTab(data);
    const nextOwed = toNum(data.balanceOwed);
    setAmount(nextOwed > 0 ? String(Math.round(nextOwed)) : "");
    const display =
      toKenyanLocal07(data.phoneDisplay) || data.phoneDisplay || phone;
    setPayPhone(display);
  }, [phone]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!intentId || !promptSent || paid) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await fetchPublicTabStkStatus(phone, intentId);
        if (cancelled) return;
        if (st.status === "fulfilled") {
          setPaid(true);
          setStatusMsg("Payment received — asante!");
          setPromptSent(false);
          setAppScreen("pay");
          void reload();
          return;
        }
        if (st.status === "failed") {
          setStatusMsg("Payment didn’t go through. Try again.");
          setPromptSent(false);
          setIntentId(null);
        }
      } catch {
        /* keep polling */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intentId, promptSent, paid, phone, reload]);

  // If the customer submitted a manual payment report, keep refreshing the
  // balance silently until the cashier clears it (balance decreases).
  useEffect(() => {
    if (!manualSubmitted || manualCleared) return;
    let cancelled = false;
    const tick = async () => {
      try {
        if (cancelled) return;
        await silentReload();
      } catch {
        /* ignore polling errors */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [manualSubmitted, manualCleared, silentReload]);

  useEffect(() => {
    if (!manualSubmitted || manualCleared) return;
    if (manualBalanceAtSubmit == null) return;
    const owedNow = toNum(tab?.balanceOwed);
    if (!Number.isFinite(owedNow)) return;
    if (owedNow < manualBalanceAtSubmit - 0.001) {
      setManualCleared(true);
      setManualSubmitted(false);
      setManualBalanceAtSubmit(null);
      setStatusMsg(null);
    }
  }, [manualSubmitted, manualCleared, manualBalanceAtSubmit, tab?.balanceOwed]);

  const owed = toNum(tab?.balanceOwed);
  const currency = tab?.currency || "KES";
  const displayShop = tab?.shopName || shopName;
  const firstName = tab?.customerName?.trim().split(/\s+/)[0] || null;
  const payDisabled = busy || promptSent || owed <= 0;
  const manualPayDisabled = busy || manualSubmitted || owed <= 0;
  const amountNum = Number.parseFloat(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= owed + 0.001;
  const showPay = owed > 0 && !loading && !notFound && mounted;
  const purchaseCount = tab?.purchases?.length ?? 0;
  const tabStats = useMemo(
    () => computeTabStats(tab?.purchases ?? []),
    [tab?.purchases],
  );

  async function onPay() {
    setError(null);
    setStatusMsg(null);
    if (!looksLikeKenyanMobilePath(payPhone)) {
      setError("Enter a valid M-Pesa number e.g. 0712345678.");
      return;
    }
    if (!amountValid) {
      setError(
        !Number.isFinite(amountNum) || amountNum <= 0
          ? "Enter how much you want to pay."
          : `Max is ${fmtMoney(owed, currency)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const normalizedPay = toKenyanLocal07(payPhone) || payPhone.trim();
      const res = await initiatePublicTabStk(
        phone,
        amountNum,
        newIdempotencyKey(),
        normalizedPay,
      );
      setIntentId(res.intentId);
      setPromptSent(true);
      setPaid(false);
      setStatusMsg(`Check ${normalizedPay} and enter your M-Pesa PIN.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send M-Pesa prompt.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitManual() {
    setError(null);
    if (!amountValid) {
      setError(
        !Number.isFinite(amountNum) || amountNum <= 0
          ? "Enter how much you paid."
          : `Max is ${fmtMoney(owed, currency)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      setManualCleared(false);
      setManualClaimId(null);
      setManualBalanceAtSubmit(owed);

      const res = await submitPublicTabManualPayment(
        phone,
        amountNum,
        reference.trim() || undefined,
      );
      setManualClaimId(res.claimId);
      setManualSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit payment report.",
      );
    } finally {
      setBusy(false);
    }
  }

  const payProps = {
    currency,
    phone,
    payPhone,
    setPayPhone,
    amount,
    setAmount,
    owed,
    payDisabled,
    amountValid,
    amountNum,
    busy,
    promptSent,
    paid,
    statusMsg,
    error,
    primary,
    onPay: () => void onPay(),
    onClearError: () => setError(null),
    fieldIdPrefix: `${fieldIdPrefix}-stk`,
  };

  const manualPayProps = {
    currency,
    amount,
    setAmount,
    reference,
    setReference,
    owed,
    payDisabled: manualPayDisabled,
    amountValid,
    amountNum,
    busy,
    submitted: manualSubmitted,
    cleared: manualCleared,
    error,
    onSubmit: () => void onSubmitManual(),
    onClearError: () => {
      setError(null);
      setManualCleared(false);
    },
    fieldIdPrefix: `${fieldIdPrefix}-manual`,
  };

  return (
    <div className="min-h-[100dvh] bg-background md:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_55%)] md:px-4 md:py-8 lg:px-6 lg:py-10">
      <div
        className="mx-auto flex h-[100dvh] max-w-lg flex-col overflow-hidden bg-background text-foreground antialiased touch-manipulation md:h-auto md:min-h-[min(720px,calc(100dvh-4rem))] md:max-h-[min(820px,calc(100dvh-4rem))] md:max-w-3xl md:rounded-2xl md:border md:border-border md:shadow-[0_24px_64px_-24px_color-mix(in_oklab,var(--primary)_22%,transparent)] lg:max-w-5xl"
        style={themeStyle}
      >
        {/* ——— Mobile wallet hero ——— */}
        <header
          className="relative shrink-0 overflow-hidden px-5 pb-8 pt-[max(0.85rem,env(safe-area-inset-top))] text-white md:hidden"
          style={{
            background: `linear-gradient(165deg, ${primary} 0%, color-mix(in oklab, ${primary} 78%, #0a1628) 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, white 55%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-8 size-44 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, white 40%, transparent), transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[6.5rem] shrink-0 rounded-lg bg-white/95 object-contain object-left p-1 shadow-sm"
              />
            ) : (
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold backdrop-blur-sm"
                aria-hidden
              >
                {displayShop.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.15rem] font-semibold leading-tight tracking-tight">
                {displayShop}
              </h1>
              <p className="truncate text-[12px] text-white/70">
                {firstName && !loading && !notFound
                  ? `Hi ${firstName}`
                  : "Your tab"}
                {!loading && !notFound ? ` · ${phone}` : null}
              </p>
            </div>
          </div>

          {!loading && !notFound ? (
            <div className="relative mt-7 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">
                {owed > 0 ? "Outstanding" : "Balance"}
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-cormorant),Georgia,serif] text-[2.65rem] font-semibold leading-none tracking-tight tabular-nums">
                {fmtMoney(owed, currency)}
              </p>
              {owed > 0 && tabStats.lastPurchaseAt ? (
                <p className="mt-2.5 text-[12px] text-white/65">
                  Last visit {fmtRelativeVisit(tabStats.lastPurchaseAt).toLowerCase()}
                  {tabStats.monthCount > 0
                    ? ` · ${tabStats.monthCount} this month`
                    : null}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* ——— Desktop brand header ——— */}
        <header className="hidden shrink-0 border-b border-border bg-background px-6 pb-4 pt-5 md:block">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="h-12 w-auto max-w-[9rem] shrink-0 object-contain object-left"
              />
            ) : (
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-md text-base font-semibold text-white"
                style={{ backgroundColor: primary }}
                aria-hidden
              >
                {displayShop.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1
                className="truncate font-[family-name:var(--font-cormorant),Georgia,serif] text-[1.45rem] font-semibold leading-tight tracking-tight"
                style={{ color: primary }}
              >
                {displayShop}
              </h1>
              <p className="truncate text-[13px] text-muted-foreground">
                {firstName && !loading && !notFound ? `${firstName} · ` : null}
                {phone}
              </p>
            </div>
          </div>

          {!loading && !notFound ? (
            <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/70 pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {owed > 0 ? "Outstanding" : "Balance"}
                </p>
                <p
                  className="mt-0.5 font-[family-name:var(--font-cormorant),Georgia,serif] text-[2.35rem] font-semibold leading-none tracking-tight tabular-nums"
                  style={{ color: primary }}
                >
                  {fmtMoney(owed, currency)}
                </p>
              </div>
            </div>
          ) : null}

          {!loading && !notFound ? (
            <TabStatsBar stats={tabStats} currency={currency} />
          ) : null}
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your account…</p>
          </div>
        ) : notFound ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <Store className="size-9 text-muted-foreground" />
            <div>
              <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-2xl font-semibold">
                Account not found
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Ask the shop to check the phone number on file.
              </p>
            </div>
            <Link
              href="/shop"
              className={cn(
                btnClass,
                "bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
              )}
              style={{ color: STOREFRONT_ON_PRIMARY }}
            >
              Browse shop
            </Link>
          </div>
        ) : (
          <>
            {/* Pull-up sheet on mobile */}
            <main
              className={cn(
                "relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain",
                "md:-mt-0 md:rounded-none",
                "-mt-5 rounded-t-[1.65rem] bg-background shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.28)] md:shadow-none",
                "lg:overflow-hidden",
              )}
            >
              {/* Mobile stats strip inside sheet */}
              <div className="border-b border-border/40 px-4 pb-3 pt-4 md:hidden">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border/80" aria-hidden />
                <TabStatsStrip stats={tabStats} currency={currency} />
              </div>

              <div
                className={cn(
                  "lg:grid lg:h-full",
                  showPay && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
                )}
              >
                <div
                  className={cn(
                    "px-4 py-4 md:px-6 md:py-5",
                    showPay && appScreen !== "purchases" && "hidden lg:block",
                    showPay && "lg:overflow-y-auto lg:bg-muted/10",
                    appScreen === "purchases" &&
                      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-250",
                  )}
                >
                  {owed <= 0 ? (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[14px] font-medium text-emerald-800">
                      <CheckCircle2 className="size-4 shrink-0" />
                      All settled — nothing owed.
                    </div>
                  ) : null}

                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-lg font-semibold tracking-tight md:text-xl">
                      Purchases
                    </h2>
                    {purchaseCount > 0 ? (
                      <p className="text-[12px] text-muted-foreground tabular-nums">
                        {purchaseCount} total
                      </p>
                    ) : null}
                  </div>

                  {purchaseCount === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
                      No credit purchases yet
                    </p>
                  ) : (
                    <ul className="-mx-4 divide-y divide-border/40 md:-mx-6">
                      {tab!.purchases.map((row) => (
                        <PurchaseRow
                          key={row.saleId}
                          row={row}
                          currency={currency}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                {showPay ? (
                  <div
                    className={cn(
                      "px-4 py-4 pb-8 md:px-6 md:py-5",
                      appScreen !== "pay" && "hidden lg:block",
                      appScreen === "pay" && "block",
                      "lg:overflow-y-auto lg:border-l lg:border-border/40",
                      appScreen === "pay" &&
                        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-250",
                    )}
                  >
                    <div className="mb-4 hidden lg:block">
                      <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-xl font-semibold tracking-tight">
                        Pay balance
                      </h2>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Pay with M-Pesa or report a payment you already made.
                      </p>
                    </div>

                    <div className="mb-1 md:hidden">
                      <h2 className="font-[family-name:var(--font-cormorant),Georgia,serif] text-lg font-semibold tracking-tight">
                        Settle your tab
                      </h2>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        M-Pesa prompt or report a payment already made.
                      </p>
                    </div>

                    <div className="mt-4">
                      <SegmentedControl
                        mode={payMode}
                        setMode={(m) => {
                          setPayMode(m);
                          setError(null);
                          setManualCleared(false);
                        }}
                        disabled={busy || promptSent || manualSubmitted}
                      />
                    </div>

                    <div className="mt-5">
                      {payMode === "stk" ? (
                        <PayPanel {...payProps} />
                      ) : (
                        <ManualPayPanel {...manualPayProps} />
                      )}
                    </div>
                  </div>
                ) : null}

              </div>
            </main>

            <MobileBottomNav
              screen={appScreen}
              onNavigate={setAppScreen}
              purchaseCount={purchaseCount}
              showPay={showPay}
            />
          </>
        )}
      </div>
    </div>
  );
}

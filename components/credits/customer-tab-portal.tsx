"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Loader2,
  Moon,
  Smartphone,
  Store,
  Sun,
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
import { buildStorefrontThemeVars } from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";

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
type PortalTheme = "light" | "dark";

const THEME_STORAGE_KEY = "palmart-customer-tab-theme";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
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

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

function shopPayLabel(shopName: string): string {
  const first = shopName.trim().split(/\s+/)[0];
  return first || "shop";
}

function readPortalTheme(): PortalTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

function persistPortalTheme(theme: PortalTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
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
    const amount = toNum(purchase.grandTotal) || toNum(purchase.creditAmount);
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

function portalSurfaceStyle(
  theme: PortalTheme,
  primary: string,
  storefrontVars: CSSProperties | undefined,
): CSSProperties {
  const isDark = theme === "dark";
  return {
    ...storefrontVars,
    ["--tab-bg" as string]: isDark ? "#121212" : "#f3f4f6",
    ["--tab-fg" as string]: isDark ? "#f5f5f5" : "#111827",
    ["--tab-muted" as string]: isDark ? "#a3a3a3" : "#6b7280",
    ["--tab-card" as string]: isDark ? "#1c1c1e" : "#ffffff",
    ["--tab-border" as string]: isDark ? "#2e2e32" : "#e5e7eb",
    ["--tab-input" as string]: isDark ? "#161618" : "#ffffff",
    ["--tab-chip" as string]: isDark ? "transparent" : "#ffffff",
    ["--tab-cta-bg" as string]: isDark ? "#ffffff" : primary,
    ["--tab-cta-fg" as string]: isDark ? "#111111" : "#ffffff",
    ["--tab-secondary-bg" as string]: isDark ? "transparent" : "#ffffff",
    ["--primary" as string]: primary,
    backgroundColor: "var(--tab-bg)",
    color: "var(--tab-fg)",
  };
}

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
  const walletCredited = toNum(row.walletCredited);
  const tabCharged = toNum(row.creditAmount);
  const displayAmount = toNum(row.grandTotal) || tabCharged;

  return (
    <li className="overflow-hidden rounded-xl bg-[var(--tab-bg)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left active:opacity-90"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold">{headline}</p>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-[var(--tab-muted)] transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--tab-muted)]">
            {fmtDate(row.soldAt)}
            {row.receiptNo != null ? <span> · #{row.receiptNo}</span> : null}
            {walletCredited > 0 ? (
              <span>
                {" "}
                · +{fmtMoney(walletCredited, currency)} wallet
              </span>
            ) : null}
            {tabCharged > 0 && walletCredited <= 0 ? (
              <span> · on tab</span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-[14px] font-semibold tabular-nums">
          {fmtMoney(displayAmount, currency)}
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
            <ul className="space-y-2 border-t border-[var(--tab-border)] px-3.5 py-3">
              {lines.map((line, i) => (
                <li
                  key={`${row.saleId}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 text-[var(--tab-muted)]">
                    <span className="text-[var(--tab-fg)]">
                      {line.itemName?.trim() || "Item"}
                    </span>
                    {toNum(line.quantity) !== 1 ? (
                      <span className="ml-1.5 tabular-nums opacity-70">
                        ×{fmtQty(line.quantity)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--tab-muted)]">
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

function QuickAmountChips({
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
  const chips = [500, 1000, 2000].filter((n) => n < owed);

  if (chips.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {chips.map((n) => {
        const active = Math.abs(amountNum - n) < 0.01;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPick(n)}
            className={cn(
              "rounded-xl border px-2 py-3 text-[13px] font-semibold tabular-nums transition active:scale-[0.98] disabled:opacity-40",
              active
                ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                : "border-[var(--tab-border)] bg-[var(--tab-chip)] text-[var(--tab-fg)]",
            )}
          >
            {fmtMoney(n, currency)}
          </button>
        );
      })}
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
  const [editingPhone, setEditingPhone] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("stk");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [manualSubmitted, setManualSubmitted] = useState(false);
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
  const [portalTheme, setPortalTheme] = useState<PortalTheme>("light");
  const walletSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPortalTheme(readPortalTheme());
  }, []);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex;
  const shopName = branding.shopName || "Shop";

  const storefrontVars = useMemo(
    () => buildStorefrontThemeVars(primary, accent),
    [primary, accent],
  );

  const surfaceStyle = useMemo(
    () => portalSurfaceStyle(portalTheme, primary, storefrontVars),
    [portalTheme, primary, storefrontVars],
  );

  const toggleTheme = useCallback(() => {
    setPortalTheme((current) => {
      const next: PortalTheme = current === "dark" ? "light" : "dark";
      persistPortalTheme(next);
      return next;
    });
  }, []);

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
  const wallet = toNum(tab?.walletBalance);
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
  const phoneOk = looksLikeKenyanMobilePath(payPhone);
  const amountId = `${fieldIdPrefix}-amount`;
  const phoneId = `${fieldIdPrefix}-phone`;
  const refId = `${fieldIdPrefix}-ref`;
  const payToName = shopPayLabel(displayShop);

  async function onPay() {
    setError(null);
    setStatusMsg(null);
    if (!looksLikeKenyanMobilePath(payPhone)) {
      setError("Enter a valid M-Pesa number e.g. 0712345678.");
      setEditingPhone(true);
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
      setEditingPhone(false);
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
      setManualBalanceAtSubmit(owed);

      await submitPublicTabManualPayment(
        phone,
        amountNum,
        reference.trim() || undefined,
      );
      setManualSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit payment report.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pickAmount(n: number) {
    setAmount(String(Math.round(n * 100) / 100));
    setError(null);
  }

  return (
    <div
      className="min-h-[100dvh] antialiased touch-manipulation"
      style={surfaceStyle}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.85rem,env(safe-area-inset-top))] md:max-w-xl md:px-6 md:py-8">
        {/* Header */}
        <header className="flex items-center gap-3">
          {branding.logoUrl ? (
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--tab-card)] ring-1 ring-[var(--tab-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt=""
                className="size-full object-contain p-1.5"
              />
            </div>
          ) : (
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
              aria-hidden
            >
              {displayShop.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight md:text-base">
              {displayShop}
            </h1>
            <p className="truncate text-[13px] text-[var(--tab-muted)]">
              {firstName && !loading && !notFound
                ? `${firstName}'s account`
                : "Your account"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!loading && !notFound ? (
              <button
                type="button"
                onClick={() => {
                  walletSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  if (purchaseCount > 0) {
                    setHistoryOpen(true);
                  }
                }}
                className="inline-flex h-10 max-w-[9.5rem] items-center gap-1.5 rounded-full border border-[var(--tab-border)] bg-[var(--tab-card)] px-3 text-[12px] font-semibold text-[var(--tab-fg)] transition active:scale-95"
                aria-label={`Wallet ${fmtMoney(wallet, currency)}`}
              >
                <Wallet className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate tabular-nums">
                  {fmtMoney(wallet, currency)}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--tab-border)] bg-[var(--tab-card)] text-[var(--tab-fg)] transition active:scale-95"
              aria-label={
                portalTheme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {portalTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
            <Loader2
              className="size-7 animate-spin"
              style={{ color: primary }}
            />
            <p className="text-sm text-[var(--tab-muted)]">
              Loading your account…
            </p>
          </div>
        ) : notFound ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-24 text-center">
            <Store className="size-9 text-[var(--tab-muted)]" />
            <div>
              <h2 className="text-xl font-bold">Account not found</h2>
              <p className="mt-2 text-[15px] text-[var(--tab-muted)]">
                Ask the shop to check the phone number on file.
              </p>
            </div>
            <Link
              href="/shop"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                backgroundColor: "var(--tab-cta-bg)",
                color: "var(--tab-cta-fg)",
              }}
            >
              Browse shop
            </Link>
          </div>
        ) : (
          <main className="mt-5 flex flex-1 flex-col gap-3.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400">
            {/* Balance card */}
            <section
              ref={walletSectionRef}
              id="wallet"
              className="scroll-mt-4 rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-4"
            >
              <p className="text-[13px] text-[var(--tab-muted)]">Balance due</p>
              <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums md:text-[2.25rem]">
                {fmtMoney(owed, currency)}
              </p>
              {wallet > 0 ? (
                <p className="mt-2.5 text-[13px] font-medium text-[var(--tab-fg)]">
                  Wallet credit{" "}
                  <span className="tabular-nums">{fmtMoney(wallet, currency)}</span>
                </p>
              ) : null}
              {tabStats.purchaseCount > 0 ? (
                <p className="mt-2.5 text-[13px] text-[var(--tab-muted)]">
                  {tabStats.purchaseCount} purchase
                  {tabStats.purchaseCount === 1 ? "" : "s"}
                  {" · "}
                  {fmtMoney(tabStats.totalCredit, currency)} total spent to date
                </p>
              ) : (
                <p className="mt-2.5 text-[13px] text-[var(--tab-muted)]">
                  {wallet > 0
                    ? "Recent visits will show here after your next purchase."
                    : "No purchases yet"}
                </p>
              )}
            </section>

            {/* Stats row */}
            {tabStats.purchaseCount > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-3.5">
                  <p className="text-[13px] text-[var(--tab-muted)]">
                    This month
                  </p>
                  <p className="mt-1 text-[1.05rem] font-bold tabular-nums leading-tight">
                    {fmtMoney(tabStats.monthAmount, currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-3.5">
                  <p className="text-[13px] text-[var(--tab-muted)]">
                    Last visit
                  </p>
                  <p className="mt-1 text-[1.05rem] font-bold leading-tight">
                    {tabStats.lastPurchaseAt
                      ? fmtRelativeVisit(tabStats.lastPurchaseAt)
                      : "—"}
                  </p>
                </div>
              </div>
            ) : null}

            {owed <= 0 ? (
              <div
                className="flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-[14px] font-medium"
                style={{
                  borderColor: "color-mix(in oklab, #10b981 35%, transparent)",
                  backgroundColor:
                    "color-mix(in oklab, #10b981 12%, transparent)",
                  color: portalTheme === "dark" ? "#6ee7b7" : "#047857",
                }}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                {wallet > 0
                  ? `Nothing owed — wallet ${fmtMoney(wallet, currency)} ready for your next visit.`
                  : "All settled — nothing owed."}
              </div>
            ) : null}

            {/* Pay section */}
            {showPay ? (
              <section className="mt-2 space-y-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
                <h2 className="text-lg font-bold tracking-tight">
                  Pay to {payToName}
                </h2>

                {/* Phone row */}
                <div className="rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-card)] px-3.5 py-3">
                  {editingPhone ? (
                    <div className="space-y-2">
                      <label
                        htmlFor={phoneId}
                        className="block text-[12px] text-[var(--tab-muted)]"
                      >
                        M-Pesa number
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={phoneId}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          autoFocus
                          placeholder="0712 345 678"
                          value={payPhone}
                          onChange={(e) => {
                            setPayPhone(e.target.value);
                            setError(null);
                          }}
                          disabled={payDisabled}
                          className="min-w-0 flex-1 rounded-xl border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-2.5 text-[16px] tabular-nums outline-none focus:border-[var(--tab-fg)]"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingPhone(false)}
                          className="shrink-0 rounded-xl border border-[var(--tab-border)] px-3.5 py-2 text-[13px] font-semibold"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Smartphone
                        className="size-5 shrink-0 text-[var(--tab-muted)]"
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] leading-snug text-[var(--tab-muted)]">
                          Sending from your M-Pesa number
                        </p>
                        <p className="truncate text-[15px] font-semibold tabular-nums">
                          {formatPhoneDisplay(payPhone)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={payDisabled}
                        onClick={() => setEditingPhone(true)}
                        className="shrink-0 rounded-lg border border-[var(--tab-border)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <QuickAmountChips
                  owed={owed}
                  currency={currency}
                  amountNum={amountNum}
                  disabled={
                    payMode === "stk" ? payDisabled : manualPayDisabled
                  }
                  onPick={pickAmount}
                />

                <div>
                  <label
                    htmlFor={amountId}
                    className="mb-1.5 block text-[13px] text-[var(--tab-muted)]"
                  >
                    {payMode === "manual" ? "Amount paid" : "Amount to pay"}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-[var(--tab-muted)]">
                      {resolveCurrencyCode(currency) === "KES"
                        ? "Ksh"
                        : resolveCurrencyCode(currency)}
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
                        setError(null);
                      }}
                      disabled={
                        payMode === "stk" ? payDisabled : manualPayDisabled
                      }
                      className="w-full rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-input)] py-3.5 pl-12 pr-3.5 text-[18px] font-semibold tabular-nums outline-none focus:border-[var(--tab-fg)] disabled:opacity-50"
                    />
                  </div>
                </div>

                {payMode === "manual" ? (
                  <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
                    <label
                      htmlFor={refId}
                      className="mb-1.5 block text-[13px] text-[var(--tab-muted)]"
                    >
                      M-Pesa code{" "}
                      <span className="font-normal">(optional)</span>
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
                        setError(null);
                      }}
                      disabled={manualPayDisabled}
                      className="w-full rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-input)] px-3.5 py-3.5 text-[16px] uppercase tracking-wide outline-none focus:border-[var(--tab-fg)] disabled:opacity-50"
                    />
                  </div>
                ) : null}

                {payMode === "stk" ? (
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={payDisabled || !amountValid || !phoneOk}
                      onClick={() => void onPay()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
                      style={{
                        backgroundColor: "var(--tab-cta-bg)",
                        color: "var(--tab-cta-fg)",
                      }}
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
                            ? `Pay ${fmtMoney(amountNum, currency)} with M-Pesa`
                            : "Pay with M-Pesa"}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={busy || promptSent || manualSubmitted}
                      onClick={() => {
                        setPayMode("manual");
                        setError(null);
                        setManualCleared(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-secondary-bg)] py-3.5 text-[14px] font-semibold transition active:scale-[0.985] disabled:opacity-45"
                    >
                      <FileCheck2 className="size-4 opacity-80" />
                      Mark as already paid
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                    <button
                      type="button"
                      disabled={
                        manualPayDisabled || !amountValid || manualSubmitted
                      }
                      onClick={() => void onSubmitManual()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
                      style={{
                        backgroundColor: "var(--tab-cta-bg)",
                        color: "var(--tab-cta-fg)",
                      }}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Submitting…
                        </>
                      ) : manualSubmitted ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Submitted for review
                        </>
                      ) : (
                        <>
                          <FileCheck2 className="size-4 opacity-90" />
                          {amountValid
                            ? `Submit ${fmtMoney(amountNum, currency)}`
                            : "Submit payment"}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={busy || manualSubmitted}
                      onClick={() => {
                        setPayMode("stk");
                        setError(null);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-secondary-bg)] py-3.5 text-[14px] font-semibold transition active:scale-[0.985] disabled:opacity-45"
                    >
                      <Smartphone className="size-4 opacity-80" />
                      Pay with M-Pesa instead
                    </button>
                  </div>
                )}

                {promptSent && payMode === "stk" ? (
                  <p
                    className="text-[13px] leading-snug"
                    style={{ color: primary }}
                  >
                    {statusMsg}
                  </p>
                ) : null}

                {paid ? (
                  <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-600">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {statusMsg}
                  </p>
                ) : null}

                {manualSubmitted ? (
                  <p className="text-[13px] leading-snug text-[var(--tab-muted)]">
                    The shop will review your payment and update your balance.
                  </p>
                ) : null}

                {manualCleared ? (
                  <p className="text-[13px] font-medium text-emerald-600">
                    Payment cleared by cashier — balance updated.
                  </p>
                ) : null}

                {error ? (
                  <p
                    className="text-[13px] font-medium text-red-500"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </section>
            ) : null}

            {/* Purchase history — expandable at bottom */}
            {purchaseCount > 0 ? (
              <section className="mt-2 overflow-hidden rounded-2xl border border-[var(--tab-border)] bg-[var(--tab-card)]">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:opacity-90"
                  aria-expanded={historyOpen}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold tracking-tight">
                      Purchase history
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--tab-muted)]">
                      {purchaseCount} purchase
                      {purchaseCount === 1 ? "" : "s"}
                      {tabStats.lastPurchaseAt
                        ? ` · last ${fmtRelativeVisit(tabStats.lastPurchaseAt).toLowerCase()}`
                        : null}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-[var(--tab-muted)] transition-transform duration-200",
                      historyOpen && "rotate-180",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-250 ease-out",
                    historyOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <ul className="space-y-2 border-t border-[var(--tab-border)] px-3 py-3">
                      {tab!.purchases.map((row) => (
                        <PurchaseRow
                          key={row.saleId}
                          row={row}
                          currency={currency}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        )}
      </div>
    </div>
  );
}

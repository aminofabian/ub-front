"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Package, RefreshCw } from "lucide-react";

import { formatBillingMoney } from "@/components/billing/billing-ui";
import { useOptionalDashboard } from "@/components/dashboard-provider";
import { FormDrawer } from "@/components/form-drawer";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import { useSubscriptionBillingStatus } from "@/hooks/use-subscription-billing-status";
import {
  fetchSubscriptionBillingStatus,
  fetchSubscriptionPlans,
  fetchSubscriptionRenewalQuote,
  type SubscriptionBillingStatusRecord,
  type SubscriptionPlanRecord,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { clearLoginBillingGate, getLoginBillingGate } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
import { SUBSCRIPTION_BLOCKED_EVENT } from "@/lib/subscription-events";
import { formatPlanCount, formatPlanMoney, isPlanDowngrade, planFitsUsage } from "@/lib/subscription-plan-fit";
import { cn } from "@/lib/utils";

type BillingPeriod = 1 | 12;

function formatPeriodEnd(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function planPrice(
  plan: SubscriptionPlanRecord,
  months: BillingPeriod,
): { amount: string; suffix: string | null } {
  if (plan.tierCode === "free") return { amount: "Free", suffix: null };
  if (plan.tierCode === "enterprise" && plan.monthlyPriceKes <= 0) {
    return { amount: "Custom", suffix: null };
  }
  const amount =
    months === 12
      ? (plan.annualPriceKes ?? plan.monthlyPriceKes * 10)
      : plan.monthlyPriceKes;
  return {
    amount: formatBillingMoney(amount),
    suffix: months === 12 ? "/yr" : "/mo",
  };
}

function planLimits(plan: SubscriptionPlanRecord): string {
  const products =
    plan.productLimit == null
      ? "Unlimited products"
      : `${formatPlanCount(plan.productLimit)} products`;
  const people =
    plan.cashierLimit == null
      ? "Unlimited people"
      : `${formatPlanCount(plan.cashierLimit)} ${
          plan.cashierLimit === 1 ? "person" : "people"
        }`;
  const revenue =
    plan.dailyRevenueLimitKes == null
      ? "unlimited daily sales"
      : `${formatPlanMoney(plan.dailyRevenueLimitKes)}/day`;
  return `${products} · ${people} · ${revenue}`;
}

function UsageLine({
  label,
  used,
  limit,
  money = false,
}: {
  label: string;
  used: number;
  limit: number | null;
  money?: boolean;
}) {
  const unlimited = limit == null;
  const over = !unlimited && used > limit;
  const pct = unlimited
    ? 0
    : Math.min(100, (used / Math.max(1, limit)) * 100);
  const usedLabel = money
    ? formatBillingMoney(Math.round(used))
    : used.toLocaleString("en-KE");
  const capLabel = unlimited
    ? "unlimited"
    : money
      ? formatBillingMoney(limit)
      : limit.toLocaleString("en-KE");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--op-ink)]">{label}</span>
        <span className="text-[var(--op-muted)]">
          <b
            className={cn(
              "font-semibold tabular-nums",
              over ? "text-[var(--op-highlight)]" : "text-[var(--op-ink)]",
            )}
          >
            {usedLabel}
          </b>
          {" / "}
          {capLabel}
        </span>
      </div>
      <div className="h-0.5 bg-[var(--op-rule)]">
        <div
          className={cn(
            "h-full",
            over ? "bg-[var(--op-highlight)]" : "bg-[var(--op-accent)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PackageCard({
  plan,
  periodMonths,
  selected,
  current,
  recommended,
  upgrade,
  downgrade,
  fits,
  onSelect,
}: {
  plan: SubscriptionPlanRecord;
  periodMonths: BillingPeriod;
  selected: boolean;
  current: boolean;
  recommended: boolean;
  upgrade: boolean;
  downgrade: boolean;
  fits: boolean;
  onSelect: () => void;
}) {
  const price = planPrice(plan, periodMonths);
  const disabled = downgrade || (!fits && plan.tierCode !== "enterprise");
  const tag = current
    ? "Current"
    : downgrade
      ? "Lower"
      : !fits && plan.tierCode !== "enterprise"
        ? "Too small"
        : recommended
          ? "Fits"
          : upgrade
            ? "Upgrade"
            : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full min-h-11 items-center gap-3.5 border px-3.5 py-3 text-left text-[var(--op-ink)]",
        "rounded-[2px] transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]/35",
        selected
          ? "border-[var(--op-accent)] bg-[var(--op-accent-soft)] shadow-[inset_2px_0_0_var(--op-accent)]"
          : "border-[var(--op-rule)] bg-[var(--op-surface)] hover:border-[color-mix(in_srgb,var(--op-ink)_22%,transparent)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          selected
            ? "border-[var(--op-accent)] bg-[var(--op-accent)]"
            : "border-[var(--op-faint)] bg-[var(--op-surface)]",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "size-2 rounded-full bg-white",
            selected ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{plan.displayName}</span>
          {tag ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                current
                  ? "bg-[var(--op-accent-soft)] text-[var(--op-accent)]"
                  : "bg-[var(--op-bg)] text-[var(--op-muted)]",
              )}
            >
              {tag}
            </span>
          ) : null}
        </span>
        <span className="text-[12.5px] leading-snug text-[var(--op-muted)]">
          {planLimits(plan)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold tabular-nums">
          {price.amount}
        </span>
        {price.suffix ? (
          <span className="block text-xs text-[var(--op-muted)]">
            {price.suffix === "/yr" ? "/year" : "/month"}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ChoosePackageDrawer({
  open,
  onOpenChange,
  locked = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unpaid shop: the back office stays behind this panel until payment lands. */
  locked?: boolean;
}) {
  const dashboard = useOptionalDashboard();
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    null,
  );
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [periodMonths, setPeriodMonths] = useState<BillingPeriod>(1);
  const [quote, setQuote] = useState<SubscriptionRenewalQuoteRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const canPay = hasPermission(
    dashboard?.me?.permissions,
    Permission.BusinessManageSubscription,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [billing, catalogue] = await Promise.all([
          fetchSubscriptionBillingStatus(),
          fetchSubscriptionPlans(),
        ]);
        if (cancelled) return;

        const active = catalogue
          .filter((plan) => plan.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setStatus(billing);
        setPlans(active);
        setPeriodMonths(1);

        const current = billing.tier.trim().toLowerCase();
        const recommended = billing.planFit?.recommendedTier
          ?.trim()
          .toLowerCase();
        const recommendedIsPublished =
          Boolean(recommended) &&
          active.some((plan) => plan.tierCode === recommended);
        const preferRecommended =
          Boolean(billing.planFit?.needsUpgrade) && recommendedIsPublished;

        const initial = preferRecommended
          ? recommended
          : active.some((plan) => plan.tierCode === current)
            ? current
            : recommendedIsPublished
              ? recommended
              : active[0]?.tierCode ?? "";
        setSelectedTier(initial ?? "");
      } catch (cause) {
        if (!cancelled) {
          setStatus(null);
          setPlans([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load packages. Try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.tierCode === selectedTier) ?? null,
    [plans, selectedTier],
  );

  const fit = status?.planFit ?? null;
  const productCount = fit?.productCount ?? 0;
  const userCount = fit?.userCount ?? 0;
  const dailyRevenue = fit?.dailyRevenueKes ?? 0;
  const currentTier = status?.tier?.trim().toLowerCase() ?? "";
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.tierCode === currentTier) ?? null,
    [plans, currentTier],
  );
  const currentSortOrder = currentPlan?.sortOrder ?? null;
  const selectedFits = selectedPlan
    ? planFitsUsage(
        selectedPlan.productLimit,
        selectedPlan.cashierLimit,
        productCount,
        userCount,
        selectedPlan.dailyRevenueLimitKes,
        dailyRevenue,
      )
    : false;
  const selectedDowngrade = selectedPlan
    ? isPlanDowngrade(selectedPlan.sortOrder, currentSortOrder)
    : false;
  const selectedCustomEnterprise =
    selectedPlan?.tierCode === "enterprise" &&
    selectedPlan.monthlyPriceKes <= 0;
  const talkToUs =
    Boolean(fit?.negotiable) ||
    selectedPlan?.tierCode === "free" ||
    selectedCustomEnterprise;

  useEffect(() => {
    if (
      !open ||
      !selectedPlan ||
      selectedDowngrade ||
      selectedPlan.tierCode === "free" ||
      selectedCustomEnterprise ||
      !status?.billingEnabled
    ) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    void fetchSubscriptionRenewalQuote(periodMonths, selectedPlan.tierCode)
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedPlan,
    selectedDowngrade,
    selectedCustomEnterprise,
    periodMonths,
    status?.billingEnabled,
  ]);

  const recommendedTier = fit?.recommendedTier?.trim().toLowerCase() ?? "";
  const atTopPackage =
    currentSortOrder != null &&
    plans.length > 0 &&
    plans.every((plan) => plan.sortOrder <= currentSortOrder);
  const paidThrough = formatPeriodEnd(status?.currentPeriodEnd);
  const expired =
    locked || status?.status === "SUSPENDED" || Boolean(status?.accessBlocked);
  const heading = expired ? "Your plan has expired" : "Choose a package";
  const paidLine = paidThrough
    ? expired
      ? `Ended ${paidThrough}`
      : `Paid through ${paidThrough}`
    : "No paid period on file yet";
  const renewingCurrent = Boolean(selectedPlan && selectedPlan.tierCode === currentTier);
  const summaryTitle = selectedPlan
    ? `${renewingCurrent ? "Renew" : "Upgrade to"} ${selectedPlan.displayName}`
    : "Choose a package";
  const summaryMeta =
    periodMonths === 12 ? "12 months, pay for 10 · M-Pesa STK" : "1 month · M-Pesa STK";
  const quoted =
    quote != null && quote.tier === selectedTier && quote.periodMonths === periodMonths;
  const summaryTotal = quoted
    ? formatBillingMoney(quote.amountKes, quote.currency)
    : selectedPlan
      ? planPrice(selectedPlan, periodMonths).amount
      : "";
  const badge = expired
    ? { label: "Expired", className: "text-[var(--op-highlight)]" }
    : status?.status === "GRACE"
      ? { label: "In grace", className: "text-[var(--op-highlight)]" }
      : { label: "Active", className: "text-[var(--op-accent)]" };
  const payFooter =
    status?.billingEnabled && !talkToUs && selectedPlan ? (
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--op-ink)]">{summaryTitle}</p>
            <p className="text-[13px] text-[var(--op-muted)]">{summaryMeta}</p>
          </div>
          <p className="text-[1.65rem] font-medium tabular-nums leading-none text-[var(--op-ink)]">
            {summaryTotal}
          </p>
        </div>
        {quoteLoading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--op-muted)]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Working out the amount…
          </div>
        ) : !selectedFits ? (
          <p className="text-sm leading-relaxed text-[var(--op-muted)]">
            {selectedPlan.displayName} is still too small for this shop. Pick
            the package that fits.
          </p>
        ) : quote &&
          quote.tier === selectedTier &&
          quote.periodMonths === periodMonths ? (
          <SubscriptionRenewalForm
            quote={quote}
            canPay={canPay}
            presentation="bar"
            note="The new period starts when payment lands. Days already paid for are added on."
          />
        ) : (
          <p className="text-sm text-[var(--op-muted)]">
            Could not load a price for {selectedPlan.displayName}. Try again.
          </p>
        )}
      </div>
    ) : null;

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (locked && !next) return;
        onOpenChange(next);
      }}
      dismissible={!locked}
      title={heading}
      description={
        expired
          ? "Renew below to open the back office. Selling stays open while you pay."
          : "Pick a package and pay with M-Pesa. Packages only move up."
      }
      footer={payFooter}
    >
      {error ? (
        <div className="flex items-start gap-2.5 border border-[color-mix(in_srgb,var(--op-highlight)_35%,transparent)] px-3 py-2.5 text-[13px] leading-snug text-[var(--op-highlight)]">
          <p className="min-w-0 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-xs font-medium text-[var(--op-ink)]"
          >
            <RefreshCw className="size-3" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      {loading && !status ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--op-muted)]">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading your plan…
        </div>
      ) : status ? (
        <>
          {expired ? (
            <div className="flex flex-col gap-3 border border-[color-mix(in_srgb,var(--op-highlight)_28%,transparent)] bg-[color-mix(in_srgb,var(--op-highlight)_7%,var(--op-surface))] px-3.5 py-3">
              <p className="text-sm leading-relaxed text-[var(--op-ink)]">
                Keep selling from the till or the clerk. The back office opens
                again once this plan is renewed.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={APP_ROUTES.cashier}
                  className="flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-sm font-medium text-[var(--op-ink)]"
                >
                  Open the till
                </Link>
                <Link
                  href={APP_ROUTES.clerk}
                  className="flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-sm font-medium text-[var(--op-ink)]"
                >
                  Open the clerk
                </Link>
              </div>
            </div>
          ) : null}

          <section aria-label="Current package" className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="truncate text-[1.7rem] font-normal leading-none tracking-[-0.02em] text-[var(--op-ink)]"
                  style={{
                    fontFamily:
                      'var(--font-cormorant), Georgia, "Times New Roman", serif',
                  }}
                >
                  {status.tierDisplayName?.trim() || status.tier}
                </p>
                <p className="mt-1.5 text-sm text-[var(--op-muted)]">{paidLine}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-[13px] font-medium",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
            </div>
            {fit ? (
              <div className="flex flex-col gap-3.5 border-t border-[var(--op-rule)] pt-4">
                <UsageLine
                  label="Products"
                  used={fit.productCount}
                  limit={fit.productLimit}
                />
                <UsageLine
                  label="People"
                  used={fit.userCount}
                  limit={fit.userLimit}
                />
                <UsageLine
                  label="Daily sales"
                  used={Math.round(fit.dailyRevenueKes ?? 0)}
                  limit={fit.dailyRevenueLimit}
                  money
                />
              </div>
            ) : null}
            {fit?.needsUpgrade && fit.reasons[0] ? (
              <p className="text-[13px] leading-snug text-[var(--op-highlight)]">
                {fit.reasons[0]}
              </p>
            ) : null}
          </section>

          {!status.billingEnabled ? (
            <div className="border-t border-[var(--op-rule)] pt-5">
              <p className="text-sm font-medium text-[var(--op-ink)]">
                Online renewals are not switched on yet
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--op-muted)]">
                Talk to us and we will renew this shop. Nothing else changes
                until then.
              </p>
              <Button type="button" size="sm" className="mt-3 rounded-[2px]" asChild>
                <Link href={APP_ROUTES.support}>
                  Talk to us
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <section
              aria-label="Choose a package"
              className="flex flex-col gap-3 border-t border-[var(--op-rule)] pt-5"
            >
              <h3 className="text-[15px] font-medium text-[var(--op-ink)]">
                {expired ? "Renew a package" : "Choose a package"}
              </h3>
              <div className="grid grid-cols-2 border border-[var(--op-rule)]">
                <button
                  type="button"
                  aria-pressed={periodMonths === 1}
                  onClick={() => setPeriodMonths(1)}
                  className={cn(
                    "h-11 text-sm font-medium",
                    periodMonths === 1
                      ? "bg-[var(--op-accent)] text-[var(--op-surface)]"
                      : "bg-transparent text-[var(--op-ink)]",
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={periodMonths === 12}
                  onClick={() => setPeriodMonths(12)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 border-l border-[var(--op-rule)] text-sm font-medium",
                    periodMonths === 12
                      ? "border-transparent bg-[var(--op-accent)] text-[var(--op-surface)]"
                      : "bg-transparent text-[var(--op-ink)]",
                  )}
                >
                  Annual
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      periodMonths === 12
                        ? "text-[color-mix(in_srgb,var(--op-surface)_78%,transparent)]"
                        : "text-[var(--op-accent)]",
                    )}
                  >
                    2 months free
                  </span>
                </button>
              </div>

                  {plans.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {plans.map((plan) => (
                        <PackageCard
                          key={plan.tierCode}
                          plan={plan}
                          periodMonths={periodMonths}
                          selected={plan.tierCode === selectedTier}
                          current={plan.tierCode === currentTier}
                          recommended={
                            plan.tierCode === recommendedTier &&
                            Boolean(fit?.needsUpgrade)
                          }
                          upgrade={
                            currentSortOrder != null &&
                            plan.sortOrder > currentSortOrder
                          }
                          downgrade={isPlanDowngrade(plan.sortOrder, currentSortOrder)}
                          fits={planFitsUsage(
                            plan.productLimit,
                            plan.cashierLimit,
                            productCount,
                            userCount,
                            plan.dailyRevenueLimitKes,
                            dailyRevenue,
                          )}
                          onSelect={() => setSelectedTier(plan.tierCode)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="border border-[var(--op-rule)] px-4 py-6 text-center text-sm text-[var(--op-muted)]">
                      No packages are published yet. Talk to us and we will set
                      one up for this shop.
                    </p>
                  )}

                  {talkToUs && selectedPlan ? (
                    <div className="border-t border-[var(--op-rule)] pt-4">
                      <p className="text-sm leading-relaxed text-[var(--op-ink)]">
                        {selectedPlan.tierCode === "free"
                          ? currentTier === "free"
                            ? "You are on Free. Pick a paid package above to renew a larger plan."
                            : "Free does not cover this shop. Pick a paid package that fits, or talk to us."
                          : selectedCustomEnterprise
                            ? "Enterprise is quoted around what this shop already runs. Talk to us and we will build the package."
                            : "This shop is past every self-serve package. We will quote Enterprise around what you already run."}
                      </p>
                      <Button type="button" className="mt-3 h-10 rounded-[2px]" asChild>
                        <Link href={APP_ROUTES.support}>
                          Talk to us
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  ) : null}

                  <p className="text-[13px] leading-relaxed text-[var(--op-muted)]">
                    Packages only move up.
                    {atTopPackage
                      ? " You are already on the top published package. Renew it below, or talk to us for a custom agreement."
                      : " Lower packages stay listed so you can see what this shop has outgrown. Talk to us if you need a downgrade."}
                  </p>
                </section>
              )}
            </>
          ) : (
            <p className="py-16 text-center text-sm text-[var(--op-muted)]">
              Could not load your plan. Try again.
            </p>
          )}
    </FormDrawer>
  );
}

export function ChoosePackageButton({
  variant = "header",
  className,
}: {
  variant?: "header" | "inline";
  className?: string;
}) {
  const dashboard = useOptionalDashboard();
  const [open, setOpen] = useState(false);
  const canManage = hasPermission(
    dashboard?.me?.permissions,
    Permission.BusinessManageSubscription,
  );

  if (IS_DESKTOP || !canManage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Choose or change your package"
        className={cn(
          variant === "header"
            ? cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-2.5 sm:h-8",
                "border-[color-mix(in_srgb,var(--order-ink,#15231f)_11%,transparent)]",
                "bg-[var(--hub-paper,#FCFAF5)] text-[11px] font-semibold tracking-[-0.015em]",
                "text-[var(--hub-ink,#121A16)] transition-colors",
                "hover:bg-[color-mix(in_srgb,var(--hub-accent,#1D4B3B)_7%,white)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#1D4B3B)]/30",
              )
            : cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background px-2.5",
                "text-xs font-medium text-foreground shadow-sm transition-colors",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              ),
          className,
        )}
      >
        <Package className="size-3.5" aria-hidden />
        <span className={variant === "header" ? "sm:hidden" : "hidden"}>
          Plan
        </span>
        <span className={variant === "header" ? "hidden sm:inline" : "inline"}>
          Choose package
        </span>
      </button>

      <ChoosePackageDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Locks the back office while the shop is unpaid. Cashiers and clerks never
 * mount this — it lives on the dashboard shell, and the close control is off.
 */
export function UnpaidBusinessPaymentDrawer() {
  const { status } = useSubscriptionBillingStatus();
  const [loginSuspended, setLoginSuspended] = useState(() => {
    return getLoginBillingGate()?.subscriptionBillingStatus === "SUSPENDED";
  });

  useEffect(() => {
    if (IS_DESKTOP || !status) return;
    if (!status.accessBlocked) {
      clearLoginBillingGate();
      setLoginSuspended(false);
    }
  }, [status]);

  useEffect(() => {
    if (IS_DESKTOP) return;
    const onBlocked = () => setLoginSuspended(true);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
    return () => {
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
    };
  }, []);

  const locked =
    !IS_DESKTOP && (status != null ? status.accessBlocked : loginSuspended);
  if (!locked) return null;

  return (
    <ChoosePackageDrawer
      open
      locked
      onOpenChange={() => {}}
    />
  );
}

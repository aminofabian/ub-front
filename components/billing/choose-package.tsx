"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  BillingPeriodToggle,
  BillingUsageMeter,
  formatBillingMoney,
} from "@/components/billing/billing-ui";
import { useOptionalDashboard } from "@/components/dashboard-provider";
import { FormDrawer } from "@/components/form-drawer";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import {
  fetchSubscriptionBillingStatus,
  fetchSubscriptionPlans,
  fetchSubscriptionRenewalQuote,
  type SubscriptionBillingStatusRecord,
  type SubscriptionPlanRecord,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
import { formatPlanCount, planFitsUsage } from "@/lib/subscription-plan-fit";
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
  if (plan.tierCode === "enterprise") {
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
  return `${products} · ${people}`;
}

const STATUS_COPY: Record<
  SubscriptionBillingStatusRecord["status"],
  { label: string; tone: string }
> = {
  ACTIVE: {
    label: "Active",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  GRACE: {
    label: "In grace",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  },
  SUSPENDED: {
    label: "Paused",
    tone: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200",
  },
};

function PackageCard({
  plan,
  periodMonths,
  selected,
  current,
  recommended,
  fits,
  onSelect,
}: {
  plan: SubscriptionPlanRecord;
  periodMonths: BillingPeriod;
  selected: boolean;
  current: boolean;
  recommended: boolean;
  fits: boolean;
  onSelect: () => void;
}) {
  const price = planPrice(plan, periodMonths);
  const disabled = !fits && plan.tierCode !== "enterprise";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? "border-primary/45 bg-primary/[0.055]"
          : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20",
        disabled && "cursor-not-allowed opacity-55 hover:bg-muted/10",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-heading text-[13px] font-semibold tracking-[-0.015em] text-foreground">
              {plan.displayName}
            </span>
            {current ? (
              <span className="rounded-full border border-border/70 bg-background px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Current
              </span>
            ) : null}
            {recommended && !current ? (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary">
                Fits this shop
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
            {planLimits(plan)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-semibold tabular-nums text-foreground">
            {price.amount}
          </span>
          {price.suffix ? (
            <span className="block text-[10px] font-medium text-muted-foreground">
              {price.suffix}
            </span>
          ) : null}
        </span>
      </span>

      {!fits && plan.tierCode !== "enterprise" ? (
        <span className="text-[10.5px] font-medium text-red-700 dark:text-red-300">
          Too small for this shop
        </span>
      ) : null}

      <span
        className={cn(
          "mt-auto flex items-center gap-1 text-[10.5px] font-semibold",
          selected ? "text-primary" : "text-muted-foreground",
        )}
      >
        {selected ? (
          <>
            <Check className="size-3" strokeWidth={2.75} aria-hidden />
            Selected
          </>
        ) : disabled ? (
          "Not available"
        ) : (
          "Choose this package"
        )}
      </span>
    </button>
  );
}

function ChoosePackageDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const selectedFits = selectedPlan
    ? planFitsUsage(
        selectedPlan.productLimit,
        selectedPlan.cashierLimit,
        productCount,
        userCount,
      )
    : false;
  const talkToUs =
    Boolean(fit?.negotiable) ||
    selectedPlan?.tierCode === "enterprise" ||
    selectedPlan?.tierCode === "free";

  useEffect(() => {
    if (
      !open ||
      !selectedTier ||
      selectedTier === "free" ||
      selectedTier === "enterprise" ||
      !status?.billingEnabled
    ) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    void fetchSubscriptionRenewalQuote(periodMonths, selectedTier)
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
  }, [open, selectedTier, periodMonths, status?.billingEnabled]);

  const currentTier = status?.tier?.trim().toLowerCase() ?? "";
  const recommendedTier = fit?.recommendedTier?.trim().toLowerCase() ?? "";
  const paidThrough = formatPeriodEnd(status?.currentPeriodEnd);
  const statusCopy = status ? STATUS_COPY[status.status] : null;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Choose a package"
      description="Pick any published package. We highlight the one that fits your catalog and team — the final choice is yours."
      contextLabel="Plan & billing"
      icon={<Package className="size-4" aria-hidden />}
      headerDensity="compact"
      width="wide"
      banner={
        error ? (
          <div className="flex items-start gap-2.5 border border-destructive/35 bg-destructive/[0.06] px-3 py-2.5 text-[12px] leading-snug text-destructive">
            <p className="min-w-0 flex-1">{error}</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCw className="size-3" aria-hidden />
              Retry
            </Button>
          </div>
        ) : null
      }
    >
      {loading && !status ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading your packages…
        </div>
      ) : status ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Current package
                </p>
                <p className="mt-0.5 font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {status.tierDisplayName?.trim() || status.tier}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {paidThrough
                    ? `Paid through ${paidThrough}`
                    : "No paid period on file yet"}
                </p>
              </div>
              {statusCopy ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                    statusCopy.tone,
                  )}
                >
                  {statusCopy.label}
                </span>
              ) : null}
            </div>

            {fit ? (
              <div className="mt-3 grid gap-3 border-t border-border/50 pt-3 sm:grid-cols-2">
                <BillingUsageMeter
                  label="Products"
                  used={fit.productCount}
                  limit={fit.productLimit}
                  unit="products"
                />
                <BillingUsageMeter
                  label="People"
                  used={fit.userCount}
                  limit={fit.userLimit}
                  unit="people"
                />
              </div>
            ) : null}

            {fit?.needsUpgrade && fit.reasons[0] ? (
              <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] leading-snug text-amber-900 dark:text-amber-100">
                <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden />
                {fit.reasons[0]}
              </p>
            ) : null}
          </div>

          {!status.billingEnabled ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                Online package changes are not enabled yet
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Talk to us and we will switch this shop to the package you
                want. Your current access is unchanged.
              </p>
              <Button type="button" size="sm" className="mt-3" asChild>
                <Link href={APP_ROUTES.support}>
                  Talk to us
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {plans.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <PackageCard
                      key={plan.tierCode}
                      plan={plan}
                      periodMonths={periodMonths}
                      selected={plan.tierCode === selectedTier}
                      current={plan.tierCode === currentTier}
                      recommended={
                        plan.tierCode === recommendedTier && Boolean(fit?.needsUpgrade)
                      }
                      fits={planFitsUsage(
                        plan.productLimit,
                        plan.cashierLimit,
                        productCount,
                        userCount,
                      )}
                      onSelect={() => setSelectedTier(plan.tierCode)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  No packages are published yet. Talk to us and we will set one
                  up for this shop.
                </p>
              )}

              {selectedPlan && !talkToUs ? (
                <BillingPeriodToggle
                  value={periodMonths}
                  onChange={setPeriodMonths}
                />
              ) : null}

              {talkToUs && selectedPlan ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedPlan.tierCode === "free"
                      ? "Free does not cover this shop. Pick a paid package that fits, or talk to us for a custom quote."
                      : "This shop is past the self-serve packages. We will quote Enterprise around what you already run."}
                  </p>
                  <Button type="button" className="h-10 w-full sm:w-auto" asChild>
                    <Link href={APP_ROUTES.support}>
                      Talk to us
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : quoteLoading ? (
                <div className="flex items-center justify-center gap-2 py-7 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading your quote…
                </div>
              ) : selectedPlan && !selectedFits ? (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                  {selectedPlan.displayName} is still too small for this shop.
                  Pick the highlighted package.
                </p>
              ) : quote &&
                quote.tier === selectedTier &&
                quote.periodMonths === periodMonths ? (
                <div className="space-y-3">
                  <SubscriptionRenewalForm
                    quote={quote}
                    canPay={canPay}
                    compact
                  />
                  <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
                    Your new package takes effect when payment lands. Any paid
                    days you already have are added after the current period.
                  </p>
                </div>
              ) : selectedPlan ? (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Could not load a quote for {selectedPlan.displayName}. Try
                  again.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Could not load your package. Close this panel and try again.
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

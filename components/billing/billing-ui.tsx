"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { saSegmentButtonClass, saSegmentWrapClass } from "@/components/super-admin/sa-section";
import { cn } from "@/lib/utils";

export function formatBillingMoney(amount: number, currency = "KES") {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export type BillingHealth = "ok" | "low" | "critical";

export function billingHealth(
  available: number,
  lowBalance: boolean,
): BillingHealth {
  if (available <= 0) return "critical";
  if (lowBalance) return "low";
  return "ok";
}

const CHIP_HEALTH: Record<
  BillingHealth,
  { ring: string; text: string; dot: string }
> = {
  ok: {
    ring: "border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/10",
    text: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  low: {
    ring: "border-amber-500/30 bg-amber-500/[0.08] hover:bg-amber-500/12",
    text: "text-amber-900 dark:text-amber-100",
    dot: "bg-amber-500",
  },
  critical: {
    ring: "border-red-500/35 bg-red-500/[0.08] hover:bg-red-500/12",
    text: "text-red-800 dark:text-red-200",
    dot: "bg-red-500",
  },
};

export function billingChipClass(
  health: BillingHealth,
  variant: "desktop" | "tablet" = "desktop",
) {
  const t = CHIP_HEALTH[health];
  return cn(
    "group inline-flex items-center gap-1.5 font-semibold tabular-nums",
    "transition-[background-color,border-color] duration-150",
    "active:scale-[0.98]",
    variant === "desktop"
      ? cn(
          "h-8 max-w-[14rem] rounded-md border bg-background pl-2.5 pr-1 text-xs shadow-sm",
          t.ring,
          t.text,
        )
      : cn(
          "tablet-header-tool h-full border-l border-[var(--tablet-header-ink)]/12 px-2.5 pr-1 text-[11px] text-[var(--tablet-header-ink)]",
          health === "critical" && "bg-red-500/[0.06]",
          health === "low" && "bg-amber-500/[0.06]",
        ),
  );
}

export function BillingFormPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BillingSurface({
  children,
  className,
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "default" | "none";
}) {
  return (
    <div
      className={cn(
        DASHBOARD_SECTION_SURFACE,
        padding === "default" && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BillingPeriodToggle({
  value,
  onChange,
  annualSavingsLabel = "Save 2 mo",
}: {
  value: 1 | 12;
  onChange: (months: 1 | 12) => void;
  annualSavingsLabel?: string;
}) {
  return (
    <div className={cn(saSegmentWrapClass, "grid w-full grid-cols-2 gap-0.5 p-1")}>
      <button
        type="button"
        className={cn(saSegmentButtonClass(value === 1), "w-full justify-center py-2")}
        onClick={() => onChange(1)}
      >
        Monthly
      </button>
      <button
        type="button"
        className={cn(saSegmentButtonClass(value === 12), "w-full justify-center gap-1.5 py-2")}
        onClick={() => onChange(12)}
      >
        Annual
        <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {annualSavingsLabel}
        </span>
      </button>
    </div>
  );
}

export function BillingQuoteCard({
  planName,
  amountLabel,
  periodLabel,
  savingsLabel,
  compact = false,
}: {
  planName: string;
  amountLabel: string;
  periodLabel: string;
  savingsLabel?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        compact ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary/70"
        aria-hidden
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {planName}
      </p>
      <p
        className={cn(
          "mt-1 font-heading font-semibold tracking-tight text-foreground tabular-nums",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {amountLabel}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{periodLabel}</p>
      {savingsLabel ? (
        <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {savingsLabel}
        </p>
      ) : null}
    </div>
  );
}

export function BillingField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={dashboardLabelClass()}>{label}</span>
      {children}
      {hint ? <span className={dashboardHintClass()}>{hint}</span> : null}
    </label>
  );
}

export function billingPhoneInputClass(disabled?: boolean) {
  return dashboardInputClass(disabled);
}

export function BillingUsageMeter({
  label,
  used,
  limit,
  unit,
  compact = false,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
  compact?: boolean;
}) {
  const unlimited = limit == null;
  const over = !unlimited && used > limit;
  const pct = unlimited
    ? 8
    : Math.min(100, (used / Math.max(1, limit)) * 100);
  const tone = over
    ? "bg-red-600 dark:bg-red-400"
    : pct >= 80
      ? "bg-amber-500"
      : "bg-emerald-600";
  const usedLabel = used.toLocaleString("en-US");
  const capLabel = unlimited ? "unlimited" : limit.toLocaleString("en-US");
  const overBy = over ? used - (limit ?? 0) : 0;

  return (
    <div
      className={cn(
        compact
          ? "flex min-w-0 flex-col gap-0.5 sm:min-w-[7.25rem]"
          : "w-full space-y-1",
      )}
    >
      <span className="text-[11px] font-medium leading-none text-current/60">
        {label}
      </span>
      <p
        className={cn(
          "tabular-nums tracking-tight leading-none",
          compact ? "text-[13px]" : "text-xs",
        )}
      >
        <span
          className={cn(
            over
              ? "font-semibold text-orange-700 dark:text-orange-300"
              : "font-medium text-current/85",
          )}
        >
          {usedLabel}
        </span>
        <span className="font-normal text-current/50"> / {capLabel}</span>
      </p>
      {compact ? null : (
        <>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-current/15"
            aria-hidden
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                tone,
              )}
              style={{ width: `${over ? 100 : pct}%` }}
            />
          </div>
          <p className="text-xs leading-tight text-current/55">
            {over
              ? `${overBy.toLocaleString("en-US")} over the ${unit} cap`
              : unlimited
                ? `No ${unit} cap on this plan`
                : `${Math.max(0, (limit ?? 0) - used).toLocaleString("en-US")} ${unit} left`}
          </p>
        </>
      )}
    </div>
  );
}

export function BillingProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const tone =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Monthly included usage</span>
        <span className="tabular-nums font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-out", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BillingPresetGrid({
  options,
  selected,
  onSelect,
}: {
  options: number[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className={cn(saSegmentWrapClass, "grid grid-cols-4 gap-0.5 p-0.5")}>
      {options.map((p) => (
        <button
          key={p}
          type="button"
          className={cn(
            saSegmentButtonClass(selected === p),
            "justify-center py-2 tabular-nums active:scale-[0.97]",
          )}
          onClick={() => onSelect(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function BillingSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function BillingStatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "warning" | "critical";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/25 bg-red-500/[0.08] text-red-900 dark:text-red-100"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-950 dark:text-amber-100"
        : "border-border/70 bg-background/80 text-foreground";

  return (
    <div
      className={cn(
        "flex min-w-[5.5rem] flex-col rounded-lg border px-2.5 py-1.5 text-center",
        toneClass,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="mt-0.5 font-heading text-sm font-semibold tabular-nums leading-none">
        {value}
      </span>
    </div>
  );
}

export function BillingBalanceStrip({
  available,
  includedUsed,
  includedAllowance,
  purchased,
}: {
  available: number;
  includedUsed: number;
  includedAllowance: number;
  purchased: number;
}) {
  const hasIncluded = includedAllowance > 0;
  return (
    <div className="grid grid-cols-3 gap-2">
      <BillingStatPill
        label="Available"
        value={available}
        tone={available <= 0 ? "critical" : available <= 5 ? "warning" : "neutral"}
      />
      {hasIncluded ? (
        <BillingStatPill
          label="Included used"
          value={`${includedUsed}/${includedAllowance}`}
          tone={
            includedUsed >= includedAllowance
              ? "critical"
              : includedUsed / includedAllowance >= 0.8
                ? "warning"
                : "neutral"
          }
        />
      ) : (
        <BillingStatPill label="Included" value="—" />
      )}
      <BillingStatPill label="Purchased" value={purchased} />
    </div>
  );
}

export function BillingAlertBanner({
  variant,
  icon: Icon,
  title,
  description,
  meta,
  action,
  className,
}: {
  variant: "warning" | "critical" | "orange";
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const shell =
    variant === "critical"
      ? {
          bar: "border-red-500/25 bg-red-500/[0.08] text-red-950 dark:text-red-50",
          iconWrap: "bg-red-600/12 text-red-800 dark:text-red-200",
          iconLoose: "text-red-800 dark:text-red-200",
          body: "text-red-950/70 dark:text-red-100/70",
        }
      : variant === "orange"
        ? {
            bar: "border-orange-200/90 bg-orange-50 text-orange-950 selection:bg-orange-200/80 dark:border-orange-500/25 dark:bg-orange-950/35 dark:text-orange-50",
            iconWrap: "bg-orange-500/12 text-orange-800 dark:text-orange-200",
            iconLoose: "text-orange-700 dark:text-orange-300",
            body: "text-orange-950/65 dark:text-orange-100/70",
          }
        : {
            bar: "border-amber-500/25 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/35 dark:text-amber-50",
            iconWrap: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
            iconLoose: "text-amber-800 dark:text-amber-200",
            body: "text-amber-950/70 dark:text-amber-100/70",
          };

  const orange = variant === "orange";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "shrink-0 border-b px-4 py-2.5 sm:px-5",
        shell.bar,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {orange ? (
            <Icon
              className={cn("size-4 shrink-0", shell.iconLoose)}
              aria-hidden
            />
          ) : (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                shell.iconWrap,
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-sans text-[13px] font-semibold leading-snug tracking-[-0.015em]">
              {title}
            </p>
            {description ? (
              <p className={cn("mt-0.5 max-w-xl text-xs leading-snug", shell.body)}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {meta || action ? (
          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto sm:w-auto">
            {meta ? (
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 sm:flex sm:flex-none sm:gap-6">
                {meta}
              </div>
            ) : null}
            {action ? (
              <div className="w-full shrink-0 sm:w-auto sm:border-l sm:border-current/12 sm:pl-5">
                {action}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BillingInlineAlert({
  variant = "critical",
  icon: Icon,
  title,
  description,
  message,
  action,
  className,
}: {
  variant?: "critical" | "warning";
  icon: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const resolvedTitle = title ?? message;
  const shell =
    variant === "critical"
      ? {
          card: "border-red-500/25 bg-red-500/[0.05] text-red-950 dark:text-red-50",
          icon: "bg-red-500/12 text-red-700 dark:text-red-300",
          body: "text-red-900/75 dark:text-red-100/75",
        }
      : {
          card: "border-amber-500/25 bg-amber-500/[0.05] text-amber-950 dark:text-amber-50",
          icon: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
          body: "text-amber-950/75 dark:text-amber-100/75",
        };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
        shell.card,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              shell.icon,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            {resolvedTitle ? (
              <p className="text-sm font-semibold leading-snug">{resolvedTitle}</p>
            ) : null}
            {description ? (
              <p className={cn("mt-0.5 text-xs leading-relaxed", shell.body)}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0 sm:ml-auto">{action}</div> : null}
      </div>
    </div>
  );
}

export function BillingMetricTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning" | "critical" | "positive";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/20 bg-red-500/[0.04]"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/[0.04]"
        : tone === "positive"
          ? "border-emerald-500/20 bg-emerald-500/[0.04]"
          : "border-border/70 bg-background";

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]",
        toneClass,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function BillingDialogHero({
  available,
  unitLabel = "SMS available",
  sublabel,
}: {
  available: number;
  unitLabel?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {unitLabel}
      </p>
      <p className="mt-0.5 font-heading text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {available}
      </p>
      {sublabel ? (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}

export function BillingTotalLine({
  credits,
  unitPrice,
}: {
  credits: number;
  unitPrice: number;
}) {
  if (!Number.isFinite(credits) || credits <= 0) {
    return (
      <p className="text-sm text-muted-foreground">Enter credits to see the total.</p>
    );
  }
  const total = credits * unitPrice;
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">
        {credits} × KES {unitPrice.toFixed(2)}
      </span>
      <span className="font-heading text-base font-semibold tabular-nums">
        KES{" "}
        {total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    </div>
  );
}

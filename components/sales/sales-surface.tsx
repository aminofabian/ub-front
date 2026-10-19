import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared Sales theatre language — matches Store room + Trends. */
export const salesInk = "text-[var(--order-ink,#15231f)]";
export const salesMute =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
export const salesHair =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
export const salesHairDivide =
  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]";
export const salesSurface =
  "rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(16,24,40,0.05)]";
export const salesPaper =
  "gap-2 pb-[calc(var(--shell-bottom-inset)+1.5rem)] max-lg:bg-[#f4f7f5] sm:pb-8";
export const salesTeal = "var(--pos-primary,#0f766e)";

export function SalesStage({
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(salesSurface, "flex min-h-0 flex-col", className)}>
      <div
        className={cn(
          "flex items-end justify-between gap-3 border-b px-3.5 py-3 sm:px-4",
          salesHair,
        )}
      >
        <div className="min-w-0">
          <h2
            className={cn(
              "font-heading text-[15px] font-semibold tracking-[-0.02em]",
              salesInk,
            )}
          >
            {title}
          </h2>
          {hint ? (
            <p className={cn("mt-0.5 text-[12px] leading-snug", salesMute)}>
              {hint}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("min-h-0 flex-1 p-3.5 sm:p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SalesPeriodChip({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors",
        active
          ? "bg-[var(--pos-primary,#0f766e)] text-white"
          : cn(
              "border bg-white",
              salesHair,
              salesMute,
              "hover:text-[var(--order-ink,#15231f)]",
            ),
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SalesMetricTile({
  label,
  value,
  hint,
  warn,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[5rem] flex-col justify-between px-3.5 py-3.5",
        className,
      )}
    >
      <p className={cn("text-[11px] font-semibold", salesMute)}>{label}</p>
      <p
        className={cn(
          "font-heading text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.03em] sm:text-[1.5rem]",
          warn ? "text-[#9a2e16]" : salesInk,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-1 truncate text-[11px]", salesMute)}>{hint}</p>
      ) : null}
    </div>
  );
}

export function SalesHeroMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <p className={cn("text-[12px] font-semibold", salesMute)}>{label}</p>
      <p
        className={cn(
          "mt-2 font-heading text-[2.35rem] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-[2.75rem]",
          salesInk,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-2 text-[13px]", salesMute)}>{hint}</p>
      ) : null}
    </div>
  );
}

export function salesToolBtnClass(active?: boolean) {
  return cn(
    "inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-2.5 text-[12px] font-semibold ring-1 ring-black/[0.05] transition-colors",
    active
      ? "text-[var(--pos-primary,#0f766e)]"
      : cn(salesMute, "hover:text-[var(--pos-primary,#0f766e)]"),
  );
}

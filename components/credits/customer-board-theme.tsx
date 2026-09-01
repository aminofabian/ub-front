import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const crmPanelClass =
  "overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]";

/** @deprecated Use crmPanelClass — kept for imports that expect WhiteCard */
export function WhiteCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(crmPanelClass, className)}>{children}</div>;
}

export function CrmBar({
  pct,
  className,
  warn,
}: {
  pct: number;
  className?: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-1.5 origin-left rounded-full",
          warn ? "bg-amber-500/80" : "bg-foreground/55",
        )}
        style={{
          width: "100%",
          transform: `scaleX(${Math.min(100, Math.max(0, pct)) / 100})`,
        }}
      />
    </div>
  );
}

export function BoardFilterButton({
  selected,
  children,
  onClick,
  compact,
  "aria-pressed": ariaPressed,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  compact?: boolean;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? selected}
      className={cn(
        "rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "min-h-9 px-3 text-[12px]" : "min-h-10 px-3 text-[13px]",
        selected
          ? "bg-foreground text-background"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function NavySidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(crmPanelClass, "p-3")}>
      <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function NavyRadioOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="block">
      <input
        type="radio"
        name={name}
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <span
        className={cn(
          "flex min-h-10 cursor-pointer items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          checked
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {label}
      </span>
    </label>
  );
}

export function boardMoney(
  n: number | string | null | undefined,
  currency = "KES",
): string {
  const val = Number(n ?? 0);
  if (!Number.isFinite(val)) return currency === "KES" ? "KSh 0" : "0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "−" : "";
  let body: string;
  if (abs >= 1_000_000) {
    body = `${(abs / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  } else if (abs >= 10_000) {
    body = `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    body = abs.toLocaleString("en-KE", { maximumFractionDigits: 0 });
  }
  const prefix = currency === "KES" ? "KSh " : `${currency.trim()} `;
  return `${sign}${prefix}${body}`;
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const crmPanelClass =
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-none";

/** @deprecated Use DirectoryPanel from directory-workspace-ui */
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
    <div className={cn("h-1 w-full rounded-full bg-muted/80", className)}>
      <div
        className={cn(
          "h-1 origin-left rounded-full",
          warn ? "bg-amber-500/75" : "bg-foreground/45",
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
        "rounded-none font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
        compact ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-xs",
        selected
          ? "border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
          : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
    <section className="space-y-1">
      <p className="px-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
        {title}
      </p>
      <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-none border border-border/60 bg-muted/20 p-1">
        {children}
      </div>
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
          "flex h-8 cursor-pointer items-center rounded-none px-2 text-xs font-medium transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--pos-primary,#0f766e)] peer-focus-visible:ring-offset-1",
          checked
            ? "border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
            : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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

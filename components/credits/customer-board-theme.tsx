import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const NAVY = "#0c3a66";
export const NAVY_DEEP = "#071e36";
export const BAR = "#2a6aa3";
export const BAR_LEAD = "#0c3a66";
export const SLICE = "#16487a";
export const INK = "#0c3a66";
export const MUTED = "#3a5570";
export const BOARD_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
export const WHITE_CARD_SHADOW = "0 4px 14px rgba(7, 30, 54, 0.22)";

export function WhiteCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-none bg-white", className)}
      style={{ boxShadow: WHITE_CARD_SHADOW }}
    >
      {children}
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
        "font-medium tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        compact ? "min-h-10 px-3 text-[12px]" : "min-h-11 px-3 text-[13px]",
        selected ? "bg-white" : "text-white/90 hover:bg-white/10",
      )}
      style={
        selected
          ? { color: INK }
          : compact
            ? { background: SLICE, color: "#fff" }
            : undefined
      }
    >
      {children}
    </button>
  );
}

export function BoardSearchInput({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-full border-0 bg-white/10 text-sm text-white placeholder:text-[#d7e3ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
    />
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
    <section
      className="overflow-hidden rounded-none"
      style={{ background: NAVY_DEEP }}
    >
      <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
        {title}
      </h2>
      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
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
          "flex min-h-11 cursor-pointer items-center justify-center px-3 py-2 text-center text-[13px] font-medium tracking-[-0.02em] transition-colors duration-150",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#071e36]",
          checked ? "bg-white" : "text-white hover:bg-white/10",
        )}
        style={
          checked ? { color: INK } : { background: SLICE, color: "#fff" }
        }
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

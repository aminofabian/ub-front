"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { nsdInput } from "./new-supply-drawer-ui";
import { supFormCellInput } from "../../suppliers/_components/supplier-ui-tokens";

export type ShelfPriceHint = {
  loading: boolean;
  error?: string;
  currentSellPrice: number | null;
  suggestedSellPrice: number | null;
  note: string | null;
};

type ShelfTone =
  | "empty"
  | "loading"
  | "below-cost"
  | "suggested"
  | "current"
  | "edited"
  | "readonly";

const TONE_SHELL: Record<ShelfTone, string> = {
  empty: "border-border/70 bg-muted/15",
  loading: "border-border/70 bg-muted/20",
  "below-cost": "border-red-500/45 bg-red-500/[0.07]",
  suggested: "border-amber-500/40 bg-amber-500/[0.07]",
  current: "border-primary/40 bg-primary/[0.06]",
  edited: "border-foreground/20 bg-background",
  readonly: "border-border/50 bg-muted/25",
};

const TONE_COMPACT_BG: Record<ShelfTone, string> = {
  empty: "bg-muted/40",
  loading: "bg-muted/25",
  "below-cost": "bg-red-500/[0.07]",
  suggested: "bg-amber-500/[0.08]",
  current: "bg-background",
  edited: "bg-background",
  readonly: "bg-muted/20",
};

function shelfShellClass(
  compact: boolean,
  touch: boolean,
  tone: ShelfTone,
  h: string,
): string {
  if (compact && !touch) {
    return cn(
      "relative mx-0.5 my-0.5 flex min-w-0 items-center rounded-sm px-1",
      h,
      "transition-[box-shadow,background-color,border-color] duration-100",
      tone === "empty"
        ? "border border-dashed border-border/80"
        : cn(
            "ring-1 ring-inset",
            tone === "below-cost" ? "ring-red-500/45" : "ring-border/55",
          ),
      "focus-within:border-solid focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/40",
      TONE_COMPACT_BG[tone],
    );
  }
  return cn(
    "relative flex min-w-0 items-center border transition-[border-color,background-color] duration-100",
    h,
    TONE_SHELL[tone],
  );
}

function sellPricesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

function resolveShelfTone(
  value: string,
  unitStr: string,
  hint: ShelfPriceHint | undefined,
  sellPriceTouched: boolean,
  canSetSellPrice: boolean,
): ShelfTone {
  if (!canSetSellPrice) {
    return "readonly";
  }
  if (hint?.loading) {
    return "loading";
  }
  const retail = parseMoney(value);
  const unit = parseMoney(unitStr);
  if (retail != null && unit != null && retail < unit) {
    return "below-cost";
  }
  if (retail == null) {
    return "empty";
  }
  if (sellPriceTouched) {
    return "edited";
  }
  const cur = hint?.currentSellPrice;
  const sug = hint?.suggestedSellPrice;
  if (cur != null && sellPricesMatch(retail, cur)) {
    return "current";
  }
  if (sug != null && sellPricesMatch(retail, sug)) {
    return "suggested";
  }
  if (cur != null || sug != null) {
    return "edited";
  }
  return retail != null ? "edited" : "empty";
}

export function formatSupplyMargin(retail: number, cost: number): string | null {
  if (cost <= 0) {
    return null;
  }
  const pct = ((retail - cost) / cost) * 100;
  if (Math.abs(pct) < 0.05) {
    return "0%";
  }
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** @deprecated Prefer {@link formatSupplyMargin} */
function formatMargin(retail: number, cost: number): string | null {
  return formatSupplyMargin(retail, cost);
}

export function shelfPriceHintTitle(
  hint: ShelfPriceHint | undefined,
  canSetSellPrice: boolean,
): string | undefined {
  const prefix = !canSetSellPrice
    ? "View only — no shelf-price permission. "
    : "";
  const cur = hint?.currentSellPrice;
  const sug = hint?.suggestedSellPrice;
  if (cur != null && sug != null && sellPricesMatch(cur, sug)) {
    return `${prefix}Current shelf price ${cur.toFixed(2)}`;
  }
  const parts: string[] = [];
  if (cur != null) {
    parts.push(`Current ${cur.toFixed(2)}`);
  }
  if (sug != null) {
    parts.push(`Suggested ${sug.toFixed(2)}`);
  }
  if (parts.length > 0) {
    return `${prefix}${parts.join(" · ")}`;
  }
  const note = hint?.note?.trim();
  if (note) {
    return `${prefix}${note}`;
  }
  return prefix.trim() || undefined;
}

type SupplyShelfPriceCellProps = {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  canSetSellPrice: boolean;
  hint?: ShelfPriceHint;
  unitStr: string;
  sellPriceTouched?: boolean;
  compact?: boolean;
  /** Mobile receiving: 44px fields + 16px type. */
  touch?: boolean;
  /** When set, renders a field label above the control (mobile cards). */
  label?: string;
  onEnterNext?: () => void;
  /** Hide under-cell “Below cost” / margin chrome. */
  quiet?: boolean;
};

export function SupplyShelfPriceCell({
  value,
  onChange,
  disabled = false,
  canSetSellPrice,
  hint,
  unitStr,
  sellPriceTouched = false,
  compact = false,
  touch = false,
  label,
  onEnterNext,
  quiet = false,
}: SupplyShelfPriceCellProps) {
  const tone = resolveShelfTone(
    value,
    unitStr,
    hint,
    sellPriceTouched,
    canSetSellPrice,
  );
  const title = shelfPriceHintTitle(hint, canSetSellPrice);
  const retail = parseMoney(value);
  const unit = parseMoney(unitStr);
  const margin =
    retail != null && unit != null && unit > 0
      ? formatMargin(retail, unit)
      : null;
  const belowCost =
    retail != null && unit != null && unit > 0 && retail < unit;

  const h = touch ? "h-11" : compact ? "h-7" : "h-8";
  const text = touch ? "text-base" : compact ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex min-w-0 flex-col", touch || !compact ? "gap-1" : "gap-0.5")}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}

      <div className={shelfShellClass(compact, touch, tone, h)} title={title}>
        {canSetSellPrice ? (
          <input
            className={cn(
              compact && !touch ? supFormCellInput : nsdInput,
              "h-full min-w-0 flex-1 border-0 bg-transparent shadow-none",
              "text-right font-mono tabular-nums",
              text,
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              belowCost && "text-red-700 dark:text-red-300",
              tone === "current" && !belowCost && "text-primary",
              hint?.loading && "pr-7",
            )}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnterNext?.();
              }
            }}
            disabled={disabled || hint?.loading}
            inputMode="decimal"
            placeholder="—"
            aria-label="Retail sell price"
            data-nsd-retail=""
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-end px-1.5 font-mono tabular-nums text-muted-foreground",
              text,
            )}
          >
            {value.trim() ? value : "—"}
          </span>
        )}

        {hint?.loading ? (
          <span
            className="pointer-events-none absolute right-1 inline-flex items-center text-muted-foreground"
            aria-hidden
          >
            <Loader2 className={cn("animate-spin", compact && !touch ? "size-3" : "size-3.5")} />
          </span>
        ) : null}
      </div>

      {!quiet ? (
        <div className="flex min-h-[0.875rem] min-w-0 flex-wrap items-center gap-1 leading-none">
          {hint?.loading ? (
            <span className="text-[10px] text-muted-foreground">…</span>
          ) : belowCost ? (
            <span className="text-[10px] font-medium text-red-700 dark:text-red-300">
              Below cost
            </span>
          ) : !compact || touch ? (
            <>
              {margin && retail != null && unit != null && retail >= unit ? (
                <span className="text-[10px] font-medium text-primary">{margin}</span>
              ) : null}
              {!canSetSellPrice ? (
                <span className="text-[10px] text-muted-foreground">View only</span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

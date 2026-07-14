"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Scissors } from "lucide-react";

import { cn } from "@/lib/utils";

/** Sale API allows at most 3 decimal places on weighed qty. */
export const WEIGHTED_QTY_DECIMALS = 3;

/** Known retail portions → decimal qty (max 3 dp to match sale API). */
export const CART_QTY_PORTIONS: ReadonlyArray<{
  value: number;
  label: string;
  hint: string;
  group: "cut" | "share" | "fine" | "bake";
}> = [
  { value: 0.5, label: "½", hint: "Half", group: "cut" },
  { value: 0.333, label: "⅓", hint: "Third", group: "cut" },
  { value: 0.25, label: "¼", hint: "Quarter", group: "cut" },
  { value: 0.2, label: "⅕", hint: "Fifth", group: "cut" },
  { value: 0.167, label: "⅙", hint: "Sixth", group: "cut" },
  { value: 0.125, label: "⅛", hint: "Eighth", group: "cut" },
  { value: 0.75, label: "¾", hint: "Three quarters", group: "share" },
  { value: 0.667, label: "⅔", hint: "Two thirds", group: "share" },
  { value: 0.4, label: "⅖", hint: "Two fifths", group: "share" },
  { value: 0.375, label: "⅜", hint: "Three eighths", group: "share" },
  { value: 0.625, label: "⅝", hint: "Five eighths", group: "share" },
  { value: 0.875, label: "⅞", hint: "Seven eighths", group: "share" },
  { value: 0.1, label: "¹⁄₁₀", hint: "Tenth", group: "fine" },
  { value: 0.083, label: "¹⁄₁₂", hint: "Twelfth", group: "fine" },
  { value: 0.063, label: "¹⁄₁₆", hint: "Sixteenth", group: "fine" },
  { value: 0.05, label: "¹⁄₂₀", hint: "Twentieth", group: "fine" },
  { value: 1.5, label: "1½", hint: "One and a half", group: "bake" },
  { value: 2.5, label: "2½", hint: "Two and a half", group: "bake" },
  { value: 3.75, label: "3¾", hint: "Three and three quarters", group: "bake" },
];

const PORTION_GROUPS: ReadonlyArray<{
  id: "cut" | "share" | "fine" | "bake";
  title: string;
  subtitle: string;
}> = [
  { id: "cut", title: "Cut", subtitle: "One piece of the whole" },
  { id: "share", title: "Share", subtitle: "Most of the unit" },
  { id: "fine", title: "Fine", subtitle: "Tiny pours & scrapes" },
  { id: "bake", title: "Bake", subtitle: "Odd bakery counts" },
];

const FRACTION_LABELS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0.05, label: "¹⁄₂₀" },
  { value: 0.063, label: "¹⁄₁₆" },
  { value: 0.1, label: "¹⁄₁₀" },
  { value: 0.125, label: "⅛" },
  { value: 0.083, label: "¹⁄₁₂" },
  { value: 0.167, label: "⅙" },
  { value: 0.2, label: "⅕" },
  { value: 0.25, label: "¼" },
  { value: 0.333, label: "⅓" },
  { value: 0.375, label: "⅜" },
  { value: 0.4, label: "⅖" },
  { value: 0.5, label: "½" },
  { value: 0.625, label: "⅝" },
  { value: 0.667, label: "⅔" },
  { value: 0.75, label: "¾" },
  { value: 0.875, label: "⅞" },
  { value: 1.5, label: "1½" },
  { value: 2.5, label: "2½" },
  { value: 3.75, label: "3¾" },
];

/** Round / stringify qty for cart lines (≤3 dp — sale API weighed limit). */
export function formatCartQtyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "1";
  const factor = 10 ** WEIGHTED_QTY_DECIMALS;
  const rounded = Math.round(n * factor) / factor;
  if (rounded <= 0) return (1 / factor).toFixed(WEIGHTED_QTY_DECIMALS);
  return String(Number(rounded.toFixed(WEIGHTED_QTY_DECIMALS)));
}

/** Pretty qty for till display (½ instead of 0.5). */
export function formatCartQtyLabel(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return String(raw);
  for (const f of FRACTION_LABELS) {
    if (Math.abs(n - f.value) < 0.0005) return f.label;
  }
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  if (whole >= 1 && frac > 0.0005) {
    for (const f of FRACTION_LABELS) {
      if (f.value < 1 && Math.abs(frac - f.value) < 0.0005) {
        return `${whole}${f.label}`;
      }
    }
  }
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n));
  }
  return formatCartQtyValue(n);
}

function PortionPie({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value > 1 ? value % 1 || 1 : value));
  const angle = clamped * 360;
  return (
    <span
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-full border border-current/30",
        className,
      )}
      style={{
        background: `conic-gradient(currentColor 0deg ${angle}deg, transparent ${angle}deg 360deg)`,
      }}
      aria-hidden
    />
  );
}

type CashierQtyControlProps = {
  quantity: string;
  itemLabel: string;
  /**
   * When false (default), only whole-number qty — matches sale API rules for
   * non-weighed items. Portion / fraction picker is for weighed lines only.
   */
  allowFractions?: boolean;
  /** Compact for dense cart rows. */
  size?: "sm" | "md";
  className?: string;
  onChange: (nextQty: string) => void;
  onRemove: () => void;
};

export function CashierQtyControl({
  quantity,
  itemLabel,
  allowFractions = false,
  size = "md",
  className,
  onChange,
  onRemove,
}: CashierQtyControlProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const qty = Number(quantity);
  const qNum = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const btn = size === "sm" ? "size-9" : "size-10";
  const labelMin = size === "sm" ? "min-w-[1.25rem]" : "min-w-[1.35rem]";

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelW = 296;
      const margin = 8;
      const left = Math.min(
        Math.max(margin, rect.right - panelW),
        window.innerWidth - panelW - margin,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferBelow = spaceBelow > 280;
      setCoords({
        top: preferBelow ? rect.bottom + 6 : Math.max(margin, rect.top - 6),
        left,
      });
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel || !rootRef.current) return;
        const h = panel.getBoundingClientRect().height;
        const r = rootRef.current.getBoundingClientRect();
        if (preferBelow && r.bottom + 6 + h > window.innerHeight - margin) {
          setCoords({ top: Math.max(margin, r.top - h - 6), left });
        } else if (!preferBelow) {
          setCoords({ top: Math.max(margin, r.top - h - 6), left });
        }
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const applyPortion = (value: number) => {
    if (!allowFractions) return;
    onChange(formatCartQtyValue(value));
    setOpen(false);
  };

  const wholeQty = Math.max(1, Math.floor(qNum + 1e-9));

  const panel =
    allowFractions && open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`Portion for ${itemLabel}`}
            className={cn(
              "fixed z-[80] w-[min(18.5rem,calc(100vw-1.5rem))]",
              "animate-in fade-in-0 zoom-in-95 duration-150",
              "rounded-2xl border border-border/60 bg-popover p-2.5 text-popover-foreground shadow-xl",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="mb-2 flex items-start gap-2 px-0.5">
              <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]">
                <Scissors className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold leading-tight">
                  Cut a portion
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Sell half a loaf, a quarter kilo, an eighth — tap a slice.
                </p>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-4 gap-1">
              {[0.5, 0.25, 0.125, 0.1].map((v) => {
                const meta = CART_QTY_PORTIONS.find(
                  (p) => Math.abs(p.value - v) < 0.0005,
                );
                const active = Math.abs(qNum - v) < 0.0005;
                return (
                  <button
                    key={v}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors",
                      active
                        ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                        : "border-border/50 bg-muted/20 text-foreground hover:border-border hover:bg-muted/40",
                    )}
                    onClick={() => applyPortion(v)}
                  >
                    <PortionPie value={v} className="size-5" />
                    <span className="text-[13px] font-bold leading-none">
                      {meta?.label ?? formatCartQtyLabel(v)}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {meta?.hint ?? ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-[14rem] space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
              {PORTION_GROUPS.map((group) => {
                const items = CART_QTY_PORTIONS.filter(
                  (p) => p.group === group.id,
                );
                const seen = new Set<string>();
                const unique = items.filter((p) => {
                  const key = formatCartQtyValue(p.value);
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                return (
                  <div key={group.id}>
                    <div className="mb-1 flex items-baseline justify-between px-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {group.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground/80">
                        {group.subtitle}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {unique.map((p) => {
                        const active = Math.abs(qNum - p.value) < 0.0005;
                        return (
                          <button
                            key={`${group.id}-${p.label}-${p.value}`}
                            type="button"
                            title={p.hint}
                            className={cn(
                              "inline-flex min-w-[2.35rem] items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] font-bold tabular-nums transition-colors",
                              active
                                ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                                : "border-border/45 bg-card hover:border-border hover:bg-muted/35",
                            )}
                            onClick={() => applyPortion(p.value)}
                          >
                            {p.value <= 1 ? (
                              <PortionPie
                                value={p.value}
                                className="opacity-80"
                              />
                            ) : null}
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                onClick={() => applyPortion(1)}
              >
                Whole (1)
              </button>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                Now {formatCartQtyLabel(quantity)}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "inline-flex items-center border",
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40",
          size === "sm" && "rounded-lg border-border/55 bg-muted/10",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex items-center justify-center text-muted-foreground hover:text-foreground",
            btn,
          )}
          aria-label={
            (allowFractions ? qNum : wholeQty) <= 1
              ? `Remove ${itemLabel}`
              : "Decrease quantity"
          }
          onClick={() => {
            if (!allowFractions) {
              if (wholeQty <= 1) {
                onRemove();
                return;
              }
              onChange(String(wholeQty - 1));
              return;
            }
            if (qNum <= 1) {
              onRemove();
              return;
            }
            onChange(formatCartQtyValue(qNum - 1));
          }}
        >
          <Minus className="size-3.5" />
        </button>
        {allowFractions ? (
          <button
            type="button"
            className={cn(
              labelMin,
              "px-0.5 text-center text-xs font-bold tabular-nums leading-none",
              "text-foreground underline-offset-2 hover:underline",
              open && "text-[var(--pos-primary)]",
            )}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            title="Split into a portion"
            onClick={() => setOpen((v) => !v)}
          >
            {formatCartQtyLabel(quantity)}
          </button>
        ) : (
          <span
            className={cn(
              labelMin,
              "px-0.5 text-center text-xs font-bold tabular-nums leading-none text-foreground",
            )}
          >
            {String(wholeQty)}
          </span>
        )}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center text-muted-foreground hover:text-foreground",
            btn,
          )}
          aria-label="Increase quantity"
          onClick={() =>
            onChange(
              allowFractions
                ? formatCartQtyValue(qNum + 1)
                : String(wholeQty + 1),
            )
          }
        >
          <Plus className="size-3.5" />
        </button>
        {allowFractions ? (
          <button
            type="button"
            className={cn(
              "flex items-center justify-center border-l border-inherit text-muted-foreground hover:text-[var(--pos-primary)]",
              btn,
              open && "text-[var(--pos-primary)]",
            )}
            aria-label={`Portion ${itemLabel}`}
            aria-expanded={open}
            aria-controls={panelId}
            title="Fraction / portion"
            onClick={() => setOpen((v) => !v)}
          >
            <Scissors className="size-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      {panel}
    </div>
  );
}

"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Scale } from "lucide-react";

import { cn } from "@/lib/utils";

/** Sale API allows at most 3 decimal places on weighed qty. */
export const WEIGHTED_QTY_DECIMALS = 3;

const QTY_FACTOR = 10 ** WEIGHTED_QTY_DECIMALS;
const MIN_WEIGHTED_QTY = 1 / QTY_FACTOR;

/** Quick spend chips for “mia moja ya …” style asks. */
export const CART_SPEND_CHIPS = [50, 100, 200, 500] as const;

/** Quick kg chips for manual weigh. */
const CART_KG_CHIPS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

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

type BalanceTab = "weight" | "spend" | "cut";

/** Round money the same way the till posts sales. */
export function roundCartMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Spend→weight uses 2 dp kg (still within the sale API’s 3 dp cap). */
export const SPEND_WEIGHT_DECIMALS = 2;
const SPEND_QTY_FACTOR = 10 ** SPEND_WEIGHT_DECIMALS;
const MIN_SPEND_QTY = 1 / SPEND_QTY_FACTOR;

/** Round / stringify qty for cart lines (≤3 dp — sale API weighed limit). */
export function formatCartQtyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "1";
  const rounded = Math.round(n * QTY_FACTOR) / QTY_FACTOR;
  if (rounded <= 0) return MIN_WEIGHTED_QTY.toFixed(WEIGHTED_QTY_DECIMALS);
  return String(Number(rounded.toFixed(WEIGHTED_QTY_DECIMALS)));
}

/** Round / stringify spend-derived weight (exactly 2 dp). */
export function formatSpendQtyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return MIN_SPEND_QTY.toFixed(SPEND_WEIGHT_DECIMALS);
  const rounded = Math.round(n * SPEND_QTY_FACTOR) / SPEND_QTY_FACTOR;
  if (rounded <= 0) return MIN_SPEND_QTY.toFixed(SPEND_WEIGHT_DECIMALS);
  return rounded.toFixed(SPEND_WEIGHT_DECIMALS);
}

/**
 * Customer pays exactly `amount`. Weight = round2(amount / shelfRate).
 * Unit price is nudged so qty × unitPrice rounds to that same amount
 * (shelf rate alone can land on 19.95 / 20.10).
 */
export function resolveSpendLine(
  amount: number,
  shelfUnitPrice: number,
): { quantity: string; unitPrice: string; amount: number; qty: number } | null {
  if (!(amount > 0) || !(shelfUnitPrice > 0)) return null;
  if (!Number.isFinite(amount) || !Number.isFinite(shelfUnitPrice)) return null;

  const target = roundCartMoney2(amount);
  if (target <= 0) return null;

  let qty = Math.round((target / shelfUnitPrice) * SPEND_QTY_FACTOR) / SPEND_QTY_FACTOR;
  if (qty < MIN_SPEND_QTY) qty = MIN_SPEND_QTY;

  let unitPrice = target / qty;
  for (const dp of [2, 3, 4, 6] as const) {
    const candidate = Number(unitPrice.toFixed(dp));
    if (candidate > 0 && roundCartMoney2(qty * candidate) === target) {
      unitPrice = candidate;
      return {
        quantity: formatSpendQtyValue(qty),
        unitPrice: candidate.toFixed(dp),
        amount: target,
        qty,
      };
    }
  }

  return {
    quantity: formatSpendQtyValue(qty),
    unitPrice: String(unitPrice),
    amount: target,
    qty,
  };
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

export function cartLineTotal(qty: number, unitPrice: number): number {
  if (!(qty > 0) || !(unitPrice >= 0) || !Number.isFinite(qty) || !Number.isFinite(unitPrice)) {
    return 0;
  }
  return roundCartMoney2(qty * unitPrice);
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

function parseDraftNumber(raw: string): number | null {
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

type CashierQtyControlProps = {
  quantity: string;
  itemLabel: string;
  /**
   * When false (default), only whole-number qty — matches sale API rules for
   * non-weighed items. Portion / fraction picker is for weighed lines only.
   */
  allowFractions?: boolean;
  /** Shelf / line unit price — required for spend ↔ weight conversion. */
  unitPrice?: string | number;
  /** Currency code shown on the spend side (e.g. KES). */
  currency?: string;
  /** Compact for dense cart rows. */
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  onChange: (nextQty: string) => void;
  /**
   * Spend mode may nudge unit price so qty × price = the keyed amount exactly.
   * Wired on cashier / grocery carts that own the line’s unitPrice.
   */
  onUnitPriceChange?: (nextUnitPrice: string) => void;
  onRemove: () => void;
};

export function CashierQtyControl({
  quantity,
  itemLabel,
  allowFractions = false,
  unitPrice,
  currency = "KES",
  size = "md",
  className,
  disabled = false,
  onChange,
  onUnitPriceChange,
  onRemove,
}: CashierQtyControlProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BalanceTab>("weight");
  const [draftKg, setDraftKg] = useState("");
  const [draftSpend, setDraftSpend] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const kgInputRef = useRef<HTMLInputElement>(null);
  const spendInputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const qty = Number(quantity);
  const qNum = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const priceNum = Number(unitPrice);
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
  const btn = size === "sm" ? "size-9" : "size-10";
  const labelMin = size === "sm" ? "min-w-[1.25rem]" : "min-w-[1.35rem]";
  const currencyLabel = currency.trim() || "KES";

  const syncDraftsFromQty = (nextQty: number) => {
    const safe = nextQty > 0 ? nextQty : MIN_WEIGHTED_QTY;
    setDraftKg(formatCartQtyValue(safe));
    if (hasPrice) {
      // String(20) not "20.00" / "20.10" — spend field stays what the line is.
      setDraftSpend(String(cartLineTotal(safe, priceNum)));
    } else {
      setDraftSpend("");
    }
  };

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelW = 320;
      const margin = 8;
      const left = Math.min(
        Math.max(margin, rect.right - panelW),
        window.innerWidth - panelW - margin,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferBelow = spaceBelow > 320;
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
  }, [open, tab]);

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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (tab === "weight") kgInputRef.current?.focus();
      if (tab === "spend") spendInputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [open, tab]);

  const openPanel = (nextTab: BalanceTab = "weight") => {
    if (disabled) return;
    syncDraftsFromQty(qNum > 0 ? qNum : 1);
    setTab(nextTab);
    setOpen(true);
  };

  const applyQty = (value: number) => {
    if (!allowFractions) return;
    onChange(formatCartQtyValue(value));
    setOpen(false);
  };

  const applySpendAmount = (amount: number) => {
    if (!hasPrice || !allowFractions) return;
    const line = resolveSpendLine(amount, priceNum);
    if (!line) return;
    // Keep the keyed amount exact; weight is 2 dp; unit price absorbs the rest.
    onChange(line.quantity);
    onUnitPriceChange?.(line.unitPrice);
    setOpen(false);
  };

  const draftKgNum = parseDraftNumber(draftKg);
  const draftSpendNum = parseDraftNumber(draftSpend);

  const weightPreviewTotal =
    draftKgNum != null && draftKgNum > 0 && hasPrice
      ? cartLineTotal(Number(formatCartQtyValue(draftKgNum)), priceNum)
      : null;

  const spendResolve =
    draftSpendNum != null && draftSpendNum > 0 && hasPrice
      ? resolveSpendLine(draftSpendNum, priceNum)
      : null;

  const canApplyWeight =
    draftKgNum != null && draftKgNum >= MIN_WEIGHTED_QTY;
  const canApplySpend = spendResolve != null;

  const wholeQty = Math.max(1, Math.floor(qNum + 1e-9));

  const panel =
    allowFractions && open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`Weigh or spend for ${itemLabel}`}
            className={cn(
              "fixed z-[80] w-[min(20rem,calc(100vw-1.5rem))]",
              "animate-in fade-in-0 zoom-in-95 duration-150",
              "rounded-2xl border border-border/60 bg-popover p-2.5 text-popover-foreground shadow-xl",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="mb-2 flex items-start gap-2 px-0.5">
              <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]">
                <Scale className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold leading-tight">
                  {itemLabel}
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {hasPrice
                    ? `${currencyLabel} ${priceNum.toFixed(2)} / kg · weigh or spend`
                    : "Weigh, spend, or cut a portion"}
                </p>
              </div>
            </div>

            <div
              className="mb-2 grid grid-cols-3 gap-0.5 rounded-xl bg-muted/35 p-0.5"
              role="tablist"
              aria-label="Entry mode"
            >
              {(
                [
                  { id: "weight" as const, label: "Weight" },
                  { id: "spend" as const, label: "Spend" },
                  { id: "cut" as const, label: "Cut" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={cn(
                    "rounded-[0.65rem] px-2 py-1.5 text-[11px] font-semibold transition-colors",
                    tab === t.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "weight" ? (
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Kilograms
                  </span>
                  <input
                    ref={kgInputRef}
                    type="text"
                    inputMode="decimal"
                    value={draftKg}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDraftKg(raw);
                      const n = parseDraftNumber(raw);
                      if (n != null && n > 0 && hasPrice) {
                        setDraftSpend(
                          String(
                            cartLineTotal(
                              Number(formatCartQtyValue(n)),
                              priceNum,
                            ),
                          ),
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canApplyWeight && draftKgNum) {
                        e.preventDefault();
                        applyQty(draftKgNum);
                      }
                    }}
                    className="h-10 w-full rounded-xl border border-border/55 bg-card px-3 text-[15px] font-bold tabular-nums outline-none focus-visible:border-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_25%,transparent)]"
                    aria-label="Weight in kilograms"
                  />
                </label>
                <p className="px-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {weightPreviewTotal != null ? (
                    <>
                      Charges{" "}
                      <span className="font-semibold text-foreground">
                        {currencyLabel} {weightPreviewTotal.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    "Enter a weight to see the price"
                  )}
                </p>
                <div className="flex flex-wrap gap-1">
                  {CART_KG_CHIPS.map((w) => {
                    const active =
                      draftKgNum != null && Math.abs(draftKgNum - w) < 0.0005;
                    return (
                      <button
                        key={w}
                        type="button"
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-[11px] font-bold tabular-nums transition-colors",
                          active
                            ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                            : "border-border/45 bg-card hover:border-border hover:bg-muted/35",
                        )}
                        onClick={() => applyQty(w)}
                      >
                        {formatCartQtyLabel(w)} kg
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={!canApplyWeight}
                  className="flex h-9 w-full items-center justify-center rounded-xl bg-[var(--pos-primary)] text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)] disabled:opacity-40"
                  onClick={() => {
                    if (draftKgNum != null) applyQty(draftKgNum);
                  }}
                >
                  Apply weight
                </button>
              </div>
            ) : null}

            {tab === "spend" ? (
              <div className="space-y-2">
                {!hasPrice ? (
                  <p className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                    Set a unit price on this line before spending by amount.
                  </p>
                ) : (
                  <>
                    <label className="block space-y-1">
                      <span className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Customer pays ({currencyLabel})
                      </span>
                      <input
                        ref={spendInputRef}
                        type="text"
                        inputMode="decimal"
                        value={draftSpend}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Keep the typed amount as-is (e.g. "20", never rewrite to 20.10).
                          setDraftSpend(raw);
                          const n = parseDraftNumber(raw);
                          if (n != null && n > 0) {
                            const hit = resolveSpendLine(n, priceNum);
                            if (hit) setDraftKg(hit.quantity);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canApplySpend && draftSpendNum) {
                            e.preventDefault();
                            applySpendAmount(draftSpendNum);
                          }
                        }}
                        className="h-10 w-full rounded-xl border border-border/55 bg-card px-3 text-[15px] font-bold tabular-nums outline-none focus-visible:border-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_25%,transparent)]"
                        aria-label={`Spend amount in ${currencyLabel}`}
                      />
                    </label>
                    <p className="px-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {spendResolve ? (
                        <>
                          Charges{" "}
                          <span className="font-semibold text-foreground">
                            {currencyLabel} {spendResolve.amount.toFixed(2)}
                          </span>
                          {" · "}
                          {spendResolve.quantity} kg
                        </>
                      ) : (
                        "Enter what the customer wants to spend"
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {CART_SPEND_CHIPS.map((a) => {
                        const active =
                          draftSpendNum != null &&
                          Math.abs(roundCartMoney2(draftSpendNum) - a) < 0.001;
                        return (
                          <button
                            key={a}
                            type="button"
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums transition-colors",
                              active
                                ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                                : "border-border/45 bg-card hover:border-border hover:bg-muted/35",
                            )}
                            onClick={() => {
                              setDraftSpend(String(a));
                              applySpendAmount(a);
                            }}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={!canApplySpend}
                      className="flex h-9 w-full items-center justify-center rounded-xl bg-[var(--pos-primary)] text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)] disabled:opacity-40"
                      onClick={() => {
                        if (draftSpendNum != null) applySpendAmount(draftSpendNum);
                      }}
                    >
                      {spendResolve
                        ? `Charge ${currencyLabel} ${spendResolve.amount.toFixed(2)}`
                        : "Apply spend"}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {tab === "cut" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1">
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
                        onClick={() => applyQty(v)}
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

                <div className="max-h-[12rem] space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
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
                                onClick={() => applyQty(p.value)}
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

                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    onClick={() => applyQty(1)}
                  >
                    Whole (1)
                  </button>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    Now {formatCartQtyLabel(quantity)} kg
                  </p>
                </div>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative shrink-0",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      aria-disabled={disabled || undefined}
    >
      <div
        className={cn(
          "inline-flex items-center border",
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40",
          size === "sm" && "rounded-lg border-border/55 bg-muted/10",
        )}
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50",
            btn,
          )}
          aria-label={
            (allowFractions ? qNum : wholeQty) <= 1
              ? `Remove ${itemLabel}`
              : "Decrease quantity"
          }
          onClick={() => {
            if (disabled) return;
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
            disabled={disabled}
            className={cn(
              labelMin,
              "px-0.5 text-center text-xs font-bold tabular-nums leading-none",
              "text-foreground underline-offset-2 hover:underline disabled:no-underline",
              open && "text-[var(--pos-primary)]",
            )}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            title="Weigh, spend, or cut a portion"
            onClick={() => {
              if (open) setOpen(false);
              else openPanel("weight");
            }}
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
          disabled={disabled}
          className={cn(
            "flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50",
            btn,
          )}
          aria-label="Increase quantity"
          onClick={() => {
            if (disabled) return;
            onChange(
              allowFractions
                ? formatCartQtyValue(qNum + 1)
                : String(wholeQty + 1),
            );
          }}
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
            aria-label={`Weigh or spend ${itemLabel}`}
            aria-expanded={open}
            aria-controls={panelId}
            title="Weight / spend / portion"
            onClick={() => {
              if (open) setOpen(false);
              else openPanel("spend");
            }}
          >
            <Scale className="size-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      {panel}
    </div>
  );
}

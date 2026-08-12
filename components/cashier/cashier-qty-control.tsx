"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Check, Minus, Plus, Scale, X } from "lucide-react";

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
type DriveAxis = "weight" | "spend";

/** Round money the same way the till posts sales. */
export function roundCartMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Spend→weight uses 2 dp kg (still within the sale API’s 3 dp cap). */
export const SPEND_WEIGHT_DECIMALS = 2;
const SPEND_QTY_FACTOR = 10 ** SPEND_WEIGHT_DECIMALS;
const MIN_SPEND_QTY = 1 / SPEND_QTY_FACTOR;

const LIVE_SYNC_MS = 120;

/** Round / stringify qty for cart lines (≤3 dp — sale API weighed limit). */
export function formatCartQtyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "1";
  const rounded = Math.round(n * QTY_FACTOR) / QTY_FACTOR;
  if (rounded <= 0) return MIN_WEIGHTED_QTY.toFixed(WEIGHTED_QTY_DECIMALS);
  return String(Number(rounded.toFixed(WEIGHTED_QTY_DECIMALS)));
}

/** Round / stringify spend-derived weight (exactly 2 dp). */
export function formatSpendQtyValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    return MIN_SPEND_QTY.toFixed(SPEND_WEIGHT_DECIMALS);
  }
  const rounded = Math.round(n * SPEND_QTY_FACTOR) / SPEND_QTY_FACTOR;
  if (rounded <= 0) return MIN_SPEND_QTY.toFixed(SPEND_WEIGHT_DECIMALS);
  return rounded.toFixed(SPEND_WEIGHT_DECIMALS);
}

/**
 * Customer pays exactly `amount`. Weight = round2(amount / shelfRate).
 * Unit price is nudged so qty × unitPrice rounds to that same amount.
 */
export function resolveSpendLine(
  amount: number,
  shelfUnitPrice: number,
): { quantity: string; unitPrice: string; amount: number; qty: number } | null {
  if (!(amount > 0) || !(shelfUnitPrice > 0)) return null;
  if (!Number.isFinite(amount) || !Number.isFinite(shelfUnitPrice)) return null;

  const target = roundCartMoney2(amount);
  if (target <= 0) return null;

  let qty =
    Math.round((target / shelfUnitPrice) * SPEND_QTY_FACTOR) / SPEND_QTY_FACTOR;
  if (qty < MIN_SPEND_QTY) qty = MIN_SPEND_QTY;

  const unitPrice = target / qty;
  for (const dp of [2, 3, 4, 6] as const) {
    const candidate = Number(unitPrice.toFixed(dp));
    if (candidate > 0 && roundCartMoney2(qty * candidate) === target) {
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
  if (
    !(qty > 0) ||
    !(unitPrice >= 0) ||
    !Number.isFinite(qty) ||
    !Number.isFinite(unitPrice)
  ) {
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
  const [tab, setTab] = useState<BalanceTab>("spend");
  const [drive, setDrive] = useState<DriveAxis>("spend");
  const [draftKg, setDraftKg] = useState("");
  const [draftSpend, setDraftSpend] = useState("");
  const [livePulse, setLivePulse] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const kgInputRef = useRef<HTMLInputElement>(null);
  const spendInputRef = useRef<HTMLInputElement>(null);
  const shelfRateRef = useRef(0);
  const syncTimerRef = useRef<number | null>(null);
  const panelId = useId();
  const qty = Number(quantity);
  const qNum = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const priceNum = Number(unitPrice);
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
  const btn = size === "sm" ? "size-9" : "size-10";
  const labelMin = size === "sm" ? "min-w-[1.75rem]" : "min-w-[1.85rem]";
  const currencyLabel = currency.trim() || "KES";
  const shelfRate =
    shelfRateRef.current > 0 ? shelfRateRef.current : hasPrice ? priceNum : 0;

  const clearSyncTimer = () => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  };

  const pushLiveWeight = useEffectEvent((kg: number) => {
    if (!allowFractions || !(kg >= MIN_WEIGHTED_QTY)) return;
    onChange(formatCartQtyValue(kg));
    setLivePulse((n) => n + 1);
  });

  const pushLiveSpend = useEffectEvent((amount: number) => {
    if (!allowFractions || !(shelfRate > 0)) return;
    const line = resolveSpendLine(amount, shelfRate);
    if (!line) return;
    onChange(line.quantity);
    onUnitPriceChange?.(line.unitPrice);
    setLivePulse((n) => n + 1);
  });

  const scheduleLiveWeight = (kg: number) => {
    clearSyncTimer();
    syncTimerRef.current = window.setTimeout(() => {
      pushLiveWeight(kg);
    }, LIVE_SYNC_MS);
  };

  const scheduleLiveSpend = (amount: number) => {
    clearSyncTimer();
    syncTimerRef.current = window.setTimeout(() => {
      pushLiveSpend(amount);
    }, LIVE_SYNC_MS);
  };

  const syncDraftsFromLine = (nextQty: number, rate: number) => {
    const safe = nextQty > 0 ? nextQty : MIN_WEIGHTED_QTY;
    setDraftKg(formatCartQtyValue(safe));
    if (rate > 0) {
      setDraftSpend(String(cartLineTotal(safe, rate)));
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
      const panelW = 340;
      const margin = 8;
      const left = Math.min(
        Math.max(margin, rect.right - panelW),
        window.innerWidth - panelW - margin,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferBelow = spaceBelow > 360;
      setCoords({
        top: preferBelow ? rect.bottom + 8 : Math.max(margin, rect.top - 8),
        left,
      });
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel || !rootRef.current) return;
        const h = panel.getBoundingClientRect().height;
        const r = rootRef.current.getBoundingClientRect();
        if (preferBelow && r.bottom + 8 + h > window.innerHeight - margin) {
          setCoords({ top: Math.max(margin, r.top - h - 8), left });
        } else if (!preferBelow) {
          setCoords({ top: Math.max(margin, r.top - h - 8), left });
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
  }, [open, tab, draftKg, draftSpend]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      clearSyncTimer();
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSyncTimer();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      clearSyncTimer();
      return;
    }
    const t = window.setTimeout(() => {
      if (tab === "weight" || (tab === "spend" && drive === "weight")) {
        kgInputRef.current?.focus();
        kgInputRef.current?.select();
      } else if (tab === "spend") {
        spendInputRef.current?.focus();
        spendInputRef.current?.select();
      }
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, tab, drive]);

  useEffect(() => () => clearSyncTimer(), []);

  const openPanel = (nextTab: BalanceTab = "spend") => {
    if (disabled) return;
    const rate = hasPrice ? priceNum : 0;
    shelfRateRef.current = rate;
    syncDraftsFromLine(qNum > 0 ? qNum : 1, rate);
    setTab(nextTab);
    setDrive(nextTab === "weight" ? "weight" : "spend");
    setOpen(true);
  };

  const closePanel = () => {
    clearSyncTimer();
    setOpen(false);
  };

  const commitWeightNow = (kg: number) => {
    clearSyncTimer();
    if (!(kg >= MIN_WEIGHTED_QTY)) return;
    const qtyStr = formatCartQtyValue(kg);
    setDraftKg(qtyStr);
    if (shelfRate > 0) {
      setDraftSpend(String(cartLineTotal(Number(qtyStr), shelfRate)));
    }
    onChange(qtyStr);
    setLivePulse((n) => n + 1);
  };

  const commitSpendNow = (amount: number) => {
    clearSyncTimer();
    if (!(shelfRate > 0)) return;
    const line = resolveSpendLine(amount, shelfRate);
    if (!line) return;
    setDraftSpend(String(line.amount));
    setDraftKg(line.quantity);
    onChange(line.quantity);
    onUnitPriceChange?.(line.unitPrice);
    setLivePulse((n) => n + 1);
  };

  const applyQty = (value: number) => {
    if (!allowFractions) return;
    commitWeightNow(value);
    // Stay open so cashier can tweak; slip already updated.
    setTab("weight");
    setDrive("weight");
  };

  const applySpendChip = (amount: number) => {
    setDraftSpend(String(amount));
    setDrive("spend");
    setTab("spend");
    commitSpendNow(amount);
  };

  const draftKgNum = parseDraftNumber(draftKg);
  const draftSpendNum = parseDraftNumber(draftSpend);

  const weightPreviewTotal =
    draftKgNum != null && draftKgNum > 0 && shelfRate > 0
      ? cartLineTotal(Number(formatCartQtyValue(draftKgNum)), shelfRate)
      : null;

  const spendResolve =
    draftSpendNum != null && draftSpendNum > 0 && shelfRate > 0
      ? resolveSpendLine(draftSpendNum, shelfRate)
      : null;

  const slipKg =
    tab === "spend" && spendResolve
      ? spendResolve.quantity
      : draftKgNum != null && draftKgNum > 0
        ? formatCartQtyValue(draftKgNum)
        : formatCartQtyLabel(quantity);
  const slipKes =
    tab === "spend" && spendResolve
      ? spendResolve.amount
      : weightPreviewTotal != null
        ? weightPreviewTotal
        : hasPrice
          ? cartLineTotal(qNum, priceNum)
          : null;

  const wholeQty = Math.max(1, Math.floor(qNum + 1e-9));

  const panel =
    allowFractions && open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`Scale for ${itemLabel}`}
            className={cn(
              "fixed z-[80] w-[min(21.25rem,calc(100vw-1.25rem))]",
              "origin-top animate-in fade-in-0 zoom-in-95 duration-200",
              "overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
              "bg-[color-mix(in_srgb,var(--popover)_96%,var(--pos-primary)_4%)] text-popover-foreground",
              "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45),0_8px_16px_-10px_rgba(0,0,0,0.2)]",
              "dark:border-border/50",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {/* Scale beam header */}
            <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 pb-3 pt-3 dark:border-border/40">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-80"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 90% at 50% -10%, color-mix(in srgb, var(--pos-primary) 22%, transparent), transparent 70%)",
                }}
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">
                    {itemLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {shelfRate > 0
                      ? `${currencyLabel} ${shelfRate.toFixed(2)} / kg`
                      : "Set a price to spend by amount"}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Close scale"
                  onClick={closePanel}
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Twin readouts — the balance */}
              <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTab("weight");
                    setDrive("weight");
                    requestAnimationFrame(() => {
                      kgInputRef.current?.focus();
                      kgInputRef.current?.select();
                    });
                  }}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-left transition-all duration-200",
                    drive === "weight" && tab !== "cut"
                      ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] shadow-[0_6px_16px_-10px_color-mix(in_srgb,var(--pos-primary)_55%,transparent)]"
                      : "border-border/45 bg-card/80 hover:border-border",
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Weight
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold tabular-nums leading-none tracking-tight">
                    {slipKg}
                    <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                      kg
                    </span>
                  </p>
                </button>

                <div className="flex flex-col items-center justify-center gap-1 px-0.5">
                  <span
                    key={livePulse}
                    className="flex size-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)] animate-pos-scale-tick"
                  >
                    <ArrowLeftRight className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    live
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTab("spend");
                    setDrive("spend");
                    requestAnimationFrame(() => {
                      spendInputRef.current?.focus();
                      spendInputRef.current?.select();
                    });
                  }}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-left transition-all duration-200",
                    drive === "spend" && tab !== "cut"
                      ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] shadow-[0_6px_16px_-10px_color-mix(in_srgb,var(--pos-primary)_55%,transparent)]"
                      : "border-border/45 bg-card/80 hover:border-border",
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Pays
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold tabular-nums leading-none tracking-tight">
                    {slipKes != null ? slipKes : "—"}
                    <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                      {currencyLabel}
                    </span>
                  </p>
                </button>
              </div>

              <div
                key={`slip-${livePulse}`}
                className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium text-[var(--pos-primary)] animate-pos-scale-tick"
              >
                <Check className="size-3" strokeWidth={2.75} />
                Updating cart as you type
              </div>
            </div>

            <div className="p-2.5">
              <div
                className="mb-2.5 grid grid-cols-3 gap-0.5 rounded-xl bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] p-0.5 dark:bg-muted/40"
                role="tablist"
                aria-label="Entry mode"
              >
                {(
                  [
                    { id: "spend" as const, label: "Spend" },
                    { id: "weight" as const, label: "Weight" },
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
                    onClick={() => {
                      setTab(t.id);
                      if (t.id !== "cut") setDrive(t.id);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "weight" ? (
                <div className="space-y-2.5">
                  <label className="block">
                    <span className="sr-only">Kilograms</span>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border bg-card px-3 transition-shadow",
                        drive === "weight"
                          ? "border-[var(--pos-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pos-primary)_18%,transparent)]"
                          : "border-border/50",
                      )}
                    >
                      <Scale
                        className="size-4 shrink-0 text-[var(--pos-primary)]"
                        aria-hidden
                      />
                      <input
                        ref={kgInputRef}
                        type="text"
                        inputMode="decimal"
                        value={draftKg}
                        onFocus={() => setDrive("weight")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDraftKg(raw);
                          setDrive("weight");
                          const n = parseDraftNumber(raw);
                          if (n != null && n > 0) {
                            if (shelfRate > 0) {
                              setDraftSpend(
                                String(
                                  cartLineTotal(
                                    Number(formatCartQtyValue(n)),
                                    shelfRate,
                                  ),
                                ),
                              );
                            }
                            scheduleLiveWeight(n);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && draftKgNum != null) {
                            e.preventDefault();
                            commitWeightNow(draftKgNum);
                            closePanel();
                          }
                        }}
                        className="h-12 w-full bg-transparent text-[22px] font-bold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/50"
                        placeholder="0.00"
                        aria-label="Weight in kilograms"
                      />
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        kg
                      </span>
                    </div>
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    {CART_KG_CHIPS.map((w) => {
                      const active =
                        draftKgNum != null &&
                        Math.abs(draftKgNum - w) < 0.0005;
                      return (
                        <button
                          key={w}
                          type="button"
                          className={cn(
                            "h-10 rounded-xl border text-[12px] font-bold tabular-nums transition-colors active:scale-[0.98]",
                            active
                              ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]"
                              : "border-border/45 bg-card hover:border-border hover:bg-muted/30",
                          )}
                          onClick={() => applyQty(w)}
                        >
                          {formatCartQtyLabel(w)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {tab === "spend" ? (
                <div className="space-y-2.5">
                  {!hasPrice && shelfRate <= 0 ? (
                    <p className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
                      Set a unit price on this line before spending by amount.
                    </p>
                  ) : (
                    <>
                      <label className="block">
                        <span className="sr-only">
                          Customer pays ({currencyLabel})
                        </span>
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border bg-card px-3 transition-shadow",
                            drive === "spend"
                              ? "border-[var(--pos-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pos-primary)_18%,transparent)]"
                              : "border-border/50",
                          )}
                        >
                          <span className="text-[12px] font-bold text-[var(--pos-primary)]">
                            {currencyLabel}
                          </span>
                          <input
                            ref={spendInputRef}
                            type="text"
                            inputMode="decimal"
                            value={draftSpend}
                            onFocus={() => setDrive("spend")}
                            onChange={(e) => {
                              const raw = e.target.value;
                              // Keep typed amount as-is (never rewrite 20 → 20.10).
                              setDraftSpend(raw);
                              setDrive("spend");
                              const n = parseDraftNumber(raw);
                              if (n != null && n > 0 && shelfRate > 0) {
                                const hit = resolveSpendLine(n, shelfRate);
                                if (hit) setDraftKg(hit.quantity);
                                scheduleLiveSpend(n);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && draftSpendNum != null) {
                                e.preventDefault();
                                commitSpendNow(draftSpendNum);
                                closePanel();
                              }
                            }}
                            className="h-12 w-full bg-transparent text-[22px] font-bold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/50"
                            placeholder="0"
                            aria-label={`Spend amount in ${currencyLabel}`}
                          />
                        </div>
                      </label>

                      <div className="grid grid-cols-4 gap-1.5">
                        {CART_SPEND_CHIPS.map((a) => {
                          const active =
                            draftSpendNum != null &&
                            Math.abs(roundCartMoney2(draftSpendNum) - a) <
                              0.001;
                          return (
                            <button
                              key={a}
                              type="button"
                              className={cn(
                                "h-11 rounded-xl border text-[13px] font-bold tabular-nums transition-colors active:scale-[0.98]",
                                active
                                  ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]"
                                  : "border-border/45 bg-card hover:border-border hover:bg-muted/30",
                              )}
                              onClick={() => applySpendChip(a)}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {tab === "cut" ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-4 gap-1.5">
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
                            "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-colors active:scale-[0.98]",
                            active
                              ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]"
                              : "border-border/50 bg-card hover:border-border hover:bg-muted/30",
                          )}
                          onClick={() => applyQty(v)}
                        >
                          <PortionPie value={v} className="size-5" />
                          <span className="text-[14px] font-bold leading-none">
                            {meta?.label ?? formatCartQtyLabel(v)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-[11rem] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
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
                          <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {group.title}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {unique.map((p) => {
                              const active = Math.abs(qNum - p.value) < 0.0005;
                              return (
                                <button
                                  key={`${group.id}-${p.label}-${p.value}`}
                                  type="button"
                                  title={p.hint}
                                  className={cn(
                                    "inline-flex min-w-[2.4rem] items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] font-bold tabular-nums transition-colors",
                                    active
                                      ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                                      : "border-border/45 bg-card hover:border-border hover:bg-muted/30",
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
                </div>
              ) : null}

              <button
                type="button"
                className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--pos-primary)] text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99]"
                onClick={closePanel}
              >
                <Check className="size-3.5" strokeWidth={2.75} />
                Done — already on the slip
              </button>
            </div>
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
          open &&
            "border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]",
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
            title="Open scale — updates the cart live"
            onClick={() => {
              if (open) closePanel();
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
            aria-label={`Open scale for ${itemLabel}`}
            aria-expanded={open}
            aria-controls={panelId}
            title="Spend or weigh — live on the slip"
            onClick={() => {
              if (open) closePanel();
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

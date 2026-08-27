"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Banknote, Building2, Coins, DoorClosed, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DashboardFeedback,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { useOptionalDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import {
  fetchLastClosedShiftFloat,
  fetchShiftDetail,
  fetchShiftDrawouts,
  initiateDrawout,
  patchShiftOpening,
  postCloseShift,
  postOpenShift,
  type BranchRecord,
  type DenominationEntry,
  type DenominationRecord,
  type DrawoutRecord,
  type ShiftRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { DrawoutApprovalActions } from "@/components/shifts/drawout-approval-actions";
import {
  clearCloseShiftDraft,
  clearOpenShiftDraft,
  loadCloseShiftDraft,
  loadOpenShiftDraft,
  openShiftDraftHasProgress,
  closeShiftDraftHasProgress,
  persistedQuantitiesToRecord,
  quantitiesRecordToPersisted,
  saveCloseShiftDraft,
  saveOpenShiftDraft,
} from "@/lib/shift-draft-storage";
import { isPrefillOpeningFromLastCloseEnabled } from "@/lib/shift-settings";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Centered shift / cash modals — marketplace paper shelf grammar. */
const SHIFT_MODAL_CONTENT = cn(
  "flex max-h-[min(92dvh,40rem)] w-full max-w-2xl flex-col gap-0 overflow-hidden overscroll-contain !rounded-none p-0",
  "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)]",
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_42%,var(--card))]",
  "shadow-[4px_4px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
);

const SHIFT_MODAL_HEADER = cn(
  "shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
  "bg-[var(--pos-primary,#0f766e)] px-3 py-2 sm:px-4",
  "text-[var(--pos-primary-ink,#fff)]",
);

const SHIFT_MODAL_ICON = cn(
  "flex size-7 shrink-0 items-center justify-center rounded-none border border-white/30",
  "bg-white/10 text-[var(--pos-primary-ink,#fff)]",
);

/** Tight body so the denomination grid fits without scrolling. */
const SHIFT_MODAL_BODY =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4";

const SHIFT_MODAL_SECTION = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
  "bg-[color-mix(in_srgb,#fff_88%,var(--pos-paper,#f1ece3))] overflow-hidden p-0",
  "shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
);

const SHIFT_MODAL_SECTION_TITLE = cn(
  "text-[9px] font-bold uppercase tracking-[0.12em]",
  "text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]",
);

const SHIFT_MODAL_FOOTER = cn(
  "shrink-0 gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] px-3 py-2 sm:px-4",
);

const SHIFT_MODAL_BTN_OUTLINE = cn(
  "rounded-none border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
  "bg-[color-mix(in_srgb,#fff_80%,var(--pos-paper,#f1ece3))]",
  "text-[var(--pos-ink,#1c1915)] shadow-none",
  "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_85%,transparent)]",
);

const SHIFT_MODAL_BTN_PRIMARY = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)]",
  "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
  "shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
  "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]",
  "active:translate-x-px active:translate-y-px active:shadow-none",
);

const SHIFT_MODAL_CLOSE = cn(
  "absolute right-2.5 top-2.5 z-50 inline-flex size-7 items-center justify-center rounded-none",
  "border border-white/30 bg-white/10 text-[var(--pos-primary-ink,#fff)]",
  "transition-colors hover:bg-white/20",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
);

function ShiftModalClose() {
  return (
    <DialogClose aria-label="Close" className={SHIFT_MODAL_CLOSE}>
      <X className="size-3.5" strokeWidth={2.25} />
    </DialogClose>
  );
}

/** Sharp shelf fields — overrides dashboard rounded-md / soft rings. */
function shiftFieldClass(disabled?: boolean, className?: string) {
  return dashboardInputClass(
    disabled,
    cn(
      "rounded-none shadow-none",
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)]",
      "bg-[color-mix(in_srgb,#fff_92%,var(--pos-paper,#f1ece3))]",
      "text-[var(--pos-ink,#1c1915)]",
      "placeholder:text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_38%,transparent)]",
      "focus-visible:border-[var(--pos-primary,#0f766e)]",
      "focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/25",
      "focus-visible:ring-offset-0",
      className,
    ),
  );
}

function shiftSelectClass(disabled?: boolean, className?: string) {
  return dashboardSelectClass(
    disabled,
    cn(
      "rounded-none shadow-none",
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)]",
      "bg-[color-mix(in_srgb,#fff_92%,var(--pos-paper,#f1ece3))]",
      "focus-visible:border-[var(--pos-primary,#0f766e)]",
      "focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/25",
      "focus-visible:ring-offset-0",
      className,
    ),
  );
}

const DENOM_STEPPER_BTN = cn(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-none border",
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_75%,#fff)]",
  "text-[var(--pos-ink,#1c1915)]",
  "shadow-[1px_1px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
  "transition-[background-color,border-color,box-shadow,transform] duration-150",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)]",
  "hover:bg-[color-mix(in_srgb,#fff_90%,var(--pos-paper,#f1ece3))]",
  "active:translate-x-px active:translate-y-px active:shadow-none",
  "active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35",
  "disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none",
);

function shortDenomLabel(value: number): string {
  return value.toLocaleString("en-KE");
}

/** All Kenyan KES denominations in display order (largest first). */
export const KES_DENOMINATIONS = [
  { value: 1000, type: "NOTE", label: "KES 1,000" },
  { value: 500, type: "NOTE", label: "KES 500" },
  { value: 200, type: "NOTE", label: "KES 200" },
  { value: 100, type: "NOTE", label: "KES 100" },
  { value: 50, type: "NOTE", label: "KES 50" },
  { value: 40, type: "COIN", label: "KES 40" },
  { value: 20, type: "COIN", label: "KES 20" },
  { value: 10, type: "COIN", label: "KES 10" },
  { value: 5, type: "COIN", label: "KES 5" },
  { value: 1, type: "COIN", label: "KES 1" },
] as const;

/** Note/coin breakdown is only defined for KES today — hide for other currencies. */
export function supportsCashDenominationBreakdown(
  currency?: string | null,
): boolean {
  return resolveCurrencyCode(currency) === "KES";
}

export const VARIANCE_THRESHOLD_AMBER = 1;
export const VARIANCE_THRESHOLD_RED = 500;
export function moneyStr(
  v: number | string | null | undefined,
  currency?: string | null,
): string {
  return formatMoney(v, currency);
}
export function varianceColor(v: number | string | null | undefined): string {
  if (v == null) return "text-muted-foreground";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "text-muted-foreground";
  const abs = Math.abs(n);
  if (abs === 0) return "text-emerald-600 dark:text-emerald-400";
  if (abs < VARIANCE_THRESHOLD_RED) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
export function denomTotal(denoms: DenominationRecord[] | undefined): number {
  if (!denoms) return 0;
  return denoms.reduce(
    (sum, d) => sum + (typeof d.total === "number" ? d.total : Number(d.total)),
    0,
  );
}

export function createEmptyDenominationQuantities(): Record<number, number> {
  const map: Record<number, number> = {};
  for (const d of KES_DENOMINATIONS) map[d.value] = 0;
  return map;
}

export function quantitiesToEntries(qty: Record<number, number>): DenominationEntry[] {
  return Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([denom, q]) => ({
      denomination: Number(denom),
      denominationType:
        KES_DENOMINATIONS.find((d) => d.value === Number(denom))?.type ??
        "COIN",
      quantity: q,
    }));
}

export function denomsToQuantities(
  denoms: DenominationRecord[] | undefined,
): Record<number, number> {
  const map = createEmptyDenominationQuantities();
  if (denoms) {
    for (const d of denoms) {
      map[d.denomination] = d.quantity;
    }
  }
  return map;
}
/** Denomination input row — compact qty steppers. */
export function DenominationRow({
  denomValue,
  label,
  quantity,
  onChange,
  autoFocus,
  readOnly,
}: {
  denomValue: number;
  label: string;
  quantity: number;
  onChange?: (val: number) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
}) {
  const total = denomValue * quantity;
  const hasQty = quantity > 0;
  const editable = !readOnly && !!onChange;
  const shortLabel = shortDenomLabel(denomValue);

  const setQty = (next: number) => {
    if (!onChange) return;
    onChange(Math.max(0, Math.floor(next)));
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[3rem_6.5rem_minmax(0,1fr)] items-center gap-1 px-1.5 py-px",
        "border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] last:border-b-0",
        "transition-[background-color] duration-150",
        hasQty
          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
          : "bg-transparent hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]",
      )}
    >
      <p
        className="truncate font-mono text-[11px] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)] sm:text-[12px]"
        title={label}
      >
        {shortLabel}
      </p>

      <div className="flex w-[6.5rem] shrink-0 items-center justify-between gap-0.5">
        {editable ? (
          <button
            type="button"
            className={DENOM_STEPPER_BTN}
            aria-label={`Decrease ${label}`}
            disabled={quantity <= 0}
            onClick={() => setQty(quantity - 1)}
          >
            <Minus className="size-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          autoFocus={autoFocus}
          disabled={readOnly}
          aria-label={`${label} quantity`}
          className={shiftFieldClass(
            readOnly,
            cn(
              "h-6 w-10 shrink-0 px-0.5 py-0 text-center text-[11px] font-semibold tabular-nums",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              hasQty &&
                "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,#fff_94%,transparent)]",
            ),
          )}
          value={quantity || ""}
          placeholder="0"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setQty(Number.isFinite(v) && v >= 0 ? v : 0);
          }}
        />
        {editable ? (
          <button
            type="button"
            className={DENOM_STEPPER_BTN}
            aria-label={`Increase ${label}`}
            onClick={() => setQty(quantity + 1)}
          >
            <Plus className="size-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
      </div>

      <span
        className={cn(
          "min-w-0 truncate text-right font-mono text-[10px] tabular-nums",
          hasQty
            ? "font-semibold text-[var(--pos-ink,#1c1915)]"
            : "text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
        )}
      >
        {hasQty ? moneyStr(total) : "—"}
      </span>
    </div>
  );
}

function DenominationGroup({
  title,
  icon,
  total,
  children,
}: {
  title: string;
  icon: ReactNode;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-1 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_72%,transparent)] px-1.5 py-0.5">
        <div className="flex items-center gap-1">
          <span
            className="flex size-4 items-center justify-center text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          >
            {icon}
          </span>
          <h5 className={SHIFT_MODAL_SECTION_TITLE}>{title}</h5>
        </div>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
          {moneyStr(total)}
        </span>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Denomination table for opening/closing counts. */
export function DenominationTable({
  title,
  quantities,
  onChange,
  readOnly,
}: {
  title: string;
  quantities: Record<number, number>;
  onChange?: (qty: Record<number, number>) => void;
  readOnly?: boolean;
}) {
  const notes = KES_DENOMINATIONS.filter((d) => d.type === "NOTE");
  const coins = KES_DENOMINATIONS.filter((d) => d.type === "COIN");

  const notesTotal = notes.reduce(
    (sum, d) => sum + d.value * (quantities[d.value] || 0),
    0,
  );
  const coinsTotal = coins.reduce(
    (sum, d) => sum + d.value * (quantities[d.value] || 0),
    0,
  );
  const grandTotal = notesTotal + coinsTotal;

  const renderRows = (
    denoms: readonly { value: number; type: string; label: string }[],
    startIndex: number,
  ) =>
    denoms.map((denom, i) => (
      <DenominationRow
        key={denom.value}
        denomValue={denom.value}
        label={denom.label}
        quantity={quantities[denom.value] || 0}
        readOnly={readOnly}
        onChange={
          readOnly || !onChange
            ? undefined
            : (val) => onChange({ ...quantities, [denom.value]: val })
        }
        autoFocus={startIndex + i === 0 && !readOnly}
      />
    ));

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[var(--pos-primary,#0f766e)] px-2 py-1.5 text-[var(--pos-primary-ink,#fff)]">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--pos-primary-ink,#fff)]/75">
          {title}
        </p>
        <p
          key={grandTotal}
          className="font-heading text-base font-semibold tabular-nums tracking-tight animate-in fade-in duration-150 sm:text-lg"
        >
          {moneyStr(grandTotal)}
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
        <DenominationGroup
          title="Notes"
          icon={<Banknote className="size-3" strokeWidth={2.25} />}
          total={notesTotal}
        >
          {renderRows(notes, 0)}
        </DenominationGroup>

        <DenominationGroup
          title="Coins"
          icon={<Coins className="size-3" strokeWidth={2.25} />}
          total={coinsTotal}
        >
          {renderRows(coins, notes.length)}
        </DenominationGroup>
      </div>
    </div>
  );
}

/** Simple cash total field for non-KES currencies. */
function CashTotalField({
  label,
  valueStr,
  onChange,
  autoFocus,
  footer,
}: {
  label: string;
  valueStr: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
  footer?: ReactNode;
}) {
  const numeric = Number(valueStr);
  const safe = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;

  return (
    <div className="space-y-2 p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className={SHIFT_MODAL_SECTION_TITLE}>{label}</h4>
        <p className="font-heading text-base font-semibold tabular-nums tracking-tight text-[var(--pos-primary,#0f766e)] sm:text-lg">
          {moneyStr(safe)}
        </p>
      </div>
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className={shiftFieldClass(
          false,
          "h-10 text-sm font-semibold tabular-nums",
        )}
        value={valueStr}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        autoFocus={autoFocus}
      />
      {footer}
    </div>
  );
}

export function OpenShiftModal({
  open,
  onClose,
  branches,
  onOpened,
  preferredBranchId,
  lockBranchSelectionTo,
}: {
  open: boolean;
  onClose: () => void;
  branches: BranchRecord[];
  onOpened: (shift: ShiftRecord) => void;
  /** When opening from POS deep link, pre-select this branch if valid. */
  preferredBranchId?: string | null;
  /** When set (e.g. cashier), branch/register cannot be changed. */
  lockBranchSelectionTo?: string | null;
}) {
  const featureFlags = useFeatureFlags();
  const dashboard = useOptionalDashboard();
  const currency = resolveCurrencyCode(dashboard?.business?.currency);
  const useDenomBreakdown = supportsCashDenominationBreakdown(currency);
  const prefillFromLastClose =
    isPrefillOpeningFromLastCloseEnabled(featureFlags);
  const businessId = dashboard?.business?.id?.trim() ?? "";
  const userId = dashboard?.me?.id?.trim() ?? "";

  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>(
    createEmptyDenominationQuantities(),
  );
  const [cashTotalStr, setCashTotalStr] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefillBusy, setPrefillBusy] = useState(false);
  const [prefillHint, setPrefillHint] = useState<string | null>(null);
  /** When true, skip last-close API prefill — user draft takes priority. */
  const [skipPrefillFromDraft, setSkipPrefillFromDraft] = useState(false);
  const skipPersistRef = useRef(true);

  const lockedBranch = lockBranchSelectionTo?.trim() ?? "";

  // Restore draft or reset when modal opens.
  useEffect(() => {
    if (!open) return;
    skipPersistRef.current = true;

    const draft = loadOpenShiftDraft(businessId, userId);
    const draftHasEntry =
      draft != null && openShiftDraftHasProgress(draft);

    const lockedOrPreferred =
      lockedBranch && branches.some((b) => b.id === lockedBranch)
        ? lockedBranch
        : preferredBranchId?.trim() &&
            branches.some((b) => b.id === preferredBranchId.trim())
          ? preferredBranchId.trim()
          : "";

    if (draftHasEntry && draft) {
      const draftBranch =
        draft.branchId.trim() &&
        branches.some((b) => b.id === draft.branchId.trim())
          ? draft.branchId.trim()
          : "";
      setBranchId(lockedBranch || draftBranch || lockedOrPreferred);
      setNotes(draft.notes ?? "");
      setQuantities({
        ...createEmptyDenominationQuantities(),
        ...persistedQuantitiesToRecord(draft.quantities),
      });
      setCashTotalStr(draft.cashTotalStr ?? "");
      setSkipPrefillFromDraft(true);
      setPrefillHint("Restored your unfinished opening count.");
    } else {
      setBranchId(lockedOrPreferred);
      setNotes("");
      setQuantities(createEmptyDenominationQuantities());
      setCashTotalStr("");
      setSkipPrefillFromDraft(false);
      setPrefillHint(null);
    }

    setError("");
    setLoading(false);
    setPrefillBusy(false);

    // Allow persist after this open-cycle hydrate settles.
    const t = window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, preferredBranchId, branches, lockedBranch, businessId, userId]);

  // Prefill from last closed shift when admin has enabled the option.
  useEffect(() => {
    if (
      !open ||
      !prefillFromLastClose ||
      !branchId ||
      !useDenomBreakdown ||
      skipPrefillFromDraft
    ) {
      return;
    }
    let cancelled = false;
    setPrefillBusy(true);
    setPrefillHint(null);
    void fetchLastClosedShiftFloat(branchId)
      .then((last) => {
        if (cancelled) return;
        const denoms = last.closingDenominations ?? [];
        if (!last.shiftId || denoms.length === 0) {
          setQuantities(createEmptyDenominationQuantities());
          setPrefillHint(
            "No previous closing count found for this register — enter the float manually.",
          );
          return;
        }
        setQuantities(denomsToQuantities(denoms));
        const when = last.closedAt
          ? new Date(last.closedAt).toLocaleString()
          : "last close";
        setPrefillHint(
          `Pre-filled from last closing count (${when}). Edit any denomination if needed.`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setQuantities(createEmptyDenominationQuantities());
        setPrefillHint(
          "Could not load last closing count — enter the float manually.",
        );
      })
      .finally(() => {
        if (!cancelled) setPrefillBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    prefillFromLastClose,
    branchId,
    useDenomBreakdown,
    skipPrefillFromDraft,
  ]);

  // Persist unfinished opening count while the modal is open.
  useEffect(() => {
    if (!open || !businessId || !userId || skipPersistRef.current) {
      return;
    }
    const draft = {
      v: 1 as const,
      updatedAt: Date.now(),
      businessId,
      userId,
      branchId,
      notes,
      quantities: quantitiesRecordToPersisted(quantities),
      cashTotalStr,
    };
    if (openShiftDraftHasProgress(draft)) {
      saveOpenShiftDraft(draft);
    } else {
      clearOpenShiftDraft(businessId, userId);
    }
  }, [
    open,
    businessId,
    userId,
    branchId,
    notes,
    quantities,
    cashTotalStr,
  ]);

  const totalCash = useMemo(() => {
    if (!useDenomBreakdown) {
      const n = Number(cashTotalStr);
      return Number.isFinite(n) ? n : 0;
    }
    return KES_DENOMINATIONS.reduce(
      (sum, d) => sum + d.value * (quantities[d.value] || 0),
      0,
    );
  }, [useDenomBreakdown, cashTotalStr, quantities]);

  const handleOpen = useCallback(async () => {
    if (!branchId) {
      setError("Please select a branch/register.");
      return;
    }
    if (totalCash <= 0) {
      setError(
        useDenomBreakdown
          ? "Please enter at least one denomination quantity."
          : "Please enter the opening cash total.",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const entries = useDenomBreakdown
        ? quantitiesToEntries(quantities)
        : [];
      const shift = await postOpenShift({
        branchId,
        openingCash: totalCash,
        notes: notes.trim() || null,
        denominations: entries.length > 0 ? entries : undefined,
      });
      clearOpenShiftDraft(businessId, userId);
      onOpened(shift);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open shift.");
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    notes,
    quantities,
    totalCash,
    useDenomBreakdown,
    businessId,
    userId,
    onOpened,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent side="center" showCloseButton={false} className={SHIFT_MODAL_CONTENT}>
        <div className={SHIFT_MODAL_HEADER}>
          <ShiftModalClose />
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Building2 className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-9">
              <DialogTitle className="font-heading text-[15px] font-semibold tracking-tight text-[var(--pos-primary-ink,#fff)] sm:text-base">
                Open New Shift
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug text-[var(--pos-primary-ink,#fff)]/80">
                {useDenomBreakdown
                  ? prefillFromLastClose
                    ? "Review the opening float (pre-filled from last close). Adjust any note or coin if needed."
                    : "Count notes, then coins."
                  : `Enter the opening cash total in ${currency}. Note/coin breakdown is only available for KES.`}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

          <div className={SHIFT_MODAL_BODY}>
            <div className="space-y-2">
              {/* Branch select */}
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Register / Branch
                </label>
                <select
                  className={shiftSelectClass(loading || prefillBusy)}
                  value={branchId}
                  disabled={!!lockedBranch}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  {!lockedBranch ? (
                    <option value="">— Select a branch —</option>
                  ) : null}
                  {branches
                    .filter((b) => b.active)
                    .filter((b) => !lockedBranch || b.id === lockedBranch)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={SHIFT_MODAL_SECTION}>
                {useDenomBreakdown ? (
                  <DenominationTable
                    title="Opening count"
                    quantities={quantities}
                    onChange={setQuantities}
                  />
                ) : (
                  <CashTotalField
                    label={`Opening cash (${currency})`}
                    valueStr={cashTotalStr}
                    onChange={setCashTotalStr}
                    autoFocus
                    footer={
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_50%,transparent)]">
                        Total: {moneyStr(totalCash, currency)}
                      </p>
                    }
                  />
                )}
              </div>
              {useDenomBreakdown && prefillBusy ? (
                <p className="text-[11px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                  Loading last closing count…
                </p>
              ) : useDenomBreakdown && prefillHint ? (
                <p className="text-[11px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                  {prefillHint}
                </p>
              ) : null}

              {/* Opening notes */}
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Notes{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="Any notes about this shift..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              {error ? <DashboardFeedback kind="error" text={error} /> : null}
            </div>
          </div>


          <DialogFooter className={SHIFT_MODAL_FOOTER}>
            <DialogClose asChild>
              <Button type="button" variant="outline" className={SHIFT_MODAL_BTN_OUTLINE}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={loading || prefillBusy}
              onClick={handleOpen}
              className={SHIFT_MODAL_BTN_PRIMARY}
            >
              {loading ? "Opening..." : `Open Shift (${moneyStr(totalCash, currency)})`}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Owner/admin correction of opening float on an open shift. */
export function EditOpeningCountModal({
  open,
  onClose,
  shift,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  shift: ShiftRecord | null;
  onUpdated: (shift: ShiftRecord) => void;
}) {
  const dashboard = useOptionalDashboard();
  const currency = resolveCurrencyCode(dashboard?.business?.currency);
  const useDenomBreakdown = supportsCashDenominationBreakdown(currency);

  const [quantities, setQuantities] = useState<Record<number, number>>(
    createEmptyDenominationQuantities(),
  );
  const [cashTotalStr, setCashTotalStr] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shift) return;
    setQuantities(denomsToQuantities(shift.openingDenominations));
    const openingTotal =
      typeof shift.openingCash === "number"
        ? shift.openingCash
        : Number(shift.openingCash ?? 0);
    setCashTotalStr(
      useDenomBreakdown
        ? ""
        : Number.isFinite(openingTotal) && openingTotal >= 0
          ? String(openingTotal)
          : "",
    );
    setNotes(shift.openingNotes ?? "");
    setReason("");
    setError("");
    setLoading(false);
  }, [open, shift, useDenomBreakdown]);

  const totalCash = useMemo(() => {
    if (!useDenomBreakdown) {
      const n = Number(cashTotalStr);
      return Number.isFinite(n) ? n : 0;
    }
    return KES_DENOMINATIONS.reduce(
      (sum, d) => sum + d.value * (quantities[d.value] || 0),
      0,
    );
  }, [useDenomBreakdown, cashTotalStr, quantities]);

  const handleSave = useCallback(async () => {
    if (!shift) return;
    if (totalCash < 0) {
      setError("Opening cash cannot be negative.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Please enter a short reason for this correction.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const updated = await patchShiftOpening(shift.id, {
        openingCash: totalCash,
        notes: notes.trim() || null,
        denominations: useDenomBreakdown
          ? quantitiesToEntries(quantities)
          : undefined,
        reason: reason.trim(),
      });
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to update opening count.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    shift,
    totalCash,
    reason,
    notes,
    quantities,
    useDenomBreakdown,
    onUpdated,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent side="center" showCloseButton={false} className={SHIFT_MODAL_CONTENT}>
        <div className={SHIFT_MODAL_HEADER}>
          <ShiftModalClose />
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Banknote className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-9">
              <DialogTitle className="font-heading text-[15px] font-semibold tracking-tight text-[var(--pos-primary-ink,#fff)] sm:text-base">
                Edit Opening Count
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug text-[var(--pos-primary-ink,#fff)]/80">
                Updates opening float only. Cash sales and drawouts are left as
                recorded; expected closing shifts by the same opening delta.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

          <div className={SHIFT_MODAL_BODY}>
            <div className="space-y-2">
              <div className={SHIFT_MODAL_SECTION}>
                {useDenomBreakdown ? (
                  <DenominationTable
                    title="Opening count"
                    quantities={quantities}
                    onChange={setQuantities}
                  />
                ) : (
                  <CashTotalField
                    label={`Opening cash (${currency})`}
                    valueStr={cashTotalStr}
                    onChange={setCashTotalStr}
                    autoFocus
                    footer={
                      <p className="text-[11px] text-muted-foreground">
                        Total: {moneyStr(totalCash, currency)}
                      </p>
                    }
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Notes{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="Opening notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Reason for correction
                </label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="e.g. Miscounted KES 500 notes at open"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                />
              </div>

              {error ? <DashboardFeedback kind="error" text={error} /> : null}
            </div>
          </div>


          <DialogFooter className={SHIFT_MODAL_FOOTER}>
            <DialogClose asChild>
              <Button type="button" variant="outline" className={SHIFT_MODAL_BTN_OUTLINE}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" disabled={loading} onClick={handleSave} className={SHIFT_MODAL_BTN_PRIMARY}>
              {loading
                ? "Saving..."
                : `Save (${moneyStr(totalCash, currency)})`}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloseShiftModal({
  open,
  onClose,
  shift,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  shift: ShiftRecord | null;
  onClosed: () => void;
}) {
  const dashboard = useOptionalDashboard();
  const currency = resolveCurrencyCode(dashboard?.business?.currency);
  const useDenomBreakdown = supportsCashDenominationBreakdown(currency);
  const roleKey = dashboard?.me?.role?.key?.trim().toLowerCase() ?? "";
  const canSeeCashVarianceDetail =
    roleKey === "owner" || roleKey === "admin";
  const businessId = dashboard?.business?.id?.trim() ?? "";
  const userId = dashboard?.me?.id?.trim() ?? "";
  const skipPersistRef = useRef(true);
  const userEditedRef = useRef(false);
  const [draftRestoredHint, setDraftRestoredHint] = useState(false);

  const [quantities, setQuantities] = useState<Record<number, number>>(
    createEmptyDenominationQuantities(),
  );
  const [cashTotalStr, setCashTotalStr] = useState("");
  const [notes, setNotes] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveShift, setLiveShift] = useState<ShiftRecord | null>(shift);
  const [drawouts, setDrawouts] = useState<DrawoutRecord[]>([]);
  const canApproveDrawouts = hasPermission(
    dashboard?.me?.permissions,
    Permission.ShiftsDrawoutsApprove,
  );

  const reloadTill = useCallback(async (shiftId: string) => {
    const [fresh, list] = await Promise.all([
      fetchShiftDetail(shiftId),
      fetchShiftDrawouts(shiftId).catch(() => [] as DrawoutRecord[]),
    ]);
    setLiveShift(fresh);
    setDrawouts(list);
  }, []);

  const setQuantitiesEdited = useCallback(
    (next: Record<number, number>) => {
      userEditedRef.current = true;
      setQuantities(next);
    },
    [],
  );

  useEffect(() => {
    if (!open || !shift) return;
    skipPersistRef.current = true;
    userEditedRef.current = false;

    const openingTotal =
      typeof shift.openingCash === "number"
        ? shift.openingCash
        : Number(shift.openingCash ?? 0);
    const openingSnapshot = Number.isFinite(openingTotal) ? openingTotal : 0;

    const draft = loadCloseShiftDraft(
      businessId,
      userId,
      shift.id,
      openingSnapshot,
    );
    const draftHasEntry =
      draft != null && closeShiftDraftHasProgress(draft);

    if (draftHasEntry && draft) {
      setQuantities({
        ...createEmptyDenominationQuantities(),
        ...persistedQuantitiesToRecord(draft.quantities),
      });
      setCashTotalStr(draft.cashTotalStr ?? "");
      setNotes(draft.notes ?? "");
      setVarianceReason(draft.varianceReason ?? "");
      setDraftRestoredHint(true);
      // Keep draft alive across reopens even if they don't edit again.
      userEditedRef.current = true;
    } else {
      // Pre-fill with opening quantities if no closing draft yet
      const openQty = denomsToQuantities(shift.openingDenominations);
      setQuantities({ ...createEmptyDenominationQuantities(), ...openQty });
      setCashTotalStr(
        useDenomBreakdown
          ? ""
          : Number.isFinite(openingTotal) && openingTotal > 0
            ? String(openingTotal)
            : "",
      );
      setNotes("");
      setVarianceReason("");
      setDraftRestoredHint(false);
    }

    setError("");
    setLoading(false);
    setLiveShift(shift);
    setDrawouts([]);
    void reloadTill(shift.id).catch(() => undefined);

    const t = window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, shift, useDenomBreakdown, businessId, userId, reloadTill]);

  // Persist unfinished closing count while the modal is open.
  useEffect(() => {
    if (
      !open ||
      !shift ||
      !businessId ||
      !userId ||
      skipPersistRef.current ||
      !userEditedRef.current
    ) {
      return;
    }
    const openingTotal =
      typeof shift.openingCash === "number"
        ? shift.openingCash
        : Number(shift.openingCash ?? 0);
    const draft = {
      v: 1 as const,
      updatedAt: Date.now(),
      businessId,
      userId,
      shiftId: shift.id,
      openingCashSnapshot: Number.isFinite(openingTotal) ? openingTotal : 0,
      notes,
      varianceReason,
      quantities: quantitiesRecordToPersisted(quantities),
      cashTotalStr,
    };
    if (closeShiftDraftHasProgress(draft)) {
      saveCloseShiftDraft(draft);
    } else {
      clearCloseShiftDraft(businessId, userId, shift.id);
    }
  }, [
    open,
    shift,
    businessId,
    userId,
    notes,
    varianceReason,
    quantities,
    cashTotalStr,
  ]);

  const totalCash = useMemo(() => {
    if (!useDenomBreakdown) {
      const n = Number(cashTotalStr);
      return Number.isFinite(n) ? n : 0;
    }
    return KES_DENOMINATIONS.reduce(
      (sum, d) => sum + d.value * (quantities[d.value] || 0),
      0,
    );
  }, [useDenomBreakdown, cashTotalStr, quantities]);

  const till = liveShift ?? shift;
  const expected = till
    ? typeof till.expectedClosingCash === "number"
      ? till.expectedClosingCash
      : Number(till.expectedClosingCash)
    : 0;
  const openingCash = till
    ? typeof till.openingCash === "number"
      ? till.openingCash
      : Number(till.openingCash ?? 0)
    : 0;
  const activeDrawouts = drawouts.filter(
    (d) => d.status === "APPROVED" || d.status === "PENDING_APPROVAL",
  );
  const drawoutTotal = activeDrawouts.reduce((sum, d) => {
    const n = typeof d.amount === "number" ? d.amount : Number(d.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const pendingDrawouts = drawouts.filter((d) => d.status === "PENDING_APPROVAL");
  const cashIn = expected - openingCash + drawoutTotal;
  const variance = totalCash - expected;
  const absVariance = Math.abs(variance);
  const balanceMismatch = absVariance >= VARIANCE_THRESHOLD_AMBER;
  const showVarianceReason = absVariance >= VARIANCE_THRESHOLD_RED;

  const handleClose = useCallback(async () => {
    if (!shift) return;
    if (totalCash <= 0 && !shift.openingDenominations?.length) {
      setError("Please count the closing cash.");
      return;
    }
    if (showVarianceReason && !varianceReason.trim()) {
      setError(
        canSeeCashVarianceDetail
          ? "Counted amount does not match the expected amount. Please provide a reason."
          : "Your cash count doesn’t match the expected till balance. Please add a short note before closing.",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const entries = useDenomBreakdown
        ? quantitiesToEntries(quantities)
        : [];
      await postCloseShift(shift.id, {
        countedClosingCash: totalCash || 0,
        notes: notes.trim() || null,
        varianceReason: varianceReason.trim() || null,
        denominations: entries.length > 0 ? entries : undefined,
      });
      clearCloseShiftDraft(businessId, userId, shift.id);
      // Desktop SKU: push the closed shift's sales to the online shop
      // (store-and-forward). Fire-and-forget — a slow/failed upload never
      // blocks the shift close; unsynced shifts are retried on the next sync.
      if (process.env.NEXT_PUBLIC_RUNTIME === "desktop") {
        void fetch("/api/v1/desktop/sync", { method: "POST" }).catch(() => {});
      }
      onClosed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close shift.");
    } finally {
      setLoading(false);
    }
  }, [
    shift,
    totalCash,
    notes,
    quantities,
    useDenomBreakdown,
    varianceReason,
    showVarianceReason,
    canSeeCashVarianceDetail,
    businessId,
    userId,
    onClosed,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent side="center" showCloseButton={false} className={SHIFT_MODAL_CONTENT}>
        <div className={SHIFT_MODAL_HEADER}>
          <ShiftModalClose />
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <DoorClosed className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-9">
              <DialogTitle className="font-heading text-[15px] font-semibold tracking-tight text-[var(--pos-primary-ink,#fff)] sm:text-base">
                Close Shift
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug text-[var(--pos-primary-ink,#fff)]/80">
                Count notes, then coins.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

          <div className={SHIFT_MODAL_BODY}>
            <div className="space-y-2">
              {canSeeCashVarianceDetail ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-px overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
                  {(
                    [
                      {
                        label: "Expected",
                        value: moneyStr(expected, currency),
                        tone: "text-[var(--pos-ink,#1c1915)]",
                      },
                      {
                        label: "Counted",
                        value: moneyStr(totalCash, currency),
                        tone: "text-[var(--pos-ink,#1c1915)]",
                      },
                      {
                        label: "Variance",
                        value: `${variance >= 0 ? "+" : ""}${moneyStr(variance, currency)}`,
                        tone: varianceColor(variance),
                      },
                    ] as const
                  ).map((cell) => (
                    <div
                      key={cell.label}
                      className="bg-[color-mix(in_srgb,#fff_88%,var(--pos-paper,#f1ece3))] px-2 py-1.5"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)]">
                        {cell.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[13px] font-semibold tabular-nums sm:text-sm",
                          cell.tone,
                        )}
                      >
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>
                  {activeDrawouts.length > 0 ? (
                    <div className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#fff_88%,var(--pos-paper,#f1ece3))] px-2.5 py-2 text-[11px]">
                      <p className="font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)]">
                        Expected till
                      </p>
                      <dl className="mt-1.5 space-y-0.5 tabular-nums">
                        <div className="flex justify-between gap-3">
                          <dt>Opening</dt>
                          <dd>{moneyStr(openingCash, currency)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Cash sales</dt>
                          <dd>
                            {cashIn >= 0 ? "+" : ""}
                            {moneyStr(cashIn, currency)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>
                            Drawouts
                            {pendingDrawouts.length > 0
                              ? ` (${pendingDrawouts.length} pending)`
                              : ""}
                          </dt>
                          <dd>−{moneyStr(drawoutTotal, currency)}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-black/10 pt-0.5 font-semibold">
                          <dt>Expected</dt>
                          <dd>{moneyStr(expected, currency)}</dd>
                        </div>
                      </dl>
                      <ul className="mt-2 space-y-2 border-t border-black/10 pt-2">
                        {activeDrawouts.map((row) => (
                          <li key={row.id} className="space-y-1">
                            <div className="flex justify-between gap-3">
                              <span>
                                {DRAWOUT_CATEGORIES[row.category] || row.category}
                                {row.status === "PENDING_APPROVAL"
                                  ? " · pending"
                                  : ""}
                                {row.description ? ` — ${row.description}` : ""}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                −{moneyStr(row.amount, currency)}
                              </span>
                            </div>
                            {canApproveDrawouts && till ? (
                              <DrawoutApprovalActions
                                drawout={row}
                                onChanged={() => void reloadTill(till.id)}
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : balanceMismatch ? (
                <p
                  className="border border-amber-700/20 bg-amber-50 px-3 py-2.5 text-[12px] font-medium leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/35 dark:text-amber-100"
                  role="status"
                >
                  Counted cash doesn’t match the expected till balance. Recheck
                  your {useDenomBreakdown ? "notes and coins" : "cash total"}
                  {showVarianceReason
                    ? ", then add a short note below so an admin can review."
                    : "."}
                </p>
              ) : null}

              <div className={SHIFT_MODAL_SECTION}>
                {useDenomBreakdown ? (
                  <DenominationTable
                    title="Closing count"
                    quantities={quantities}
                    onChange={setQuantitiesEdited}
                  />
                ) : (
                  <CashTotalField
                    label={`Closing cash (${currency})`}
                    valueStr={cashTotalStr}
                    onChange={(next) => {
                      userEditedRef.current = true;
                      setCashTotalStr(next);
                    }}
                    autoFocus
                    footer={
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_50%,transparent)]">
                        Note/coin breakdown is only available for KES.
                      </p>
                    }
                  />
                )}
              </div>

              {draftRestoredHint ? (
                <p className="text-[11px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                  Restored your unfinished closing count.
                </p>
              ) : null}

            {/* Variance reason */}
            {showVarianceReason ? (
              <div className="space-y-1.5">
                <label
                  className={cn(
                    dashboardFilterFieldLabelClass(),
                    "text-destructive",
                  )}
                >
                  {canSeeCashVarianceDetail
                    ? "Reason for Variance *"
                    : "Note about the cash count *"}
                </label>
                <textarea
                  className={shiftFieldClass(loading, "min-h-[3.25rem] resize-y py-2")}
                  placeholder={
                    canSeeCashVarianceDetail
                      ? "Explain the significant variance..."
                      : "Briefly note what happened with the till count…"
                  }
                  value={varianceReason}
                  onChange={(e) => {
                    userEditedRef.current = true;
                    setVarianceReason(e.target.value);
                  }}
                  maxLength={500}
                  rows={2}
                />
              </div>
            ) : null}

            {/* Closing notes */}
            <div className="space-y-1">
              <label className={cn(dashboardFilterFieldLabelClass(), "text-[10px]")}>
                Notes{" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                className={shiftFieldClass(loading, "h-8 py-1.5 text-xs")}
                placeholder="Closing notes..."
                value={notes}
                onChange={(e) => {
                  userEditedRef.current = true;
                  setNotes(e.target.value);
                }}
                maxLength={500}
              />
            </div>

              {error ? <DashboardFeedback kind="error" text={error} /> : null}
            </div>
          </div>


          <DialogFooter className={SHIFT_MODAL_FOOTER}>
            <DialogClose asChild>
              <Button type="button" variant="outline" className={SHIFT_MODAL_BTN_OUTLINE}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" disabled={loading} onClick={handleClose} className={SHIFT_MODAL_BTN_PRIMARY}>
              {loading ? "Closing..." : `Close Shift (${moneyStr(totalCash, currency)})`}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export const DRAWOUT_CATEGORIES: Record<string, string> = {
  PETTY_CASH: "Petty Cash",
  CASUAL_LABOUR: "Casual Labour",
  SUPPLIER_PAYMENT: "Supplier Payment",
  RECURRING: "Recurring",
  OTHER: "Other",
};

// ─── New Drawout Modal ──────────────────────────────────────────────────

export function DrawoutModal({
  open,
  onClose,
  shiftId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  shiftId: string;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState("PETTY_CASH");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("PETTY_CASH");
      setAmount("");
      setDescription("");
      setRecipientName("");
      setRecipientContact("");
      setReference("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (category === "OTHER" && description.trim().length < 10) {
      setError(
        "Description must be at least 10 characters for 'Other' category.",
      );
      return;
    }
    if (!recipientName.trim()) {
      setError("Recipient name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await initiateDrawout(shiftId, {
        amount: amt,
        category,
        description: description.trim(),
        recipientName: recipientName.trim(),
        recipientContact: recipientContact.trim() || null,
        reference: reference.trim() || null,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create drawout.");
    } finally {
      setLoading(false);
    }
  }, [
    shiftId,
    amount,
    category,
    description,
    recipientName,
    recipientContact,
    reference,
    onCreated,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent side="center" showCloseButton={false} className={cn(SHIFT_MODAL_CONTENT, "max-w-lg")}>
        <div className={SHIFT_MODAL_HEADER}>
          <ShiftModalClose />
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Banknote className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-9">
              <DialogTitle className="font-heading text-[15px] font-semibold tracking-tight text-[var(--pos-primary-ink,#fff)] sm:text-base">
                New Cash Drawout
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug text-[var(--pos-primary-ink,#fff)]/80">
                Record cash removed from the till during this shift.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className={SHIFT_MODAL_BODY}>
          <div className={SHIFT_MODAL_SECTION}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2">
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>Category</label>
                <select
                  className={shiftSelectClass(loading)}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {Object.entries(DRAWOUT_CATEGORIES).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Amount (KES)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  inputMode="decimal"
                  className={shiftFieldClass(loading, "tabular-nums")}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={dashboardFilterFieldLabelClass()}>Description</label>
                <textarea
                  className={shiftFieldClass(loading, "min-h-[3.25rem] resize-y py-2 text-sm")}
                  placeholder="What is this drawout for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={dashboardFilterFieldLabelClass()}>Recipient Name</label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="Who received the cash"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Contact{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="Phone or ID number"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={dashboardFilterFieldLabelClass()}>
                  Reference{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  className={shiftFieldClass(loading)}
                  placeholder="Invoice or receipt #"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-2">
              <DashboardFeedback kind="error" text={error} />
            </div>
          ) : null}
        </div>

        <DialogFooter className={SHIFT_MODAL_FOOTER}>
          <DialogClose asChild>
            <Button type="button" variant="outline" className={SHIFT_MODAL_BTN_OUTLINE}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={loading} onClick={handleSubmit} className={SHIFT_MODAL_BTN_PRIMARY}>
            {loading ? "Submitting..." : "Submit Drawout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

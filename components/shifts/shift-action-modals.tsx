"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Banknote, Building2, DoorClosed } from "lucide-react";

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
import { TillCountPad } from "@/components/shifts/till-count-pad";
import {
  fetchDrawerBalances,
  fetchLastClosedShiftFloat,
  initiateDrawout,
  patchShiftOpening,
  postCloseShift,
  postOpenShift,
  type BranchRecord,
  type DenominationEntry,
  type DenominationRecord,
  type DrawerBalanceRecord,
  type ShiftRecord,
} from "@/lib/api";
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

/** Centered shift / cash modals — dense layout to avoid inner scrolling on common viewports. */
const SHIFT_MODAL_CONTENT = cn(
  "flex flex-col gap-0 overflow-visible p-0",
  "border-border/50 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_48px_-12px_rgba(0,0,0,0.16)]",
  "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_56px_-12px_rgba(0,0,0,0.45)]",
);

const SHIFT_MODAL_HEADER = cn(
  "shrink-0 border-b border-border/45 bg-gradient-to-br from-muted/35 via-background to-background",
  "px-4 pb-3 pt-3.5 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)] sm:px-5 dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]",
);

const SHIFT_MODAL_ICON = cn(
  "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50",
  "bg-gradient-to-b from-muted/55 to-muted/20 text-foreground shadow-sm ring-1 ring-black/[0.04] dark:from-muted/30 dark:to-muted/10 dark:ring-white/[0.06]",
);

/** No overflow-auto — content is sized to fit; parent dialog may still clip on very short viewports. */
const SHIFT_MODAL_BODY = "px-4 py-2.5 sm:px-5 sm:py-3";

const SHIFT_MODAL_SECTION = cn(
  "rounded-lg border border-border/50 bg-muted/[0.04] p-3 shadow-sm ring-1 ring-black/[0.02] dark:bg-muted/[0.06] dark:ring-white/[0.04]",
);

const SHIFT_MODAL_SECTION_TITLE = cn(
  "mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
);

const SHIFT_MODAL_FOOTER = cn(
  "shrink-0 gap-2 border-t border-border/45 bg-gradient-to-t from-muted/25 to-background px-4 py-3 backdrop-blur-sm sm:px-5",
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:from-muted/15",
);

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
/** Denomination input row. */
export function DenominationRow({
  denomValue,
  label,
  quantity,
  onChange,
  autoFocus,
  readOnly,
  expectedQty,
  active,
  onActivate,
  suppressNativeKeyboard,
}: {
  denomValue: number;
  label: string;
  quantity: number;
  onChange?: (val: number) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  /** Expected ledger quantity — renders an Exp / Short / Long hint when provided. */
  expectedQty?: number | null;
  /** Highlighted when the till count pad is targeting this row. */
  active?: boolean;
  onActivate?: () => void;
  /** Prefer the on-screen pad over the OS keyboard (tablets / tills). */
  suppressNativeKeyboard?: boolean;
}) {
  const total = denomValue * quantity;
  const diff = expectedQty != null ? quantity - expectedQty : null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 rounded-md border bg-background px-2 py-1 text-xs sm:gap-2 sm:px-2.5 sm:text-[13px]",
        "transition-[border-color,box-shadow,background-color] duration-150",
        active
          ? "border-emerald-500/55 bg-emerald-500/[0.06] shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
          : "border-border/60",
      )}
      onPointerDown={() => {
        if (!readOnly) onActivate?.();
      }}
    >
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
      {diff != null ? (
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            Exp {expectedQty}
          </span>
          {diff !== 0 ? (
            <span
              className={cn(
                "rounded px-1 py-px text-[10px] font-semibold tabular-nums",
                diff > 0
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-red-500/15 text-red-700 dark:text-red-300",
              )}
            >
              {diff > 0 ? `Long ${diff}` : `Short ${-diff}`}
            </span>
          ) : null}
        </span>
      ) : null}
      <input
        type="number"
        min={0}
        inputMode={suppressNativeKeyboard ? "none" : "numeric"}
        autoFocus={autoFocus}
        disabled={readOnly}
        className={dashboardInputClass(
          false,
          cn(
            "h-7 w-[3.75rem] shrink-0 py-0 pr-1 text-right text-xs tabular-nums sm:w-16 sm:text-[13px]",
            active && "border-emerald-500/50 ring-1 ring-emerald-500/25",
          ),
        )}
        value={quantity || ""}
        onFocus={() => onActivate?.()}
        onChange={(e) => {
          if (!onChange) return;
          const v = parseInt(e.target.value, 10);
          onChange(Number.isFinite(v) && v >= 0 ? v : 0);
        }}
      />      <span className="w-[4.25rem] shrink-0 text-right text-[11px] tabular-nums text-muted-foreground sm:w-[4.5rem] sm:text-xs">
        {moneyStr(total)}
      </span>
    </div>
  );
}

/** Denomination table for opening/closing counts. */
export function DenominationTable({
  title,
  quantities,
  onChange,
  readOnly,
  expectedQuantities,
}: {
  title: string;
  quantities: Record<number, number>;
  onChange?: (qty: Record<number, number>) => void;
  readOnly?: boolean;
  /** Expected ledger quantities per denomination — renders an Exp / Short / Long column. */
  expectedQuantities?: Record<number, number> | null;
}) {
  const [padOpen, setPadOpen] = useState(false);
  const [activeDenom, setActiveDenom] = useState<number>(
    KES_DENOMINATIONS[0].value,
  );

  const notesTotal = KES_DENOMINATIONS.reduce(
    (sum, d) => sum + d.value * (quantities[d.value] || 0),
    0,
  );
  const notesSum = KES_DENOMINATIONS.filter((d) => d.type === "NOTE").reduce(
    (sum, d) => sum + d.value * (quantities[d.value] || 0),
    0,
  );
  const coinsSum = KES_DENOMINATIONS.filter((d) => d.type === "COIN").reduce(
    (sum, d) => sum + d.value * (quantities[d.value] || 0),
    0,
  );
  const expectedTotal = KES_DENOMINATIONS.reduce(
    (sum, d) =>
      sum + d.value * (expectedQuantities?.[d.value] ?? 0),
    0,
  );

  const activeMeta =
    KES_DENOMINATIONS.find((d) => d.value === activeDenom) ??
    KES_DENOMINATIONS[0];
  const activeQty = quantities[activeDenom] || 0;
  const editable = !readOnly && !!onChange;

  const activate = useCallback(
    (denom: number) => {
      if (!editable) return;
      setActiveDenom(denom);
      setPadOpen(true);
    },
    [editable],
  );

  const goNext = useCallback(() => {
    const idx = KES_DENOMINATIONS.findIndex((d) => d.value === activeDenom);
    if (idx < 0 || idx >= KES_DENOMINATIONS.length - 1) return;
    setActiveDenom(KES_DENOMINATIONS[idx + 1].value);
  }, [activeDenom]);

  const canGoNext =
    KES_DENOMINATIONS.findIndex((d) => d.value === activeDenom) <
    KES_DENOMINATIONS.length - 1;

  return (
    <div className="space-y-1.5">
      <h4 className={cn(SHIFT_MODAL_SECTION_TITLE, "mb-1.5")}>{title}</h4>
      <div className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-0.5">
        {KES_DENOMINATIONS.map((denom, i) => (
          <DenominationRow
            key={denom.value}
            denomValue={denom.value}
            label={denom.label}
            quantity={quantities[denom.value] || 0}
            readOnly={readOnly}
            active={editable && padOpen && activeDenom === denom.value}
            suppressNativeKeyboard={editable && padOpen}
            expectedQty={
              expectedQuantities != null
                ? (expectedQuantities[denom.value] ?? 0)
                : null
            }
            onActivate={() => activate(denom.value)}
            onChange={
              readOnly || !onChange
                ? undefined
                : (val) => onChange({ ...quantities, [denom.value]: val })
            }
            autoFocus={i === 0 && !readOnly && !padOpen}
          />
        ))}
      </div>
      {/* Totals */}
      <div className="mt-1.5 space-y-0.5 border-t border-border/40 pt-1.5 text-[11px] sm:text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Total Notes</span>
          <span className="tabular-nums font-medium">{moneyStr(notesSum)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Total Coins</span>
          <span className="tabular-nums font-medium">{moneyStr(coinsSum)}</span>
        </div>
        {expectedQuantities != null ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Expected</span>
            <span className="tabular-nums font-medium">{moneyStr(expectedTotal)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border/35 pt-1 text-xs font-semibold sm:text-sm">
          <span>Total {title}</span>
          <span className="tabular-nums">{moneyStr(notesTotal)}</span>
        </div>
      </div>

      {editable ? (
        <TillCountPad
          open={padOpen}
          onOpenChange={setPadOpen}
          activeLabel={activeMeta.label}
          value={activeQty}
          hint={`${moneyStr(activeMeta.value * activeQty)} · ${activeMeta.type === "NOTE" ? "note" : "coin"}`}
          onChange={(val) =>
            onChange({ ...quantities, [activeDenom]: Math.floor(val) })
          }
          onNext={canGoNext ? goNext : undefined}
          mode="quantity"
        />
      ) : null}
    </div>
  );
}

/** Cash total field with the same collapsible till pad (non-KES / simple total). */
function CashTotalWithPad({
  label,
  currency,
  valueStr,
  onChange,
  autoFocus,
  footer,
}: {
  label: string;
  currency: string;
  valueStr: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
  footer?: ReactNode;
}) {
  const [padOpen, setPadOpen] = useState(false);
  const numeric = Number(valueStr);
  const safeValue = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;

  return (
    <div className="space-y-1.5">
      <h4 className={cn(SHIFT_MODAL_SECTION_TITLE, "mb-1.5")}>{label}</h4>
      <input
        type="number"
        min={0}
        step="any"
        inputMode={padOpen ? "none" : "decimal"}
        className={dashboardInputClass(
          false,
          cn(padOpen && "border-emerald-500/50 ring-1 ring-emerald-500/25"),
        )}
        value={valueStr}
        onFocus={() => setPadOpen(true)}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        autoFocus={autoFocus && !padOpen}
      />      {footer}
      <TillCountPad
        open={padOpen}
        onOpenChange={setPadOpen}
        activeLabel={`${currency} total`}
        value={safeValue}
        hint={moneyStr(safeValue, currency)}
        mode="decimal"
        onChange={(val) => {
          // Preserve up to 2 dp without forcing trailing zeros while typing via pad buffer.
          const rounded = Math.round(val * 100) / 100;
          onChange(Number.isFinite(rounded) ? String(rounded) : "0");
        }}
      />
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
      <DialogContent side="center" className={cn("max-w-xl", SHIFT_MODAL_CONTENT)}>
        <div className={SHIFT_MODAL_HEADER}>
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Building2 className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-2">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                Open New Shift
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug sm:text-[13px] sm:leading-relaxed">
                {useDenomBreakdown
                  ? prefillFromLastClose
                    ? "Review the opening float (pre-filled from last close) and edit if needed."
                    : "Count the opening float by denomination below."
                  : `Enter the opening cash total in ${currency}. Note/coin breakdown is only available for KES.`}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className={SHIFT_MODAL_BODY}>
          <div className="space-y-3">
            {/* Branch select */}
            <div className="space-y-1.5">
              <label className={dashboardFilterFieldLabelClass()}>
                Register / Branch
              </label>
              <select
                className={dashboardSelectClass(loading || prefillBusy)}
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
                  title="Opening Float Count"
                  quantities={quantities}
                  onChange={setQuantities}
                />
              ) : (
                <CashTotalWithPad
                  label={`Opening cash (${currency})`}
                  currency={currency}
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
              {useDenomBreakdown && prefillBusy ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Loading last closing count…
                </p>
              ) : useDenomBreakdown && prefillHint ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {prefillHint}
                </p>
              ) : null}
            </div>

            {/* Opening notes */}
            <div className="space-y-1.5">
              <label className={dashboardFilterFieldLabelClass()}>
                Notes{" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                className={dashboardInputClass(loading)}
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={loading || prefillBusy}
            onClick={handleOpen}
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
      <DialogContent side="center" className={cn("max-w-xl", SHIFT_MODAL_CONTENT)}>
        <div className={SHIFT_MODAL_HEADER}>
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Banknote className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-2">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                Edit Opening Count
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug sm:text-[13px] sm:leading-relaxed">
                Updates opening float only. Cash sales and drawouts are left as
                recorded; expected closing shifts by the same opening delta.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className={SHIFT_MODAL_BODY}>
          <div className="space-y-3">
            <div className={SHIFT_MODAL_SECTION}>
              {useDenomBreakdown ? (
                <DenominationTable
                  title="Opening Count"
                  quantities={quantities}
                  onChange={setQuantities}
                />
              ) : (
                <CashTotalWithPad
                  label={`Opening cash (${currency})`}
                  currency={currency}
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
                className={dashboardInputClass(loading)}
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
                className={dashboardInputClass(loading)}
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={loading} onClick={handleSave}>
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
  const [expectedBalances, setExpectedBalances] =
    useState<DrawerBalanceRecord | null>(null);

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

    const t = window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, shift, useDenomBreakdown, businessId, userId]);

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

  // Expected per-denomination ledger balances for the variance column.
  // Only managers/admins see expected figures (mirrors the total variance UI).
  useEffect(() => {
    if (!open || !shift || !useDenomBreakdown || !canSeeCashVarianceDetail) {
      setExpectedBalances(null);
      return;
    }
    let cancelled = false;
    fetchDrawerBalances(shift.id)
      .then((b) => {
        if (!cancelled) setExpectedBalances(b);
      })
      .catch(() => {
        if (!cancelled) setExpectedBalances(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, shift, useDenomBreakdown, canSeeCashVarianceDetail]);

  const expectedQty = useMemo(() => {
    const map = createEmptyDenominationQuantities();
    if (expectedBalances) {
      for (const row of expectedBalances.balances) {
        map[row.denomination] = row.quantity;
      }
    }
    return map;
  }, [expectedBalances]);

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

  const expected = shift
    ? typeof shift.expectedClosingCash === "number"
      ? shift.expectedClosingCash
      : Number(shift.expectedClosingCash)
    : 0;
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
      <DialogContent side="center" className={cn("max-w-xl", SHIFT_MODAL_CONTENT)}>
        <div className={SHIFT_MODAL_HEADER}>
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <DoorClosed className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-2">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                Close Shift
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug sm:text-[13px] sm:leading-relaxed">
                Count the closing cash by denomination.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className={SHIFT_MODAL_BODY}>
          <div className="space-y-3">
            {canSeeCashVarianceDetail ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-border/50 bg-gradient-to-br from-muted/25 to-muted/10 px-3 py-2 text-[11px] shadow-sm ring-1 ring-black/[0.03] sm:text-xs dark:ring-white/[0.05]">
                <span>
                  <span className="text-muted-foreground">Expected</span>{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {moneyStr(expected, currency)}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">Counted</span>{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {moneyStr(totalCash, currency)}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">Variance</span>{" "}
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      varianceColor(variance),
                    )}
                  >
                    {variance >= 0 ? "+" : ""}
                    {moneyStr(variance, currency)}
                  </span>
                </span>
              </div>
            ) : balanceMismatch ? (
              <p
                className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                role="status"
              >
                Your cash count doesn’t match the expected till balance. Recheck
                your {useDenomBreakdown ? "notes and coins" : "cash total"}
                {showVarianceReason
                  ? ", then add a short note below so an admin can review."
                  : "."}
              </p>
            ) : null}

            <div className={SHIFT_MODAL_SECTION}>
              {useDenomBreakdown ? (
                <DenominationTable
                  title="Closing Float Count"
                  quantities={quantities}
                  onChange={setQuantitiesEdited}
                  expectedQuantities={
                    expectedBalances ? expectedQty : null
                  }
                />
              ) : (
                <CashTotalWithPad
                  label={`Closing cash (${currency})`}
                  currency={currency}
                  valueStr={cashTotalStr}
                  onChange={(next) => {
                    userEditedRef.current = true;
                    setCashTotalStr(next);
                  }}
                  autoFocus
                  footer={
                    <p className="text-[11px] text-muted-foreground">
                      Note/coin breakdown is only available for KES.
                    </p>
                  }
                />
              )}
              {draftRestoredHint ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Restored your unfinished closing count.
                </p>
              ) : null}
            </div>

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
                  className={dashboardTextareaClass(loading)}
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
            <div className="space-y-1.5">
              <label className={dashboardFilterFieldLabelClass()}>
                Notes{" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                className={dashboardInputClass(loading)}
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={loading} onClick={handleClose}>
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
      <DialogContent side="center" className={cn("max-w-lg", SHIFT_MODAL_CONTENT)}>
        <div className={SHIFT_MODAL_HEADER}>
          <DialogHeader className="flex flex-row items-start gap-2.5 space-y-0 text-left sm:gap-3">
            <span className={SHIFT_MODAL_ICON} aria-hidden>
              <Banknote className="size-4 sm:size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pr-2">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                New Cash Drawout
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug sm:text-[13px] sm:leading-relaxed">
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
                  className={dashboardSelectClass(loading)}
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
                  className={dashboardInputClass(loading, "tabular-nums")}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={dashboardFilterFieldLabelClass()}>Description</label>
                <textarea
                  className={dashboardTextareaClass(loading, "min-h-[3.25rem] py-2 text-sm")}
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
                  className={dashboardInputClass(loading)}
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
                  className={dashboardInputClass(loading)}
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
                  className={dashboardInputClass(loading)}
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={loading} onClick={handleSubmit}>
            {loading ? "Submitting..." : "Submit Drawout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

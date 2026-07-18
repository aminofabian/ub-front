"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import {
  fetchLastClosedShiftFloat,
  initiateDrawout,
  postCloseShift,
  postOpenShift,
  type BranchRecord,
  type DenominationEntry,
  type DenominationRecord,
  type ShiftRecord,
} from "@/lib/api";
import { isPrefillOpeningFromLastCloseEnabled } from "@/lib/shift-settings";
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
export const VARIANCE_THRESHOLD_AMBER = 1;
export const VARIANCE_THRESHOLD_RED = 500;
export function moneyStr(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(v);
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
}: {
  denomValue: number;
  label: string;
  quantity: number;
  onChange?: (val: number) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
}) {
  const total = denomValue * quantity;
  return (
    <div className="flex items-center justify-between gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-xs sm:gap-2 sm:px-2.5 sm:text-[13px]">
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        autoFocus={autoFocus}
        disabled={readOnly}
        className={dashboardInputClass(
          false,
          "h-7 w-[3.75rem] shrink-0 py-0 pr-1 text-right text-xs tabular-nums sm:w-16 sm:text-[13px]",
        )}
        value={quantity || ""}
        onChange={(e) => {
          if (!onChange) return;
          const v = parseInt(e.target.value, 10);
          onChange(Number.isFinite(v) && v >= 0 ? v : 0);
        }}
      />
      <span className="w-[4.25rem] shrink-0 text-right text-[11px] tabular-nums text-muted-foreground sm:w-[4.5rem] sm:text-xs">
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
}: {
  title: string;
  quantities: Record<number, number>;
  onChange?: (qty: Record<number, number>) => void;
  readOnly?: boolean;
}) {
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
            onChange={
              readOnly || !onChange
                ? undefined
                : (val) => onChange({ ...quantities, [denom.value]: val })
            }
            autoFocus={i === 0 && !readOnly}
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
        <div className="flex justify-between border-t border-border/35 pt-1 text-xs font-semibold sm:text-sm">
          <span>Total {title}</span>
          <span className="tabular-nums">{moneyStr(notesTotal)}</span>
        </div>
      </div>
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
  const prefillFromLastClose =
    isPrefillOpeningFromLastCloseEnabled(featureFlags);

  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>(
    createEmptyDenominationQuantities(),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefillBusy, setPrefillBusy] = useState(false);
  const [prefillHint, setPrefillHint] = useState<string | null>(null);

  const lockedBranch = lockBranchSelectionTo?.trim() ?? "";

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      const initial =
        lockedBranch && branches.some((b) => b.id === lockedBranch)
          ? lockedBranch
          : preferredBranchId?.trim() &&
              branches.some((b) => b.id === preferredBranchId.trim())
            ? preferredBranchId.trim()
            : "";
      setBranchId(initial);
      setNotes("");
      setQuantities(createEmptyDenominationQuantities());
      setError("");
      setLoading(false);
      setPrefillHint(null);
      setPrefillBusy(false);
    }
  }, [open, preferredBranchId, branches, lockedBranch]);

  // Prefill from last closed shift when admin has enabled the option.
  useEffect(() => {
    if (!open || !prefillFromLastClose || !branchId) {
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
  }, [open, prefillFromLastClose, branchId]);

  const totalCash = useMemo(
    () =>
      KES_DENOMINATIONS.reduce(
        (sum, d) => sum + d.value * (quantities[d.value] || 0),
        0,
      ),
    [quantities],
  );

  const handleOpen = useCallback(async () => {
    if (!branchId) {
      setError("Please select a branch/register.");
      return;
    }
    if (totalCash <= 0) {
      setError("Please enter at least one denomination quantity.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const entries = quantitiesToEntries(quantities);
      const shift = await postOpenShift({
        branchId,
        openingCash: totalCash,
        notes: notes.trim() || null,
        denominations: entries.length > 0 ? entries : undefined,
      });
      onOpened(shift);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open shift.");
    } finally {
      setLoading(false);
    }
  }, [branchId, notes, quantities, totalCash, onOpened, onClose]);

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
                {prefillFromLastClose
                  ? "Review the opening float (pre-filled from last close) and edit if needed."
                  : "Count the opening float by denomination below."}
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
              <DenominationTable
                title="Opening Float Count"
                quantities={quantities}
                onChange={setQuantities}
              />
              {prefillBusy ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Loading last closing count…
                </p>
              ) : prefillHint ? (
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
            {loading ? "Opening..." : `Open Shift (${moneyStr(totalCash)})`}
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
  const [quantities, setQuantities] = useState<Record<number, number>>(
    createEmptyDenominationQuantities(),
  );
  const [notes, setNotes] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && shift) {
      // Pre-fill with opening quantities if no closing count yet
      const openQty = denomsToQuantities(shift.openingDenominations);
      setQuantities({ ...createEmptyDenominationQuantities(), ...openQty });
      setNotes("");
      setVarianceReason("");
      setError("");
      setLoading(false);
    }
  }, [open, shift]);

  const totalCash = useMemo(
    () =>
      KES_DENOMINATIONS.reduce(
        (sum, d) => sum + d.value * (quantities[d.value] || 0),
        0,
      ),
    [quantities],
  );

  const expected = shift
    ? typeof shift.expectedClosingCash === "number"
      ? shift.expectedClosingCash
      : Number(shift.expectedClosingCash)
    : 0;
  const variance = totalCash - expected;
  const absVariance = Math.abs(variance);
  const showVarianceReason = absVariance >= VARIANCE_THRESHOLD_RED;

  const handleClose = useCallback(async () => {
    if (!shift) return;
    if (totalCash <= 0 && !shift.openingDenominations?.length) {
      setError("Please count the closing cash.");
      return;
    }
    if (showVarianceReason && !varianceReason.trim()) {
      setError(
        "Counted amount does not match the expected amount. Please provide a reason.",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const entries = quantitiesToEntries(quantities);
      await postCloseShift(shift.id, {
        countedClosingCash: totalCash || 0,
        notes: notes.trim() || null,
        varianceReason: varianceReason.trim() || null,
        denominations: entries.length > 0 ? entries : undefined,
      });
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
    varianceReason,
    quantities,
    showVarianceReason,
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
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-border/50 bg-gradient-to-br from-muted/25 to-muted/10 px-3 py-2 text-[11px] shadow-sm ring-1 ring-black/[0.03] sm:text-xs dark:ring-white/[0.05]">
              <span>
                <span className="text-muted-foreground">Expected</span>{" "}
                <span className="font-semibold tabular-nums text-foreground">{moneyStr(expected)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Counted</span>{" "}
                <span className="font-semibold tabular-nums text-foreground">{moneyStr(totalCash)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Variance</span>{" "}
                <span className={cn("font-semibold tabular-nums", varianceColor(variance))}>
                  {variance >= 0 ? "+" : ""}
                  {moneyStr(variance)}
                </span>
              </span>
            </div>

            <div className={SHIFT_MODAL_SECTION}>
              <DenominationTable
                title="Closing Float Count"
                quantities={quantities}
                onChange={setQuantities}
              />
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
                  Reason for Variance *
                </label>
                <textarea
                  className={dashboardTextareaClass(loading)}
                  placeholder="Explain the significant variance..."
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
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
          <Button type="button" disabled={loading} onClick={handleClose}>
            {loading ? "Closing..." : `Close Shift (${moneyStr(totalCash)})`}
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

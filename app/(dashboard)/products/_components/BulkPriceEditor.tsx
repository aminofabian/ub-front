"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import styles from "./bulk-price-editor.module.css";
import {
  ApiRequestError,
  applyBulkPrices,
  previewBulkPrices,
  type BulkPriceMode,
  type BulkPricePreview,
  type BulkPriceRequest,
  type BulkPriceSide,
  type PriceRounding,
} from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type SideMode = "UNCHANGED" | BulkPriceMode;

type SideDraft = {
  mode: SideMode;
  value: string;
  overwrite: boolean;
};

type Target = Omit<
  BulkPriceRequest,
  "buying" | "selling" | "rounding" | "acknowledgeLosses"
>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencyCode: string;
  selectionCount: number;
  target: Target | null;
  onApplied: (updated: number) => void;
};

const BUYING_SHORTCUTS = [80, 85, 90] as const;
const SELLING_SHORTCUTS = [10, 15, 20, 25, 30] as const;

const MODES: { id: SideMode; label: string }[] = [
  { id: "UNCHANGED", label: "Don't change" },
  { id: "SET_AMOUNT", label: "Set amount" },
  { id: "INCREASE_PERCENT", label: "Increase %" },
  { id: "DECREASE_PERCENT", label: "Decrease %" },
  { id: "PERCENT_OF_COUNTERPART", label: "From the other price" },
];

const ROUNDING: { id: PriceRounding; label: string }[] = [
  { id: "NONE", label: "Exact" },
  { id: "NEAREST_1", label: "Nearest 1" },
  { id: "NEAREST_5", label: "Nearest 5" },
  { id: "NEAREST_10", label: "Nearest 10" },
];

function emptySide(): SideDraft {
  return { mode: "UNCHANGED", value: "", overwrite: false };
}

export function BulkPriceEditor({
  open,
  onOpenChange,
  currencyCode,
  selectionCount,
  target,
  onApplied,
}: Props) {
  const [buying, setBuying] = useState<SideDraft>(emptySide);
  const [selling, setSelling] = useState<SideDraft>(emptySide);
  const [rounding, setRounding] = useState<PriceRounding>("NONE");
  const [preview, setPreview] = useState<BulkPricePreview | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setBuying(emptySide());
    setSelling(emptySide());
    setRounding("NONE");
    setPreview(null);
    setAcknowledge(false);
    setError("");
    setBusy(null);
    setApplied(null);
  }, [open]);

  function touch(next: () => void) {
    setPreview(null);
    setAcknowledge(false);
    setApplied(null);
    setError("");
    next();
  }

  const request = useMemo(() => {
    if (!target) return null;
    const buyingSide = toSide(buying);
    const sellingSide = toSide(selling);
    if (!buyingSide && !sellingSide) return null;
    return {
      ...target,
      buying: buyingSide,
      selling: sellingSide,
      rounding,
      acknowledgeLosses: acknowledge,
    } satisfies BulkPriceRequest;
  }, [acknowledge, buying, rounding, selling, target]);

  async function onPreview() {
    const problem = validateDrafts(buying, selling);
    if (problem || !target) {
      setError(problem ?? "Select at least one item.");
      return;
    }
    const body = {
      ...target,
      buying: toSide(buying),
      selling: toSide(selling),
      rounding,
      acknowledgeLosses: false,
    } satisfies BulkPriceRequest;
    setBusy("preview");
    setError("");
    try {
      const result = await previewBulkPrices(body);
      setPreview(result);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function onApply() {
    if (!request || !preview || preview.affected === 0) return;
    if (preview.requiresLossAcknowledgement && !acknowledge) return;
    setBusy("apply");
    setError("");
    try {
      const result = await applyBulkPrices({
        ...request,
        acknowledgeLosses: acknowledge,
      });
      setApplied(result.updated);
      onApplied(result.updated);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  const lossBlocked = !!preview?.requiresLossAcknowledgement && !acknowledge;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1.5rem)] max-w-3xl gap-0 overflow-hidden rounded-none border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] p-0 shadow-[0_24px_80px_-32px_rgba(21,35,31,0.45)]"
      >
        <div className={styles.root}>
          <header className={styles.header}>
            <DialogClose className="absolute right-3 top-3 inline-flex size-7 items-center justify-center text-[var(--catalog-ink,#15231f)] hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_6%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--catalog-primary,#0f766e)]">
              <X className="size-4" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogClose>
            <DialogTitle className={cn(styles.title, "text-[15px] leading-tight tracking-[-0.02em] text-[var(--catalog-ink,#15231f)]")}>
              Edit prices
            </DialogTitle>
            <DialogDescription className={cn(styles.description, "text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]")}>
              {selectionCount.toLocaleString()}{" "}
              {selectionCount === 1 ? "item" : "items"} selected. Prices that
              are already set stay as they are unless you choose to replace them.
            </DialogDescription>
          </header>

          <div className={styles.body}>
            {applied != null ? (
              <p className={styles.summary} role="status">
                Updated prices on {applied.toLocaleString()}{" "}
                {applied === 1 ? "item" : "items"}.
              </p>
            ) : (
              <>
                <div className={styles.sides}>
                  <SideEditor
                    title="Buying price"
                    draft={buying}
                    counterpartLabel="% of selling price"
                    shortcuts={BUYING_SHORTCUTS}
                    shortcutSuffix="%"
                    onChange={(next) => touch(() => setBuying(next))}
                  />
                  <SideEditor
                    title="Selling price"
                    draft={selling}
                    counterpartLabel="Markup on buying price"
                    shortcuts={SELLING_SHORTCUTS}
                    shortcutPrefix="+"
                    shortcutSuffix="%"
                    onChange={(next) => touch(() => setSelling(next))}
                  />
                </div>

                <fieldset className={styles.side}>
                  <legend className={styles.sideTitle}>Rounding</legend>
                  <div className={styles.track} role="radiogroup" aria-label="Rounding">
                    {ROUNDING.map((option) => {
                      const active = rounding === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => touch(() => setRounding(option.id))}
                          className={cn(styles.round, active && styles.roundOn)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {preview ? (
                  <PreviewTable
                    preview={preview}
                    currencyCode={currencyCode}
                    acknowledge={acknowledge}
                    onAcknowledge={(checked) => {
                      setAcknowledge(checked);
                      setError("");
                    }}
                  />
                ) : null}

                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.ghost}
              disabled={!!busy}
              onClick={() => onOpenChange(false)}
            >
              {applied != null ? "Done" : "Cancel"}
            </button>
            {applied == null ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={!!busy || (buying.mode === "UNCHANGED" && selling.mode === "UNCHANGED")}
                  onClick={() => void onPreview()}
                >
                  {busy === "preview" ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : null}
                  Preview
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={
                    !!busy ||
                    !preview ||
                    preview.affected === 0 ||
                    lossBlocked
                  }
                  onClick={() => void onApply()}
                >
                  {busy === "apply" ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {preview
                    ? `Update ${preview.affected.toLocaleString()} ${preview.affected === 1 ? "item" : "items"}`
                    : "Update prices"}
                </button>
              </div>
            ) : null}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SideEditor({
  title,
  draft,
  counterpartLabel,
  shortcuts,
  shortcutPrefix = "",
  shortcutSuffix,
  onChange,
}: {
  title: string;
  draft: SideDraft;
  counterpartLabel: string;
  shortcuts: readonly number[];
  shortcutPrefix?: string;
  shortcutSuffix: string;
  onChange: (next: SideDraft) => void;
}) {
  const needsValue = draft.mode !== "UNCHANGED";
  const relative =
    draft.mode === "INCREASE_PERCENT" || draft.mode === "DECREASE_PERCENT";
  const fromOther = draft.mode === "PERCENT_OF_COUNTERPART";

  return (
    <fieldset className={styles.side}>
      <legend className={styles.sideTitle}>{title}</legend>
      <div className={styles.track}>
        {shortcuts.map((percent) => {
          const active = fromOther && draft.value === String(percent);
          return (
            <button
              key={percent}
              type="button"
              onClick={() =>
                onChange({
                  mode: "PERCENT_OF_COUNTERPART",
                  value: String(percent),
                  overwrite: false,
                })
              }
              className={cn(styles.chip, active && styles.chipOn)}
            >
              {shortcutPrefix}
              {percent}
              {shortcutSuffix}
            </button>
          );
        })}
      </div>
      <label className="block space-y-1">
        <span className={styles.label}>How</span>
        <select
          className={styles.field}
          value={draft.mode}
          onChange={(event) =>
            onChange({
              ...draft,
              mode: event.target.value as SideMode,
              overwrite: false,
            })
          }
        >
          {MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.id === "PERCENT_OF_COUNTERPART" ? counterpartLabel : mode.label}
            </option>
          ))}
        </select>
      </label>
      {needsValue ? (
        <label className="block space-y-1">
          <span className={styles.label}>
            {draft.mode === "SET_AMOUNT" ? "Amount" : "Percent"}
          </span>
          <input
            className={cn(styles.field, "tabular-nums")}
            inputMode="decimal"
            value={draft.value}
            onChange={(event) => onChange({ ...draft, value: event.target.value })}
            aria-label={draft.mode === "SET_AMOUNT" ? `${title} amount` : `${title} percent`}
          />
        </label>
      ) : null}
      {relative ? (
        <p className={styles.hint}>
          Only items that already have this price. Empty prices are left alone.
        </p>
      ) : null}
      {needsValue && !relative ? (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={draft.overwrite}
            onChange={(event) =>
              onChange({ ...draft, overwrite: event.target.checked })
            }
          />
          <span>Replace prices that are already set</span>
        </label>
      ) : null}
    </fieldset>
  );
}

function PreviewTable({
  preview,
  currencyCode,
  acknowledge,
  onAcknowledge,
}: {
  preview: BulkPricePreview;
  currencyCode: string;
  acknowledge: boolean;
  onAcknowledge: (checked: boolean) => void;
}) {
  const money = (value: number | string | null | undefined) =>
    formatMoney(value, currencyCode);

  return (
    <div className="space-y-2">
      <p className={styles.summary}>
        <strong>{preview.affected.toLocaleString()}</strong> will change
        {preview.skippedExisting > 0
          ? `, ${preview.skippedExisting.toLocaleString()} left alone because a price is already set`
          : ""}
        {preview.unchanged > 0
          ? `, ${preview.unchanged.toLocaleString()} unchanged`
          : ""}
        .
      </p>
      {preview.losses > 0 ? (
        <div className={styles.loss}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-2">
            <p>
              {preview.losses.toLocaleString()}{" "}
              {preview.losses === 1 ? "item" : "items"} would have a buying price
              higher than the selling price.
            </p>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={acknowledge}
                onChange={(event) => onAcknowledge(event.target.checked)}
              />
              <span>Apply even though those items would sell below cost</span>
            </label>
          </div>
        </div>
      ) : null}
      {preview.lowMargin > 0 ? (
        <p className={styles.hint}>
          {preview.lowMargin.toLocaleString()}{" "}
          {preview.lowMargin === 1 ? "item has" : "items have"} a margin under{" "}
          {String(preview.lowMarginPct)}%.
        </p>
      ) : null}
      {preview.rows.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Current buying</th>
                <th>New buying</th>
                <th>Current selling</th>
                <th>New selling</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    row.loss && styles.rowLoss,
                    !row.loss && row.lowMargin && styles.rowThin,
                  )}
                >
                  <td>
                    <span className="font-medium">{row.name}</span>
                    {row.loss ? (
                      <span className={cn(styles.note, styles.noteLoss)}>
                        Buying above selling
                      </span>
                    ) : row.lowMargin ? (
                      <span className={cn(styles.note, styles.noteQuiet)}>
                        Thin margin
                      </span>
                    ) : row.skippedExisting ? (
                      <span className={cn(styles.note, styles.noteQuiet)}>
                        Already priced
                      </span>
                    ) : null}
                  </td>
                  <td>{money(row.currentBuying)}</td>
                  <td className={row.buyingChanged ? styles.changed : undefined}>
                    {money(row.newBuying)}
                  </td>
                  <td>{money(row.currentSelling)}</td>
                  <td className={row.sellingChanged ? styles.changed : undefined}>
                    {money(row.newSelling)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {preview.truncated ? (
        <p className={styles.hint}>
          Showing the first {preview.rows.length.toLocaleString()} rows. The
          counts above include every selected item.
        </p>
      ) : null}
    </div>
  );
}

function toSide(draft: SideDraft): BulkPriceSide | null {
  if (draft.mode === "UNCHANGED") return null;
  const value = Number(draft.value);
  if (!Number.isFinite(value)) return null;
  const relative =
    draft.mode === "INCREASE_PERCENT" || draft.mode === "DECREASE_PERCENT";
  return {
    mode: draft.mode,
    value,
    overwriteExisting: relative ? true : draft.overwrite,
  };
}

function validateDrafts(buying: SideDraft, selling: SideDraft): string | null {
  if (buying.mode === "UNCHANGED" && selling.mode === "UNCHANGED") {
    return "Choose a buying price, a selling price, or both.";
  }
  return sideProblem(buying, "Buying") ?? sideProblem(selling, "Selling");
}

function sideProblem(draft: SideDraft, label: string): string | null {
  if (draft.mode === "UNCHANGED") return null;
  const value = Number(draft.value);
  if (!Number.isFinite(value)) return `Enter a ${label.toLowerCase()} amount or percent.`;
  if (draft.mode === "SET_AMOUNT" && value <= 0) {
    return `${label} amount must be greater than zero.`;
  }
  if (draft.mode === "INCREASE_PERCENT" && (value <= 0 || value > 1000)) {
    return `${label} increase must be between 0 and 1000 percent.`;
  }
  if (draft.mode === "DECREASE_PERCENT" && (value <= 0 || value >= 100)) {
    return `${label} decrease must be greater than 0 and less than 100 percent.`;
  }
  if (draft.mode === "PERCENT_OF_COUNTERPART") {
    if (label === "Selling" && (value < 0 || value > 1000)) {
      return "Markup must be between 0 and 1000 percent.";
    }
    if (label === "Buying" && (value <= 0 || value > 500)) {
      return "Percent of selling price must be between 0 and 500.";
    }
  }
  return null;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Could not update prices. Try again.";
}

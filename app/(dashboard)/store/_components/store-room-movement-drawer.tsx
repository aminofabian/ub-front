"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiRequestError,
  postStoreRoomMovement,
  type StoreItemRecord,
  type StoreRoomDirection,
  type StoreRoomMovementRecord,
  type StoreRoomReason,
} from "@/lib/api";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { cn } from "@/lib/utils";

/**
 * Every store-room reason in one place, with the two things the form needs to know:
 * which direction it belongs to, and whether it changes stock.
 *
 * Two classes, and the split is the point. "Restocked the shelf" and "Spoilage" are
 * both take-outs, but only spoilage means the shop lost something. Treating the
 * first as a stock decrement would drain inventory every time a shelf was filled.
 *
 * Mirrors `zelisline.ub.storeroom.domain.StoreRoomReason`; the server rejects an
 * unknown reason, so drift fails loudly rather than silently.
 */
export const STORE_ROOM_REASONS: readonly {
  value: StoreRoomReason;
  label: string;
  direction: StoreRoomDirection;
  changesStock: boolean;
  hint: string;
}[] = [
  // Class A — moved, still ours.
  {
    value: "restock_to_shelf",
    label: "Restocked the shelf",
    direction: "out",
    changesStock: false,
    hint: "Still yours — it just moved to the front.",
  },
  {
    value: "kitchen_prep",
    label: "Kitchen / prep",
    direction: "out",
    changesStock: false,
    hint: "Used to make something you will sell.",
  },
  {
    value: "counter_transfer",
    label: "Moved to another counter",
    direction: "out",
    changesStock: false,
    hint: "Still yours — just not in the back room now.",
  },
  // Class B — gone. Physical loss goes through the wastage path (oldest first).
  {
    value: "spoilage",
    label: "Spoilage",
    direction: "out",
    changesStock: true,
    hint: "Written off, oldest stock first.",
  },
  {
    value: "expired",
    label: "Expired",
    direction: "out",
    changesStock: true,
    hint: "Written off, oldest stock first.",
  },
  {
    value: "breakage",
    label: "Breakage / damage",
    direction: "out",
    changesStock: true,
    hint: "Written off, oldest stock first.",
  },
  {
    value: "customer_return",
    label: "Customer return",
    direction: "out",
    changesStock: true,
    hint: "Came back and is not fit to sell.",
  },
  {
    value: "theft",
    label: "Theft",
    direction: "out",
    changesStock: true,
    hint: "Removed from stock.",
  },
  {
    value: "staff_use",
    label: "Staff use",
    direction: "out",
    changesStock: true,
    hint: "Removed from stock.",
  },
  {
    value: "count_correction",
    label: "Count correction",
    direction: "out",
    changesStock: true,
    hint: "Stock turned out to be less than the count said.",
  },
  {
    value: "other",
    label: "Something else",
    direction: "out",
    changesStock: true,
    hint: "Add a note so it still makes sense next month.",
  },
  // Put in.
  {
    value: "received_into_room",
    label: "Back into the store room",
    direction: "in",
    changesStock: false,
    hint: "A note in the log — stock is unchanged.",
  },
];

const REASON_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  STORE_ROOM_REASONS.map((reason) => [reason.value, reason.label]),
);

/** Display label for a reason, falling back to the raw wire value. */
export function storeRoomReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export function storeRoomReasonHint(reason: string): string | null {
  return STORE_ROOM_REASONS.find((r) => r.value === reason)?.hint ?? null;
}

/** A movement that took stock out of the shop for good. */
export function isStockLoss(effect: string): boolean {
  return effect === "decrease";
}

function parseQuantity(raw: string, wholeOnly: boolean): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (wholeOnly && !Number.isInteger(n)) return null;
  return n;
}

/**
 * Take out / put in.
 *
 * State is seeded once from the props, so the caller must remount this drawer per
 * open (pass a changing `key`) rather than reusing one instance — otherwise a
 * previous movement's item and quantity would leak into the next one.
 */
export function StoreRoomMovementDrawer({
  open,
  onOpenChange,
  rows,
  connected,
  initial,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: StoreItemRecord[];
  connected: boolean;
  /** Pre-selected row + direction, e.g. from a table row action. */
  initial: { storeItemId?: string | null; direction: StoreRoomDirection } | null;
  onRecorded: (movement: StoreRoomMovementRecord) => void;
}) {
  const [storeItemId, setStoreItemId] = useState(
    initial?.storeItemId ?? rows[0]?.id ?? "",
  );
  const [direction, setDirection] = useState<StoreRoomDirection>(
    initial?.direction ?? "out",
  );
  const [reason, setReason] = useState<StoreRoomReason>(
    initial?.direction === "in" ? "received_into_room" : "spoilage",
  );
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const row = useMemo(
    () => rows.find((candidate) => candidate.id === storeItemId) ?? null,
    [rows, storeItemId],
  );
  /** A row is only "linked" while the store room follows inventory. */
  const linked = connected && row?.itemId != null;

  const reasonsForDirection = useMemo(
    () => STORE_ROOM_REASONS.filter((option) => option.direction === direction),
    [direction],
  );

  const meta = STORE_ROOM_REASONS.find((option) => option.value === reason);
  const changesStock = meta?.changesStock ?? false;
  const wholeOnly = changesStock && !linked;
  const parsed = parseQuantity(quantity, wholeOnly);
  const noteRequired = reason === "other";

  const submit = async () => {
    if (!row) {
      setError("Pick something from the store room.");
      return;
    }
    if (parsed == null) {
      setError(
        wholeOnly
          ? "Enter a whole number of one or more."
          : "Enter a quantity of one or more.",
      );
      return;
    }
    if (noteRequired && !note.trim()) {
      setError("Add a short note so this still makes sense later.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const movement = await postStoreRoomMovement({
        storeItemId: row.id,
        direction,
        reason,
        quantity: parsed,
        note: note.trim() || null,
      });
      onOpenChange(false);
      onRecorded(movement);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : DEFAULT_PROBLEM_TITLE,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Store room"
      title={direction === "out" ? "Take out of the store room" : "Put back in the store room"}
      description={
        direction === "out"
          ? "Say what left and why. Only a loss changes stock — restocking the shelf does not."
          : "Record what came back into the back room."
      }
      icon={
        direction === "out" ? (
          <ArrowUpFromLine className="size-4" aria-hidden />
        ) : (
          <ArrowDownToLine className="size-4" aria-hidden />
        )
      }
      width="default"
      appearance="sharp"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className={cn(dashboardHintClass(), "truncate")}>
            {row ? `On file: ${row.name}` : null}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={changesStock ? "destructive" : "default"}
              disabled={busy || !row}
              onClick={() => void submit()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {direction === "out" ? "Record take-out" : "Record put-in"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div
          role="group"
          aria-label="Direction"
          className="grid grid-cols-2 gap-2"
        >
          {(
            [
              { value: "out", label: "Take out", icon: ArrowUpFromLine },
              { value: "in", label: "Put in", icon: ArrowDownToLine },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const active = direction === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDirection(option.value);
                  const firstForDirection = STORE_ROOM_REASONS.find(
                    (candidate) => candidate.direction === option.value,
                  );
                  if (firstForDirection) setReason(firstForDirection.value);
                }}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 border text-[13px] font-medium transition-colors",
                  active
                    ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)] text-[var(--pos-primary,#0f766e)]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_15%,transparent)] text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Item
          </span>
          <select
            className={dashboardInputClass()}
            value={storeItemId}
            onChange={(event) => setStoreItemId(event.target.value)}
            disabled={Boolean(initial?.storeItemId)}
            required
          >
            {rows.length === 0 ? <option value="">Nothing in the store room</option> : null}
            {rows.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
                {connected && candidate.itemId ? " · follows stock" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            How many
          </span>
          <input
            className={dashboardInputClass()}
            type="number"
            min={wholeOnly ? 1 : 0.01}
            step={wholeOnly ? 1 : 0.01}
            inputMode={wholeOnly ? "numeric" : "decimal"}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Why
          </span>
          <select
            className={dashboardInputClass()}
            value={reason}
            onChange={(event) => setReason(event.target.value as StoreRoomReason)}
            required
          >
            {reasonsForDirection.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Note {noteRequired ? "" : "(optional)"}
          </span>
          <textarea
            className={dashboardTextareaClass()}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              noteRequired ? "What happened?" : "Any detail worth keeping…"
            }
          />
        </label>

        {meta ? (
          <p
            className={cn(
              dashboardHintClass(),
              "border-l-2 pl-2.5",
              changesStock
                ? "border-rose-500/60 text-rose-700 dark:text-rose-400"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)]",
            )}
          >
            {meta.hint}
            {changesStock
              ? linked
                ? " This reduces stock for the linked product."
                : " This reduces this list's count."
              : null}
          </p>
        ) : null}

        {error ? (
          <p className="border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-[12px] leading-snug text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </FormDrawer>
  );
}

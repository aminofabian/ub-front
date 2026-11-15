"use client";

import { useMemo, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import type { MenuItemRecord, ModifierGroupRecord } from "@/lib/restaurant-api";
import { defaultSelection, priceSelection, selectionProblem, toggleOption } from "@/lib/restaurant-cart";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");

function ruleLabel(group: ModifierGroupRecord): string {
  if (group.minSelect === 0) return group.maxSelect === 1 ? "Optional" : `Optional, up to ${group.maxSelect}`;
  if (group.minSelect === group.maxSelect) return group.minSelect === 1 ? "Choose one" : `Choose ${group.minSelect}`;
  return `Choose ${group.minSelect} to ${group.maxSelect}`;
}

/** What the customer wants on one dish: its choices and anything they asked for. */
export function ModifierSheet({
  item,
  groups,
  onClose,
  onAdd,
}: {
  item: MenuItemRecord;
  groups: ModifierGroupRecord[];
  onClose: () => void;
  onAdd: (choice: { unitPrice: number; optionIds: string[]; optionNames: string[]; note: string; quantity: number }) => void;
}) {
  const [selected, setSelected] = useState<string[]>(() => defaultSelection(groups));
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const priced = useMemo(() => priceSelection(item, groups, selected), [item, groups, selected]);
  const problem = selectionProblem(groups, selected);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            <span className="font-mono tabular-nums">{kes(item.price ?? 0)}</span> before choices
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {groups.map((group) => (
            <fieldset key={group.id} className="grid gap-1.5">
              <legend className={dashboardLabelClass()}>
                {group.name} <span className={dashboardHintClass()}>· {ruleLabel(group)}</span>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((option) => {
                  const on = selected.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role={group.maxSelect === 1 ? "radio" : "checkbox"}
                      aria-checked={on}
                      disabled={!option.available}
                      className={cn(
                        "min-h-[3.25rem] rounded-[2px] border px-3 py-2 text-left text-sm",
                        "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        on &&
                          "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]",
                      )}
                      onClick={() => setSelected((prev) => toggleOption(prev, group, option))}
                    >
                      <span className="block font-semibold">{option.name}</span>
                      <span className="block font-mono text-xs tabular-nums">
                        {!option.available ? "Run out" : option.priceDelta > 0 ? `+ ${kes(option.priceDelta)}` : "No extra"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Anything else (optional)</span>
            <input
              className={dashboardInputClass(false)}
              value={note}
              maxLength={255}
              placeholder="No onions, extra hot…"
              onChange={(e) => setNote(e.target.value)}
            />
            <span className={dashboardHintClass()}>The kitchen sees this on the ticket.</span>
          </label>

          <div className="flex items-center justify-between gap-3">
            <span className={dashboardLabelClass()}>How many</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11 text-lg"
                aria-label="One fewer"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="w-8 text-center font-mono text-lg tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11 text-lg"
                aria-label="One more"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 grid gap-2">
          {problem ? (
            <p role="status" className="text-sm text-red-700">
              {problem}
            </p>
          ) : null}
          <Button
            className="h-12 w-full text-base"
            disabled={problem != null}
            onClick={() =>
              onAdd({
                unitPrice: priced.unitPrice,
                optionIds: priced.optionIds,
                optionNames: priced.optionNames,
                note: note.trim(),
                quantity,
              })
            }
          >
            Add · {kes(priced.unitPrice * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Layers, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ItemTypeRecord } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  itemTypes: ItemTypeRecord[];
  currentItemTypeId: string | null;
  busy?: boolean;
  /** Persists the new department. Resolve to true to close the modal. */
  onSave: (nextItemTypeId: string) => Promise<boolean>;
};

export function ChangeItemTypeModal({
  open,
  onOpenChange,
  productName,
  itemTypes,
  currentItemTypeId,
  busy = false,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string>(currentItemTypeId ?? "");

  // Reset selection whenever the dialog reopens for a different product.
  useEffect(() => {
    if (!open) return;
    setSelected(currentItemTypeId ?? "");
  }, [open, currentItemTypeId]);

  const sorted = useMemo(
    () =>
      [...itemTypes]
        .filter((t) => t.active)
        .sort((a, b) => {
          const ax = a.sortOrder ?? 0;
          const bx = b.sortOrder ?? 0;
          if (ax !== bx) return ax - bx;
          return a.label.localeCompare(b.label);
        }),
    [itemTypes],
  );

  const currentLabel =
    itemTypes.find((t) => t.id === currentItemTypeId)?.label?.trim() ||
    "Unassigned";

  const changed = selected.trim() && selected !== currentItemTypeId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    const ok = await onSave(selected);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <DialogContent className="max-h-[min(90vh,36rem)] max-w-md gap-0 overflow-hidden p-0">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="size-5 text-primary" aria-hidden />
              Change department
            </DialogTitle>
            <DialogDescription>
              Move{" "}
              <span className="font-medium text-foreground">{productName}</span>{" "}
              to a different department. Currently{" "}
              <span className="font-medium text-foreground">
                {currentLabel}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {sorted.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No departments exist yet. Create one from the catalog settings
                before changing this product.
              </div>
            ) : (
              <ul className="space-y-2">
                {sorted.map((t) => {
                  const isSelected = selected === t.id;
                  const isCurrent = currentItemTypeId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(t.id)}
                        disabled={busy}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                          isSelected
                            ? "border-primary/60 bg-primary/[0.06] ring-1 ring-inset ring-primary/30"
                            : "border-border/60 bg-background hover:bg-muted/30",
                          busy && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                          aria-hidden
                        >
                          <Layers className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {t.label}
                            {isCurrent ? (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Current
                              </span>
                            ) : null}
                            {t.isDefault ? (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Default
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t.key}
                          </span>
                        </span>
                        {isSelected ? (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !changed || sorted.length === 0}
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

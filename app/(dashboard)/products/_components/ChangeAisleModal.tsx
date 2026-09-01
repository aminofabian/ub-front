"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";

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
import type { AisleRecord } from "@/lib/api";

const CLEAR_AISLE = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  aisles: AisleRecord[];
  currentAisleId: string | null;
  busy?: boolean;
  selectionCount?: number;
  /** Persists shelf zone. Pass empty string to clear. Resolve true to close. */
  onSave: (nextAisleId: string) => Promise<boolean>;
};

export function ChangeAisleModal({
  open,
  onOpenChange,
  productName,
  aisles,
  currentAisleId,
  busy = false,
  selectionCount,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string>(currentAisleId ?? CLEAR_AISLE);
  const isBulk = selectionCount != null && selectionCount > 0;

  useEffect(() => {
    if (!open) return;
    setSelected(currentAisleId?.trim() ? currentAisleId : CLEAR_AISLE);
  }, [open, currentAisleId, selectionCount]);

  const sorted = useMemo(
    () =>
      [...aisles]
        .filter((a) => a.active)
        .sort((a, b) => {
          const ax = a.sortOrder ?? 0;
          const bx = b.sortOrder ?? 0;
          if (ax !== bx) return ax - bx;
          return a.name.localeCompare(b.name);
        }),
    [aisles],
  );

  const currentLabel =
    aisles.find((a) => a.id === currentAisleId)?.name?.trim() || null;

  const resolvedSelection =
    selected === CLEAR_AISLE ? "" : selected.trim();
  const resolvedCurrent = currentAisleId?.trim() || "";
  const changed = resolvedSelection !== resolvedCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    const ok = await onSave(resolvedSelection);
    if (ok) onOpenChange(false);
  };

  const subjectLabel = isBulk
    ? `${selectionCount.toLocaleString()} selected item${selectionCount === 1 ? "" : "s"}`
    : productName;

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <DialogContent className="max-h-[min(90vh,36rem)] max-w-md gap-0 overflow-hidden p-0">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-5 text-primary" aria-hidden />
              Assign shelf zone
            </DialogTitle>
            <DialogDescription>
              Set shelf zone for{" "}
              <span className="font-medium text-foreground">{subjectLabel}</span>
              {currentLabel ? (
                <>
                  . Currently{" "}
                  <span className="font-medium text-foreground">
                    {currentLabel}
                  </span>
                </>
              ) : (
                <> — no zone assigned yet</>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => setSelected(CLEAR_AISLE)}
                  disabled={busy}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected === CLEAR_AISLE
                      ? "border-primary/60 bg-primary/[0.06] ring-1 ring-inset ring-primary/30"
                      : "border-border/60 bg-background hover:bg-muted/30",
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    No shelf zone
                  </span>
                </button>
              </li>
              {sorted.length === 0 ? (
                <li className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  No shelf zones yet. Create one from Your shop → Shelf zones.
                </li>
              ) : (
                sorted.map((a) => {
                  const isSelected = selected === a.id;
                  const isCurrent = currentAisleId === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(a.id)}
                        disabled={busy}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary/60 bg-primary/[0.06] ring-1 ring-inset ring-primary/30"
                            : "border-border/60 bg-background hover:bg-muted/30",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {a.name}
                            {isCurrent ? (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Current
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.code}
                            {a.productCount > 0
                              ? ` · ${a.productCount.toLocaleString()} products`
                              : ""}
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
                })
              )}
            </ul>
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
            <Button type="submit" disabled={busy || !changed} className="gap-2">
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save shelf zone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

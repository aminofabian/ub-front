"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Link2, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addItemSupplierLink,
  fetchItems,
  type ItemSummaryRecord,
  type SupplierRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type SupplierReceiveLinkModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  supplier: SupplierRecord;
  /** Item ids already linked to this supplier (hide or mark). */
  linkedItemIds: Set<string>;
  onLinked: () => void;
};

const fieldClass = cn(
  "w-full border border-border/60 bg-background px-3 py-2.5 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
);

export function SupplierReceiveLinkModal({
  open,
  onOpenChange,
  brandTheme,
  supplier,
  linkedItemIds,
  onLinked,
}: SupplierReceiveLinkModalProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ItemSummaryRecord[]>([]);
  const [costStr, setCostStr] = useState("");
  const [linking, setLinking] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selected.map((p) => p.id)),
    [selected],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setSelected([]);
    setCostStr("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let cancelled = false;
    const t = window.setTimeout(
      () => {
        setBusy(true);
        void fetchItems(q || undefined, {
          size: 24,
          catalogScope: "ALL",
          softAuth: true,
        })
          .then((rows) => {
            if (!cancelled) {
              setHits(rows.filter((r) => r.groupLabelOnly !== true));
            }
          })
          .catch(() => {
            if (!cancelled) setHits([]);
          })
          .finally(() => {
            if (!cancelled) setBusy(false);
          });
      },
      q ? 220 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, query]);

  const toggle = (item: ItemSummaryRecord) => {
    if (linkedItemIds.has(item.id)) return;
    setSelected((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const onLink = async () => {
    if (selected.length === 0) {
      toast.error("Pick at least one product");
      return;
    }
    let cost: number | undefined;
    if (costStr.trim()) {
      const n = Number(costStr);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Cost must be a valid non-negative number");
        return;
      }
      cost = n;
    }
    setLinking(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const product of selected) {
        try {
          await addItemSupplierLink(product.id, {
            supplierId: supplier.id,
            ...(cost != null ? { defaultCostPrice: cost } : {}),
            setPrimary: ok === 0,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (ok > 0) {
        toast.success(
          ok === 1
            ? `Linked 1 product → ${supplier.name}`
            : `Linked ${ok} products → ${supplier.name}`,
        );
        onLinked();
        onOpenChange(false);
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "1 product could not be linked"
            : `${failed} products could not be linked`,
        );
      }
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="flex max-h-[min(92dvh,40rem)] max-w-md flex-col gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-3">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Link2 className="size-4 text-[var(--pos-primary)]" />
              Link products
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attach catalog items to {supplier.name} so they appear on this
              till.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(fieldClass, "pl-9")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog…"
              autoFocus
              disabled={linking}
            />
            {busy ? (
              <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Default cost (optional)
            </span>
            <input
              className={fieldClass}
              inputMode="decimal"
              value={costStr}
              onChange={(e) => setCostStr(e.target.value)}
              placeholder="0.00"
              disabled={linking}
            />
          </label>

          <ul className="max-h-64 divide-y overflow-auto border border-border/60">
            {hits.length === 0 && !busy ? (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                {query.trim() ? "No match" : "Type to search the catalog"}
              </li>
            ) : (
              hits.map((item) => {
                const already = linkedItemIds.has(item.id);
                const picked = selectedIds.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={already || linking}
                      onClick={() => toggle(item)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        already
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-muted/50",
                        picked && "bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center border text-[10px]",
                          picked || already
                            ? "border-[var(--pos-primary)] bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]"
                            : "border-border",
                        )}
                      >
                        {already || picked ? (
                          <Check className="size-3" aria-hidden />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {cashierItemPrimaryLabel(item)}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.sku}
                          {item.barcode ? ` · ${item.barcode}` : ""}
                          {already ? " · Already linked" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <DialogFooter className="border-t border-border/40 px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={linking}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-3.5" aria-hidden />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={linking || selected.length === 0}
            onClick={() => void onLink()}
          >
            {linking ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Link2 className="size-3.5" aria-hidden />
            )}
            Link {selected.length > 0 ? selected.length : ""} product
            {selected.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

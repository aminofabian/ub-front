"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { ReceiptText } from "lucide-react";
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
  fetchBusiness,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CashierReceiptShopModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  shopName: string;
  lastReceiptNo?: number | null;
  nextReceiptNo?: number | null;
  onSaved: () => Promise<void> | void;
};

function effectiveNextReceipt(
  lastReceiptNo: number | null | undefined,
  nextReceiptNo: number | null | undefined,
): number {
  const fromMax =
    lastReceiptNo != null && Number.isFinite(lastReceiptNo)
      ? Math.floor(lastReceiptNo) + 1
      : 1;
  const floor =
    nextReceiptNo != null && Number.isFinite(nextReceiptNo)
      ? Math.floor(nextReceiptNo)
      : 1;
  return Math.max(fromMax, floor);
}

export function CashierReceiptShopModal({
  open,
  onOpenChange,
  brandTheme,
  shopName,
  lastReceiptNo,
  nextReceiptNo,
  onSaved,
}: CashierReceiptShopModalProps) {
  const shopId = useId();
  const receiptId = useId();
  const [name, setName] = useState(shopName);
  const [receiptInput, setReceiptInput] = useState(
    String(effectiveNextReceipt(lastReceiptNo, nextReceiptNo)),
  );
  const [lastIssued, setLastIssued] = useState<number | null>(
    lastReceiptNo ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(shopName);
    setLastIssued(lastReceiptNo ?? null);
    setReceiptInput(String(effectiveNextReceipt(lastReceiptNo, nextReceiptNo)));

    let cancelled = false;
    setLoading(true);
    void fetchBusiness()
      .then((biz: BusinessRecord) => {
        if (cancelled) return;
        setName(biz.name?.trim() || shopName);
        setLastIssued(biz.lastReceiptNo ?? null);
        setReceiptInput(
          String(effectiveNextReceipt(biz.lastReceiptNo, biz.nextReceiptNo)),
        );
      })
      .catch(() => {
        // Keep props-seeded values when refresh fails.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, shopName, lastReceiptNo, nextReceiptNo]);

  const minAllowed =
    lastIssued != null && Number.isFinite(lastIssued)
      ? Math.floor(lastIssued) + 1
      : 1;

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a shop name.");
      return;
    }
    const parsed = Number(receiptInput.trim());
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      toast.error("Receipt number must be a whole number of 1 or more.");
      return;
    }
    if (parsed < minAllowed) {
      toast.error(`Next receipt number must be at least ${minAllowed}.`);
      return;
    }

    setSaving(true);
    try {
      await updateBusiness({
        name: trimmed,
        nextReceiptNo: parsed,
      });
      await onSaved();
      toast.success("Shop and receipt number saved.");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Could not save. Try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    "h-10 w-full rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
    "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] px-3 text-sm text-foreground shadow-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
    "disabled:opacity-50 dark:bg-card/80",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        overlayClassName="bg-black/45 backdrop-blur-[3px] dark:bg-black/55"
        className={cn(
          "max-w-md gap-0 overflow-hidden p-0",
          "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,white)]",
          "dark:bg-background",
        )}
        style={brandTheme}
      >
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-5 pb-4 pt-5 pr-12">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-[1.0625rem] tracking-[-0.02em]">
              <ReceiptText
                className="size-4 text-[var(--pos-primary)]"
                aria-hidden
              />
              Receipt & shop
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              Shop name prints on receipts. Set the next receipt number when
              migrating from another till.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor={shopId} className="text-[13px] font-medium">
              Shop name
            </label>
            <input
              id={shopId}
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving || loading}
              autoComplete="organization"
              placeholder="Shop name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={receiptId} className="text-[13px] font-medium">
              Next receipt number
            </label>
            <input
              id={receiptId}
              type="number"
              inputMode="numeric"
              min={minAllowed}
              step={1}
              className={inputClass}
              value={receiptInput}
              onChange={(e) => setReceiptInput(e.target.value)}
              disabled={saving || loading}
            />
            <p className="text-[12px] leading-snug text-muted-foreground">
              {lastIssued != null
                ? `Last issued was #${lastIssued}. Next sale will use this number (or higher if sales catch up).`
                : "No receipts yet. The first sale will use this number."}
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || loading}
            onClick={() => {
              void onSave();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

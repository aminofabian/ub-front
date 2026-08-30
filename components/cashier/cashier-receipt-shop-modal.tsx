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
  fetchBranches,
  patchBranch,
  updateBusiness,
  type BranchRecord,
  type BusinessRecord,
} from "@/lib/api";
import {
  branchReceiptDraft,
  type BranchReceiptSettings,
} from "@/lib/branch-receipt";
import { cn } from "@/lib/utils";

type CashierReceiptShopModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  shopName: string;
  branchId: string | null | undefined;
  branchName?: string | null;
  branchAddress?: string | null;
  branchReceipt?: BranchReceiptSettings | null;
  lastReceiptNo?: number | null;
  nextReceiptNo?: number | null;
  onSaved: () => Promise<void> | void;
};

type ReceiptDraft = ReturnType<typeof branchReceiptDraft>;

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

function Field({
  id,
  label,
  children,
  hint,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[12px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function CashierReceiptShopModal({
  open,
  onOpenChange,
  brandTheme,
  shopName,
  branchId,
  branchName,
  branchAddress,
  branchReceipt,
  lastReceiptNo,
  nextReceiptNo,
  onSaved,
}: CashierReceiptShopModalProps) {
  const ids = {
    shop: useId(),
    address: useId(),
    phone: useId(),
    email: useId(),
    website: useId(),
    till: useId(),
    printer: useId(),
    footer: useId(),
    receiptNo: useId(),
  };

  const [name, setName] = useState(shopName);
  const [address, setAddress] = useState(branchAddress ?? "");
  const [receipt, setReceipt] = useState<ReceiptDraft>(() =>
    branchReceiptDraft(branchReceipt),
  );
  const [receiptInput, setReceiptInput] = useState(
    String(effectiveNextReceipt(lastReceiptNo, nextReceiptNo)),
  );
  const [lastIssued, setLastIssued] = useState<number | null>(
    lastReceiptNo ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const setReceiptField = (key: keyof ReceiptDraft, value: string) => {
    setReceipt((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!open) return;
    setName(shopName);
    setAddress(branchAddress ?? "");
    setReceipt(branchReceiptDraft(branchReceipt));
    setLastIssued(lastReceiptNo ?? null);
    setReceiptInput(String(effectiveNextReceipt(lastReceiptNo, nextReceiptNo)));

    let cancelled = false;
    setLoading(true);

    void Promise.all([fetchBusiness(), fetchBranches()])
      .then(([biz, branches]: [BusinessRecord, BranchRecord[]]) => {
        if (cancelled) return;
        setName(biz.name?.trim() || shopName);
        setLastIssued(biz.lastReceiptNo ?? null);
        setReceiptInput(
          String(effectiveNextReceipt(biz.lastReceiptNo, biz.nextReceiptNo)),
        );
        const current = branchId
          ? branches.find((b) => b.id === branchId)
          : null;
        if (current) {
          setAddress(current.address ?? "");
          setReceipt(branchReceiptDraft(current.receipt));
        }
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
  }, [
    open,
    shopName,
    branchId,
    branchAddress,
    branchReceipt,
    lastReceiptNo,
    nextReceiptNo,
  ]);

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
    if (!branchId?.trim()) {
      toast.error("Select a branch on the till before editing receipt details.");
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
      await Promise.all([
        updateBusiness({
          name: trimmed,
          nextReceiptNo: parsed,
        }),
        patchBranch(branchId, {
          address: address.trim(),
          receipt: {
            phone: receipt.phone,
            email: receipt.email,
            website: receipt.website,
            tillNumber: receipt.tillNumber,
            footerNote: receipt.footerNote,
            printerCupsName: receipt.printerCupsName,
          },
        }),
      ]);
      await onSaved();
      toast.success("Receipt details saved.");
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
  const textareaClass = cn(
    inputClass,
    "h-auto min-h-[4.5rem] resize-y py-2.5 leading-snug",
  );
  const disabled = saving || loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        overlayClassName="bg-black/45 backdrop-blur-[3px] dark:bg-black/55"
        className={cn(
          "max-h-[min(92dvh,40rem)] max-w-lg gap-0 overflow-hidden p-0",
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
              Receipt details
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              Shop name, contact lines, and footer that print on receipts
              {branchName?.trim() ? ` for ${branchName.trim()}` : ""}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {!branchId?.trim() ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-950 dark:text-amber-100">
              Select a branch on the till first — contact details are saved per
              branch.
            </p>
          ) : null}

          <Field id={ids.shop} label="Shop name">
            <input
              id={ids.shop}
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              autoComplete="organization"
              placeholder="Shop name"
            />
          </Field>

          <Field id={ids.address} label="Address">
            <input
              id={ids.address}
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={disabled || !branchId}
              autoComplete="street-address"
              placeholder="Street, town"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={ids.phone} label="Phone">
              <input
                id={ids.phone}
                className={inputClass}
                value={receipt.phone}
                onChange={(e) => setReceiptField("phone", e.target.value)}
                disabled={disabled || !branchId}
                inputMode="tel"
                autoComplete="tel"
                placeholder="254712345678"
              />
            </Field>
            <Field id={ids.email} label="Email">
              <input
                id={ids.email}
                type="email"
                className={inputClass}
                value={receipt.email}
                onChange={(e) => setReceiptField("email", e.target.value)}
                disabled={disabled || !branchId}
                autoComplete="email"
                placeholder="hello@shop.com"
              />
            </Field>
          </div>

          <Field id={ids.website} label="Website">
            <input
              id={ids.website}
              className={inputClass}
              value={receipt.website}
              onChange={(e) => setReceiptField("website", e.target.value)}
              disabled={disabled || !branchId}
              inputMode="url"
              autoComplete="url"
              placeholder="https://yourshop.com"
            />
          </Field>

          <Field id={ids.till} label="M-Pesa till">
            <input
              id={ids.till}
              className={inputClass}
              value={receipt.tillNumber}
              onChange={(e) => setReceiptField("tillNumber", e.target.value)}
              disabled={disabled || !branchId}
              inputMode="numeric"
              placeholder="3502582"
            />
          </Field>

          <Field id={ids.footer} label="Footer message">
            <textarea
              id={ids.footer}
              className={textareaClass}
              value={receipt.footerNote}
              onChange={(e) => setReceiptField("footerNote", e.target.value)}
              disabled={disabled || !branchId}
              rows={3}
              placeholder="Thanks for shopping with us"
            />
          </Field>

          <Field
            id={ids.printer}
            label="Receipt printer name"
            hint="CUPS / Windows printer name on the till PC (optional)."
          >
            <input
              id={ids.printer}
              className={inputClass}
              value={receipt.printerCupsName}
              onChange={(e) =>
                setReceiptField("printerCupsName", e.target.value)
              }
              disabled={disabled || !branchId}
              placeholder="Caysn_CN811_UB"
            />
          </Field>

          <Field
            id={ids.receiptNo}
            label="Next receipt number"
            hint={
              lastIssued != null
                ? `Last issued was #${lastIssued}. Cannot go below ${minAllowed}.`
                : "No receipts yet. The first sale will use this number."
            }
          >
            <input
              id={ids.receiptNo}
              type="number"
              inputMode="numeric"
              min={minAllowed}
              step={1}
              className={inputClass}
              value={receiptInput}
              onChange={(e) => setReceiptInput(e.target.value)}
              disabled={disabled}
            />
          </Field>
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
            disabled={disabled || !branchId?.trim()}
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

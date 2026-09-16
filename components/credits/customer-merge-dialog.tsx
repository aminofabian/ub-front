"use client";

import { useEffect, useMemo, useState } from "react";
import { GitMerge, Loader2 } from "lucide-react";

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
import { mergeCustomers, type CustomerRecord } from "@/lib/api";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerRecord[];
  onMerged: (keep: CustomerRecord) => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

function money(n: number | string | null | undefined): string {
  const v = n == null ? 0 : typeof n === "number" ? n : Number(n);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function CustomerMergeDialog({
  open,
  onOpenChange,
  customers,
  onMerged,
  onFeedback,
}: Props) {
  const [keepId, setKeepId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setKeepId("");
      setBusy(false);
      return;
    }
    if (customers.length === 0) return;
    // Prefer the row with the highest owed balance as the keep default.
    const ranked = [...customers].sort(
      (a, b) =>
        Number(b.credit.balanceOwed ?? 0) - Number(a.credit.balanceOwed ?? 0),
    );
    setKeepId(ranked[0]?.id ?? customers[0].id);
  }, [open, customers]);

  const totals = useMemo(() => {
    let owed = 0;
    let wallet = 0;
    let loyalty = 0;
    for (const c of customers) {
      owed += Number(c.credit.balanceOwed ?? 0);
      wallet += Number(c.credit.walletBalance ?? 0);
      loyalty += Number(c.credit.loyaltyPoints ?? 0);
    }
    return { owed, wallet, loyalty };
  }, [customers]);

  const absorbIds = useMemo(
    () => customers.map((c) => c.id).filter((id) => id !== keepId),
    [customers, keepId],
  );

  const onSubmit = async () => {
    if (!keepId || absorbIds.length === 0) {
      onFeedback("error", "Pick the account to keep.");
      return;
    }
    setBusy(true);
    try {
      const keep = await mergeCustomers({ keepId, absorbIds });
      onFeedback(
        "success",
        `Merged ${absorbIds.length} duplicate${absorbIds.length === 1 ? "" : "s"} into ${keep.name}.`,
      );
      onMerged(keep);
      onOpenChange(false);
    } catch (err) {
      onFeedback(
        "error",
        err instanceof Error ? err.message : "Could not merge customers.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:rounded-none">
        <DialogHeader className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-5 py-4 text-left">
          <div className="mb-2 flex size-10 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]">
            <GitMerge className="size-5" aria-hidden />
          </div>
          <DialogTitle>Fuse accounts</DialogTitle>
          <DialogDescription>
            Combine duplicate credit customers into one. Sales, phones, wallet,
            and balances move to the account you keep — the others are removed
            from the directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Combined after fuse:{" "}
            <span className="font-semibold text-[#9a2e16]">
              KES {money(totals.owed)} owed
            </span>
            {" · "}
            <span className="font-semibold text-[var(--pos-primary,#0f766e)]">
              KES {money(totals.wallet)} wallet
            </span>
            {" · "}
            {totals.loyalty} pts
          </p>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
              Keep this account
            </legend>
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
              {customers.map((c) => {
                const phone = customerPrimaryPhone(c.phones);
                const selected = keepId === c.id;
                return (
                  <li key={c.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors",
                        selected
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                      )}
                    >
                      <input
                        type="radio"
                        name="merge-keep"
                        className="mt-1"
                        checked={selected}
                        onChange={() => setKeepId(c.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {c.name}
                          {c.customerNo != null ? (
                            <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                              #{c.customerNo}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {phone || "No phone"}
                          {" · "}
                          owed KES {money(c.credit.balanceOwed)}
                          {" · "}
                          wallet KES {money(c.credit.walletBalance)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>

        <DialogFooter className="gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-5 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]"
            disabled={busy || absorbIds.length === 0}
            onClick={() => void onSubmit()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                Fusing…
              </>
            ) : (
              <>Fuse {absorbIds.length + 1} accounts</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

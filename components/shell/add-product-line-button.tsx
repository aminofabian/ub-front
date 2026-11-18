"use client";

import { useState } from "react";
import { PackagePlus, Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { useDashboard } from "@/components/dashboard-provider";
import { changeBusinessFormats } from "@/lib/api";
import {
  DEFAULT_GOODS_STORE_TYPE,
  getBusinessStoreTypes,
} from "@/lib/business-store-type";
import { cn } from "@/lib/utils";

/**
 * The inline "give this shop a product line" affordance at the foot of the icon rail (ADR 0031 nav
 * cleanup). A bar, kinyozi or guest house doesn't sell goods, so its sidebar carries no Products or
 * Stock — but a bar often also sells crisps and cigarettes, a salon toiletries. This turns that
 * sideline on in place: it adds a general retail format to the business's formats (the same change
 * the Business formats editor makes), after which the retail sidebar appears. Shown only to someone
 * who can manage settings, and only while the shop has no goods format yet.
 */
export function AddProductLineButton() {
  const { refreshSession, business } = useDashboard();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enable() {
    setError("");
    setBusy(true);
    try {
      const current = getBusinessStoreTypes(business);
      const next = Array.from(new Set([...current, DEFAULT_GOODS_STORE_TYPE]));
      await changeBusinessFormats(next);
      await refreshSession();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn on products. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : setOpen(next))}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Also sell products — add a retail line"
        aria-label="Also sell products — add a retail line"
        className={cn(
          "group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 outline-none",
          "transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      >
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl border border-dashed",
            "border-primary/35 text-primary/80 transition-all duration-200",
            "group-hover:border-primary/60 group-hover:bg-primary/8 group-hover:text-primary",
          )}
        >
          <PackagePlus className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="max-w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-primary">
          Products
        </span>
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Also sell products?</DialogTitle>
          <DialogDescription>
            Turn this on to sell goods off a shelf beside what you already do — crisps and sodas at
            the bar, toiletries at the salon, anything with a price and a count.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Adds Products, Stock and the retail till to your sidebar",
            "Your current work stays exactly as it is",
            "Change your mind any time in Setup → Business formats",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Not now
            </Button>
          </DialogClose>
          <Button onClick={() => void enable()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Turning on…
              </>
            ) : (
              "Start selling products"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

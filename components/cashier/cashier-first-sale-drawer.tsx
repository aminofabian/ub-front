"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import { helpHostUrl } from "@/lib/help/help-url";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: PackagePlus,
    title: "Add products first",
    body: "The shelf is built from your catalog. Add a few items (or scan barcodes) so there's something to ring up.",
  },
  {
    icon: ShoppingCart,
    title: "Tap a product to add it",
    body: "Tap a tile to drop it in the cart, then tap again (or use +/−) to change quantity.",
  },
  {
    icon: Smartphone,
    title: "Take payment",
    body: "Cash, or M-Pesa STK — one tap sends the prompt to the customer's phone, and the sale completes on their PIN.",
  },
  {
    icon: ReceiptText,
    title: "Hand out the receipt",
    body: "Printed or digital — the sale is recorded, stock drops, and the shift stays honest.",
  },
] as const;

/**
 * First-run nudge for an empty cashier shelf. Opens a right-edge drawer
 * summarising how to take the first sale — the full guide link points at the
 * HOST help site (kiosk.ke), never the tenant subdomain.
 */
export function CashierFirstSaleDrawer({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const cashierGuideUrl = helpHostUrl(APP_ROUTES.helpOpenCashier);
  const productsGuideUrl = helpHostUrl(APP_ROUTES.helpAddProducts);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 640px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={desktop}
        className={cn(
          "gap-0 p-0",
          !desktop && "max-h-[min(92dvh,40rem)] rounded-t-[1.25rem] bg-[#FBF9F5]",
        )}
      >
        {!desktop ? (
          <div className="flex shrink-0 justify-center pt-2" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-col overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DialogHeader className={desktop ? "pr-10" : undefined}>
            <DialogTitle className="text-lg">
              How to take your first sale
            </DialogTitle>
            <DialogDescription>
              Four steps from an empty shelf to the first ring at the till. The
              full guide with screenshots is one tap away.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2.5">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
              >
                <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-primary">
                  <Icon className="size-4" aria-hidden />
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold tracking-tight text-foreground">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {body}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Quick rule: </span>
            ring every sale, no exceptions — an un-rung sale is a stock ghost
            you’ll chase for weeks. M-Pesa can wait for the network; the till
            never waits.
          </div>

          <Link
            href={cashierGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-auto sm:rounded-lg sm:py-2.5"
          >
            <BookOpen className="size-4" aria-hidden />
            Open the cashier guide
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            Shelf still empty?{" "}
            <Link
              href={productsGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Read the product guide
            </Link>
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground/70">
            Guides open on kiosk.ke — no tenant redirect.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

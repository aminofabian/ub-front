"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  HandCoins,
  PackageCheck,
  PhoneCall,
  ShoppingCart,
  UserRoundPlus,
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

const STAGES = [
  {
    icon: UserRoundPlus,
    title: "1 · Create the supplier",
    body: "Name, phone (becomes the WhatsApp order number), VAT ID, credit terms, and a payout destination.",
  },
  {
    icon: PhoneCall,
    title: "2 · Link their products",
    body: "Connect the items they supply so ordering is pick-and-tap instead of retyping.",
  },
  {
    icon: ShoppingCart,
    title: "3 · Order — the PO",
    body: "Pick products, set quantities, then Save & WhatsApp, Save only, or share an order Ticket.",
  },
  {
    icon: PackageCheck,
    title: "4 · Receive & pay",
    body: "Confirm what arrived — stock rises and the bill is created in one go. Pay from the profile or AP aging.",
  },
] as const;

/**
 * In-app summary of "The complete supplier flow". Opens a right-edge drawer
 * instead of navigating away — the full article link points at the HOST help
 * site (kiosk.ke), never the tenant subdomain.
 */
export function SupplierGuideDrawer({ trigger }: { trigger?: ReactNode }) {
  const guideUrl = helpHostUrl(APP_ROUTES.helpSupplierFlow);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent side="right" className="gap-0 p-0">
        <div className="flex flex-col overflow-y-auto p-5 pb-6">
          <DialogHeader className="pr-10">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              Two-minute summary
            </p>
            <DialogTitle className="pt-1 text-lg">
              The complete supplier flow
            </DialogTitle>
            <DialogDescription>
              From first vendor to final payment, in four stages. The full guide
              with screenshots is one tap away.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2.5">
            {STAGES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-primary">
                  <Icon className="size-4" aria-hidden />
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
            orders are promises, supplies are the truth. Stock moves only when
            you receive — never bump stock manually for a delivery.
          </div>

          <Link
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BookOpen className="size-4" aria-hidden />
            Read the full step-by-step guide
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            Opens the guide on kiosk.ke — no tenant redirect.
          </p>

          <div className={cn("mt-5 border-t border-border pt-4")}>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <HandCoins className="size-3.5 text-primary/70" aria-hidden />
              Paying later?
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Track what you owe in AP aging and settle before credit terms
              expire — the supplier profile keeps every payment one tap away.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

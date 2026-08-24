"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  PackagePlus,
  ShoppingBag,
  Store,
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

const STEPS = [
  {
    icon: PackagePlus,
    title: "Add products in your dashboard",
    body: "Everything you add — and mark sellable — appears on this storefront automatically. No separate uploads.",
  },
  {
    icon: Store,
    title: "Your shop is this link",
    body: "The URL you're on right now is your shop's home on the internet. Share it on WhatsApp, statuses, and group chats.",
  },
  {
    icon: MessageCircle,
    title: "Take orders on any channel",
    body: "Customers order here, or message you and you ring it at the till. Either way the stock number stays the same.",
  },
  {
    icon: ShoppingBag,
    title: "First order in, fulfilment done",
    body: "Web orders land in your dashboard — confirm, pack, and hand over without juggling screenshots.",
  },
] as const;

/**
 * Owner nudge on an empty customer storefront. Opens a right-edge drawer
 * explaining how the shop gets stocked — the full guide link points at the
 * HOST help site (kiosk.ke), never the tenant subdomain.
 */
export function StorefrontEmptyCatalogDrawer({ trigger }: { trigger?: ReactNode }) {
  const storefrontGuideUrl = helpHostUrl(APP_ROUTES.helpSetUpStorefront);
  const productsGuideUrl = helpHostUrl(APP_ROUTES.helpAddProducts);

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
              Fill this shop with products
            </DialogTitle>
            <DialogDescription>
              Your storefront pulls straight from your catalog — stock it once,
              sell everywhere. The full guide with screenshots is one tap away.
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
            the till and this storefront share one stock count — what&apos;s on the
            shelf here is what&apos;s on the shelf at the counter. No overselling,
            no midnight reconciliations.
          </div>

          <Link
            href={storefrontGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BookOpen className="size-4" aria-hidden />
            Set up your online store
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            Catalog empty too?{" "}
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

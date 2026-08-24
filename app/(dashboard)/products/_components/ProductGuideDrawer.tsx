"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Layers,
  Package,
  ScanBarcode,
  Tag,
  Warehouse,
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

/**
 * In-app summary of the "how to add products" guide. Opens a right-edge drawer
 * instead of navigating away — the full article link points at the HOST help
 * site (kiosk.ke), never the tenant subdomain.
 */
export function ProductGuideDrawer({ trigger }: { trigger?: ReactNode }) {
  const guideUrl = helpHostUrl(APP_ROUTES.helpAddProducts);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent side="right" className="gap-0 p-0">
        <div className="flex flex-col overflow-y-auto p-5 pb-6">
          <DialogHeader className="pr-10">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              Two-minute summary
            </p>
            <DialogTitle className="pt-1 text-lg">How to add products</DialogTitle>
            <DialogDescription>
              Pick the right product type, fill the essentials, and you are
              selling. The full guide with screenshots is one tap away.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2.5">
            <TypeCard
              icon={Package}
              title="Single product"
              body="One-off item with no siblings — a jar of honey, a single appliance."
              accent="text-primary"
            />
            <TypeCard
              icon={Layers}
              title="Group → Variants"
              body="Same brand, several sizes — Coca-Cola 300 ml / 500 ml / 1 L. One entry, one SKU per size."
              accent="text-primary"
            />
            <TypeCard
              icon={Boxes}
              title="Single + Package"
              body="Sold loose and in trays or crates — eggs by piece or tray of 30. The package shares the base stock."
              accent="text-primary"
            />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            The essentials
          </p>
          <ul className="mt-2.5 space-y-2">
            <EssenceRow
              icon={Tag}
              text={
                <>
                  <span className="font-medium text-foreground">Buying &amp; sell price</span>
                  {" — the till shows your margin as you type."}
                </>
              }
            />
            <EssenceRow
              icon={ScanBarcode}
              text={
                <>
                  <span className="font-medium text-foreground">Barcode</span>
                  {" — scan or type it; SKU fills itself if left blank."}
                </>
              }
            />
            <EssenceRow
              icon={Warehouse}
              text={
                <>
                  <span className="font-medium text-foreground">Opening qty</span>
                  {" — per branch, so stock is honest from day one."}
                </>
              }
            />
          </ul>

          <div className="mt-5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Quick rule: </span>
            one-off item → Single. Same brand in sizes → Group with variants.
            Loose + trays → Single with packages. Don’t create three separate
            “Coca-Cola” products — it splits stock.
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: typeof Package;
  title: string;
  body: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40",
          accent,
        )}
      >
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
  );
}

function EssenceRow({
  icon: Icon,
  text,
}: {
  icon: typeof Tag;
  text: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
      <span>{text}</span>
    </li>
  );
}

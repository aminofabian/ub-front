"use client";

import { Mail, MapPin, Pencil, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ShippingSummaryData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  streetAddress: string;
  county: string;
  subCounty: string;
  ward: string;
  whatsAppNumber: string;
  deliveryNotes: string;
};

type Props = {
  contact: ShippingSummaryData;
  onEdit: () => void;
  className?: string;
  /** Tighter layout for the mobile review step */
  compact?: boolean;
};

export function ShopShippingSummaryCard({
  contact,
  onEdit,
  className,
  compact = false,
}: Props) {
  const zone =
    contact.ward && contact.subCounty
      ? `${contact.ward}, ${contact.subCounty}`
      : contact.subCounty || contact.county;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-black/[0.02]",
        compact && "rounded-xl shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5",
          compact && "px-3 py-2.5 sm:px-3",
        )}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Delivery &amp; contact
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {compact
              ? "Tap edit if anything changed."
              : "Using your saved details — edit only if something changed."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-3 p-4 sm:grid-cols-2 sm:p-5",
          compact && "gap-2 p-3 sm:p-3",
        )}
      >
        <div
          className={cn(
            "flex gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5",
            compact && "p-2.5",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Contact
            </p>
            <p className="mt-1 font-semibold text-foreground">{contact.customerName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {contact.customerPhone}
            </p>
            {contact.customerEmail ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                {contact.customerEmail}
              </p>
            ) : null}
            {contact.whatsAppNumber ? (
              <p className="mt-1 text-xs text-muted-foreground">
                WhatsApp: {contact.whatsAppNumber}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5 sm:col-span-2",
            compact && "p-2.5",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <MapPin className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Delivery address
            </p>
            <p className="mt-1 font-semibold leading-snug text-foreground">
              {contact.streetAddress}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{zone}</p>
            <p className="text-sm text-muted-foreground">{contact.county}</p>
            {contact.deliveryNotes ? (
              <p className="mt-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/80">Note: </span>
                {contact.deliveryNotes}
              </p>
            ) : null}
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Est. delivery ~30 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

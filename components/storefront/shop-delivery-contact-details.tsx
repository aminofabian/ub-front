"use client";

import {
  Clock3,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  CHECKOUT_SECTION_DIVIDER,
  CHECKOUT_SECTION_HEAD,
  CHECKOUT_SECTION_ICON_WRAP,
  CHECKOUT_SECTION_INSET,
} from "@/components/storefront/shop-checkout-design";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DeliveryContactDetailsProps = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  whatsAppNumber: string;
  streetAddress: string;
  zoneLabel: string | null;
  deliveryNotes: string;
  showEta?: boolean;
  compact?: boolean;
};

function IconValue({
  icon: Icon,
  value,
  tabular = false,
  className,
}: {
  icon: LucideIcon;
  value: string;
  tabular?: boolean;
  className?: string;
}) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <Icon className="size-3.5 shrink-0 text-primary/75" aria-hidden />
      <span
        className={cn(
          "min-w-0 truncate text-[12px] leading-snug text-foreground",
          tabular && "tabular-nums",
        )}
      >
        {trimmed}
      </span>
    </div>
  );
}

function DetailPairRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  if (!left && !right) return null;

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2",
        left && right ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {left ? <div className="min-w-0">{left}</div> : null}
      {right ? <div className="min-w-0">{right}</div> : null}
    </div>
  );
}

export function DeliveryContactDetails({
  customerName,
  customerPhone,
  customerEmail,
  whatsAppNumber,
  streetAddress,
  zoneLabel,
  deliveryNotes,
  showEta = false,
  compact = false,
}: DeliveryContactDetailsProps) {
  const phone = customerPhone.trim();
  const whatsApp = whatsAppNumber.trim();
  const email = customerEmail.trim();
  const street = streetAddress.trim();
  const zone = zoneLabel?.trim() ?? "";
  const notes = deliveryNotes.trim();

  const hasContact = Boolean(customerName.trim() || phone || email || whatsApp);
  const hasAddress = Boolean(street || zone);
  const hasNotes = Boolean(notes);

  if (!hasContact && !hasAddress && !hasNotes) {
    return null;
  }

  const phoneNode = phone ? (
    <IconValue icon={Phone} value={phone} tabular />
  ) : null;
  const whatsAppNode = whatsApp ? (
    <IconValue icon={MessageCircle} value={whatsApp} tabular />
  ) : null;
  const streetNode = street ? (
    <IconValue icon={Home} value={street} />
  ) : null;
  const zoneNode = zone ? (
    <div className="flex min-w-0 flex-col gap-0.5">
      <IconValue icon={MapPin} value={zone} />
      {showEta ? (
                <span className="inline-flex items-center gap-1 pl-5 text-[11px] font-medium text-[color-mix(in_srgb,var(--storefront-accent,var(--primary))_75%,var(--foreground))]">
                  <Clock3 className="size-3 shrink-0" aria-hidden />
                  ~30 min
                </span>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={cn("space-y-2.5", compact ? "px-3 py-2" : "px-3 py-2.5")}>
      {hasContact ? (
        <div className="space-y-2">
          {customerName.trim() ? (
            <p className="text-[13px] font-medium leading-snug text-foreground">
              {customerName.trim()}
            </p>
          ) : null}

          <DetailPairRow left={phoneNode} right={whatsAppNode} />

          {email ? (
            <IconValue icon={Mail} value={email} />
          ) : null}
        </div>
      ) : null}

      {hasAddress ? (
        <div
          className={cn(
            hasContact && "border-t pt-2.5",
            hasContact && CHECKOUT_SECTION_DIVIDER,
          )}
        >
          <DetailPairRow left={streetNode} right={zoneNode} />
        </div>
      ) : null}

      {hasNotes ? (
        <div className={cn("px-2.5 py-2", CHECKOUT_SECTION_INSET)}>
          <p className="text-[11px] font-medium text-muted-foreground">Note</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/90">
            {notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function DeliveryContactCardHeader({
  onEdit,
  prominentEdit = false,
}: {
  onEdit?: () => void;
  prominentEdit?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2",
        CHECKOUT_SECTION_HEAD,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={cn("size-7", CHECKOUT_SECTION_ICON_WRAP)}>
          <MapPin className="size-3.5" aria-hidden />
        </span>
        <p className="text-xs font-semibold text-foreground">Delivery & contact</p>
      </div>
      {onEdit ? (
        <Button
          type="button"
          variant={prominentEdit ? "outline" : "ghost"}
          size="sm"
          className={cn(
            "h-7 shrink-0 gap-1 px-2 text-[11px] font-medium text-primary hover:bg-primary/10",
            prominentEdit && "h-8 border-primary/25 bg-background px-3 text-xs font-semibold",
          )}
          onClick={onEdit}
        >
          <Pencil className="size-3" aria-hidden />
          Edit details
        </Button>
      ) : null}
    </div>
  );
}

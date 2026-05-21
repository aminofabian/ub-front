"use client";

import {
  DeliveryContactCardHeader,
  DeliveryContactDetails,
} from "@/components/storefront/shop-delivery-contact-details";
import {
  CHECKOUT_CARD,
  formatDeliveryZone,
} from "@/components/storefront/shop-checkout-design";
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
  compact?: boolean;
};

export function ShopShippingSummaryCard({
  contact,
  onEdit,
  className,
  compact = false,
}: Props) {
  const zoneLabel = formatDeliveryZone(
    contact.ward,
    contact.subCounty,
    contact.county,
  );

  return (
    <div className={cn(CHECKOUT_CARD, "overflow-hidden", className)}>
      <DeliveryContactCardHeader onEdit={onEdit} />
      <DeliveryContactDetails
        customerName={contact.customerName}
        customerPhone={contact.customerPhone}
        customerEmail={contact.customerEmail}
        whatsAppNumber={contact.whatsAppNumber}
        streetAddress={contact.streetAddress}
        zoneLabel={zoneLabel}
        deliveryNotes={contact.deliveryNotes}
        compact={compact}
      />
    </div>
  );
}

"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { trackWhatsAppCheckoutEvent } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

/**
 * Eligibility-aware "Order on WhatsApp" CTA (scope §8): renders nothing when
 * the merchant has no valid WhatsApp capability. Used by the cart drawer, the
 * full cart page, and (via label variants) the payment step.
 */
export function WhatsAppCheckoutButton({
  className,
  label = "Order on WhatsApp",
  surface = "button",
}: {
  className?: string;
  label?: string;
  surface?: string;
}) {
  const { whatsappCheckout, openWhatsAppCheckout } = useShopCart();
  if (!whatsappCheckout) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-10 w-full gap-2 rounded-xl text-sm font-semibold", className)}
      onClick={() => {
        trackWhatsAppCheckoutEvent("wa_checkout_click", { surface });
        openWhatsAppCheckout();
      }}
    >
      <MessageCircle className="size-4 text-[#128C4A]" aria-hidden />
      {label}
    </Button>
  );
}

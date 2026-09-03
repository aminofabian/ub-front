"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";

export function ClimaxFloorFloats({
  whatsappDigits,
  storeName,
}: {
  whatsappDigits: string | null;
  storeName: string;
}) {
  const pathname = usePathname();
  const { checkoutOpen, checkoutChoiceOpen, whatsAppSheetOpen } = useShopCart();
  const hidden =
    pathname === APP_ROUTES.shopCheckout ||
    checkoutOpen ||
    checkoutChoiceOpen ||
    whatsAppSheetOpen;

  if (hidden || !whatsappDigits) return null;

  const href = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Hi ${storeName}, I have a question about your shop.`,
  )}`;

  return (
    <a
      className={styles.wa}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp us"
    >
      <MessageCircle size={26} strokeWidth={1.8} />
    </a>
  );
}

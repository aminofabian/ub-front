"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { fetchPublicCheckoutPaymentOptionsBrowser } from "@/lib/public-storefront-client";
import { trackWhatsAppCheckoutEvent } from "@/lib/whatsapp-order";

/**
 * Phase 4 — catalog-less shops (scope §13/§17): the only checkout affordance on
 * landing / coming-soon pages. No cart exists, so no order is created — this is
 * the one deliberately lossy case: a free-text message to the merchant's
 * WhatsApp number, resolved from checkout-options so the same number/mode
 * settings apply as on a live storefront.
 */
export function WhatsAppLandingCta({
  slug,
  storeName,
}: {
  slug: string;
  storeName: string;
}) {
  const [digits, setDigits] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicCheckoutPaymentOptionsBrowser(slug)
      .then((opts) => {
        const wa = opts.whatsappCheckout;
        if (!cancelled && wa?.enabled && wa.digits) {
          setDigits(wa.digits);
          setGreeting(wa.greeting ?? null);
        }
      })
      .catch(() => {
        /* CTA stays hidden when eligibility can't be resolved */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!digits) return null;

  const greetingLine = greeting?.trim() ? `\n${greeting.trim()}` : "";
  const text = `Hi ${storeName.trim() || "the shop"}, I'd like to place an order.${greetingLine}`;
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackWhatsAppCheckoutEvent("wa_checkout_click", { surface: "landing" })
      }
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <MessageCircle className="size-4" aria-hidden />
      Order on WhatsApp
    </a>
  );
}

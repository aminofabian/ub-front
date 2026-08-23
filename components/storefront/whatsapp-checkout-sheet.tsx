"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";
import {
  buildCartWhatsAppText,
  buildCartWhatsAppUrl,
  buildOrderTrackingUrl,
  buildWhatsAppCheckoutNotes,
  cartOrderCode,
  normalizeLocalPhone,
  normalizeWhatsApp,
  trackWhatsAppCheckoutEvent,
} from "@/lib/whatsapp-order";
import { clearWebCartHandle, readWebCartHandle, submitWebCheckout } from "@/lib/web-cart";
import { recordWhatsAppOrderHandoff } from "@/lib/public-storefront-client";
import { cn } from "@/lib/utils";

const CHECKOUT_PREFILL_KEY = "ub.checkoutPrefill.v1";

type Prefill = {
  name: string;
  phone: string;
  ward: string;
  street: string;
};

function readPrefill(): Prefill {
  try {
    if (typeof window === "undefined") return { name: "", phone: "", ward: "", street: "" };
    const raw = window.localStorage.getItem(CHECKOUT_PREFILL_KEY);
    if (!raw) return { name: "", phone: "", ward: "", street: "" };
    const p = JSON.parse(raw) as Record<string, unknown>;
    const firstName = typeof p.firstName === "string" ? p.firstName : "";
    const lastName = typeof p.lastName === "string" ? p.lastName : "";
    const phone = typeof p.customerPhone === "string" ? p.customerPhone : "";
    const areaCode = typeof p.areaCode === "string" ? p.areaCode : "+254";
    const ward = typeof p.ward === "string" ? p.ward : "";
    const street = typeof p.streetAddress === "string" ? p.streetAddress : "";
    return {
      name: `${firstName} ${lastName}`.trim(),
      phone: [areaCode, phone].filter(Boolean).join(" "),
      ward,
      street,
    };
  } catch {
    return { name: "", phone: "", ward: "", street: "" };
  }
}

function savePrefill(p: Prefill): void {
  try {
    if (typeof window === "undefined") return;
    const existing = readPrefill();
    window.localStorage.setItem(
      CHECKOUT_PREFILL_KEY,
      JSON.stringify({
        ...existing,
        customerPhone: p.phone.replace(/^\+254\s*/, ""),
        ward: p.ward,
        streetAddress: p.street,
      }),
    );
  } catch {
    /* non-fatal */
  }
}

type Done = {
  orderCode: string;
  waUrl: string | null;
  text: string;
  callHref: string;
};

/**
 * Theme-agnostic "Order on WhatsApp" sheet (scope §8): captures name + phone,
 * creates the order first, then hands off to wa.me carrying the order code.
 * The thank-you screen owns the "message didn't send?" recovery.
 */
export function WhatsAppCheckoutSheet() {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const {
    slug,
    cart,
    whatsappCheckout,
    whatsAppSheetOpen,
    closeWhatsAppCheckout,
    refresh,
  } = useShopCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [ward, setWard] = useState("");
  const [street, setStreet] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!whatsAppSheetOpen) return;
    const prefill = readPrefill();
    setName(prefill.name);
    setPhone(prefill.phone);
    setWard(prefill.ward);
    setStreet(prefill.street);
    setDeliveryOpen(false);
    setSubmitting(false);
    setError(null);
    setDone(null);
    setCopied(false);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWhatsAppCheckout();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [whatsAppSheetOpen, closeWhatsAppCheckout]);

  const subtotal =
    cart?.subtotal != null ? formatDisplayPrice(cart.currency, cart.subtotal) : null;
  const itemLabel = cart
    ? `${cart.lines.length} item${cart.lines.length === 1 ? "" : "s"}`
    : "";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!cart || !whatsappCheckout || submitting) return;

      const trimmedName = name.trim();
      const trimmedPhone = normalizeLocalPhone(phone);
      if (!trimmedName) {
        setError("Enter your name so the shop knows who the order is from.");
        return;
      }
      if (!normalizeWhatsApp(trimmedPhone)) {
        setError("Enter a valid phone number so the shop can reach you.");
        return;
      }

      // Popup-blocker fix (§14.1): open a named tab synchronously inside the
      // gesture, then point it at wa.me once the order exists.
      const tab = window.open("", "_blank");
      setSubmitting(true);
      setError(null);
      trackWhatsAppCheckoutEvent("wa_checkout_click", { surface: "sheet" });

      try {
        const handle = readWebCartHandle();
        if (!handle || handle.slug !== slug || !handle.cartId) {
          throw new Error("Cart session missing. Start again from the shop.");
        }
        const notes = buildWhatsAppCheckoutNotes({ street, ward, deliveryNotes });
        const result = await submitWebCheckout(slug, handle.cartId, {
          customerName: trimmedName,
          customerPhone: trimmedPhone,
          notes,
          channel: "WHATSAPP",
        });

        clearWebCartHandle();
        void refresh();
        savePrefill({ name: trimmedName, phone: trimmedPhone, ward, street });

        const orderCode = result.orderCode ?? cartOrderCode(result.orderId);
        const trackingUrl = buildOrderTrackingUrl(
          window.location.origin,
          orderCode,
          result.receiptToken,
        );
        const messageOptions = {
          storeName: whatsappCheckout.storeName,
          cart,
          orderCode,
          trackingUrl,
          greeting: whatsappCheckout.greeting,
          customerName: trimmedName,
          customerPhone: trimmedPhone,
        };
        const text = buildCartWhatsAppText(messageOptions);
        const waUrl = buildCartWhatsAppUrl({
          ...messageOptions,
          phone: whatsappCheckout.whatsappDigits,
        });
        if (waUrl && tab) {
          tab.location.href = waUrl;
        }
        // Best-effort "shopper opened the chat" marker (scope §15).
        recordWhatsAppOrderHandoff(slug, result.orderId);
        trackWhatsAppCheckoutEvent("wa_order_created", {
          items: cart.lines.length,
          subtotal: cart.subtotal,
        });
        trackWhatsAppCheckoutEvent("wa_handoff_opened", {});
        setDone({
          orderCode,
          waUrl,
          text,
          callHref: `tel:+${whatsappCheckout.whatsappDigits}`,
        });
      } catch (err) {
        if (tab) tab.close();
        setError(err instanceof Error ? err.message : "Could not place the order. Try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [cart, whatsappCheckout, slug, submitting, name, phone, street, ward, deliveryNotes, refresh],
  );

  const handleCopy = useCallback(async () => {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done.text);
      trackWhatsAppCheckoutEvent("wa_copy_used", {});
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text is still shown on the button tooltip */
    }
  }, [done]);

  if (!whatsAppSheetOpen || !whatsappCheckout) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) closeWhatsAppCheckout();
      }}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl ring-1 ring-black/10 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C4A]">
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                Send your order to {whatsappCheckout.storeName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {itemLabel}
                {subtotal ? ` · ${subtotal}` : ""}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeWhatsAppCheckout}
            disabled={submitting}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-6">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-6" aria-hidden />
              </span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                Order {done.orderCode} saved
              </h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                We opened WhatsApp for you. If nothing happened, use the buttons
                below — your order is already with the shop either way.
              </p>
            </div>

            <div className="grid gap-2">
              {done.waUrl ? (
                <Button asChild className="h-11 w-full gap-2 rounded-xl text-sm font-semibold">
                  <a
                    href={done.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Open WhatsApp again
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl text-sm font-semibold"
                onClick={handleCopy}
              >
                <Copy className="size-4" aria-hidden />
                {copied ? "Copied!" : "Copy the message"}
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-11 w-full gap-2 rounded-xl text-sm font-semibold"
              >
                <a href={done.callHref}>
                  <Phone className="size-4" aria-hidden />
                  Call the shop
                </a>
              </Button>
            </div>

            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              {done.text}
            </pre>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {!cart || cart.lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Your cart is empty. Add items first, then order on WhatsApp.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Your name
                    </span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Wanjiku"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Phone
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0714 282 874"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setDeliveryOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    aria-expanded={deliveryOpen}
                  >
                    {deliveryOpen ? "Hide delivery details" : "+ Add delivery details"}
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", deliveryOpen && "rotate-180")}
                      aria-hidden
                    />
                  </button>

                  {deliveryOpen ? (
                    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          Ward / estate
                        </span>
                        <input
                          type="text"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          placeholder="Githurai"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          Street / building
                        </span>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Mwiki Road, 35393"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          Notes
                        </span>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Call before delivery"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="mt-auto h-12 w-full gap-2 rounded-xl text-sm font-semibold"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {submitting ? "Saving your order…" : "Send order on WhatsApp"}
                </Button>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Your order is saved either way — WhatsApp is just how the shop
                  hears about it.
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

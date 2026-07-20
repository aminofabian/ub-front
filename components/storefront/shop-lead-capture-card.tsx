"use client";

import { MapPin, MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientHasSession } from "@/hooks/use-client-session";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import type { PublicDeliveryArea } from "@/lib/public-storefront";
import { isStkPhoneValid } from "@/lib/stk-phone";
import { cn } from "@/lib/utils";
import {
  SHOP_ITEM_ADDED_EVENT,
  submitStorefrontLeadCapture,
  type ShopItemAddedDetail,
} from "@/lib/web-cart";

const PHONE_KEY = "ub.leadPhone.v1";
const LOCATION_KEY = "ub.leadLocation.v1";
const PHONE_DISMISS_KEY = "ub.leadPhoneDismissed.v1";
const LOCATION_DISMISS_KEY = "ub.leadLocationDismissed.v1";

type StringStore = Record<string, string>;

function readStore(key: string): StringStore {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StringStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(key: string, slug: string, value: string) {
  try {
    const store = readStore(key);
    store[slug] = value;
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function readValue(key: string, slug: string): string | null {
  const v = readStore(key)[slug];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function needsLocationGate(slug: string, signedIn: boolean): boolean {
  if (signedIn) return false;
  if (readValue(LOCATION_KEY, slug) || readValue(LOCATION_DISMISS_KEY, slug)) {
    return false;
  }
  return true;
}

function whatsAppGeneralLink(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) return null;
  const text = encodeURIComponent(
    "Hi! I'd like to know which areas you deliver to.",
  );
  return `https://wa.me/${raw}?text=${text}`;
}

export function ShopLeadCaptureCard({
  slug,
  storeName,
  deliveryAreas,
}: {
  slug: string;
  storeName: string;
  deliveryAreas: PublicDeliveryArea[];
}) {
  const pathname = usePathname();
  const signedIn = useClientHasSession();
  const { checkoutOpen } = useShopCart();
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [phone, setPhone] = useState("");
  const [areaId, setAreaId] = useState("");
  const [street, setStreet] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const continueToCartRef = useRef<(() => void) | null>(null);

  const activeAreas = useMemo(
    () => deliveryAreas.filter((a) => a.active && a.name.trim()),
    [deliveryAreas],
  );
  const selectedArea = activeAreas.find((a) => a.id === areaId) ?? null;
  const waLink = whatsAppGeneralLink();

  useEffect(() => {
    if (!slug) {
      setPhoneOpen(false);
      return;
    }
    const savedPhone = readValue(PHONE_KEY, slug);
    if (savedPhone) setPhone(savedPhone);
    if (!readValue(PHONE_DISMISS_KEY, slug) && !savedPhone) {
      setPhoneOpen(true);
    } else {
      setPhoneOpen(false);
    }
  }, [slug]);

  useEffect(() => {
    if (activeAreas.length === 1 && !areaId) {
      setAreaId(activeAreas[0].id);
    }
  }, [activeAreas, areaId]);

  useEffect(() => {
    if (!slug) return;

    const onAdded = (event: Event) => {
      const detail = (event as CustomEvent<ShopItemAddedDetail>).detail;
      if (!detail?.continueToCart) return;

      if (!needsLocationGate(slug, signedIn)) {
        detail.continueToCart();
        return;
      }

      const savedPhone = readValue(PHONE_KEY, slug);
      if (savedPhone) setPhone(savedPhone);
      setOutOfArea(false);
      setError(null);
      setPhoneOpen(false);
      continueToCartRef.current = detail.continueToCart;
      setLocationOpen(true);
    };

    window.addEventListener(SHOP_ITEM_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(SHOP_ITEM_ADDED_EVENT, onAdded);
  }, [slug, signedIn]);

  const hidePhoneForRoute =
    pathname === APP_ROUTES.shopCheckout ||
    pathname === APP_ROUTES.shopCart ||
    checkoutOpen ||
    locationOpen;

  function releaseCart() {
    const fn = continueToCartRef.current;
    continueToCartRef.current = null;
    setLocationOpen(false);
    fn?.();
  }

  function dismissPhone() {
    writeStore(PHONE_DISMISS_KEY, slug, new Date().toISOString());
    setPhoneOpen(false);
  }

  function dismissLocation() {
    writeStore(LOCATION_DISMISS_KEY, slug, new Date().toISOString());
    releaseCart();
  }

  async function savePhone() {
    setError(null);
    if (!isStkPhoneValid("+254", phone)) {
      setError("Enter a valid WhatsApp number (e.g. 0712 345 678).");
      return;
    }
    setSaving(true);
    try {
      await submitStorefrontLeadCapture(slug, {
        areaCode: "+254",
        phone: phone.trim(),
        whatsApp: phone.trim(),
      });
      writeStore(PHONE_KEY, slug, phone.trim());
      writeStore(PHONE_DISMISS_KEY, slug, new Date().toISOString());
      setPhoneSuccess(true);
      window.setTimeout(() => {
        setPhoneSuccess(false);
        setPhoneOpen(false);
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation() {
    setError(null);
    const phoneDigits = phone.trim() || readValue(PHONE_KEY, slug) || "";
    if (!isStkPhoneValid("+254", phoneDigits)) {
      setError("Add your WhatsApp number so we can reach you about delivery.");
      return;
    }
    if (!selectedArea) {
      setError("Select the area we deliver to.");
      return;
    }
    if (!street.trim()) {
      setError("Add your exact location within that area.");
      return;
    }
    setSaving(true);
    try {
      await submitStorefrontLeadCapture(slug, {
        areaCode: "+254",
        phone: phoneDigits,
        whatsApp: phoneDigits,
        deliveryArea: selectedArea.name,
        streetAddress: street.trim(),
      });
      writeStore(PHONE_KEY, slug, phoneDigits);
      writeStore(
        LOCATION_KEY,
        slug,
        JSON.stringify({ area: selectedArea.name, street: street.trim() }),
      );
      writeStore(LOCATION_DISMISS_KEY, slug, new Date().toISOString());
      releaseCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {phoneOpen && !hidePhoneForRoute ? (
        <aside
          className={cn(
            "fixed z-[55] w-[min(calc(100vw-1.5rem),17.5rem)] overflow-hidden rounded-2xl border border-border/70 bg-background/98 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.05] backdrop-blur-xl",
            "right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] md:right-4",
            "animate-in fade-in-0 slide-in-from-bottom-3 duration-300",
          )}
          aria-label="WhatsApp number"
        >
          <div className="flex items-start justify-between gap-2 px-3 pb-0.5 pt-2.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              <MessageCircle className="size-3" aria-hidden />
              WhatsApp
            </span>
            <button
              type="button"
              onClick={dismissPhone}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {phoneSuccess ? (
            <div className="space-y-0.5 px-3 pb-3 pt-1">
              <p className="text-sm font-semibold text-foreground">Saved</p>
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll ping you about deals and restocks.
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-3 pb-3 pt-1">
              <p className="text-[13px] font-semibold leading-snug text-foreground">
                Get deals on WhatsApp
              </p>
              <div className="flex overflow-hidden rounded-lg border border-border bg-background">
                <span className="flex shrink-0 items-center border-r border-border bg-muted/40 px-2 text-[11px] font-medium text-muted-foreground">
                  +254
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="7XX XXX XXX"
                  className="h-8 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/70"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {error && phoneOpen ? (
                <p className="text-[11px] font-medium text-destructive">{error}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Optional · reply STOP anytime
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 w-full rounded-lg bg-[var(--storefront-accent,var(--primary))] text-xs font-semibold text-white hover:opacity-95"
                disabled={saving}
                onClick={() => void savePhone()}
              >
                {saving ? "Saving…" : "Save number"}
              </Button>
            </div>
          )}
        </aside>
      ) : null}

      <Dialog
        open={locationOpen}
        onOpenChange={(open) => {
          if (!open) dismissLocation();
        }}
      >
        <DialogContent
          side="center"
          className="z-[80] gap-3 p-5 sm:max-w-md"
          overlayClassName="z-[80]"
          showCloseButton
        >
          <DialogHeader>
            <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
              <MapPin className="size-3.5" aria-hidden />
              Delivery area
            </div>
            <DialogTitle>Where should we deliver?</DialogTitle>
            <DialogDescription>
              Choose an area {storeName} serves, then your exact place. You can
              edit this later at checkout.
            </DialogDescription>
          </DialogHeader>

          {outOfArea ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                We don&apos;t deliver to that area yet
              </p>
              <p className="text-sm text-muted-foreground">
                Pick one of the areas we serve, or message us if you need
                coverage elsewhere.
              </p>
              <div className="flex flex-col gap-2">
                {waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Message us on WhatsApp
                  </a>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOutOfArea(false)}
                >
                  Back to served areas
                </Button>
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={dismissLocation}
                >
                  Skip and view cart
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!readValue(PHONE_KEY, slug) ? (
                <div className="flex overflow-hidden rounded-lg border border-border bg-background">
                  <span className="flex shrink-0 items-center border-r border-border bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground">
                    +254
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="WhatsApp number"
                    className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              ) : null}

              {activeAreas.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  This store hasn&apos;t set delivery areas yet.
                </p>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-medium text-foreground">
                      Area we deliver to
                    </span>
                    <select
                      className="h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
                      value={areaId}
                      onChange={(e) => setAreaId(e.target.value)}
                    >
                      <option value="">Select delivery area…</option>
                      {activeAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-medium text-foreground">
                      Exact location
                    </span>
                    <input
                      type="text"
                      placeholder="Street, estate, landmark…"
                      className="h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring/40"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setOutOfArea(true)}
                  >
                    My area isn&apos;t listed
                  </button>
                </>
              )}

              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="button"
                  className="h-10 w-full rounded-lg bg-[var(--storefront-accent,var(--primary))] font-semibold text-white hover:opacity-95"
                  disabled={saving || activeAreas.length === 0}
                  onClick={() => void saveLocation()}
                >
                  {saving ? "Saving…" : "Save and view cart"}
                </Button>
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={dismissLocation}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

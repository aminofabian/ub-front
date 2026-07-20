"use client";

import { Check, MapPin, MessageCircle, Navigation, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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

/** Soft format: 712 345 678 */
function formatLocalPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^0/, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function accentButtonStyle(hex: string | null | undefined): CSSProperties | undefined {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex.trim())) return undefined;
  const c = hex.trim();
  return {
    background: `linear-gradient(135deg, ${c} 0%, color-mix(in srgb, ${c} 70%, #0f172a) 100%)`,
  };
}

export function ShopLeadCaptureCard({
  slug,
  storeName,
  deliveryAreas,
  accentHex,
}: {
  slug: string;
  storeName: string;
  deliveryAreas: PublicDeliveryArea[];
  accentHex?: string | null;
}) {
  const pathname = usePathname();
  const signedIn = useClientHasSession();
  const { checkoutOpen } = useShopCart();
  const [phoneReady, setPhoneReady] = useState(false);
  const [phoneExpanded, setPhoneExpanded] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationDone, setLocationDone] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [phone, setPhone] = useState("");
  const [areaId, setAreaId] = useState("");
  const [street, setStreet] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const continueToCartRef = useRef<(() => void) | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);

  const activeAreas = useMemo(
    () => deliveryAreas.filter((a) => a.active && a.name.trim()),
    [deliveryAreas],
  );
  const selectedArea = activeAreas.find((a) => a.id === areaId) ?? null;
  const waLink = whatsAppGeneralLink();
  const ctaStyle = accentButtonStyle(accentHex);

  useEffect(() => {
    if (!slug) {
      setPhoneOpen(false);
      return;
    }
    const savedPhone = readValue(PHONE_KEY, slug);
    if (savedPhone) setPhone(formatLocalPhone(savedPhone));
    if (!readValue(PHONE_DISMISS_KEY, slug) && !savedPhone) {
      setPhoneOpen(true);
      // Arrive quietly after first paint — less intrusive.
      const t = window.setTimeout(() => setPhoneReady(true), 1400);
      return () => window.clearTimeout(t);
    }
    setPhoneOpen(false);
    setPhoneReady(false);
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
      if (savedPhone) setPhone(formatLocalPhone(savedPhone));
      setOutOfArea(false);
      setError(null);
      setLocationDone(false);
      setPhoneOpen(false);
      setStreet("");
      continueToCartRef.current = detail.continueToCart;
      setLocationOpen(true);
    };

    window.addEventListener(SHOP_ITEM_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(SHOP_ITEM_ADDED_EVENT, onAdded);
  }, [slug, signedIn]);

  useEffect(() => {
    if (!phoneExpanded) return;
    const t = window.setTimeout(() => phoneInputRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [phoneExpanded]);

  useEffect(() => {
    if (!selectedArea || outOfArea || locationDone) return;
    const t = window.setTimeout(() => streetInputRef.current?.focus(), 220);
    return () => window.clearTimeout(t);
  }, [selectedArea, outOfArea, locationDone]);

  const hidePhoneForRoute =
    pathname === APP_ROUTES.shopCheckout ||
    pathname === APP_ROUTES.shopCart ||
    checkoutOpen ||
    locationOpen;

  function releaseCart() {
    const fn = continueToCartRef.current;
    continueToCartRef.current = null;
    setLocationOpen(false);
    setLocationDone(false);
    fn?.();
  }

  function dismissPhone() {
    writeStore(PHONE_DISMISS_KEY, slug, new Date().toISOString());
    setPhoneOpen(false);
    setPhoneExpanded(false);
  }

  function dismissLocation() {
    writeStore(LOCATION_DISMISS_KEY, slug, new Date().toISOString());
    releaseCart();
  }

  async function savePhone() {
    setError(null);
    if (!isStkPhoneValid("+254", phone)) {
      setError("Enter a valid number (e.g. 712 345 678).");
      return;
    }
    setSaving(true);
    try {
      await submitStorefrontLeadCapture(slug, {
        areaCode: "+254",
        phone: phone.replace(/\s/g, ""),
        whatsApp: phone.replace(/\s/g, ""),
      });
      writeStore(PHONE_KEY, slug, phone.replace(/\s/g, ""));
      writeStore(PHONE_DISMISS_KEY, slug, new Date().toISOString());
      setPhoneSuccess(true);
      window.setTimeout(() => {
        setPhoneSuccess(false);
        setPhoneOpen(false);
        setPhoneExpanded(false);
      }, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation() {
    setError(null);
    const phoneDigits =
      phone.replace(/\s/g, "") || readValue(PHONE_KEY, slug) || "";
    if (!isStkPhoneValid("+254", phoneDigits)) {
      setError("Add a WhatsApp number so riders can reach you.");
      return;
    }
    if (!selectedArea) {
      setError("Tap the area we deliver to.");
      return;
    }
    if (!street.trim()) {
      setError("Add a street, estate, or landmark.");
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
      setLocationDone(true);
      window.setTimeout(() => releaseCart(), 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {phoneOpen && phoneReady && !hidePhoneForRoute ? (
        <aside
          className={cn(
            "fixed z-[55] origin-bottom-right",
            "right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] md:right-4",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
          )}
          aria-label="WhatsApp deals"
        >
          {!phoneExpanded && !phoneSuccess ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPhoneExpanded(true)}
                className={cn(
                  "group flex items-center gap-2 rounded-full border border-[#25D366]/35 bg-background/95 py-2 pl-2.5 pr-3.5 shadow-lg shadow-black/10 ring-1 ring-black/[0.04] backdrop-blur-xl transition-transform hover:scale-[1.02] active:scale-[0.98]",
                )}
              >
                <span className="relative flex size-8 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
                  <MessageCircle className="size-4" aria-hidden />
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/35 [animation-duration:2.4s]" />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-semibold text-foreground">
                    Deals on WhatsApp?
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Tap to leave your number
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={dismissPhone}
                className="flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden rounded-2xl border border-[#25D366]/25 bg-background/98 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.32)] ring-1 ring-black/[0.04] backdrop-blur-xl",
                "animate-in fade-in-0 zoom-in-95 duration-300",
              )}
            >
              <div
                className="h-1 w-full bg-gradient-to-r from-[#25D366] via-[#25D366]/70 to-transparent"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2 px-3.5 pb-0.5 pt-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#25D366]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#128C7E]">
                  <Sparkles className="size-3" aria-hidden />
                  Optional
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
                <div className="flex flex-col items-center gap-2 px-4 pb-5 pt-3 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] animate-in zoom-in-50 duration-300">
                    <Check className="size-5" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    You&apos;re on the list
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Restocks & weekly deals — reply STOP anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 px-3.5 pb-3.5 pt-1">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-semibold leading-snug text-foreground">
                      Catch deals before they sell out
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      One quiet message a week from {storeName}.
                    </p>
                  </div>
                  <div className="flex overflow-hidden rounded-xl border border-border bg-muted/20 transition-shadow focus-within:border-[#25D366]/50 focus-within:ring-2 focus-within:ring-[#25D366]/20">
                    <span className="flex shrink-0 items-center border-r border-border/80 px-2.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      +254
                    </span>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="712 345 678"
                      className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm tabular-nums outline-none placeholder:text-muted-foreground/60"
                      value={phone}
                      onChange={(e) => setPhone(formatLocalPhone(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void savePhone();
                      }}
                    />
                  </div>
                  {error ? (
                    <p className="text-[11px] font-medium text-destructive">
                      {error}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full rounded-xl bg-[#25D366] text-xs font-semibold text-white hover:bg-[#1ebe5d]"
                    disabled={saving}
                    onClick={() => void savePhone()}
                  >
                    {saving ? "Saving…" : "Save my WhatsApp"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>
      ) : null}

      <Dialog
        open={locationOpen}
        onOpenChange={(open) => {
          if (!open && !locationDone) dismissLocation();
        }}
      >
        <DialogContent
          side="center"
          className="z-[80] gap-0 overflow-hidden p-0 sm:max-w-[26rem]"
          overlayClassName="z-[80] bg-black/55 supports-[backdrop-filter]:bg-black/45"
          showCloseButton={!locationDone}
        >
          {locationDone && selectedArea ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-300">
              <span
                className="relative flex size-14 items-center justify-center rounded-full text-white shadow-lg"
                style={
                  ctaStyle ?? {
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #0f172a) 100%)",
                  }
                }
              >
                <Navigation className="size-6" aria-hidden />
                <span className="absolute inset-0 animate-ping rounded-full bg-white/25 [animation-duration:1.2s]" />
              </span>
              <div className="space-y-1">
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  Heading your way
                </p>
                <p className="text-sm text-muted-foreground">
                  Delivering to{" "}
                  <span className="font-medium text-foreground">
                    {selectedArea.name}
                  </span>
                  {street.trim() ? (
                    <>
                      {" "}
                      · <span className="text-foreground/80">{street.trim()}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Opening your cart…</p>
            </div>
          ) : (
            <>
              <div
                className="relative overflow-hidden px-5 pb-4 pt-5"
                style={{
                  background: accentHex
                    ? `linear-gradient(160deg, color-mix(in srgb, ${accentHex} 22%, #0f172a) 0%, #0f172a 70%)`
                    : "linear-gradient(160deg, color-mix(in srgb, var(--primary) 28%, #0f172a) 0%, #0f172a 72%)",
                }}
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-8 size-32 rounded-full opacity-30 blur-2xl"
                  style={{
                    background: accentHex ?? "var(--primary)",
                  }}
                  aria-hidden
                />
                <div className="relative space-y-2 text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 ring-1 ring-white/15">
                    <MapPin className="size-3.5" aria-hidden />
                    Before checkout
                  </span>
                  <DialogHeader className="space-y-1.5 pr-6 text-left">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                      {outOfArea
                        ? "Outside our routes"
                        : "Where are you shopping from?"}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-white/70">
                      {outOfArea
                        ? `${storeName} only delivers to the areas below — for now.`
                        : `Pick your neighborhood so ${storeName} can plan your drop.`}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                {outOfArea ? (
                  <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      We&apos;re not there yet. Message us if you want us to
                      expand — or pick a served area to continue.
                    </p>
                    <div className="flex flex-col gap-2">
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                        >
                          <MessageCircle className="size-4" aria-hidden />
                          Ask us on WhatsApp
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={() => setOutOfArea(false)}
                      >
                        Choose a served area
                      </Button>
                      <button
                        type="button"
                        className="py-1 text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
                        onClick={dismissLocation}
                      >
                        Skip and view cart
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in-0 duration-300">
                    {!readValue(PHONE_KEY, slug) ? (
                      <div className="flex overflow-hidden rounded-xl border border-border bg-muted/15 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
                        <span className="flex shrink-0 items-center border-r border-border/80 px-3 text-xs font-semibold tabular-nums text-muted-foreground">
                          +254
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="WhatsApp number"
                          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none placeholder:text-muted-foreground/60"
                          value={phone}
                          onChange={(e) =>
                            setPhone(formatLocalPhone(e.target.value))
                          }
                        />
                      </div>
                    ) : null}

                    {activeAreas.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                        Delivery areas aren&apos;t set up yet — you can still
                        continue to cart.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          We deliver to
                        </p>
                        <div
                          className="flex max-h-[9.5rem] flex-wrap gap-2 overflow-y-auto overscroll-contain pr-0.5"
                          role="listbox"
                          aria-label="Delivery areas"
                        >
                          {activeAreas.map((area) => {
                            const selected = area.id === areaId;
                            return (
                              <button
                                key={area.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setAreaId(area.id);
                                  setError(null);
                                }}
                                className={cn(
                                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                                  selected
                                    ? "border-transparent text-white shadow-md"
                                    : "border-border/80 bg-background text-foreground hover:border-foreground/25 hover:bg-muted/50",
                                )}
                                style={
                                  selected
                                    ? (ctaStyle ?? {
                                        backgroundColor: "var(--primary)",
                                      })
                                    : undefined
                                }
                              >
                                {area.name}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => setOutOfArea(true)}
                        >
                          My area isn&apos;t listed
                        </button>
                      </div>
                    )}

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                        selectedArea
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <label className="flex flex-col gap-1.5 pt-1 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Exact spot in {selectedArea?.name ?? "your area"}
                          </span>
                          <input
                            ref={streetInputRef}
                            type="text"
                            placeholder="Estate, building, gate, landmark…"
                            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveLocation();
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {error ? (
                      <p className="text-sm font-medium text-destructive">
                        {error}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-2 pt-0.5">
                      <Button
                        type="button"
                        className="h-11 w-full rounded-xl font-semibold text-white shadow-md transition-transform active:scale-[0.98] hover:opacity-95"
                        style={ctaStyle}
                        disabled={
                          saving ||
                          activeAreas.length === 0 ||
                          !selectedArea ||
                          !street.trim()
                        }
                        onClick={() => void saveLocation()}
                      >
                        {saving ? "Saving…" : "Confirm & view cart"}
                      </Button>
                      <button
                        type="button"
                        className="py-1 text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
                        onClick={dismissLocation}
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

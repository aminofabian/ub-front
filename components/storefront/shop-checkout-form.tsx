"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckoutProgressSteps } from "@/components/storefront/checkout-progress-steps";
import { Button } from "@/components/ui/button";
import {
  fetchShopperAccountOverview,
  fetchShopperPickupOrderDetail,
} from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchWebCart,
  notifyWebCartChanged,
  readWebCartHandle,
  submitWebCheckout,
  type PublicCheckoutResult,
  type PublicWebCart,
} from "@/lib/web-cart";

/** Snapshot of cart + shipping at submit time (cart is cleared after checkout). */
type CheckoutOrderReceipt = {
  currency: string;
  subtotal: number;
  lines: PublicWebCart["lines"];
  shipping: {
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
};

const NAIROBI_SUBCOUNTY_WARDS: Record<string, string[]> = {
  Roysambu: ["Githurai", "Kahawa West", "Zimmerman", "Roysambu", "Kahawa"],
  Kasarani: ["Mirema", "USIU", "Thome", "Garden Estate", "Kasarani"],
};

const NAIROBI_SUBCOUNTIES = Object.keys(NAIROBI_SUBCOUNTY_WARDS);

const CHECKOUT_PREFILL_KEY = "ub.checkoutPrefill.v1";

type CheckoutPrefill = {
  firstName: string;
  lastName: string;
  customerPhone: string;
  areaCode: string;
  streetAddress: string;
  county: string;
  subCounty: string;
  ward: string;
  whatsAppNumber: string;
  customerEmail: string;
  deliveryNotes: string;
  isDefaultAddress: boolean;
};

function saveCheckoutPrefill(data: CheckoutPrefill): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHECKOUT_PREFILL_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

function loadCheckoutPrefill(): CheckoutPrefill | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CHECKOUT_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutPrefill>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
      customerPhone:
        typeof parsed.customerPhone === "string" ? parsed.customerPhone : "",
      areaCode: typeof parsed.areaCode === "string" ? parsed.areaCode : "+254",
      streetAddress:
        typeof parsed.streetAddress === "string" ? parsed.streetAddress : "",
      county: typeof parsed.county === "string" ? parsed.county : "Nairobi",
      subCounty: typeof parsed.subCounty === "string" ? parsed.subCounty : "",
      ward: typeof parsed.ward === "string" ? parsed.ward : "",
      whatsAppNumber:
        typeof parsed.whatsAppNumber === "string" ? parsed.whatsAppNumber : "",
      customerEmail:
        typeof parsed.customerEmail === "string" ? parsed.customerEmail : "",
      deliveryNotes:
        typeof parsed.deliveryNotes === "string" ? parsed.deliveryNotes : "",
      isDefaultAddress: Boolean(parsed.isDefaultAddress),
    };
  } catch {
    return null;
  }
}

/** Parse pipe-separated notes from a previous order back into address fields. */
function parseNotesToPrefill(notes: string): Partial<CheckoutPrefill> {
  const result: Partial<CheckoutPrefill> = {};
  const segments = notes
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    if (seg.startsWith("Street:")) result.streetAddress = seg.slice(7).trim();
    else if (seg.startsWith("County:")) result.county = seg.slice(7).trim();
    else if (seg.startsWith("Subcounty:"))
      result.subCounty = seg.slice(10).trim();
    else if (seg.startsWith("Ward:")) result.ward = seg.slice(5).trim();
    else if (seg.startsWith("WhatsApp:"))
      result.whatsAppNumber = seg.slice(9).trim();
    else if (seg.startsWith("Notes:"))
      result.deliveryNotes = seg.slice(6).trim();
    else if (seg === "Set as default address") result.isDefaultAddress = true;
  }
  return result;
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  required,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required !== false && (
          <span className="ml-0.5 text-destructive">*</span>
        )}
      </span>
      <input
        {...props}
        required={required !== false}
        className="h-11 rounded-lg border border-border bg-background px-3.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 hover:border-border/80 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SelectField({
  label,
  required,
  hint,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required !== false && (
          <span className="ml-0.5 text-destructive">*</span>
        )}
      </span>
      <select
        {...props}
        required={required !== false}
        className="h-11 rounded-lg border border-border bg-background px-3.5 text-sm shadow-sm transition-all hover:border-border/80 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function ShopCheckoutForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<PublicWebCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PublicCheckoutResult | null>(null);
  const [orderReceipt, setOrderReceipt] = useState<CheckoutOrderReceipt | null>(
    null,
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [areaCode, setAreaCode] = useState("+254");
  const [streetAddress, setStreetAddress] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [subCounty, setSubCounty] = useState("");
  const [ward, setWard] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const prefilled = useRef(false);

  /** Try to prefill form fields from localStorage + signed-in shopper history. */
  const tryPrefill = useCallback(async () => {
    if (prefilled.current) return;
    prefilled.current = true;

    // 1. Always try localStorage first (fast, works for guests)
    const saved = loadCheckoutPrefill();
    if (saved) {
      if (saved.firstName) setFirstName(saved.firstName);
      if (saved.lastName) setLastName(saved.lastName);
      if (saved.customerPhone) setCustomerPhone(saved.customerPhone);
      if (saved.areaCode && saved.areaCode !== "+254")
        setAreaCode(saved.areaCode);
      if (saved.streetAddress) setStreetAddress(saved.streetAddress);
      if (saved.county) setCounty(saved.county);
      if (saved.subCounty) setSubCounty(saved.subCounty);
      if (saved.ward) setWard(saved.ward);
      if (saved.whatsAppNumber) setWhatsAppNumber(saved.whatsAppNumber);
      if (saved.customerEmail) setCustomerEmail(saved.customerEmail);
      if (saved.deliveryNotes) setDeliveryNotes(saved.deliveryNotes);
      if (saved.isDefaultAddress) setIsDefaultAddress(true);
    }

    // 2. If signed in, also try shopper API for richer data
    const tokens = getSessionTokens();
    if (!tokens) return;

    try {
      const overview = await fetchShopperAccountOverview(0, 1);

      // Prefill email from account
      if (overview.email && !customerEmail) {
        setCustomerEmail(overview.email);
      }

      // Prefill name from account
      if (overview.customerDirectoryName && (!firstName || !lastName)) {
        const parts = overview.customerDirectoryName.trim().split(/\s+/);
        if (!firstName && parts.length > 0) setFirstName(parts[0]);
        if (!lastName && parts.length > 1)
          setLastName(parts.slice(1).join(" "));
      }

      // Try most recent pickup order for phone + address details
      const latestOrder = overview.pickupOrders?.[0];
      if (latestOrder) {
        if (latestOrder.customerPhone && !customerPhone) {
          // Try to split area code from phone
          const phone = latestOrder.customerPhone.trim();
          const codeMatch = phone.match(/^(\+\d{1,4})\s+(.+)/);
          if (codeMatch) {
            if (!saved?.areaCode || saved.areaCode === "+254")
              setAreaCode(codeMatch[1]);
            setCustomerPhone(codeMatch[2]);
          } else {
            setCustomerPhone(phone);
          }
        }

        // Fetch full order detail for notes (contains address)
        try {
          const detail = await fetchShopperPickupOrderDetail(latestOrder.id);
          if (detail.notes) {
            const parsedNotes = parseNotesToPrefill(detail.notes);
            if (!streetAddress && parsedNotes.streetAddress)
              setStreetAddress(parsedNotes.streetAddress);
            if (!subCounty && parsedNotes.subCounty)
              setSubCounty(parsedNotes.subCounty);
            if (!ward && parsedNotes.ward) setWard(parsedNotes.ward);
            if (!whatsAppNumber && parsedNotes.whatsAppNumber)
              setWhatsAppNumber(parsedNotes.whatsAppNumber);
            if (!deliveryNotes && parsedNotes.deliveryNotes)
              setDeliveryNotes(parsedNotes.deliveryNotes);
            if (parsedNotes.isDefaultAddress) setIsDefaultAddress(true);
          }
          if (detail.customerEmail && !customerEmail) {
            setCustomerEmail(detail.customerEmail);
          }
        } catch {
          // order detail fetch failed — continue with what we have
        }
      }
    } catch {
      // shopper API unavailable — localStorage data is sufficient
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const s = slug.trim();
    if (!s) {
      setCart(null);
      setLoading(false);
      return;
    }
    const h = readWebCartHandle();
    if (!h || h.slug !== s) {
      setCart(null);
      setLoading(false);
      return;
    }
    const data = await fetchWebCart(s, h.cartId);
    if (!data || data.lines.length === 0) {
      clearWebCartHandle();
      setCart(null);
      setLoading(false);
      return;
    }
    setCart(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load updates after fetch
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
  }, [load]);

  // Trigger prefill once cart is loaded and form is ready
  useEffect(() => {
    if (!loading && cart && cart.subtotal != null) {
      queueMicrotask(() => void tryPrefill());
    }
  }, [loading, cart, tryPrefill]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const h = readWebCartHandle();
    if (!h || h.slug !== s || !cart || cart.subtotal == null) {
      setError("Your cart is missing prices or expired. Return to the shop.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await submitWebCheckout(s, h.cartId, {
        customerName: `${firstName} ${lastName}`.trim(),
        customerPhone: `${areaCode} ${customerPhone}`.trim(),
        customerEmail: customerEmail.trim() || undefined,
        notes: [
          streetAddress.trim() ? `Street: ${streetAddress.trim()}` : "",
          county.trim() ? `County: ${county.trim()}` : "",
          subCounty.trim() ? `Subcounty: ${subCounty.trim()}` : "",
          ward.trim() ? `Ward: ${ward.trim()}` : "",
          whatsAppNumber.trim() ? `WhatsApp: ${whatsAppNumber.trim()}` : "",
          isDefaultAddress ? "Set as default address" : "",
          deliveryNotes.trim() ? `Notes: ${deliveryNotes.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      });

      setOrderReceipt({
        currency: cart.currency,
        subtotal: cart.subtotal,
        lines: cart.lines.map((line) => ({ ...line })),
        shipping: {
          customerName: `${firstName} ${lastName}`.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: `${areaCode} ${customerPhone}`.trim(),
          streetAddress: streetAddress.trim(),
          county: county.trim(),
          subCounty: subCounty.trim(),
          ward: ward.trim(),
          whatsAppNumber: whatsAppNumber.trim(),
          deliveryNotes: deliveryNotes.trim(),
        },
      });

      clearWebCartHandle();
      notifyWebCartChanged();

      // Persist address for next checkout (guest + signed-in users)
      if (isDefaultAddress) {
        saveCheckoutPrefill({
          firstName,
          lastName,
          customerPhone,
          areaCode,
          streetAddress,
          county,
          subCounty,
          ward,
          whatsAppNumber,
          customerEmail,
          deliveryNotes,
          isDefaultAddress: true,
        });
      }

      setDone(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div>
        <header className="mb-8 space-y-6 border-b border-border/50 pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Checkout
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Place your pickup request. Payment on the web is coming soon —
              staff may confirm via phone or WhatsApp.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-full max-w-48 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <CheckoutProgressSteps activeStep={1} />
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-11 animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-14 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    const total = formatDisplayPrice(done.currency, done.grandTotal);
    const statusLabel = done.status.replace(/_/g, " ");
    const receipt = orderReceipt;
    const receiptSubtotalLabel =
      receipt != null
        ? formatDisplayPrice(receipt.currency, receipt.subtotal)
        : total;
    const deliveryAreaLine =
      receipt?.shipping.ward &&
      receipt?.shipping.subCounty &&
      receipt?.shipping.county
        ? `${receipt.shipping.ward} · ${receipt.shipping.subCounty} · ${receipt.shipping.county}`
        : null;

    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 space-y-8 pb-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div
              className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40"
              aria-hidden
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600 shadow-inner dark:bg-emerald-500">
                <Check className="size-5 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
                Order received
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                <span className="text-muted-foreground">Reference </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {done.orderId}
                </span>
                <span className="text-muted-foreground"> · Total </span>
                <span className="font-bold text-foreground">{total}</span>
                <span className="text-muted-foreground"> · Pickup at </span>
                <span className="font-bold text-foreground">
                  {done.catalogBranchName}
                </span>
                <span className="text-muted-foreground"> · Status: </span>
                <span className="font-bold capitalize text-foreground">
                  {statusLabel}
                </span>
                <span className="text-muted-foreground">.</span>
              </p>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                You&apos;ll complete payment with the store when supported —
                we&apos;ll hold your request as pending payment.
              </p>
            </div>
          </div>
          <CheckoutProgressSteps complete />
        </header>

        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Order summary
          </h2>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background px-4 py-4 sm:py-5">
              <dt className="text-xs font-medium text-muted-foreground">
                Total
              </dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {total}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-4 py-4 sm:py-5">
              <dt className="text-xs font-medium text-muted-foreground">
                Pickup branch
              </dt>
              <dd className="mt-2 text-base font-bold text-foreground">
                {done.catalogBranchName}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-4 py-4 sm:col-span-2 sm:py-4">
              <dt className="text-xs font-medium text-muted-foreground">
                Status
              </dt>
              <dd className="mt-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold capitalize text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                  {statusLabel}
                </span>
              </dd>
            </div>
          </dl>

          {receipt && receipt.lines.length > 0 ? (
            <div className="mt-8 border-t border-border/50 pt-8">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Items in this order
              </h3>
              <ul className="mt-4 space-y-2">
                {receipt.lines.map((line) => (
                  <li
                    key={line.itemId}
                    className="flex gap-3.5 rounded-xl border border-border/50 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="relative size-[3.25rem] shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-border/40">
                      {line.imageUrl ? (
                        <Image
                          src={line.imageUrl}
                          alt={line.name}
                          fill
                          sizes="52px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-medium text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {line.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty {line.quantity}
                        {line.variantName ? (
                          <span className="ml-2 inline-flex rounded-md border border-border/60 bg-background px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                            {line.variantName}
                          </span>
                        ) : null}
                        {line.unitPrice != null ? (
                          <span className="ml-2 tabular-nums">
                            @{" "}
                            {formatDisplayPrice(
                              receipt.currency,
                              line.unitPrice,
                            )}{" "}
                            each
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="shrink-0 self-start text-right">
                      <p className="text-sm font-bold tabular-nums text-foreground">
                        {formatDisplayPrice(
                          receipt.currency,
                          line.lineTotal ?? 0,
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {receipt ? (
            <div className="mt-8 border-t border-border/50 pt-8">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Delivery &amp; contact
              </h3>
              <div className="mt-4 rounded-xl border border-border/60 bg-background px-4 py-4 text-sm">
                <p className="font-bold text-foreground">
                  {receipt.shipping.customerName || "—"}
                </p>
                {receipt.shipping.customerEmail ? (
                  <p className="mt-1.5 text-muted-foreground">
                    {receipt.shipping.customerEmail}
                  </p>
                ) : null}
                <p className="mt-1.5 text-muted-foreground">
                  {receipt.shipping.customerPhone}
                </p>
                {receipt.shipping.whatsAppNumber ? (
                  <p className="mt-1.5 text-muted-foreground">
                    WhatsApp: {receipt.shipping.whatsAppNumber}
                  </p>
                ) : null}
                {receipt.shipping.streetAddress ? (
                  <p className="mt-4 font-medium text-foreground">
                    {receipt.shipping.streetAddress}
                  </p>
                ) : null}
                {deliveryAreaLine ? (
                  <p className="mt-1.5 text-muted-foreground">
                    {deliveryAreaLine}
                  </p>
                ) : null}
                {deliveryAreaLine ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <span aria-hidden>⏱</span>
                    Est. delivery: within 30 minutes
                  </p>
                ) : null}
                {receipt.shipping.deliveryNotes ? (
                  <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Note: </span>
                    {receipt.shipping.deliveryNotes}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 border-t border-border/50 pt-6 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Cart subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {receiptSubtotalLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Free
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => router.push(APP_ROUTES.shop)}
            className="mt-8 h-12 w-full rounded-xl bg-foreground text-base font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
          >
            Continue shopping
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty cart ──
  if (!cart) {
    return (
      <div className="mx-auto max-w-md text-center py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted text-3xl">
          🛒
        </div>
        <h2 className="mt-6 text-xl font-semibold">No active cart</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add items to your cart before checking out.
        </p>
        <Link
          href={APP_ROUTES.shopCart}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          Go to Cart
        </Link>
      </div>
    );
  }

  // ── Missing prices ──
  if (cart.subtotal == null) {
    return (
      <div className="mx-auto max-w-md text-center py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
          ⚠️
        </div>
        <h2 className="mt-6 text-xl font-semibold">Pricing Issue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Some items are missing storefront prices. Please remove those items or
          contact the branch.
        </p>
        <Link
          href={APP_ROUTES.shopCart}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          Edit Cart
        </Link>
      </div>
    );
  }

  const subtotalLabel = formatDisplayPrice(cart.currency, cart.subtotal);
  const shippingLabel = formatDisplayPrice(cart.currency, 0);
  const totalLabel = subtotalLabel;
  const wardOptions = subCounty
    ? (NAIROBI_SUBCOUNTY_WARDS[subCounty] ?? [])
    : [];

  const totalQty = cart.lines.reduce((acc, line) => acc + line.quantity, 0);

  const deliveryZoneSummary =
    ward && subCounty && county
      ? `${ward} · ${subCounty} · ${county}`
      : "Select subcounty and ward below";

  const shippingComplete = Boolean(
    customerEmail.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    customerPhone.trim() &&
    subCounty &&
    ward &&
    streetAddress.trim(),
  );

  const activeCheckoutStep: 1 | 2 | 3 = !shippingComplete
    ? 1
    : !agreedToTerms
      ? 2
      : 3;

  return (
    <div>
      <header className="mb-8 space-y-6 border-b border-border/50 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Place your pickup request. Payment on the web is coming soon — staff
            may confirm via phone or WhatsApp.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your order at a glance
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">
                Items
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">
                {cart.lines.length}{" "}
                {cart.lines.length === 1 ? "product" : "products"} · {totalQty}{" "}
                {totalQty === 1 ? "unit" : "units"}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">
                Order total
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {subtotalLabel}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">
                Fulfillment
              </dt>
              <dd className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                Pickup at {cart.catalogBranchName}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Delivery area
              </dt>
              <dd className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                {deliveryZoneSummary}
              </dd>
            </div>
          </dl>
        </div>

        <CheckoutProgressSteps activeStep={activeCheckoutStep} />
      </header>

      <form
        className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start"
        onSubmit={(ev) => void onSubmit(ev)}
      >
        {/* ── Left: Shipping Details ── */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          <SectionHeader
            icon="📍"
            title="Shipping Address"
            subtitle="We'll deliver to this location within 30 minutes"
          />

          {/* Delivery Zone Notice */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            <span className="mt-px shrink-0 text-base">🚚</span>
            <div>
              <span className="font-semibold">Delivery Zone:</span> Available
              around{" "}
              <span className="font-medium">
                Roysambu, Mirema, USIU, Thome, Zimmerman, Kahawa West, Githurai
              </span>
              , and nearby areas.
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <span className="mt-px shrink-0 text-base">⚠️</span>
              <p>{error}</p>
            </div>
          ) : null}

          {/* ── Contact Information ── */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Information
            </h3>
            <div className="mt-4 space-y-4">
              <InputField
                label="Email Address"
                type="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(ev) => setCustomerEmail(ev.target.value)}
                placeholder="you@example.com"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="First Name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  placeholder="John"
                />
                <InputField
                  label="Last Name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <InputField
                  label="Code"
                  value={areaCode}
                  onChange={(ev) => setAreaCode(ev.target.value)}
                  placeholder="+254"
                />
                <InputField
                  label="Phone Number"
                  autoComplete="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(ev) => setCustomerPhone(ev.target.value)}
                  placeholder="712 345 678"
                />
              </div>

              <InputField
                label="WhatsApp Number"
                required={false}
                inputMode="tel"
                value={whatsAppNumber}
                onChange={(ev) => setWhatsAppNumber(ev.target.value)}
                placeholder="Same as phone (optional)"
                hint="We'll use this for order updates if different from your phone number."
              />
            </div>
          </div>

          {/* ── Location ── */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Location
            </h3>
            <div className="mt-4 space-y-4">
              <SelectField
                label="County"
                value={county}
                onChange={(ev) => setCounty(ev.target.value)}
              >
                <option value="">Select county</option>
                <option value="Nairobi">Nairobi</option>
              </SelectField>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Subcounty"
                  value={subCounty}
                  onChange={(ev) => {
                    setSubCounty(ev.target.value);
                    setWard("");
                  }}
                >
                  <option value="">Select subcounty</option>
                  {NAIROBI_SUBCOUNTIES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Ward"
                  value={ward}
                  onChange={(ev) => setWard(ev.target.value)}
                  disabled={!subCounty}
                >
                  <option value="">
                    {subCounty ? "Select ward" : "Select subcounty first"}
                  </option>
                  {wardOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <InputField
                label="Street Address"
                value={streetAddress}
                onChange={(ev) => setStreetAddress(ev.target.value)}
                placeholder="Apartment, building, street name..."
                hint="A detailed address helps our rider find you quickly."
              />

              <InputField
                label="Delivery Notes"
                required={false}
                value={deliveryNotes}
                onChange={(ev) => setDeliveryNotes(ev.target.value)}
                placeholder="Landmark, gate code, preferred contact time..."
              />

              <label className="inline-flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border text-primary focus:ring-primary/10"
                  checked={isDefaultAddress}
                  onChange={(ev) => setIsDefaultAddress(ev.target.checked)}
                />
                <span>Save as my default delivery address</span>
              </label>
            </div>
          </div>
        </section>

        {/* ── Right: Order Summary ── */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8 lg:sticky lg:top-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">My Order</h3>
            <Link
              href={APP_ROUTES.shopCart}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </Link>
          </div>

          {/* Cart Lines */}
          <div className="mt-5 space-y-3">
            {cart.lines.map((line) => (
              <div
                key={line.itemId}
                className="flex gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/30">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt={line.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">
                      🛍️
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {line.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty: {line.quantity}
                    {line.variantName && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-muted px-2 py-px text-[10px] font-medium uppercase tracking-wide">
                        {line.variantName}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatDisplayPrice(cart.currency, line.lineTotal ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 space-y-2.5 border-t border-border/60 pt-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{subtotalLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="tabular-nums">
                {shippingLabel === formatDisplayPrice(cart.currency, 0) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Free
                  </span>
                ) : (
                  shippingLabel
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
              <span className="text-base font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                {totalLabel}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 space-y-4">
            <Button
              type="submit"
              size="lg"
              disabled={busy || !agreedToTerms}
              className="h-12 w-full rounded-xl text-base font-semibold tracking-wide transition-all disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Placing Order…
                </span>
              ) : (
                "Place Order"
              )}
            </Button>

            <label className="inline-flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer leading-relaxed">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/10"
                checked={agreedToTerms}
                onChange={(ev) => setAgreedToTerms(ev.target.checked)}
              />
              <span>
                I agree to the store{" "}
                <span className="underline underline-offset-2">
                  terms of use
                </span>{" "}
                and{" "}
                <span className="underline underline-offset-2">
                  privacy policy
                </span>
                .
              </span>
            </label>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-4 border-t border-border/40 pt-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">🔒 Secure</span>
            <span className="flex items-center gap-1.5">⚡ Fast Pickup</span>
          </div>
        </section>

        {/* Mobile Bottom CTA (hidden on desktop) */}
        <div className="lg:hidden">
          <Button
            type="submit"
            size="lg"
            disabled={busy || !agreedToTerms}
            className="h-12 w-full rounded-xl text-base font-semibold tracking-wide"
          >
            {busy ? "Placing Order…" : "Place Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}

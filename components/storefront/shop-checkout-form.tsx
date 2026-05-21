"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CheckoutProgressSteps } from "@/components/storefront/checkout-progress-steps";
import { CheckoutScrollEndSpacer } from "@/components/storefront/shop-checkout-dock-height";
import {
  CONFIRMATION_SCROLL,
  CONFIRMATION_VIEWPORT,
  ConfirmationDockActions,
  ConfirmationFloatingDock,
  ConfirmationPanel,
  ConfirmationPanelHeader,
  ConfirmationTopProgress,
  OrderDeliveryCard,
  OrderLinesList,
  OrderMetaStrip,
  OrderPaymentStatusBanner,
  OrderPaymentSummaryCard,
} from "@/components/storefront/shop-order-confirmation-ui";
import {
  dismissCheckoutSignupPrompt,
  isCheckoutSignupDismissed,
  ShopCheckoutSignupModal,
} from "@/components/storefront/shop-checkout-signup-modal";
import { ShopCheckoutPaymentSection } from "@/components/storefront/shop-checkout-payment-section";
import { ShopShippingSummaryCard } from "@/components/storefront/shop-shipping-summary-card";
import { Button } from "@/components/ui/button";
import {
  fetchShopperAccountOverview,
  fetchShopperPickupOrderDetail,
} from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCheckoutPaymentOptions,
} from "@/lib/public-storefront";
import {
  fetchPublicCheckoutPaymentOptionsBrowser,
  fetchPublicWebOrderPaymentStatus,
  initiatePublicWebOrderStkPush,
} from "@/lib/public-storefront-client";
import { cn } from "@/lib/utils";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchWebCart,
  notifyWebCartChanged,
  readWebCartHandle,
  cartIsCheckoutReady,
  cartLinesMissingPrice,
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

function isPrefillComplete(p: CheckoutPrefill): boolean {
  return Boolean(
    p.customerEmail.trim() &&
      p.firstName.trim() &&
      p.lastName.trim() &&
      p.customerPhone.trim() &&
      p.subCounty &&
      p.ward &&
      p.streetAddress.trim(),
  );
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

function CheckoutFloatingCta({
  children,
  pulse,
  minimal,
}: {
  children?: React.ReactNode;
  pulse?: boolean;
  /** Compact bar: total + action only (floating dock) */
  minimal?: boolean;
}) {
  if (minimal) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/45 bg-card/95 p-2.5 ring-1 ring-black/[0.03]",
          pulse && "ring-2 ring-primary/25",
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/45 bg-card/95 p-3.5 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.03] sm:p-4",
        pulse &&
          "ring-2 ring-primary/25 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)]",
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
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
      <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/70">
        {label}
        {required !== false && (
          <span className="ml-0.5 text-destructive">*</span>
        )}
      </span>
      <input
        {...props}
        required={required !== false}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-all placeholder:text-muted-foreground/55 hover:border-foreground/25 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
      {hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
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
      <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/70">
        {label}
        {required !== false && (
          <span className="ml-0.5 text-destructive">*</span>
        )}
      </span>
      <select
        {...props}
        required={required !== false}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-all hover:border-foreground/25 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      {hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
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
  const [paymentOptions, setPaymentOptions] = useState<PublicCheckoutPaymentOptions>({
    manual: [],
    online: [],
  });
  const [stkBusy, setStkBusy] = useState(false);
  const [stkSent, setStkSent] = useState(false);
  const [stkMessage, setStkMessage] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

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
  const [shippingLocked, setShippingLocked] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);

  const prefilled = useRef(false);
  const termsManuallyChanged = useRef(false);
  const paymentToastShown = useRef(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const pendingShippingLock = useRef(false);

  const notifyPaymentConfirmed = useCallback(() => {
    setPaymentConfirmed(true);
    setPaymentFailed(false);
    setStkSent(false);
    setStkMessage(null);
    if (!paymentToastShown.current) {
      paymentToastShown.current = true;
      toast.success("Payment received", {
        description: "Your order is confirmed. The store has been notified.",
        duration: 10_000,
      });
    }
  }, []);

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
    void load();
  }, [load]);

  useEffect(() => {
    setSignedIn(getSessionTokens() != null);
  }, []);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
  }, [load]);

  // Trigger prefill once cart is loaded and form is ready
  useEffect(() => {
    if (!loading && cart && cartIsCheckoutReady(cart)) {
      queueMicrotask(() => void tryPrefill());
    }
  }, [loading, cart, tryPrefill]);

  // Fetch payment options when cart loads
  useEffect(() => {
    if (slug && cart) {
      fetchPublicCheckoutPaymentOptionsBrowser(slug)
        .then(setPaymentOptions)
        .catch(() => setPaymentOptions({ manual: [], online: [] }));
    }
  }, [slug, cart]);

  async function handleStkPay(configId: string, phoneNumber: string) {
    if (!done?.orderId) {
      toast.message("Complete your purchase first", {
        description:
          "Place your order below, then send the M-Pesa prompt to your phone from here.",
      });
      return;
    }
    setStkBusy(true);
    setStkMessage(null);
    try {
      const result = await initiatePublicWebOrderStkPush(slug, done.orderId, {
        configId,
        phoneNumber,
      });
      if (result.accepted) {
        setStkSent(true);
        setStkMessage(result.message ?? "Check your phone to approve the M-Pesa payment.");
      } else {
        setStkMessage(result.message ?? "Could not send M-Pesa prompt.");
      }
    } catch (err) {
      setStkMessage(err instanceof Error ? err.message : "Could not send M-Pesa prompt.");
    } finally {
      setStkBusy(false);
    }
  }

  useEffect(() => {
    if (!done?.orderId || paymentConfirmed) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchPublicWebOrderPaymentStatus(slug, done.orderId);
        if (cancelled) {
          return;
        }
        if (status.paid) {
          notifyPaymentConfirmed();
        } else if (status.paymentFailed) {
          setPaymentFailed(true);
          setStkSent(false);
          setStkMessage(
            status.failureReason ?? "Payment was not completed. You can try again.",
          );
        }
      } catch {
        /* keep polling */
      }
    };
    const interval = setInterval(() => void poll(), 4000);
    void poll();
    const stop = setTimeout(() => clearInterval(interval), 180_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [done?.orderId, slug, paymentConfirmed, notifyPaymentConfirmed]);

  const hasOnlinePay = paymentOptions.online.length > 0;
  const hasManualPay = paymentOptions.manual.length > 0;

  async function handleConfirmPaymentSent() {
    if (!done?.orderId) {
      return;
    }
    setCheckingPayment(true);
    setError(null);
    try {
      const status = await fetchPublicWebOrderPaymentStatus(slug, done.orderId);
      if (status.paid) {
        notifyPaymentConfirmed();
        return;
      }
      if (status.paymentFailed) {
        setPaymentFailed(true);
        setStkSent(false);
        setStkMessage(
          status.failureReason ?? "Payment was not completed. You can try again.",
        );
        toast.error("Payment not completed", {
          description:
            status.failureReason ??
            "Try the M-Pesa prompt again or pay using the till details.",
        });
        return;
      }
      toast.message("Payment not confirmed yet", {
        description: hasManualPay
          ? "The store will mark your order paid once they verify your till or transfer."
          : "Approve the M-Pesa prompt on your phone, or send the prompt again below.",
        duration: 8000,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not check payment status",
      );
    } finally {
      setCheckingPayment(false);
    }
  }

  const contactFieldsComplete = Boolean(
    customerEmail.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    customerPhone.trim(),
  );

  const requiredCheckoutFieldsComplete = Boolean(
    contactFieldsComplete && subCounty && ward && streetAddress.trim(),
  );

  // Use saved delivery/contact from last order — skip the extra "save" step
  useEffect(() => {
    if (loading || !cart || !prefilled.current || isEditingShipping) return;
    if (shippingLocked || !requiredCheckoutFieldsComplete) return;
    const saved = loadCheckoutPrefill();
    const canUseSaved =
      (saved != null && isPrefillComplete(saved)) ||
      (isDefaultAddress && requiredCheckoutFieldsComplete);
    if (canUseSaved) {
      setShippingLocked(true);
    }
  }, [
    loading,
    cart,
    isEditingShipping,
    shippingLocked,
    requiredCheckoutFieldsComplete,
    customerEmail,
    firstName,
    lastName,
    customerPhone,
    subCounty,
    ward,
    streetAddress,
    isDefaultAddress,
  ]);

  const termsAccepted =
    agreedToTerms ||
    (requiredCheckoutFieldsComplete && !termsManuallyChanged.current);

  useEffect(() => {
    if (!requiredCheckoutFieldsComplete) {
      termsManuallyChanged.current = false;
      return;
    }
  }, [requiredCheckoutFieldsComplete]);

  function handleTermsAgreementChange(checked: boolean) {
    termsManuallyChanged.current = true;
    setAgreedToTerms(checked);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const h = readWebCartHandle();
    if (!h || h.slug !== s || !cart || !cartIsCheckoutReady(cart)) {
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

      const receiptSubtotal =
        cart.subtotal ??
        cart.lines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);

      setOrderReceipt({
        currency: cart.currency,
        subtotal: receiptSubtotal,
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
        isDefaultAddress,
      });

      setPaymentConfirmed(false);
      setPaymentFailed(false);
      setStkSent(false);
      setStkMessage(null);
      paymentToastShown.current = false;
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
              Place your pickup request, then pay with M-Pesa on your phone or
              using the store&apos;s payment details.
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
          <CheckoutProgressSteps activeStep={1} compact />
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

  const awaitingOnlinePayment =
    Boolean(done) &&
    !paymentConfirmed &&
    paymentOptions.online.length > 0;

  // ── Success (manual-only or already paid) ──
  if (done && !awaitingOnlinePayment) {
    const total = formatDisplayPrice(done.currency, done.grandTotal);
    const orderRef =
      done.orderId.length > 8
        ? done.orderId.slice(0, 8).toUpperCase()
        : done.orderId;
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

    const receiptLines =
      receipt?.lines.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        variantName: line.variantName,
        imageUrl: line.imageUrl,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        currency: receipt.currency,
        formatPrice: formatDisplayPrice,
      })) ?? [];

    return (
      <div
        className={cn(
          CONFIRMATION_VIEWPORT,
          "mx-auto h-full w-full max-w-5xl",
        )}
      >
        <ConfirmationTopProgress />
        <div className={CONFIRMATION_SCROLL}>
          <header className="space-y-2 pb-2 max-lg:space-y-1.5">
            <OrderPaymentStatusBanner
              paymentConfirmed={paymentConfirmed}
              paymentFailed={paymentFailed}
              failureMessage={stkMessage}
              total={total}
              hasOnlinePay={hasOnlinePay}
              hasManualPay={hasManualPay}
              stkSent={stkSent}
            />
            <OrderMetaStrip
              items={[
                {
                  label: "Reference",
                  value: (
                    <span className="font-mono text-[13px]">{orderRef}</span>
                  ),
                },
                {
                  label: paymentConfirmed ? "Paid" : "Total due",
                  value: total,
                  highlight: paymentConfirmed,
                },
                {
                  label: "Pickup",
                  value: (
                    <span className="truncate text-[13px] font-medium normal-case tracking-normal">
                      {done.catalogBranchName}
                    </span>
                  ),
                },
              ]}
            />
          </header>

          <div className="space-y-2.5 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-3">
            <ConfirmationPanel className="overflow-hidden p-0">
              <ConfirmationPanelHeader
                title="Items ordered"
                subtitle={`${receipt?.lines.length ?? 0} ${receipt?.lines.length === 1 ? "item" : "items"}`}
                trailing={
                  <span className="rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
                    {receiptSubtotalLabel}
                  </span>
                }
              />
              <OrderLinesList lines={receiptLines} />
            </ConfirmationPanel>

            <aside className="space-y-2.5 max-lg:hidden">
              {receipt ? (
                <OrderDeliveryCard
                  customerName={receipt.shipping.customerName}
                  customerEmail={receipt.shipping.customerEmail}
                  customerPhone={receipt.shipping.customerPhone}
                  whatsAppNumber={receipt.shipping.whatsAppNumber}
                  streetAddress={receipt.shipping.streetAddress}
                  deliveryAreaLine={deliveryAreaLine}
                  deliveryNotes={receipt.shipping.deliveryNotes}
                />
              ) : null}
              <OrderPaymentSummaryCard
                subtotalLabel={receiptSubtotalLabel}
                totalLabel={total}
                paymentConfirmed={paymentConfirmed}
                paymentFailed={paymentFailed}
                manualPayNote={hasManualPay}
              />
            </aside>

            {receipt ? (
              <div className="space-y-2.5 lg:hidden">
                <OrderDeliveryCard
                  customerName={receipt.shipping.customerName}
                  customerEmail={receipt.shipping.customerEmail}
                  customerPhone={receipt.shipping.customerPhone}
                  whatsAppNumber={receipt.shipping.whatsAppNumber}
                  streetAddress={receipt.shipping.streetAddress}
                  deliveryAreaLine={deliveryAreaLine}
                  deliveryNotes={receipt.shipping.deliveryNotes}
                />
                <OrderPaymentSummaryCard
                  subtotalLabel={receiptSubtotalLabel}
                  totalLabel={total}
                  paymentConfirmed={paymentConfirmed}
                  paymentFailed={paymentFailed}
                  manualPayNote={hasManualPay}
                />
              </div>
            ) : null}
          </div>
          <CheckoutScrollEndSpacer />
        </div>

        <ConfirmationDockActions
          paymentConfirmed={paymentConfirmed}
          checkingPayment={checkingPayment}
          onConfirmPayment={() => void handleConfirmPaymentSent()}
          onReturnToShop={() => router.push(APP_ROUTES.shop)}
          paymentSlot={
            !paymentConfirmed && (hasManualPay || hasOnlinePay) ? (
              <ShopCheckoutPaymentSection
                variant="floating"
                manual={paymentOptions.manual}
                online={paymentOptions.online}
                defaultAreaCode={areaCode}
                defaultPhone={customerPhone}
                stkBusy={stkBusy}
                stkMessage={stkMessage}
                stkSent={stkSent}
                onStkPay={handleStkPay}
                orderPlaced
              />
            ) : undefined
          }
        />
      </div>
    );
  }

  // ── Order placed — pay with M-Pesa on the same checkout screen ──
  if (done && awaitingOnlinePayment && orderReceipt) {
    const placedTotal = formatDisplayPrice(done.currency, done.grandTotal);
    const orderRef =
      done.orderId.length > 8
        ? done.orderId.slice(0, 8).toUpperCase()
        : done.orderId;

    const placedLines = orderReceipt.lines.map((line) => ({
      itemId: line.itemId,
      name: line.name,
      variantName: line.variantName,
      imageUrl: line.imageUrl,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      currency: orderReceipt.currency,
      formatPrice: formatDisplayPrice,
    }));

    return (
      <div className={cn(CONFIRMATION_VIEWPORT, "h-full min-w-0 max-w-full")}>
        <ConfirmationTopProgress />
        <div className={CONFIRMATION_SCROLL}>
          <header className="space-y-2 pb-2 max-lg:space-y-1.5">
            <OrderPaymentStatusBanner
              paymentConfirmed={paymentConfirmed}
              paymentFailed={paymentFailed}
              failureMessage={stkMessage}
              total={placedTotal}
              hasOnlinePay={hasOnlinePay}
              hasManualPay={hasManualPay}
              stkSent={stkSent}
            />
            <OrderMetaStrip
              items={[
                {
                  label: "Reference",
                  value: (
                    <span className="font-mono text-[13px]">{orderRef}</span>
                  ),
                },
                {
                  label: "Total due",
                  value: placedTotal,
                  highlight: false,
                },
                {
                  label: "Pickup",
                  value: (
                    <span className="truncate text-[13px] font-medium normal-case tracking-normal">
                      {done.catalogBranchName}
                    </span>
                  ),
                },
              ]}
            />
          </header>

          <ConfirmationPanel className="overflow-hidden p-0">
            <ConfirmationPanelHeader
              title="Order summary"
              subtitle={`${placedLines.length} ${placedLines.length === 1 ? "item" : "items"}`}
            />
            <OrderLinesList lines={placedLines} />
            <div className="flex items-end justify-between border-t border-border/50 px-3.5 py-3 sm:px-4">
              <span className="text-xs font-semibold text-foreground">Total due</span>
              <span className="font-serif text-xl font-semibold tabular-nums">
                {placedTotal}
              </span>
            </div>
          </ConfirmationPanel>
          <CheckoutScrollEndSpacer />
        </div>

        <ConfirmationDockActions
          paymentConfirmed={paymentConfirmed}
          checkingPayment={checkingPayment}
          onConfirmPayment={() => void handleConfirmPaymentSent()}
          onReturnToShop={() => router.push(APP_ROUTES.shop)}
          paymentSlot={
            <ShopCheckoutPaymentSection
              variant="floating"
              manual={paymentOptions.manual}
              online={paymentOptions.online}
              defaultAreaCode={areaCode}
              defaultPhone={customerPhone}
              stkBusy={stkBusy}
              stkMessage={stkMessage}
              stkSent={stkSent}
              onStkPay={handleStkPay}
              orderPlaced
            />
          }
        />
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
          href={APP_ROUTES.shop}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const unpricedLines = cartLinesMissingPrice(cart);
  if (!cartIsCheckoutReady(cart)) {
    return (
      <div className="mx-auto max-w-md py-16">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
            ⚠️
          </div>
          <h2 className="mt-6 text-xl font-semibold">Pricing unavailable for checkout</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {unpricedLines.length > 0
              ? "These items need a shelf price in Products before you can check out. Remove them or ask the store to set a price."
              : "Your cart has no priced items. Add products with a visible price from the shop."}
          </p>
        </div>
        {unpricedLines.length > 0 ? (
          <ul className="mt-6 space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
            {unpricedLines.map((line) => (
              <li
                key={line.itemId}
                className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0"
              >
                <span className="min-w-0 font-medium text-foreground">
                  {line.variantName ? `${line.name} · ${line.variantName}` : line.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">Qty {line.quantity}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={APP_ROUTES.shopCart}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            Edit cart
          </Link>
          <Link
            href={APP_ROUTES.shop}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to shop
          </Link>
        </div>
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

  const shippingComplete = requiredCheckoutFieldsComplete;

  const activeCheckoutStep: 1 | 2 | 3 = !shippingLocked
    ? 1
    : !termsAccepted
      ? 2
      : 3;

  const shippingSummary = {
    customerName: `${firstName} ${lastName}`.trim(),
    customerEmail: customerEmail.trim(),
    customerPhone: `${areaCode} ${customerPhone}`.trim(),
    streetAddress: streetAddress.trim(),
    county: county.trim(),
    subCounty: subCounty.trim(),
    ward: ward.trim(),
    whatsAppNumber: whatsAppNumber.trim(),
    deliveryNotes: deliveryNotes.trim(),
  };

  function persistShippingIfRequested() {
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
  }

  function applyShippingLock() {
    setError(null);
    persistShippingIfRequested();
    setIsEditingShipping(false);
    setShippingLocked(true);
    pendingShippingLock.current = false;
  }

  function lockShippingAndContinue() {
    if (!shippingComplete) {
      setError("Please complete all required delivery fields.");
      return;
    }
    if (
      !signedIn &&
      contactFieldsComplete &&
      !isCheckoutSignupDismissed()
    ) {
      pendingShippingLock.current = true;
      setSignupModalOpen(true);
      return;
    }
    applyShippingLock();
  }

  function openCheckoutSignupModal() {
    pendingShippingLock.current = false;
    setSignupModalOpen(true);
  }

  function startEditingShipping() {
    setIsEditingShipping(true);
    setShippingLocked(false);
    setError(null);
  }

  const showShippingForm = !shippingLocked || isEditingShipping;
  const showReviewOnMobile = shippingLocked && !isEditingShipping;
  /** Payment in the dock only on confirm (step 3), not while reviewing cart/terms */
  const showFloatingPayment =
    shippingLocked &&
    !isEditingShipping &&
    termsAccepted &&
    (paymentOptions.manual.length > 0 || paymentOptions.online.length > 0);

  const scrollToCheckoutTerms = () => {
    document
      .getElementById("checkout-terms")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const floatingCheckout = showShippingForm
    ? {
        eyebrow: shippingComplete ? "Ready for the next step" : "Delivery details",
        headline: shippingComplete
          ? "Tap below to review your order"
          : "Fill in your delivery info to continue",
        hint: shippingComplete
          ? "We'll show your cart and payment options next."
          : "Name, phone, and delivery location are required.",
        actionLabel: isEditingShipping ? "Save & review" : "Continue to review",
        actionDisabled: !shippingComplete,
        onAction: lockShippingAndContinue,
        actionType: "button" as const,
        pulse: shippingComplete,
      }
    : busy
      ? {
          eyebrow: "Please wait",
          headline: "Completing your purchase…",
          hint: "Keep this page open while we place your order.",
          actionLabel: "Placing order…",
          actionDisabled: true,
          actionType: "submit" as const,
          pulse: false,
        }
      : !termsAccepted
        ? {
            eyebrow: "One more step",
            headline: "Accept the store terms to finish",
            hint: "Tap the button below to jump to the terms checkbox.",
            actionLabel: "Go to terms",
            actionDisabled: false,
            onAction: scrollToCheckoutTerms,
            actionType: "button" as const,
            pulse: false,
          }
        : {
            eyebrow: "",
            headline: "",
            hint: "",
            actionLabel: "Complete purchase",
            actionDisabled: false,
            actionType: "submit" as const,
            pulse: true,
          };

  return (
    <div className={cn(CONFIRMATION_VIEWPORT, "min-w-0 max-w-full")}>
      <form
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={(ev) => void onSubmit(ev)}
      >
        <div className={CONFIRMATION_SCROLL}>
      <header className="mb-2 shrink-0 space-y-2 max-lg:mb-1.5 max-lg:space-y-1.5">
        <CheckoutProgressSteps activeStep={activeCheckoutStep} compact />
        <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-border bg-card/95 p-3 shadow-sm ring-1 ring-black/[0.02] lg:block">
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <ShoppingBag
                className="size-4 shrink-0 text-foreground/65"
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Items
                </dt>
                <dd className="truncate text-sm font-semibold text-foreground">
                  {cart.lines.length}{" "}
                  {cart.lines.length === 1 ? "product" : "products"} /{" "}
                  {totalQty} {totalQty === 1 ? "unit" : "units"}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <PackageCheck
                className="size-4 shrink-0 text-foreground/65"
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Cart total
                </dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-foreground">
                  {subtotalLabel}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <MapPin
                className="size-4 shrink-0 text-foreground/65"
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Pickup
                </dt>
                <dd className="truncate text-sm font-semibold text-foreground">
                  {cart.catalogBranchName}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <Truck
                className="size-4 shrink-0 text-foreground/65"
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Delivery area
                </dt>
                <dd className="truncate text-sm font-semibold text-foreground">
                  {deliveryZoneSummary}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </header>

        <div className="grid w-full min-w-0 max-w-full gap-3 pb-2 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-4">
        <section
          className={cn(
            "space-y-4",
            showReviewOnMobile && "max-lg:hidden",
          )}
        >
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary lg:hidden">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {activeCheckoutStep}
            </span>
            {activeCheckoutStep === 1
              ? "Delivery details"
              : activeCheckoutStep === 2
                ? "Review order"
                : "Confirm & pay"}
          </div>

          {shippingLocked && !isEditingShipping ? (
            <ShopShippingSummaryCard
              contact={shippingSummary}
              onEdit={startEditingShipping}
              className="hidden lg:block"
            />
          ) : null}

          {showShippingForm ? (
            <>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
            <SectionHeader
              icon={<User className="size-4" aria-hidden />}
              title="Contact information"
              subtitle="Enter the details the store can use to confirm and update your order."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <InputField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(ev) => setCustomerEmail(ev.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <InputField
                label="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
                placeholder="John"
              />
              <InputField
                label="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
                placeholder="Doe"
              />
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                <InputField
                  label="Code"
                  value={areaCode}
                  onChange={(ev) => setAreaCode(ev.target.value)}
                  placeholder="+254"
                />
                <InputField
                  label="Phone number"
                  autoComplete="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(ev) => setCustomerPhone(ev.target.value)}
                  placeholder="712 345 678"
                />
              </div>
              <InputField
                label="WhatsApp"
                required={false}
                inputMode="tel"
                value={whatsAppNumber}
                onChange={(ev) => setWhatsAppNumber(ev.target.value)}
                placeholder="Same as phone"
                hint="Optional. Use this if WhatsApp is different from your phone number."
              />
            </div>
          </div>

          {contactFieldsComplete && !signedIn ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Track this order next time
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Create a free account with {customerEmail.trim()} — we&apos;ll
                  use the name and phone you entered. Only choose a password.
                </p>
              </div>
              <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-xl px-4 text-xs font-semibold"
                  onClick={openCheckoutSignupModal}
                >
                  Create account
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-xs text-muted-foreground"
                  onClick={() => {
                    dismissCheckoutSignupPrompt();
                  }}
                >
                  Not now
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader
                icon={<MapPin className="size-4" aria-hidden />}
                title="Delivery location"
                subtitle="Select your area and add a precise address so the rider can find you quickly."
              />
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950">
                <Truck className="size-3.5" aria-hidden />
                Supported area only
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SelectField
                label="County"
                value={county}
                onChange={(ev) => setCounty(ev.target.value)}
              >
                <option value="">Select county</option>
                <option value="Nairobi">Nairobi</option>
              </SelectField>
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
              <InputField
                label="Street Address"
                value={streetAddress}
                onChange={(ev) => setStreetAddress(ev.target.value)}
                placeholder="Apartment, building, street name"
                hint="Include the building name, apartment number, or nearby landmark."
              />
              <div className="sm:col-span-2">
                <InputField
                  label="Delivery notes"
                  required={false}
                  value={deliveryNotes}
                  onChange={(ev) => setDeliveryNotes(ev.target.value)}
                  placeholder="Landmark, gate code, preferred contact time"
                />
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border text-primary focus:ring-primary/10"
                checked={isDefaultAddress}
                onChange={(ev) => setIsDefaultAddress(ev.target.checked)}
              />
              <span className="font-medium">
                Save these delivery details for next time
              </span>
            </label>
          </div>

          <Button
            type="button"
            size="lg"
            className="hidden h-11 w-full rounded-xl text-sm font-semibold"
            onClick={lockShippingAndContinue}
            disabled={!shippingComplete}
          >
            {isEditingShipping ? "Use these details" : "Continue to review"}
          </Button>
            </>
          ) : null}
        </section>

        <section
          className={cn(
            "min-w-0 max-w-full rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5 lg:sticky lg:top-6 lg:overflow-hidden",
            !showReviewOnMobile && "max-lg:hidden",
          )}
        >
          {showReviewOnMobile ? (
            <ShopShippingSummaryCard
              contact={shippingSummary}
              onEdit={startEditingShipping}
              compact
              className="mb-4 lg:hidden"
            />
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary lg:hidden">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                  2
                </span>
                Review
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Review your order
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {cart.lines.length} {cart.lines.length === 1 ? "item" : "items"}{" "}
                in your cart
              </p>
            </div>
            <Link
              href={APP_ROUTES.shopCart}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Edit cart
            </Link>
          </div>

          <div className="mt-3 space-y-2 max-lg:overflow-visible lg:max-h-[360px] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            {cart.lines.map((line) => (
              <div
                key={line.itemId}
                className="flex w-full min-w-0 gap-3 rounded-xl border border-border bg-background p-3 lg:p-2.5"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/40 lg:size-12">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt={line.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {line.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Qty {line.quantity}</span>
                    {line.variantName ? (
                      <span className="rounded-full bg-muted px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                        {line.variantName}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatDisplayPrice(cart.currency, line.lineTotal ?? 0)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/15 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Promo code
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                disabled
                placeholder="Coming soon"
                className="h-9 flex-1 rounded-lg border border-border bg-background/50 px-3 text-sm opacity-60"
              />
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" disabled>
                Apply
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums text-foreground">
                {subtotalLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="tabular-nums">
                {shippingLabel === formatDisplayPrice(cart.currency, 0) ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Free
                  </span>
                ) : (
                  shippingLabel
                )}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Total due</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                {totalLabel}
              </span>
            </div>
          </div>

          <div
            id="checkout-terms"
            className="mt-5 scroll-mt-[calc(var(--shop-checkout-dock-height,12rem)+1.5rem)] space-y-3 rounded-2xl border border-border bg-background p-3 max-lg:pb-2"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary lg:hidden">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                3
              </span>
              Confirm order
            </div>
            <div className="hidden items-center gap-2 border-b border-border pb-3 sm:flex">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Confirm order
                </h4>
                <p className="text-xs text-muted-foreground">
                  Accept the store terms before placing your request.
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/10"
                checked={termsAccepted}
                onChange={(ev) => handleTermsAgreementChange(ev.target.checked)}
              />
              <span>
                I agree to the store{" "}
                <span className="font-medium text-foreground underline underline-offset-2">
                  terms of use
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground underline underline-offset-2">
                  privacy policy
                </span>
                .
              </span>
            </label>

            <Button
              type="submit"
              size="lg"
              disabled={busy || !termsAccepted || !shippingLocked}
              className="hidden h-11 w-full rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Placing order...
                </span>
              ) : (
                "Place order"
              )}
            </Button>
          </div>

          <div className="mt-3 hidden gap-2 border-t border-border/40 pt-3 text-[11px] font-medium text-muted-foreground sm:grid sm:grid-cols-3">
            <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2">
              <Lock className="size-3.5" aria-hidden />
              Secure
            </span>
            <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2">
              <Zap className="size-3.5" aria-hidden />
              Fast
            </span>
            <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2">
              <ShieldCheck className="size-3.5" aria-hidden />
              Protected
            </span>
          </div>
        </section>
        </div>
        <CheckoutScrollEndSpacer />
        </div>

        <ConfirmationFloatingDock ariaLabel="Checkout actions">
          <div className="space-y-1.5">
            {showFloatingPayment ? (
              <ShopCheckoutPaymentSection
                variant="floating"
                manual={paymentOptions.manual}
                online={paymentOptions.online}
                defaultAreaCode={areaCode}
                defaultPhone={customerPhone}
                stkBusy={stkBusy}
                stkMessage={stkMessage}
                stkSent={stkSent}
                onStkPay={
                  paymentOptions.online.length > 0 ? handleStkPay : undefined
                }
                orderPlaced={Boolean(done)}
              />
            ) : null}

            <CheckoutFloatingCta
              pulse={floatingCheckout.pulse}
              minimal={!showShippingForm}
            >
              {!showShippingForm ? (
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Total due
                    </p>
                    <p className="text-lg font-bold tabular-nums leading-tight text-foreground">
                      {totalLabel}
                    </p>
                  </div>
                  {floatingCheckout.actionType === "button" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled={floatingCheckout.actionDisabled}
                      className="h-10 shrink-0 gap-1 rounded-xl px-4 text-sm font-semibold"
                      onClick={floatingCheckout.onAction}
                    >
                      {floatingCheckout.actionLabel}
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={
                        floatingCheckout.actionDisabled ||
                        busy ||
                        !termsAccepted ||
                        !shippingLocked
                      }
                      className="h-10 shrink-0 gap-1 rounded-xl px-4 text-sm font-semibold"
                    >
                      {busy ? (
                        <>
                          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Placing…
                        </>
                      ) : (
                        <>
                          {floatingCheckout.actionLabel}
                          <ArrowRight className="size-4" aria-hidden />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {floatingCheckout.eyebrow ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/90">
                      {floatingCheckout.eyebrow}
                    </p>
                  ) : null}
                  {floatingCheckout.headline ? (
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
                      {floatingCheckout.headline}
                    </p>
                  ) : null}
                  {floatingCheckout.hint ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {floatingCheckout.hint}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-end gap-3 border-t border-border/50 pt-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Cart total
                      </p>
                      <p className="font-serif text-xl font-semibold tabular-nums tracking-tight text-foreground">
                        {totalLabel}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      disabled={floatingCheckout.actionDisabled}
                      className="h-11 shrink-0 gap-1.5 rounded-xl px-5 text-sm font-semibold shadow-md"
                      onClick={floatingCheckout.onAction}
                    >
                      {floatingCheckout.actionLabel}
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </>
              )}
            </CheckoutFloatingCta>
          </div>
        </ConfirmationFloatingDock>
      </form>

      <ShopCheckoutSignupModal
        open={signupModalOpen}
        onOpenChange={setSignupModalOpen}
        email={customerEmail}
        firstName={firstName}
        lastName={lastName}
        phoneDisplay={`${areaCode} ${customerPhone}`.trim()}
        onSignedIn={() => {
          setSignedIn(true);
          if (pendingShippingLock.current) {
            applyShippingLock();
          }
        }}
        onContinueAsGuest={() => {
          if (pendingShippingLock.current) {
            applyShippingLock();
          }
        }}
      />
    </div>
  );
}

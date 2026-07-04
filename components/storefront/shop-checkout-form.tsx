"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock3,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Zap,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CheckoutDetailsSubSteps } from "@/components/storefront/checkout-details-substeps";
import { CheckoutProgressSteps } from "@/components/storefront/checkout-progress-steps";
import { CheckoutStepHint } from "@/components/storefront/checkout-step-hint";
import {
  CHECKOUT_ACCOUNT_NUDGE,
  CHECKOUT_CARD,
  CHECKOUT_CARD_INSET,
  CHECKOUT_CARD_PAD,
  CHECKOUT_DOCK_AMOUNT,
  CHECKOUT_FORM_GROUP,
  CHECKOUT_FORM_GROUP_LABEL,
  CHECKOUT_INPUT,
  CHECKOUT_INPUT_COMPLETE,
  CHECKOUT_INPUT_PLAIN,
  CHECKOUT_VARIANT_PILL,
  CHECKOUT_LABEL,
  CHECKOUT_LABEL_PLAIN,
  CHECKOUT_PRIMARY_BTN,
  CHECKOUT_SECTION_GAP,
  CHECKOUT_SELECT,
  CHECKOUT_SERIF_AMOUNT,
  CHECKOUT_STICKY_HEAD,
  formatDeliveryZone,
} from "@/components/storefront/shop-checkout-design";
import { CheckoutScrollEndSpacer } from "@/components/storefront/shop-checkout-dock-height";
import {
  CONFIRMATION_SCROLL,
  CONFIRMATION_SCROLL_ANCHORED,
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
import { ShopCheckoutLoginModal } from "@/components/storefront/shop-checkout-login-modal";
import { ShopCheckoutDeliveryEditModal } from "@/components/storefront/shop-checkout-delivery-edit-modal";
import { ShopCheckoutPaymentSection } from "@/components/storefront/shop-checkout-payment-section";
import { ShopShippingSummaryCard } from "@/components/storefront/shop-shipping-summary-card";
import { Button } from "@/components/ui/button";
import {
  fetchShopperAccountOverview,
  fetchShopperPickupOrderDetail,
  lookupAuthEmail,
} from "@/lib/api";
import { useClientHasSession } from "@/hooks/use-client-session";
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
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchCheckoutState,
  fetchWebCart,
  notifyWebCartChanged,
  patchCheckoutContact,
  patchCheckoutDelivery,
  readWebCartHandle,
  writeGuestCheckoutKey,
  cartIsCheckoutReady,
  cartLinesMissingPrice,
  submitWebCheckout,
  type PublicCheckoutResult,
  type PublicCheckoutState,
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

function shopperIsSignedIn(serverAuthenticated = false): boolean {
  if (typeof window === "undefined") {
    return serverAuthenticated;
  }
  return (
    getSessionTokens() != null ||
    Boolean(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me)) ||
    serverAuthenticated
  );
}

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
          "rounded-xl border border-border/45 bg-card/95 p-2 shadow-sm ring-1 ring-black/[0.03]",
          pulse &&
            "ring-2 ring-primary/25 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]",
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/45 bg-card/95 p-3.5 shadow-sm ring-1 ring-black/[0.03] sm:p-4",
        pulse &&
          "ring-2 ring-primary/25 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]",
      )}
    >
      {children}
    </div>
  );
}

function FormFieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CHECKOUT_FORM_GROUP}>
      <div>
        <p className={CHECKOUT_FORM_GROUP_LABEL}>{title}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function FieldCompleteMark({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/12 text-primary">
      <Check className="size-2.5 stroke-[3]" aria-hidden />
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.09] text-primary ring-1 ring-primary/10">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {badge ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
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
  variant = "default",
  complete,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  variant?: "default" | "plain";
  complete?: boolean;
}) {
  const isPlain = variant === "plain";
  const filled =
    complete ??
    Boolean(
      props.value != null &&
        String(props.value).trim().length > 0 &&
        props.value !== props.placeholder,
    );
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="flex items-center justify-between gap-2">
        <span className={isPlain ? CHECKOUT_LABEL_PLAIN : CHECKOUT_LABEL}>
          {label}
          {required !== false && (
            <span className="ml-0.5 text-destructive/80">*</span>
          )}
        </span>
        <FieldCompleteMark show={filled} />
      </span>
      <input
        {...props}
        required={required !== false}
        className={cn(
          isPlain ? CHECKOUT_INPUT_PLAIN : CHECKOUT_INPUT,
          filled && !isPlain && CHECKOUT_INPUT_COMPLETE,
        )}
      />
      {hint ? (
        <span className="text-[11px] leading-relaxed text-muted-foreground">
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
  variant = "default",
  complete,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  children: React.ReactNode;
  variant?: "default" | "plain";
  complete?: boolean;
}) {
  const isPlain = variant === "plain";
  const filled =
    complete ??
    Boolean(props.value != null && String(props.value).trim().length > 0);
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="flex items-center justify-between gap-2">
        <span className={isPlain ? CHECKOUT_LABEL_PLAIN : CHECKOUT_LABEL}>
          {label}
          {required !== false && (
            <span className="ml-0.5 text-destructive/80">*</span>
          )}
        </span>
        <FieldCompleteMark show={filled} />
      </span>
      <select
        {...props}
        required={required !== false}
        className={cn(
          isPlain ? CHECKOUT_INPUT_PLAIN : CHECKOUT_SELECT,
          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          filled && !isPlain && CHECKOUT_INPUT_COMPLETE,
        )}
      >
        {children}
      </select>
      {hint ? (
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function PlainFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function ShopCheckoutForm({
  slug,
  embedded = false,
}: {
  slug: string;
  /** Desktop half-panel: outer chrome handles back/close */
  embedded?: boolean;
}) {
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
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [shippingLocked, setShippingLocked] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [deliveryEditOpen, setDeliveryEditOpen] = useState(false);
  const [addressPrefilled, setAddressPrefilled] = useState(false);
  const [detailsSubStep, setDetailsSubStep] = useState<"contact" | "delivery">(
    "contact",
  );

  const prefilled = useRef(false);
  const serverCheckoutState = useRef(false);
  const serverAuthenticatedRef = useRef(false);
  const termsManuallyChanged = useRef(false);
  const paymentToastShown = useRef(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [serverAuthenticated, setServerAuthenticated] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const pendingShippingLock = useRef(false);
  const wasShippingLockedBeforeEdit = useRef(false);
  const hasClientSession = useClientHasSession();
  const signedIn = hasClientSession || serverAuthenticated;

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

  const applyServerCheckoutState = useCallback((state: PublicCheckoutState) => {
    const profile = state.profile;
    if (profile.firstName) setFirstName(profile.firstName);
    if (profile.lastName) setLastName(profile.lastName);
    if (profile.email) setCustomerEmail(profile.email);
    if (profile.areaCode) setAreaCode(profile.areaCode);
    if (profile.phone) setCustomerPhone(profile.phone);
    if (profile.whatsApp) setWhatsAppNumber(profile.whatsApp);
    if (profile.county) setCounty(profile.county);
    if (profile.subCounty) setSubCounty(profile.subCounty);
    if (profile.ward) setWard(profile.ward);
    if (profile.streetAddress) setStreetAddress(profile.streetAddress);
    if (profile.deliveryNotes) setDeliveryNotes(profile.deliveryNotes);

    if (state.guestKey) {
      writeGuestCheckoutKey(slug.trim(), state.guestKey);
    }

    if (state.authenticated) {
      serverAuthenticatedRef.current = true;
      setServerAuthenticated(true);
    }

    if (state.detailsSubStep === "delivery") {
      setDetailsSubStep("delivery");
    } else if (state.detailsSubStep === "contact") {
      setDetailsSubStep("contact");
    }

    if (state.completed.contact && state.completed.delivery) {
      setAddressPrefilled(true);
      setShippingLocked(true);
    } else if (state.completed.contact) {
      setAddressPrefilled(false);
      setShippingLocked(false);
      setDetailsSubStep("delivery");
    }
  }, [slug]);

  /** Try to prefill form fields from checkout-state API, localStorage, or shopper history. */
  const tryPrefill = useCallback(async () => {
    if (prefilled.current) return;
    prefilled.current = true;

    const s = slug.trim();
    const handle = readWebCartHandle();
    if (handle && handle.slug === s && handle.cartId) {
      try {
        const state = await fetchCheckoutState(s, handle.cartId);
        if (state) {
          serverCheckoutState.current = true;
          applyServerCheckoutState(state);
          if (state.authenticated || (state.completed.contact && state.completed.delivery)) {
            return;
          }
          if (state.completed.contact || state.profile.email) {
            return;
          }
        }
      } catch {
        /* fall through to legacy prefill */
      }
    }

    // Legacy guest prefill from localStorage
    const saved = loadCheckoutPrefill();
    if (saved) {
      if (saved.firstName) setFirstName(saved.firstName);
      if (saved.lastName) setLastName(saved.lastName);
      if (saved.customerPhone) {
        const phone = saved.customerPhone.trim();
        const codeMatch = phone.match(/^(\+\d{1,4})\s*(.+)/);
        if (codeMatch) {
          if (!saved.areaCode || saved.areaCode === "+254")
            setAreaCode(codeMatch[1]);
          setCustomerPhone(codeMatch[2]);
        } else {
          setCustomerPhone(phone);
        }
      } else if (saved.areaCode && saved.areaCode !== "+254") {
        setAreaCode(saved.areaCode);
      }
      if (saved.streetAddress) setStreetAddress(saved.streetAddress);
      if (saved.county) setCounty(saved.county);
      if (saved.subCounty) setSubCounty(saved.subCounty);
      if (saved.ward) setWard(saved.ward);
      if (saved.whatsAppNumber) setWhatsAppNumber(saved.whatsAppNumber);
      if (saved.customerEmail) setCustomerEmail(saved.customerEmail);
      if (saved.deliveryNotes) setDeliveryNotes(saved.deliveryNotes);
      if (saved.isDefaultAddress) setIsDefaultAddress(true);
      if (isPrefillComplete(saved)) {
        setAddressPrefilled(true);
      }
    }

    let loadedAddressFromHistory = false;

    // Signed-in shoppers without server profile: enrich from account history
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
            if (
              parsedNotes.streetAddress ||
              parsedNotes.subCounty ||
              parsedNotes.ward
            ) {
              loadedAddressFromHistory = true;
            }
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

    if (loadedAddressFromHistory) {
      setAddressPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyServerCheckoutState, slug]);

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

  const deliveryFieldsComplete = Boolean(
    subCounty && ward && streetAddress.trim(),
  );

  const requiredCheckoutFieldsComplete = Boolean(
    contactFieldsComplete && deliveryFieldsComplete,
  );

  // Returning shoppers with saved details start on step 2 (review).
  useEffect(() => {
    if (serverCheckoutState.current) return;
    if (loading || !cart || !prefilled.current || isEditingShipping) return;
    if (shippingLocked || !requiredCheckoutFieldsComplete) return;
    const saved = loadCheckoutPrefill();
    const canUseSaved =
      (saved != null && isPrefillComplete(saved)) ||
      (isDefaultAddress && requiredCheckoutFieldsComplete) ||
      (addressPrefilled && requiredCheckoutFieldsComplete);
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
    addressPrefilled,
  ]);

  const termsAccepted = agreedToTerms;

  useEffect(() => {
    if (!requiredCheckoutFieldsComplete) {
      termsManuallyChanged.current = false;
      setAgreedToTerms(false);
      return;
    }
  }, [requiredCheckoutFieldsComplete]);

  useEffect(() => {
    if (shippingLocked && !termsManuallyChanged.current) {
      setAgreedToTerms(true);
    }
  }, [shippingLocked]);

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
      <div className={CONFIRMATION_VIEWPORT}>
        <div className={CHECKOUT_STICKY_HEAD}>
          <div className="py-1.5">
            <CheckoutProgressSteps activeStep={1} focused compact dense />
          </div>
        </div>
        <div className="h-0 min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2.5 p-0.5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className={cn(CHECKOUT_CARD, CHECKOUT_CARD_PAD, "space-y-3")}>
              <div className="h-6 w-40 animate-pulse rounded-lg bg-muted/80" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-muted/70" />
                  <div className="h-11 animate-pulse rounded-xl bg-muted/60" />
                </div>
              ))}
            </div>
            <div className={cn(CHECKOUT_CARD, CHECKOUT_CARD_PAD, "space-y-2.5")}>
              <div className="h-6 w-28 animate-pulse rounded-lg bg-muted/80" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2">
                  <div className="size-12 animate-pulse rounded-lg bg-muted/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-full animate-pulse rounded bg-muted/70" />
                    <div className="h-2.5 w-14 animate-pulse rounded bg-muted/50" />
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
          <header className="space-y-1.5 pb-1.5">
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

          <div className="space-y-2 pb-1.5 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-2.5">
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
                  ward={receipt.shipping.ward}
                  subCounty={receipt.shipping.subCounty}
                  county={receipt.shipping.county}
                  deliveryNotes={receipt.shipping.deliveryNotes}
                />
              ) : null}
              <OrderPaymentSummaryCard
                subtotalLabel={receiptSubtotalLabel}
                totalLabel={total}
                paymentConfirmed={paymentConfirmed}
                paymentFailed={paymentFailed}
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
                  ward={receipt.shipping.ward}
                  subCounty={receipt.shipping.subCounty}
                  county={receipt.shipping.county}
                  deliveryNotes={receipt.shipping.deliveryNotes}
                />
                <OrderPaymentSummaryCard
                  subtotalLabel={receiptSubtotalLabel}
                  totalLabel={total}
                  paymentConfirmed={paymentConfirmed}
                  paymentFailed={paymentFailed}
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
          <header className="space-y-1.5 pb-1.5">
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
              <span className={CHECKOUT_SERIF_AMOUNT}>{placedTotal}</span>
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
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-all hover:bg-[var(--primary-hover)]"
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
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-white transition-all hover:bg-[var(--primary-hover)]"
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
    : !reviewAcknowledged
      ? 2
      : 3;

  const showDetailsStep = activeCheckoutStep === 1;
  const showReviewStep = activeCheckoutStep === 2;
  const showConfirmStep = activeCheckoutStep === 3;

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

  async function openCheckoutAccountModal(pendingLock: boolean) {
    pendingShippingLock.current = pendingLock;
    const email = customerEmail.trim();
    if (!email) {
      setSignupModalOpen(true);
      return;
    }
    setStepBusy(true);
    setError(null);
    try {
      const { registered } = await lookupAuthEmail(email);
      if (registered) {
        setSignupModalOpen(false);
        setLoginModalOpen(true);
      } else {
        setLoginModalOpen(false);
        setSignupModalOpen(true);
      }
    } catch {
      setLoginModalOpen(false);
      setSignupModalOpen(true);
    } finally {
      setStepBusy(false);
    }
  }

  async function lockShippingAndContinue() {
    if (!shippingComplete) {
      setError("Please complete all required delivery fields.");
      return;
    }
    if (
      !shopperIsSignedIn(serverAuthenticatedRef.current) &&
      contactFieldsComplete &&
      !isCheckoutSignupDismissed()
    ) {
      await openCheckoutAccountModal(true);
      return;
    }
    applyShippingLock();
  }

  function openCheckoutSignupModal() {
    void openCheckoutAccountModal(false);
  }

  function returnToDetailsStep() {
    setError(null);
    setIsEditingShipping(false);
    setDeliveryEditOpen(false);
    setAgreedToTerms(false);
    termsManuallyChanged.current = false;
    setReviewAcknowledged(false);
    setShippingLocked(false);
    setDetailsSubStep("delivery");
  }

  function proceedToConfirmStep() {
    if (!termsAccepted) {
      scrollToCheckoutTerms();
      return;
    }
    setError(null);
    setReviewAcknowledged(true);
  }

  function returnToContactSubStep() {
    setError(null);
    setDetailsSubStep("contact");
  }

  async function advanceDetailsStep() {
    const s = slug.trim();
    const handle = readWebCartHandle();
    if (showSavedDeliverySummary || detailsSubStep === "delivery") {
      if (!shippingComplete) {
        setError("Please complete all required delivery fields.");
        return;
      }
      if (handle && handle.slug === s) {
        setStepBusy(true);
        setError(null);
        try {
          const state = await patchCheckoutDelivery(s, handle.cartId, {
            county,
            subCounty,
            ward,
            streetAddress,
            deliveryNotes,
            saveForNextTime: isDefaultAddress,
          });
          applyServerCheckoutState(state);
          void lockShippingAndContinue();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save delivery details.");
        } finally {
          setStepBusy(false);
        }
        return;
      }
      void lockShippingAndContinue();
      return;
    }
    if (!contactFieldsComplete) {
      setError("Please complete all contact fields.");
      return;
    }
    const phone = customerPhone.trim();
    const codeMatch = phone.match(/^(\+\d{1,4})\s*(.+)/);
    let phoneValue = customerPhone;
    let codeValue = areaCode;
    if (codeMatch) {
      codeValue = codeMatch[1];
      phoneValue = codeMatch[2];
      setAreaCode(codeValue);
      setCustomerPhone(phoneValue);
    }
    if (handle && handle.slug === s) {
      setStepBusy(true);
      setError(null);
      try {
        const state = await patchCheckoutContact(s, handle.cartId, {
          firstName,
          lastName,
          email: customerEmail,
          areaCode: codeValue,
          phone: phoneValue,
          whatsApp: whatsAppNumber,
        });
        applyServerCheckoutState(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save contact details.");
      } finally {
        setStepBusy(false);
      }
      return;
    }
    setError(null);
    setDetailsSubStep("delivery");
  }

  function returnToReviewStep() {
    setError(null);
    setReviewAcknowledged(false);
  }

  function startEditingShipping() {
    wasShippingLockedBeforeEdit.current = shippingLocked;
    setIsEditingShipping(true);
    setShippingLocked(false);
    setDeliveryEditOpen(true);
    setError(null);

    const phone = customerPhone.trim();
    const codeMatch = phone.match(/^(\+\d{1,4})\s*(.+)/);
    if (codeMatch) {
      setAreaCode(codeMatch[1]);
      setCustomerPhone(codeMatch[2]);
    }
  }

  function closeDeliveryEditModal() {
    setDeliveryEditOpen(false);
    setIsEditingShipping(false);
    if (wasShippingLockedBeforeEdit.current) {
      setShippingLocked(true);
    }
  }

  function saveDeliveryEdit() {
    if (!requiredCheckoutFieldsComplete) {
      setError("Please complete all required delivery fields.");
      return;
    }
    setError(null);
    persistShippingIfRequested();
    setAddressPrefilled(true);
    wasShippingLockedBeforeEdit.current = false;
    closeDeliveryEditModal();
    if (!shippingLocked) {
      applyShippingLock();
    }
  }

  const showShippingForm = showDetailsStep;
  const showSavedDeliverySummary =
    addressPrefilled &&
    requiredCheckoutFieldsComplete &&
    !deliveryEditOpen &&
    !isEditingShipping;
  const showContactSubStep =
    showDetailsStep && !showSavedDeliverySummary && detailsSubStep === "contact";
  const showDeliverySubStep =
    showDetailsStep && !showSavedDeliverySummary && detailsSubStep === "delivery";
  /** Totals in the review card — step 2 only */
  const showTotalInSummary = showReviewStep;
  /** Payment in the dock only on confirm (step 3), not while reviewing cart/terms */
  const showFloatingPayment =
    showConfirmStep &&
    !isEditingShipping &&
    termsAccepted &&
    (paymentOptions.manual.length > 0 || paymentOptions.online.length > 0);

  const scrollToCheckoutTerms = () => {
    document
      .getElementById("checkout-terms")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const floatingCheckout = showShippingForm
    ? showSavedDeliverySummary
      ? {
          eyebrow: "Ready for the next step",
          headline: "Tap below to review your order",
          hint: "We'll show your cart and payment options next.",
          actionLabel: "Continue to review",
          actionDisabled: false,
          onAction: () => void lockShippingAndContinue(),
          actionType: "button" as const,
          pulse: true,
        }
      : detailsSubStep === "contact"
        ? {
            eyebrow: "Contact details",
            headline: contactFieldsComplete
              ? "Tap below to add your delivery address"
              : "Enter how we can reach you",
            hint: "Email, name, and phone are required.",
            actionLabel: "Continue",
            actionDisabled: !contactFieldsComplete || stepBusy,
            onAction: () => void advanceDetailsStep(),
            actionType: "button" as const,
            pulse: contactFieldsComplete,
          }
        : {
            eyebrow: "Delivery location",
            headline: shippingComplete
              ? "Tap below to review your order"
              : "Where should we deliver?",
            hint: "Subcounty, ward, and street address are required.",
            actionLabel: "Continue to review",
            actionDisabled: !shippingComplete || stepBusy,
            onAction: () => void advanceDetailsStep(),
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
      : showReviewStep && !termsAccepted
        ? {
            eyebrow: "Review your order",
            headline: "Accept the store terms to continue",
            hint: "Check your items above, then tick the terms checkbox.",
            actionLabel: "Go to terms",
            actionDisabled: false,
            onAction: scrollToCheckoutTerms,
            actionType: "button" as const,
            pulse: false,
          }
        : showReviewStep
          ? {
              eyebrow: "Review your order",
              headline: "Ready when you are",
              hint: "Check your items above, then continue to payment.",
              actionLabel: "Continue to payment",
              actionDisabled: false,
              onAction: proceedToConfirmStep,
              actionType: "button" as const,
              pulse: true,
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
        <div className={CONFIRMATION_SCROLL_ANCHORED}>
      <header
        className={cn(
          CHECKOUT_STICKY_HEAD,
          embedded && "border-t-0 bg-transparent backdrop-blur-none",
        )}
      >
        <div className={cn("flex items-center gap-1", embedded ? "py-0.5" : "py-1.5")}>
          {!embedded ? (
            activeCheckoutStep > 1 ? (
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label={
                  activeCheckoutStep === 2
                    ? "Back to delivery details"
                    : "Back to review"
                }
                onClick={
                  activeCheckoutStep === 2
                    ? returnToDetailsStep
                    : returnToReviewStep
                }
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            ) : showDeliverySubStep ? (
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Back to contact details"
                onClick={returnToContactSubStep}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            ) : (
              <Link
                href={APP_ROUTES.shopCart}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Back to cart"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Link>
            )
          ) : activeCheckoutStep > 1 ? (
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label={
                activeCheckoutStep === 2
                  ? "Back to delivery details"
                  : "Back to review"
              }
              onClick={
                activeCheckoutStep === 2
                  ? returnToDetailsStep
                  : returnToReviewStep
              }
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          ) : showDeliverySubStep ? (
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Back to contact details"
              onClick={returnToContactSubStep}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          ) : null}
          <div className="min-w-0 flex-1 pr-1">
            <CheckoutProgressSteps
              activeStep={activeCheckoutStep}
              focused
              compact
              dense
            />
            {showDetailsStep && !showSavedDeliverySummary ? (
              <CheckoutDetailsSubSteps
                active={detailsSubStep}
                contactComplete={contactFieldsComplete}
                deliveryComplete={deliveryFieldsComplete}
                onSelect={(step) => {
                  if (step === "contact") returnToContactSubStep();
                }}
                className="mt-2"
              />
            ) : null}
            <CheckoutStepHint
              activeStep={activeCheckoutStep}
              detailsSubStep={detailsSubStep}
              hasSavedDetails={showSavedDeliverySummary}
              className="mt-2 max-sm:pr-7"
            />
          </div>
        </div>
        <dl
          className={cn(
            "hidden flex-wrap gap-1.5 border-t border-border/30 px-1 py-1.5",
            embedded ? "md:flex" : "lg:flex",
          )}
        >
          <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/35 px-2 py-1 text-[11px] text-foreground">
            <ShoppingBag className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="font-semibold tabular-nums">
              {cart.lines.length} · {totalQty} qty
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/35 px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground">
            <PackageCheck className="size-3.5 shrink-0 opacity-60" aria-hidden />
            {subtotalLabel}
          </div>
          <div className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-md bg-muted/35 px-2 py-1 text-[11px] font-medium text-foreground">
            <MapPin className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">{cart.catalogBranchName}</span>
          </div>
          <div className="inline-flex max-w-[10rem] items-center gap-1.5 truncate rounded-md bg-muted/35 px-2 py-1 text-[11px] font-medium text-foreground">
            <Truck className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">{deliveryZoneSummary}</span>
          </div>
        </dl>
      </header>

        <div
          className={cn(
            "grid w-full min-w-0 max-w-full grid-cols-1 gap-2.5 pb-1.5",
          )}
        >
        {showDetailsStep ? (
        <section className={CHECKOUT_SECTION_GAP}>
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          ) : null}

          {showSavedDeliverySummary ? (
            <ShopShippingSummaryCard
              contact={shippingSummary}
              onEdit={startEditingShipping}
              prominentEdit
            />
          ) : null}

          {showContactSubStep ? (
            <>
          <div className={cn(CHECKOUT_CARD, CHECKOUT_CARD_PAD, "space-y-4")}>
            <SectionHeader
              icon={<User className="size-4" aria-hidden />}
              title="Contact information"
              subtitle="We'll use this to confirm your order and share delivery updates."
              badge="1 of 2"
            />

            <FormFieldGroup
              title="Who is this for?"
              description="The name shown on your order and receipt."
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </FormFieldGroup>

            <FormFieldGroup
              title="How we reach you"
              description="Email and phone are required for checkout."
            >
              <div className="space-y-3">
                <InputField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(ev) => setCustomerEmail(ev.target.value)}
                  placeholder="you@example.com"
                />
                <div className="flex gap-2.5">
                  <div className="w-[4.75rem] shrink-0 sm:w-[5.5rem]">
                    <InputField
                      label="Code"
                      value={areaCode}
                      onChange={(ev) => setAreaCode(ev.target.value)}
                      placeholder="+254"
                      inputMode="tel"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <InputField
                      label="Phone number"
                      autoComplete="tel"
                      inputMode="tel"
                      value={customerPhone}
                      onChange={(ev) => setCustomerPhone(ev.target.value)}
                      placeholder="712 345 678"
                    />
                  </div>
                </div>
              </div>
            </FormFieldGroup>

            <InputField
              label="WhatsApp"
              required={false}
              inputMode="tel"
              value={whatsAppNumber}
              onChange={(ev) => setWhatsAppNumber(ev.target.value)}
              placeholder="Same as phone — optional"
              hint="Only if different from your phone number."
            />
          </div>

          {contactFieldsComplete && !signedIn ? (
            <div className={CHECKOUT_ACCOUNT_NUDGE}>
              <div className="flex gap-3 sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Save details for next time
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Use {customerEmail.trim()} to track orders and skip
                      retyping your address.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 rounded-xl px-4 text-xs font-semibold shadow-sm"
                    onClick={() => void openCheckoutSignupModal()}
                  >
                    Save my details
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
            </div>
          ) : null}
            </>
          ) : null}

          {showDeliverySubStep ? (
            <>
          <div className={cn(CHECKOUT_CARD, CHECKOUT_CARD_PAD, "space-y-4")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader
                icon={<MapPin className="size-4" aria-hidden />}
                title="Delivery location"
                subtitle="Help the rider find you — start with your area, then street details."
                badge="2 of 2"
              />
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-900">
                <Truck className="size-3.5" aria-hidden />
                Nairobi delivery
              </div>
            </div>

            {formatDeliveryZone(ward, subCounty, county) ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
                <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                <p className="min-w-0 truncate text-xs font-medium text-foreground">
                  {formatDeliveryZone(ward, subCounty, county)}
                </p>
              </div>
            ) : null}

            <FormFieldGroup
              title="Your area"
              description="County → subcounty → ward"
            >
              <div className="grid gap-3 sm:grid-cols-3">
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
                    {subCounty ? "Select ward" : "Pick subcounty first"}
                  </option>
                  {wardOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </FormFieldGroup>

            <FormFieldGroup
              title="Street details"
              description="Building, apartment, or landmark the rider can spot."
            >
              <div className="space-y-3">
                <InputField
                  label="Street address"
                  value={streetAddress}
                  onChange={(ev) => setStreetAddress(ev.target.value)}
                  placeholder="e.g. Sunrise Apartments, Block B"
                />
                <InputField
                  label="Delivery notes"
                  required={false}
                  value={deliveryNotes}
                  onChange={(ev) => setDeliveryNotes(ev.target.value)}
                  placeholder="Gate code, floor, preferred call time"
                />
              </div>
            </FormFieldGroup>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-sm text-foreground transition-colors hover:bg-muted/30">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/10"
                checked={isDefaultAddress}
                onChange={(ev) => setIsDefaultAddress(ev.target.checked)}
              />
              <span>
                <span className="font-medium">Save for next checkout</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  Skip retyping contact and delivery on your next order.
                </span>
              </span>
            </label>
          </div>

          <Button
            type="button"
            size="lg"
            className="hidden h-11 w-full rounded-xl text-sm font-semibold"
            onClick={() => void lockShippingAndContinue()}
            disabled={!shippingComplete}
          >
            {isEditingShipping ? "Use these details" : "Continue to review"}
          </Button>
            </>
          ) : null}
        </section>
        ) : null}

        {showReviewStep ? (
        <section
          className={cn(
            "min-w-0 max-w-full space-y-3",
            CHECKOUT_CARD_PAD,
            CHECKOUT_CARD,
          )}
        >
          <SectionHeader
            icon={<PackageCheck className="size-4" aria-hidden />}
            title="Review your order"
            subtitle={`${cart.lines.length} ${cart.lines.length === 1 ? "item" : "items"} · confirm details before payment`}
          />

          <ShopShippingSummaryCard
            contact={shippingSummary}
            onEdit={startEditingShipping}
            compact
          />

          <div className="flex items-center justify-end">
            <Link
              href={APP_ROUTES.shopCart}
              className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Edit cart
            </Link>
          </div>

          <div
            className={cn(
              CHECKOUT_CARD_INSET,
              "mt-3 divide-y divide-border/50 overflow-visible lg:max-h-[360px] lg:overflow-y-auto lg:overscroll-contain lg:pr-1",
              embedded && "max-h-[min(32vh,14rem)] overflow-y-auto overscroll-contain",
            )}
          >
            {cart.lines.map((line) => (
              <div
                key={line.itemId}
                className="flex w-full min-w-0 gap-2.5 p-2.5"
              >
                <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/40">
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
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug">
                    {line.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Qty {line.quantity}</span>
                    {line.variantName ? (
                      <span className={CHECKOUT_VARIANT_PILL}>{line.variantName}</span>
                    ) : null}
                  </div>
                </div>
                <p className="shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                  {formatDisplayPrice(cart.currency, line.lineTotal ?? 0)}
                </p>
              </div>
            ))}
          </div>

          <div className={cn(CHECKOUT_CARD_INSET, "mt-3 border-dashed p-2.5")}>
            <p className={CHECKOUT_LABEL}>Promo code</p>
            <div className="mt-1.5 flex gap-1.5">
              <input
                type="text"
                disabled
                placeholder="Coming soon"
                className="h-9 flex-1 rounded-lg border border-border bg-background/50 px-2.5 text-[13px] opacity-60"
              />
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 px-2.5 text-xs" disabled>
                Apply
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-[13px]">
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
                  <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-primary">
                    Free
                  </span>
                ) : (
                  shippingLabel
                )}
              </span>
            </div>
            {showTotalInSummary ? (
              <div className="flex items-end justify-between border-t border-border/60 pt-3">
                <span className="text-sm font-semibold text-foreground">Total due</span>
                <span className={CHECKOUT_SERIF_AMOUNT}>{totalLabel}</span>
              </div>
            ) : null}
          </div>

          <div
            id="checkout-terms"
            className={cn(
              CHECKOUT_CARD_INSET,
              "mt-3 scroll-mt-4 space-y-2.5 p-3",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden />
              <h4 className="text-xs font-semibold text-foreground">Confirm order</h4>
            </div>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
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
          </div>

          <p className="mt-2 hidden items-center justify-center gap-3 text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" aria-hidden />
              Secure
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Zap className="size-3" aria-hidden />
              Fast checkout
            </span>
          </p>
        </section>
        ) : null}

        {showConfirmStep ? (
        <section
          className={cn(
            "min-w-0 max-w-full space-y-3",
            CHECKOUT_CARD_PAD,
            CHECKOUT_CARD,
          )}
        >
          <SectionHeader
            icon={<CreditCard className="size-4" aria-hidden />}
            title="Payment"
            subtitle="Almost done — review total and choose how to pay."
          />

          <ShopShippingSummaryCard
            contact={shippingSummary}
            onEdit={startEditingShipping}
            compact
          />

          <div className={cn(CHECKOUT_CARD_INSET, "space-y-2 p-3")}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">
                {cart.lines.length} {cart.lines.length === 1 ? "item" : "items"}
              </span>
              <Link
                href={APP_ROUTES.shopCart}
                className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                Edit cart
              </Link>
            </div>
            <div className="flex items-end justify-between border-t border-border/60 pt-3">
              <span className="text-sm font-semibold text-foreground">Total due</span>
              <span className={CHECKOUT_SERIF_AMOUNT}>{totalLabel}</span>
            </div>
          </div>

          <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Payment options are in the bar below. Place your order first, then
            send the M-Pesa prompt if paying on your phone.
          </p>
        </section>
        ) : null}
        </div>
        <CheckoutScrollEndSpacer />
        </div>

        <ConfirmationFloatingDock
          anchored
          fullWidth={embedded}
          ariaLabel="Checkout actions"
        >
          <div className="space-y-1">
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
                    <p className={cn(CHECKOUT_DOCK_AMOUNT, "leading-tight")}>
                      {totalLabel}
                    </p>
                  </div>
                  {floatingCheckout.actionType === "button" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled={floatingCheckout.actionDisabled}
                      className={cn(CHECKOUT_PRIMARY_BTN, "h-10 shrink-0 gap-1 px-4 text-sm")}
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
                      className={cn(CHECKOUT_PRIMARY_BTN, "h-10 shrink-0 gap-1 px-4 text-sm")}
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {floatingCheckout.eyebrow ? (
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/90">
                          {floatingCheckout.eyebrow}
                        </p>
                      ) : null}
                      {floatingCheckout.headline ? (
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                          {floatingCheckout.headline}
                        </p>
                      ) : null}
                      {floatingCheckout.hint ? (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {floatingCheckout.hint}
                        </p>
                      ) : null}
                    </div>
                    {detailsSubStep === "contact" && showShippingForm ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                          contactFieldsComplete
                            ? "bg-primary/12 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {[
                          customerEmail.trim(),
                          firstName.trim(),
                          lastName.trim(),
                          customerPhone.trim(),
                        ].filter(Boolean).length}
                        /4
                      </span>
                    ) : detailsSubStep === "delivery" && showShippingForm ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                          shippingComplete
                            ? "bg-primary/12 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {[
                          subCounty,
                          ward,
                          streetAddress.trim(),
                        ].filter(Boolean).length}
                        /3
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-end gap-2 border-t border-border/50 pt-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Cart total
                      </p>
                      <p className={CHECKOUT_DOCK_AMOUNT}>{totalLabel}</p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      disabled={floatingCheckout.actionDisabled || stepBusy}
                      className={cn(CHECKOUT_PRIMARY_BTN, "shrink-0 gap-1.5 px-5 text-sm")}
                      onClick={floatingCheckout.onAction}
                    >
                      {stepBusy ? (
                        <>
                          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Checking…
                        </>
                      ) : (
                        <>
                          {floatingCheckout.actionLabel}
                          <ArrowRight className="size-4" aria-hidden />
                        </>
                      )}
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
          serverAuthenticatedRef.current = true;
          setServerAuthenticated(true);
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

      <ShopCheckoutLoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        email={customerEmail}
        firstName={firstName}
        lastName={lastName}
        phoneDisplay={`${areaCode} ${customerPhone}`.trim()}
        onSignedIn={() => {
          serverAuthenticatedRef.current = true;
          setServerAuthenticated(true);
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

      <ShopCheckoutDeliveryEditModal
        open={deliveryEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeliveryEditModal();
            return;
          }
          setDeliveryEditOpen(true);
        }}
        onSave={saveDeliveryEdit}
        saveDisabled={!requiredCheckoutFieldsComplete}
      >
        <div className="space-y-6">
          <PlainFormSection title="Contact">
            <div className="space-y-3">
              <InputField
                variant="plain"
                label="Email"
                type="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(ev) => setCustomerEmail(ev.target.value)}
                placeholder="you@example.com"
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  variant="plain"
                  label="First name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  placeholder="John"
                />
                <InputField
                  variant="plain"
                  label="Last name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  placeholder="Doe"
                />
              </div>
              <div className="flex gap-3">
                <div className="w-[5.5rem] shrink-0">
                  <InputField
                    variant="plain"
                    label="Code"
                    value={areaCode}
                    onChange={(ev) => setAreaCode(ev.target.value)}
                    placeholder="+254"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <InputField
                    variant="plain"
                    label="Phone"
                    autoComplete="tel"
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(ev) => setCustomerPhone(ev.target.value)}
                    placeholder="712 345 678"
                  />
                </div>
              </div>
              <InputField
                variant="plain"
                label="WhatsApp"
                required={false}
                inputMode="tel"
                value={whatsAppNumber}
                onChange={(ev) => setWhatsAppNumber(ev.target.value)}
                placeholder="Optional"
              />
            </div>
          </PlainFormSection>

          <PlainFormSection title="Delivery">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  variant="plain"
                  label="County"
                  value={county}
                  onChange={(ev) => setCounty(ev.target.value)}
                >
                  <option value="">Select county</option>
                  <option value="Nairobi">Nairobi</option>
                </SelectField>
                <SelectField
                  variant="plain"
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
              </div>
              <SelectField
                variant="plain"
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
                variant="plain"
                label="Street address"
                value={streetAddress}
                onChange={(ev) => setStreetAddress(ev.target.value)}
                placeholder="Building, apartment, or landmark"
              />
              <InputField
                variant="plain"
                label="Delivery notes"
                required={false}
                value={deliveryNotes}
                onChange={(ev) => setDeliveryNotes(ev.target.value)}
                placeholder="Gate code, landmark, etc."
              />
            </div>

            <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-border text-primary focus:ring-primary/10"
                checked={isDefaultAddress}
                onChange={(ev) => setIsDefaultAddress(ev.target.checked)}
              />
              <span>Save for next time</span>
            </label>
          </PlainFormSection>
        </div>
      </ShopCheckoutDeliveryEditModal>
    </div>
  );
}

import { API_ROUTES, apiUrl } from "@/lib/config";
import { getProblemTitle } from "@/lib/problem";

/** Tokenised public offer payload — no auth, only the shop's public identity. */
export type PublicDomainOffer = {
  businessName: string;
  businessSlug: string;
  shopHost: string;
  shopUrl: string;
  suggestedDomain: string;
  priceCents: number;
  currency: string;
  status:
    | "INVITED"
    | "AWAITING_PAYMENT"
    | "PAID"
    | "IN_PROGRESS"
    | "DELIVERED"
    | "CANCELLED"
    | "EXPIRED"
    | "REFUNDED";
  paid: boolean;
  delivered: boolean;
  deliveredDomain: string | null;
  requestedDomain: string | null;
  domainMode: "OWNED" | "NEEDS_REGISTRATION";
  themeDirection: string | null;
  themeKey: string | null;
  themeNotes: string | null;
  maskedPhone: string | null;
  reference: string;
  paidAt: string | null;
  slaDueAt: string | null;
  message: string;
  preview: boolean;
  canPay: boolean;
  paymentUnavailableReason: string | null;
  themes: { id: string; label: string; hint: string }[];
  directions: { id: string; label: string; hint: string }[];
};

export type PublicDomainOfferPayInput = {
  phoneNumber: string;
  requestedDomain: string;
  domainMode: "OWNED" | "NEEDS_REGISTRATION";
  themeDirection: string;
  themeKey?: string;
  themeNotes?: string;
  contactName?: string;
};

export type PublicDomainOfferPayResult = {
  status: string;
  message: string;
  promptSent: boolean;
  reference: string;
};

export type PublicDomainOfferStatus = {
  status: string;
  paid: boolean;
  delivered: boolean;
  deliveredDomain: string | null;
  lastStkStatus: string | null;
  message: string;
  paidAt: string | null;
  slaDueAt: string | null;
  reference: string;
};

async function offerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("We could not reach Kiosk. Check your connection and try again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(getProblemTitle(payload));
  }
  return (await response.json()) as T;
}

export function fetchPublicDomainOffer(token: string): Promise<PublicDomainOffer> {
  return offerRequest<PublicDomainOffer>(
    `${API_ROUTES.publicDomainOffer}/${encodeURIComponent(token)}`,
  );
}

export function payPublicDomainOffer(
  token: string,
  input: PublicDomainOfferPayInput,
): Promise<PublicDomainOfferPayResult> {
  return offerRequest<PublicDomainOfferPayResult>(
    `${API_ROUTES.publicDomainOffer}/${encodeURIComponent(token)}/pay`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function fetchPublicDomainOfferStatus(
  token: string,
): Promise<PublicDomainOfferStatus> {
  return offerRequest<PublicDomainOfferStatus>(
    `${API_ROUTES.publicDomainOffer}/${encodeURIComponent(token)}/status`,
  );
}

export function formatOfferKes(cents: number): string {
  const amount = Math.round(cents / 100);
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

export function formatOfferDue(iso: string | null): string {
  if (!iso) return "within 24 hours";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(new Date(iso));
  } catch {
    return "within 24 hours";
  }
}

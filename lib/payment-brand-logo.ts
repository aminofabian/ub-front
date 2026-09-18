/** Static marks for Apple Pay / Google Pay when the API has no logoUrl yet. */
export const APPLE_PAY_LOGO_SRC = "/apple_pay.png";
export const GOOGLE_PAY_LOGO_SRC = "/google_pay.png";

export type PaymentBrandLogo = {
  src: string;
  alt: string;
  /** Wordmarks in /public are cropped to the Apple / G mark used as a category icon. */
  crop?: "mark";
};

function haystack(gatewayType?: string | null, displayName?: string | null) {
  return `${gatewayType ?? ""} ${displayName ?? ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolvePaymentBrandLogo(opts: {
  gatewayType?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
}): PaymentBrandLogo | null {
  const fromApi = opts.logoUrl?.trim();
  if (fromApi) {
    const crop =
      fromApi === APPLE_PAY_LOGO_SRC || fromApi === GOOGLE_PAY_LOGO_SRC
        ? ("mark" as const)
        : undefined;
    return {
      src: fromApi,
      alt: opts.displayName?.trim() || opts.gatewayType?.trim() || "Payment method",
      ...(crop ? { crop } : {}),
    };
  }

  const hay = haystack(opts.gatewayType, opts.displayName);
  if (!hay) return null;

  if (/\bapple\s*pay\b/.test(hay) || hay.includes("applepay")) {
    return { src: APPLE_PAY_LOGO_SRC, alt: "Apple Pay", crop: "mark" };
  }
  if (/\bgoogle\s*pay\b/.test(hay) || hay.includes("googlepay") || /\bgpay\b/.test(hay)) {
    return { src: GOOGLE_PAY_LOGO_SRC, alt: "Google Pay", crop: "mark" };
  }
  return null;
}

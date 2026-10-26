"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import { useSearchParams } from "next/navigation";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPublicDomainOffer,
  fetchPublicDomainOfferStatus,
  formatOfferDue,
  formatOfferKes,
  payPublicDomainOffer,
  type PublicDomainOffer,
} from "@/lib/domain-offer";
import {
  ghostCtaClass,
  goldCtaClass,
  landingRootStyle,
  landingSectionClass,
} from "@/components/tenant-console/landing/landing-styles";
import { cn } from "@/lib/utils";

const FALLBACK_DIRECTIONS = [
  { id: "WARM_MARKET", label: "Warm market", hint: "Paper, produce, hand-written signs." },
  { id: "CLEAN_MODERN", label: "Clean and modern", hint: "Quiet type, white space, a calm grid." },
  { id: "BOLD_LOUD", label: "Bold and loud", hint: "Big type, strong colour, a shop that shouts." },
  { id: "DESIGNER_CHOICE", label: "Kiosk designer's pick", hint: "Tell us the shop and we choose the look." },
];

const FALLBACK_THEMES = [
  { id: "mart", label: "Market day", hint: "Produce and price tags." },
  { id: "boutique-shelf", label: "Boutique shelf", hint: "Quiet and considered." },
  { id: "butcher-board", label: "Butcher board", hint: "Chalk and a serious counter." },
  { id: "comilmart", label: "Everyday minimart", hint: "Familiar and easy to scan." },
];

const PALETTES: Record<
  string,
  { ground: string; ink: string; accent: string; highlight: string; panel: string }
> = {
  mart: {
    ground: "#FCFAF5",
    ink: "#121A16",
    accent: "#1D4B3B",
    highlight: "#A55237",
    panel: "#EFEBE2",
  },
  "boutique-shelf": {
    ground: "#F8F3EA",
    ink: "#241F19",
    accent: "#6D5A43",
    highlight: "#B07B5A",
    panel: "#EFE6D7",
  },
  "butcher-board": {
    ground: "#F3EEE4",
    ink: "#1A1A17",
    accent: "#7A3023",
    highlight: "#2E4A3A",
    panel: "#E8E0D2",
  },
  comilmart: {
    ground: "#F5F1E7",
    ink: "#17201B",
    accent: "#2E5A4C",
    highlight: "#C87932",
    panel: "#ECE5D8",
  },
};

const DIRECTION_ACCENT: Record<string, string> = {
  WARM_MARKET: "",
  CLEAN_MODERN: "#121A16",
  BOLD_LOUD: "#A55237",
  DESIGNER_CHOICE: "",
};

function themePalette(themeKey: string, direction: string) {
  const base = PALETTES[themeKey] ?? PALETTES.mart;
  const accent = DIRECTION_ACCENT[direction] || base.accent;
  return { ...base, accent, accentSoft: `${accent}14` };
}

function signType(direction: string) {
  if (direction === "CLEAN_MODERN") {
    return "font-sans text-[clamp(1.45rem,3.4vw,2.55rem)] font-semibold tracking-[-0.04em] leading-[1.02]";
  }
  if (direction === "BOLD_LOUD") {
    return "font-heading text-[clamp(1.9rem,4.4vw,3.3rem)] font-semibold uppercase tracking-[-0.02em] leading-[0.94]";
  }
  if (direction === "DESIGNER_CHOICE") {
    return "font-heading text-[clamp(1.7rem,4vw,3rem)] italic font-normal leading-[1]";
  }
  return "font-heading text-[clamp(1.7rem,4vw,3rem)] font-normal leading-[1]";
}

function cleanDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export function CustomDomainOfferPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() ?? "";
  const [offer, setOffer] = useState<PublicDomainOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [polling, setPolling] = useState(false);

  const [domain, setDomain] = useState("");
  const [domainMode, setDomainMode] = useState<"OWNED" | "NEEDS_REGISTRATION">("OWNED");
  const [direction, setDirection] = useState("WARM_MARKET");
  const [themeKey, setThemeKey] = useState("mart");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [stickyCta, setStickyCta] = useState(false);
  const pollTicks = useRef(0);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoadError("This link is missing its key. Open the link from your email or the Kiosk notification again.");
      setLoading(false);
      return;
    }
    try {
      const next = await fetchPublicDomainOffer(token);
      setOffer(next);
      setLoadError("");
      setDomain((current) => current || next.requestedDomain || next.suggestedDomain || "");
      setDomainMode(next.domainMode === "NEEDS_REGISTRATION" ? "NEEDS_REGISTRATION" : "OWNED");
      setDirection(
        next.directions.some((d) => d.id === next.themeDirection)
          ? (next.themeDirection as string)
          : "WARM_MARKET",
      );
      setThemeKey(next.themeKey || "mart");
      setNotes(next.themeNotes ?? "");
      setPhone((current) => current || "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We could not load this offer.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const awaiting = offer?.status === "AWAITING_PAYMENT";
  useEffect(() => {
    if (!token || !awaiting) return;
    pollTicks.current = 0;
    setPolling(true);
    const timer = window.setInterval(async () => {
      pollTicks.current += 1;
      try {
        const status = await fetchPublicDomainOfferStatus(token);
        if (status.paid || status.status === "PAID" || status.status === "IN_PROGRESS" || status.status === "DELIVERED") {
          setPolling(false);
          window.clearInterval(timer);
          await load();
          return;
        }
        if (status.lastStkStatus === "FAILED") {
          setPolling(false);
          window.clearInterval(timer);
          await load();
          return;
        }
      } catch {
        // Keep the prompt visible; the merchant can check manually.
      }
      if (pollTicks.current >= 45) {
        setPolling(false);
        window.clearInterval(timer);
      }
    }, 4000);
    return () => {
      window.clearInterval(timer);
      setPolling(false);
    };
  }, [awaiting, load, token]);

  useEffect(() => {
    const node = submitRef.current;
    if (!node || offer?.status !== "INVITED") {
      setStickyCta(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setStickyCta(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [offer?.status, loading]);

  const directions = offer?.directions?.length ? offer.directions : FALLBACK_DIRECTIONS;
  const themes = offer?.themes?.length ? offer.themes : FALLBACK_THEMES;
  const palette = useMemo(() => themePalette(themeKey, direction), [direction, themeKey]);
  const previewDomain = cleanDomain(domain) || offer?.suggestedDomain || "yourshop.co.ke";
  const price = offer ? formatOfferKes(offer.priceCents) : "KES 1,000";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offer) return;
    setFormError("");
    setNotice("");
    const cleaned = cleanDomain(domain);
    if (!cleaned || !cleaned.includes(".")) {
      setFormError("Enter the full domain, for example powermart.co.ke.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Enter the M-Pesa number that will receive the prompt.");
      document.getElementById("offer-phone")?.focus();
      document.getElementById("offer-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const result = await payPublicDomainOffer(token, {
        phoneNumber: phone.trim(),
        requestedDomain: cleaned,
        domainMode,
        themeDirection: direction,
        themeKey,
        themeNotes: notes.trim() || undefined,
        contactName: contactName.trim() || undefined,
      });
      setNotice(result.message);
      if (result.promptSent) {
        pollTicks.current = 0;
        setOffer((current) =>
          current
            ? {
                ...current,
                status: "AWAITING_PAYMENT",
                requestedDomain: cleaned,
                domainMode,
                themeDirection: direction,
              }
            : current,
        );
        await load();
      } else {
        await load();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "We could not start the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!token) return;
    setBusy(true);
    setFormError("");
    try {
      await fetchPublicDomainOfferStatus(token);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "We could not check the payment.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <OfferSkeleton />;
  }

  if (loadError || !offer) {
    return <OfferUnavailable message={loadError || "This offer is not available."} />;
  }

  const closed = ["CANCELLED", "EXPIRED", "REFUNDED"].includes(offer.status);
  const paidLike = offer.paid || ["PAID", "IN_PROGRESS", "DELIVERED"].includes(offer.status);

  return (
    <div className="landing-page min-h-screen bg-[var(--kiosk-bg)]" style={landingRootStyle()}>
      <SiteHeader offer={offer} />

      <section id="start" className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{ backgroundImage: "url('/textures/paper-grain.png')", backgroundSize: "360px" }}
        />
        <div className="relative mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-14">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--kiosk-text-faint)]">
              {offer.preview ? "Preview · no payment is taken" : "24-hour handover · M-Pesa Express"}
            </p>
            <h1 className="mt-4 max-w-[13ch] font-heading text-[clamp(2.75rem,7.2vw,5.6rem)] font-normal leading-[0.92] tracking-[-0.03em] text-[var(--kiosk-text)]">
              Your shop, at its <span className="italic">own address</span>.
            </h1>
            <p className="mt-5 max-w-[54ch] text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)] sm:text-[16px]">
              We move <strong className="font-semibold text-[var(--kiosk-text)]">{offer.businessName}</strong> from{" "}
              <span className="font-mono text-[13px] text-[var(--kiosk-text)]">{offer.shopHost}</span> to{" "}
              <span className="font-mono text-[13px] text-[var(--kiosk-text)]">{previewDomain}</span>, then repaint
              the storefront to match. {price}. Live within 24 hours of payment.
            </p>

            <div className="mt-7">
              {closed ? (
                <ClosedPanel offer={offer} />
              ) : paidLike ? (
                <PaidPanel offer={offer} onCheck={checkStatus} busy={busy} />
              ) : awaiting ? (
                <AwaitingPanel
                  offer={offer}
                  notice={notice}
                  polling={polling}
                  busy={busy}
                  onCheck={checkStatus}
                  onRetry={() => {
                    setNotice("");
                    setOffer((current) => (current ? { ...current, status: "INVITED" } : current));
                  }}
                />
              ) : (
                <PayDocket
                  offer={offer}
                  price={price}
                  domain={domain}
                  setDomain={setDomain}
                  domainMode={domainMode}
                  setDomainMode={setDomainMode}
                  direction={direction}
                  setDirection={setDirection}
                  themeKey={themeKey}
                  setThemeKey={setThemeKey}
                  phone={phone}
                  setPhone={setPhone}
                  notes={notes}
                  setNotes={setNotes}
                  contactName={contactName}
                  setContactName={setContactName}
                  directions={directions}
                  themes={themes}
                  busy={busy}
                  error={formError}
                  notice={notice}
                  onSubmit={onSubmit}
                  submitRef={submitRef}
                />
              )}
            </div>
          </div>

          <ShopSignPreview
            offer={offer}
            domain={previewDomain}
            palette={palette}
            direction={direction}
            themeKey={themeKey}
            themes={themes}
          />
        </div>
      </section>

      <LedgerSection price={price} />
      <TimelineSection />
      <ExampleSection currentHost={offer.shopHost} suggestedDomain={offer.suggestedDomain || previewDomain} />
      <FaqSection />
      <CloseSection offer={offer} paidLike={paidLike} />
      <SiteFooter />
      {stickyCta && offer.status === "INVITED" && !offer.preview ? (
        <div
          className="fixed inset-x-3 z-40 rounded-[2px] border border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] px-3 py-2.5 shadow-[0_18px_44px_-18px_rgba(18,26,22,0.42)] lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                {price} · 24-hour handover
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--kiosk-text-muted)]">
                Domain + theme, set up for you
              </p>
            </div>
            <button
              type="submit"
              form="offer-form"
              disabled={busy || !offer.canPay}
              className={cn(goldCtaClass, "shrink-0 px-3.5 py-2.5 text-[11.5px]")}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />}
              Pay with M-Pesa
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SiteHeader({ offer }: { offer: PublicDomainOffer }) {
  return (
    <header className="relative z-10 border-b border-[var(--kiosk-border-soft)] bg-[color-mix(in_srgb,var(--kiosk-bg)_88%,transparent)] backdrop-blur-[6px]">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-8">
        <KioskLogo href="/" size="sm" wordmark="Kiosk" showDomain tagline={offer.businessName} />
        <div className="flex items-center gap-3 sm:gap-5">
          {offer.preview ? (
            <span className="inline-flex items-center border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)]">
              Preview
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-[var(--kiosk-text-muted)] sm:inline-flex">
              <Clock3 className="size-3.5" strokeWidth={1.75} aria-hidden />
              24-hour handover
            </span>
          )}
          <a
            href="mailto:support@kiosk.ke?subject=Custom%20domain%20and%20theme"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--kiosk-text)] underline-offset-4 hover:underline"
          >
            <MessageCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
            Talk to us
          </a>
        </div>
      </div>
    </header>
  );
}

function PayDocket({
  offer,
  price,
  domain,
  setDomain,
  domainMode,
  setDomainMode,
  direction,
  setDirection,
  themeKey,
  setThemeKey,
  phone,
  setPhone,
  notes,
  setNotes,
  contactName,
  setContactName,
  directions,
  themes,
  busy,
  error,
  notice,
  onSubmit,
  submitRef,
}: {
  offer: PublicDomainOffer;
  price: string;
  domain: string;
  setDomain: (value: string) => void;
  domainMode: "OWNED" | "NEEDS_REGISTRATION";
  setDomainMode: (value: "OWNED" | "NEEDS_REGISTRATION") => void;
  direction: string;
  setDirection: (value: string) => void;
  themeKey: string;
  setThemeKey: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  contactName: string;
  setContactName: (value: string) => void;
  directions: { id: string; label: string; hint: string }[];
  themes: { id: string; label: string; hint: string }[];
  busy: boolean;
  error: string;
  notice: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitRef: RefObject<HTMLButtonElement | null>;
}) {
  const unavailable = !offer.canPay;
  return (
    <form
      id="offer-form"
      onSubmit={onSubmit}
      className="overflow-hidden rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] shadow-[0_24px_60px_-38px_rgba(18,26,22,0.38)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--kiosk-border-soft)] px-4 py-3 sm:px-5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--kiosk-text-faint)]">
          Job ticket
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          {offer.reference}
        </span>
      </div>

      <div className="border-b border-[var(--kiosk-border-soft)] px-4 py-5 sm:px-5">
        <label htmlFor="offer-domain" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
          New address
        </label>
        <input
          id="offer-domain"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="powermart.co.ke"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          className="mt-2 w-full border-0 border-b border-[var(--kiosk-border-strong)] bg-transparent px-0 pb-2 font-mono text-[clamp(1.15rem,3vw,1.6rem)] font-medium tracking-[-0.02em] text-[var(--kiosk-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--kiosk-text)_30%,transparent)] focus:border-[var(--kiosk-gold)]"
        />
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--kiosk-text-muted)]">
          Today: <span className="font-mono text-[11px]">{offer.shopHost}</span>. We confirm availability before
          ordering a new name.
        </p>
      </div>

      <fieldset className="border-b border-[var(--kiosk-border-soft)] px-4 py-5 sm:px-5">
        <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
          This domain is
        </legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ChoiceButton
            selected={domainMode === "OWNED"}
            onClick={() => setDomainMode("OWNED")}
            title="Already mine"
            hint="We connect it. KES 1,000 covers the setup."
          />
          <ChoiceButton
            selected={domainMode === "NEEDS_REGISTRATION"}
            onClick={() => setDomainMode("NEEDS_REGISTRATION")}
            title="Register it for me"
            hint="Included. We register one .ke name for you."
          />
        </div>
      </fieldset>

      <fieldset className="border-b border-[var(--kiosk-border-soft)] px-4 py-5 sm:px-5">
        <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
          Theme direction
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {directions.map((option) => (
            <ChoiceButton
              key={option.id}
              selected={direction === option.id}
              onClick={() => setDirection(option.id)}
              title={option.label}
              hint={option.hint}
              compact
              hideHintOnMobile
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[var(--kiosk-text-muted)] sm:hidden">
          {directions.find((option) => option.id === direction)?.hint}
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 border-b border-[var(--kiosk-border-soft)] px-4 py-5 sm:grid-cols-2 sm:px-5">
        <div>
          <label htmlFor="offer-phone" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            M-Pesa number
          </label>
          <input
            id="offer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0712 345 678"
            inputMode="tel"
            autoComplete="tel"
            className="mt-2 w-full rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-bg)] px-3 py-2.5 text-[14px] text-[var(--kiosk-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--kiosk-text)_35%,transparent)] focus:border-[var(--kiosk-gold)]"
          />
        </div>
        <div>
          <label htmlFor="offer-name" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            Your name <span className="normal-case tracking-normal opacity-70">(optional)</span>
          </label>
          <input
            id="offer-name"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="Who should we call?"
            autoComplete="name"
            className="mt-2 w-full rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-bg)] px-3 py-2.5 text-[14px] text-[var(--kiosk-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--kiosk-text)_35%,transparent)] focus:border-[var(--kiosk-gold)]"
          />
        </div>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {error ? (
          <p role="alert" className="mb-3 border border-[color-mix(in_srgb,#A55237_42%,transparent)] bg-[color-mix(in_srgb,#A55237_7%,transparent)] px-3 py-2 text-[12px] leading-relaxed text-[#8C3F2B]">
            {error}
          </p>
        ) : null}
        {notice && !error ? (
          <p role="status" className="mb-3 border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--kiosk-gold)]">
            {notice}
          </p>
        ) : null}
        {unavailable ? (
          <p role="status" className="mb-3 border border-[var(--kiosk-border)] bg-[var(--kiosk-panel)] px-3 py-2 text-[12px] leading-relaxed text-[var(--kiosk-text-muted)]">
            {offer.paymentUnavailableReason || "M-Pesa is temporarily unavailable. Try again shortly."}
          </p>
        ) : null}
        <button
          ref={submitRef}
          type="submit"
          disabled={busy || unavailable}
          className={cn(goldCtaClass, "w-full justify-between px-5 py-3.5 text-[14px]")}
        >
          <span className="inline-flex items-center gap-2">
            {busy ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <Smartphone className="size-4" strokeWidth={1.75} aria-hidden />
            )}
            {busy ? "Sending the prompt…" : `Pay ${price} with M-Pesa`}
          </span>
          <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--kiosk-text-faint)]">
          <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={1.75} aria-hidden />
          An M-Pesa prompt arrives on your phone. The 24-hour clock starts when it clears. A new .co.ke
          registration, if you need one, is included.
        </p>
      </div>
      <details className="group border-t border-[var(--kiosk-border-soft)] px-4 py-4 sm:px-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-medium text-[var(--kiosk-text)] outline-none [&::-webkit-details-marker]:hidden">
          <span>
            Optional: starting look and notes for the designer
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)] group-open:hidden">
            Open
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)] group-open:inline">
            Close
          </span>
        </summary>
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            Starting look
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {themes.map((theme) => {
              const swatch = PALETTES[theme.id] ?? PALETTES.mart;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={themeKey === theme.id}
                  onClick={() => setThemeKey(theme.id)}
                  className={cn(
                    "group flex items-center gap-2 rounded-[2px] border px-2.5 py-2 text-left transition-colors duration-200",
                    themeKey === theme.id
                      ? "border-[var(--kiosk-gold)] bg-[var(--kiosk-gold-soft)]"
                      : "border-[var(--kiosk-border)] hover:border-[var(--kiosk-border-strong)]",
                  )}
                  title={theme.hint}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-[1px]" aria-hidden>
                    <span className="size-2.5" style={{ background: swatch.accent }} />
                    <span className="size-2.5" style={{ background: swatch.highlight }} />
                    <span className="size-2.5" style={{ background: swatch.ground }} />
                  </span>
                  <span className="min-w-0 truncate text-[11px] font-medium text-[var(--kiosk-text)]">
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="offer-notes" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            Anything the designer should know
          </label>
          <textarea
            id="offer-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="The green on our sign, the shop’s nickname, a photo we should match…"
            className="mt-2 w-full resize-y rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-bg)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--kiosk-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--kiosk-text)_35%,transparent)] focus:border-[var(--kiosk-gold)]"
          />
        </div>
      </details>

    </form>
  );
}

function ChoiceButton({
  selected,
  onClick,
  title,
  hint,
  compact = false,
  hideHintOnMobile = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  compact?: boolean;
  hideHintOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group flex items-start gap-2.5 rounded-[2px] border px-3 text-left transition-[border-color,background-color] duration-200",
        compact ? "py-2.5" : "py-3",
        selected
          ? "border-[var(--kiosk-gold)] bg-[var(--kiosk-gold-soft)]"
          : "border-[var(--kiosk-border)] bg-transparent hover:border-[var(--kiosk-border-strong)]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-[var(--kiosk-gold)] bg-[var(--kiosk-gold)]" : "border-[var(--kiosk-border-strong)]",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-2.5 text-[var(--kiosk-cta-text)]" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold leading-snug text-[var(--kiosk-text)]">{title}</span>
        <span
          className={cn(
            "mt-0.5 block text-[11px] leading-snug text-[var(--kiosk-text-muted)]",
            hideHintOnMobile && "hidden sm:block",
          )}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}

function ShopSignPreview({
  offer,
  domain,
  palette,
  direction,
  themeKey,
  themes,
}: {
  offer: PublicDomainOffer;
  domain: string;
  palette: { ground: string; ink: string; accent: string; highlight: string; panel: string; accentSoft: string };
  direction: string;
  themeKey: string;
  themes: { id: string; label: string; hint: string }[];
}) {
  const directionLabel =
    FALLBACK_DIRECTIONS.find((item) => item.id === direction)?.label ?? "Kiosk designer's pick";
  const themeLabel = themes.find((item) => item.id === themeKey)?.label ?? "Market day";
  return (
    <aside className="relative min-w-0 lg:sticky lg:top-8">
      <div
        className="relative overflow-hidden rounded-[2px] border border-[var(--kiosk-border)] transition-[background-color,border-color,color] duration-300"
        style={
          {
            background: palette.ground,
            color: palette.ink,
            borderColor: `${palette.accent}33`,
          } as CSSProperties
        }
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "url('/textures/paper-grain.png')", backgroundSize: "260px" }}
          aria-hidden
        />
        <div className="relative flex flex-col items-start justify-between gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5" style={{ borderColor: `${palette.accent}24` }}>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accent }}>
            Storefront preview
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: `${palette.ink}99` }}>
            {directionLabel} · {themeLabel}
          </span>
        </div>

        <div className="relative px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-10">
          <div
            className="pointer-events-none absolute right-4 top-4 flex size-[54px] -rotate-[7deg] flex-col items-center justify-center rounded-full border-2 text-center sm:right-5 sm:top-5"
            style={{ borderColor: `${palette.accent}70`, color: palette.accent }}
            aria-hidden
          >
            <span className="font-mono text-[13px] font-bold leading-none">24</span>
            <span className="mt-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.14em]">hours</span>
          </div>

          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: `${palette.ink}99` }}>
            {offer.businessName}
          </p>
          <p
            className={cn("mt-4 break-words text-balance", signType(direction))}
            style={{ color: palette.ink }}
          >
            {domain}
          </p>
          <div className="mt-5 h-px w-14" style={{ background: palette.accent }} aria-hidden />
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: `${palette.ink}99` }}>
            <span>Open today</span>
            <span aria-hidden>·</span>
            <span>M-Pesa</span>
            <span aria-hidden>·</span>
            <span>Nairobi</span>
          </p>

          <div className="mt-7 grid grid-cols-3 gap-2">
            {[
              { label: "Maize", detail: "2 kg", price: "210" },
              { label: "Oil", detail: "1 L", price: "320" },
              { label: "Sugar", detail: "2 kg", price: "280" },
            ].map((product, index) => (
              <div
                key={product.label}
                className="overflow-hidden rounded-[2px] border"
                style={{ borderColor: `${palette.ink}14`, background: palette.panel }}
              >
                <div
                  className="flex h-12 items-end justify-between px-2 pb-1.5"
                  style={{
                    background:
                      index === 0
                        ? `linear-gradient(135deg, ${palette.accent}26, ${palette.accent}08)`
                        : index === 1
                          ? `linear-gradient(135deg, ${palette.highlight}24, ${palette.highlight}08)`
                          : `linear-gradient(135deg, ${palette.ink}12, ${palette.ink}04)`,
                  }}
                  aria-hidden
                >
                  <span className="font-mono text-[7px] uppercase tracking-[0.08em]" style={{ color: `${palette.ink}70` }}>
                    {product.detail}
                  </span>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[9px] font-semibold leading-none" style={{ color: palette.ink }}>
                    {product.label}
                  </p>
                  <p className="mt-1 font-mono text-[8px]" style={{ color: `${palette.ink}88` }}>
                    KES {product.price}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: `${palette.accent}20` }}>
            <div className="flex items-center gap-1.5" aria-hidden>
              {[palette.ink, palette.accent, palette.highlight, palette.panel].map((color) => (
                <span key={color} className="size-4 rounded-full border" style={{ background: color, borderColor: `${palette.ink}18` }} />
              ))}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: `${palette.ink}8c` }}>
              Theme · {themeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <p className="max-w-[36ch] text-[11px] leading-relaxed text-[var(--kiosk-text-faint)]">
          A live preview of the sign, not a screenshot. The designer tunes the real storefront after payment.
        </p>
        <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
          {offer.deliveredDomain ? "Live" : "Preview"}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--kiosk-border-soft)] pt-5">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
            What changes
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--kiosk-text-muted)]">
            <li>The address on the sign</li>
            <li>The storefront theme</li>
            <li>The view on a phone</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            What stays
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--kiosk-text-muted)]">
            <li>Catalog and stock</li>
            <li>Orders and M-Pesa</li>
            <li>The old kiosk link</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function AwaitingPanel({
  offer,
  notice,
  polling,
  busy,
  onCheck,
  onRetry,
}: {
  offer: PublicDomainOffer;
  notice: string;
  polling: boolean;
  busy: boolean;
  onCheck: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5 shadow-[0_24px_60px_-38px_rgba(18,26,22,0.38)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)]">
          <Smartphone className="size-4 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-[1.7rem] leading-tight text-[var(--kiosk-text)]">
            Check your phone.
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
            {notice || "We sent an M-Pesa prompt. Enter your PIN to pay KES 1,000. It can take a few seconds to arrive."}
          </p>
          {offer.maskedPhone ? (
            <p className="mt-2 font-mono text-[11px] text-[var(--kiosk-text-faint)]">
              Prompt sent to {offer.maskedPhone}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onCheck} disabled={busy} className={cn(goldCtaClass, "justify-center px-5 py-3 text-[13px]")}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
          I have paid — check status
        </button>
        <button type="button" onClick={onRetry} className={cn(ghostCtaClass, "justify-center px-5 py-3 text-[13px]")}>
          Use a different number
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--kiosk-text-faint)]">
        {polling ? "Checking automatically…" : "Still waiting? The prompt can take a minute. We will email you when it clears."}
      </p>
    </div>
  );
}

function PaidPanel({
  offer,
  onCheck,
  busy,
}: {
  offer: PublicDomainOffer;
  onCheck: () => void;
  busy: boolean;
}) {
  const delivered = offer.status === "DELIVERED";
  return (
    <div className="rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5 shadow-[0_24px_60px_-38px_rgba(18,26,22,0.38)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)]">
            {delivered ? (
              <Check className="size-4 text-[var(--kiosk-gold)]" strokeWidth={2.5} aria-hidden />
            ) : (
              <Clock3 className="size-4 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
            )}
          </span>
          <div>
            <h2 className="max-w-[16ch] text-balance font-heading text-[1.7rem] leading-tight text-[var(--kiosk-text)]">
              {delivered ? "Your shop is live." : "Payment received. We are on it."}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
              {delivered
                ? `${offer.deliveredDomain || offer.requestedDomain || offer.suggestedDomain} is connected. The old kiosk address still works.`
                : `The 24-hour clock is running. We connect the domain, customise the theme, and check it on a phone.`}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)]">
          {offer.status.replace("_", " ")}
        </span>
      </div>

      <dl className="mt-5 divide-y divide-[var(--kiosk-border-soft)] border-y border-[var(--kiosk-border-soft)] text-[12px]">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-[var(--kiosk-text-muted)]">Reference</dt>
          <dd className="font-mono text-[11px] text-[var(--kiosk-text)]">{offer.reference}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-[var(--kiosk-text-muted)]">{delivered ? "Live at" : "New address"}</dt>
          <dd className="max-w-[62%] break-all text-right font-mono text-[11px] text-[var(--kiosk-text)]">
            {offer.deliveredDomain || offer.requestedDomain || offer.suggestedDomain}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-[var(--kiosk-text-muted)]">Due</dt>
          <dd className="font-mono text-[11px] text-[var(--kiosk-text)]">{formatOfferDue(offer.slaDueAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-[var(--kiosk-text-muted)]">Theme</dt>
          <dd className="text-right text-[11px] text-[var(--kiosk-text)]">
            {FALLBACK_DIRECTIONS.find((item) => item.id === offer.themeDirection)?.label ?? "Designer's pick"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {delivered ? (
          <a
            href={offer.deliveredDomain ? `https://${offer.deliveredDomain}` : offer.shopUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(goldCtaClass, "justify-center px-5 py-3 text-[13px]")}
          >
            Visit my shop
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
          </a>
        ) : (
          <button type="button" onClick={onCheck} disabled={busy} className={cn(goldCtaClass, "justify-center px-5 py-3 text-[13px]")}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Refresh status
          </button>
        )}
        <a
          href="mailto:support@kiosk.ke?subject=Custom%20domain%20and%20theme"
          className={cn(ghostCtaClass, "justify-center px-5 py-3 text-[13px]")}
        >
          <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Ask about this order
        </a>
      </div>
    </div>
  );
}

function ClosedPanel({ offer }: { offer: PublicDomainOffer }) {
  return (
    <div className="rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5 sm:p-6">
      <h2 className="font-heading text-[1.6rem] leading-tight text-[var(--kiosk-text)]">
        This offer is {offer.status === "EXPIRED" ? "closed" : "no longer open"}.
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
        {offer.message} If you still want your own address, reply to the email or talk to us and we will reopen it.
      </p>
      <a
        href="mailto:support@kiosk.ke?subject=Reopen%20my%20domain%20and%20theme%20offer"
        className={cn(ghostCtaClass, "mt-4 justify-center px-5 py-3 text-[13px]")}
      >
        <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
        Talk to us
      </a>
    </div>
  );
}

function LedgerSection({ price }: { price: string }) {
  return (
    <section className={cn(landingSectionClass, "border-t border-[var(--kiosk-border-soft)]")}>
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <h2 className="max-w-[18ch] font-heading text-[clamp(2rem,4.8vw,3.8rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[var(--kiosk-text)]">
              One price. The whole handover.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[14px] leading-[1.7] text-[var(--kiosk-text-muted)]">
              No tiers, no monthly fee for the setup. You pay once for the domain connection and the theme work,
              and we hand it over within 24 hours.
            </p>
          </div>
          <div className="border-t border-[var(--kiosk-border-strong)]">
            {[
              {
                label: "Custom domain connection",
                detail: "We point your domain at the shop you already run, with SSL and the old kiosk address kept alive.",
              },
              {
                label: "Storefront theme",
                detail: "Colours, type, layout and a phone check, tuned to the shop people walk into.",
              },
              {
                label: "24-hour handover",
                detail: "Paid today, live tomorrow. We tell you if a registry step needs a decision from you.",
              },
            ].map((item) => (
              <div key={item.label} className="border-b border-[var(--kiosk-border-soft)] py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[14px] font-semibold text-[var(--kiosk-text)]">{item.label}</h3>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                    Included
                  </span>
                </div>
                <p className="mt-1.5 max-w-[54ch] text-[12.5px] leading-relaxed text-[var(--kiosk-text-muted)]">
                  {item.detail}
                </p>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 border-b border-[var(--kiosk-border-strong)] py-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--kiosk-text-faint)]">
                Total, once
              </span>
              <span className="font-heading text-[2rem] leading-none text-[var(--kiosk-text)]">{price}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-[var(--kiosk-border-soft)] pt-6 sm:grid-cols-3">
          <p className="text-[12px] leading-relaxed text-[var(--kiosk-text-muted)]">
            <span className="font-semibold text-[var(--kiosk-text)]">Already own the name?</span> We connect it.
            Nothing else to buy.
          </p>
          <p className="text-[12px] leading-relaxed text-[var(--kiosk-text-muted)]">
            <span className="font-semibold text-[var(--kiosk-text)]">Need a new .co.ke?</span> Included. We
            register it and confirm the name with you first.
          </p>
          <p className="text-[12px] leading-relaxed text-[var(--kiosk-text-muted)]">
            <span className="font-semibold text-[var(--kiosk-text)]">Not a new shop.</span> Same catalog, stock,
            orders and M-Pesa. Only the address and the look change.
          </p>
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const steps = [
    {
      time: "00:00",
      title: "You pay",
      body: "An M-Pesa Express prompt lands on your phone. Enter your PIN. No card, no bank details.",
    },
    {
      time: "Within minutes",
      title: "We start",
      body: "We connect the domain, confirm the theme direction, and begin on the storefront.",
    },
    {
      time: "Within 24 hours",
      title: "You get the keys",
      body: "We check the shop on a phone and send the new address. The old kiosk link keeps working.",
    },
  ];
  return (
    <section className={cn(landingSectionClass, "border-t border-[var(--kiosk-border-soft)] bg-[color-mix(in_srgb,var(--kiosk-panel)_45%,var(--kiosk-bg))]")}>
      <div className="mx-auto w-full max-w-[1240px]">
        <h2 className="max-w-[22ch] font-heading text-[clamp(2rem,4.8vw,3.8rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[var(--kiosk-text)]">
          From M-Pesa to your own address.
        </h2>
        <ol className="mt-10 grid grid-cols-1 border-t border-[var(--kiosk-border-strong)] sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={cn(
                "border-b border-[var(--kiosk-border-soft)] py-6 sm:border-b-0 sm:px-5 sm:py-7",
                index > 0 && "sm:border-l sm:border-[var(--kiosk-border-soft)]",
                index === 0 && "sm:pl-0",
                index === steps.length - 1 && "sm:pr-0",
              )}
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                {step.time}
              </span>
              <h3 className="mt-3 font-heading text-[1.5rem] leading-tight text-[var(--kiosk-text)]">{step.title}</h3>
              <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--kiosk-text-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ExampleSection({ currentHost, suggestedDomain }: { currentHost: string; suggestedDomain: string }) {
  return (
    <section
      className="border-t border-[var(--kiosk-border-soft)] bg-[#0D1713] px-4 py-16 text-[#F2EDE1] sm:px-8 sm:py-24"
      style={
        {
          "--kiosk-text": "#F2EDE1",
          "--kiosk-text-muted": "#B7B1A4",
          "--kiosk-text-faint": "#989286",
          "--kiosk-gold": "#B9D0C0",
          "--kiosk-border": "rgba(242,237,225,0.10)",
          "--kiosk-border-strong": "rgba(242,237,225,0.22)",
        } as CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <h2 className="max-w-[24ch] font-heading text-[clamp(2.2rem,5.6vw,4.6rem)] font-normal leading-[0.98] tracking-[-0.03em]">
          <span className="text-[#F2EDE1]/45 line-through decoration-[#F2EDE1]/20">powermart.kiosk.ke</span>{" "}
          <span className="italic text-[#B9D0C0]">becomes</span> powermart.co.ke.
        </h2>
        <p className="mt-5 max-w-[54ch] text-[14px] leading-[1.7] text-[#B7B1A4]">
          A name a customer can type from memory, print on a receipt, and send on WhatsApp. The shop behind it does
          not change.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
          {[
            ["Easy to say", "A .co.ke reads like a business, not a test link."],
            ["Easy to trust", "The address on the sign matches the address on the receipt."],
            ["Easy to find again", "One shorter name for WhatsApp, Google, and the next order."],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#B9D0C0]">{title}</p>
              <p className="mt-2 max-w-[32ch] text-[12px] leading-relaxed text-[#B7B1A4]">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-[#989286]">
          Your shop: {currentHost} → {suggestedDomain}
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "I already own the domain. What happens?",
      a: "We connect it to the shop you already run. You keep the registrar and the renewal; we handle the DNS, SSL, and the storefront handover.",
    },
    {
      q: "I do not own one. Can you register it?",
      a: "Yes, for .ke names. One registration is included in the KES 1,000. We confirm the name and availability with you before ordering.",
    },
    {
      q: "Will my old kiosk.ke links break?",
      a: "No. The kiosk address keeps working. The custom domain is added alongside it, so old WhatsApp messages, receipts, and links still land on the shop.",
    },
    {
      q: "What if I do not like the theme?",
      a: "Tell us what feels off before handover. The 24-hour window includes one design pass; we tune the colours, type, and layout with you rather than guessing twice.",
    },
    {
      q: "How do I pay?",
      a: "M-Pesa Express. Enter the number that should receive the prompt, pay KES 1,000, and the 24-hour clock starts when it clears. No card or bank details.",
    },
  ];
  return (
    <section className={cn(landingSectionClass, "border-t border-[var(--kiosk-border-soft)]")}>
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <h2 className="max-w-[14ch] font-heading text-[clamp(2rem,4.8vw,3.6rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[var(--kiosk-text)]">
            Questions shops ask.
          </h2>
          <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
            Still unsure? Reply to the email or talk to us. A person answers.
          </p>
        </div>
        <div className="border-t border-[var(--kiosk-border-strong)]">
          {faqs.map((item) => (
            <details key={item.q} className="group border-b border-[var(--kiosk-border-soft)] py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-semibold text-[var(--kiosk-text)] outline-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="relative size-4 shrink-0" aria-hidden>
                  <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-[var(--kiosk-text)]" />
                  <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-[var(--kiosk-text)] transition-transform duration-200 group-open:rotate-90 group-open:opacity-0" />
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-[var(--kiosk-text-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CloseSection({ offer, paidLike }: { offer: PublicDomainOffer; paidLike: boolean }) {
  const open = offer.status === "INVITED";
  const href = open ? "#offer-domain" : paidLike ? "#start" : "mailto:support@kiosk.ke?subject=Reopen%20my%20domain%20and%20theme%20offer";
  return (
    <section className="border-t border-[var(--kiosk-border-soft)] px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-6 border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="max-w-[20ch] font-heading text-[clamp(1.8rem,3.6vw,2.8rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[var(--kiosk-text)]">
            {paidLike ? "Follow your 24-hour setup." : "Ready for your own address?"}
          </h2>
          <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-[var(--kiosk-text-muted)]">
            {paidLike
              ? "The reference, the due time, and the new address stay on this page."
              : `${formatOfferKes(offer.priceCents)}. Domain connected, theme customised, handover within 24 hours of payment.`}
          </p>
        </div>
        <a
          href={href}
          className={cn(goldCtaClass, "justify-center px-6 py-3 text-[13px]")}
        >
          {open ? "Start my setup" : paidLike ? "See my order" : "Ask us to reopen it"}
          <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
        </a>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--kiosk-border-soft)] px-4 pb-28 pt-8 sm:px-8 sm:pb-10">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <KioskLogo href="/" size="sm" wordmark="Kiosk" showDomain />
          <p className="mt-3 max-w-[42ch] text-[11px] leading-relaxed text-[var(--kiosk-text-faint)]">
            Kiosk is the point of sale, inventory, and online storefront for Kenyan shops. The custom domain and
            theme service is handled by the Kiosk team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--kiosk-text-muted)]">
          <a href={APP_ROUTES.help} className="underline-offset-4 hover:underline">Help</a>
          <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
          <a href="mailto:support@kiosk.ke" className="underline-offset-4 hover:underline">support@kiosk.ke</a>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
            <ShieldCheck className="size-3" strokeWidth={1.75} aria-hidden />
            M-Pesa Express
          </span>
        </div>
      </div>
    </footer>
  );
}

function OfferSkeleton() {
  return (
    <div className="landing-page min-h-screen bg-[var(--kiosk-bg)] px-4 py-16 sm:px-8" style={landingRootStyle()}>
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--kiosk-panel)]" />
          <div className="h-16 w-4/5 animate-pulse rounded-[2px] bg-[var(--kiosk-panel)]" />
          <div className="h-24 w-full animate-pulse rounded-[2px] bg-[var(--kiosk-panel)]" />
          <div className="h-[420px] w-full animate-pulse rounded-[2px] bg-[var(--kiosk-panel)]" />
        </div>
        <div className="h-[500px] w-full animate-pulse rounded-[2px] bg-[var(--kiosk-panel)]" />
      </div>
    </div>
  );
}

function OfferUnavailable({ message }: { message: string }) {
  return (
    <div className="landing-page flex min-h-screen items-center justify-center bg-[var(--kiosk-bg)] px-4 py-16" style={landingRootStyle()}>
      <div className="w-full max-w-[520px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 sm:p-8">
        <KioskLogo href="/" size="sm" wordmark="Kiosk" showDomain />
        <h1 className="mt-6 font-heading text-[2.2rem] leading-tight text-[var(--kiosk-text)]">
          This link did not open.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">{message}</p>
        <a
          href="mailto:support@kiosk.ke?subject=My%20domain%20and%20theme%20link"
          className={cn(goldCtaClass, "mt-5 justify-center px-5 py-3 text-[13px]")}
        >
          <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Ask for a new link
        </a>
      </div>
    </div>
  );
}

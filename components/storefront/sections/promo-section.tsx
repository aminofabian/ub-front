import { ArrowRight, MessageCircle, Ticket } from "lucide-react";
import Link from "next/link";

import { PromoCountdown } from "@/components/storefront/sections/promo-countdown";
import { whatsappHref } from "@/components/storefront/sections/shared";
import type { StorefrontPromoSectionSettings } from "@/lib/storefront-design";

/** Flash-sale banner: headline, countdown, coupon code, WhatsApp CTA. */
export function PromoSection({
  settings,
  primaryHex,
  accentHex,
}: {
  settings: StorefrontPromoSectionSettings;
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const title = settings.title.trim();
  if (!title) {
    return null;
  }
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim())
      ? accentHex.trim()
      : null;
  const subtitle = settings.subtitle.trim();
  const coupon = settings.coupon.trim();
  const ctaLabel = settings.ctaLabel.trim() || "Message us";
  const waHref = whatsappHref(
    settings.whatsapp,
    coupon
      ? `Hi! I'd like to use the "${coupon}" offer on your shop.`
      : "Hi! I'd like to place an order.",
  );

  return (
    <div
      className="relative overflow-hidden rounded-[length:var(--sf-card-radius,1rem)] px-4 py-5 text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.4)] sm:px-6 sm:py-7"
      style={{
        background: `linear-gradient(135deg, ${primary ?? "#0f172a"} 0%, ${accent ?? primary ?? "#334155"} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold leading-tight tracking-[-0.02em] sm:text-2xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 max-w-md text-[13px] leading-snug text-white/80 sm:text-sm">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {settings.endsAt.trim() ? (
              <PromoCountdown endsAt={settings.endsAt.trim()} />
            ) : null}
            {coupon ? (
              <span className="inline-flex items-center gap-1.5 rounded-[length:var(--sf-button-radius,0.5rem)] border border-dashed border-white/50 bg-white/10 px-2.5 py-1 font-mono text-[12px] font-semibold tracking-wide">
                <Ticket className="size-3.5" aria-hidden />
                {coupon}
              </span>
            ) : null}
          </div>
        </div>

        {waHref ? (
          <Link
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[length:var(--sf-button-radius,0.5rem)] bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition-[filter,transform] duration-200 hover:brightness-95 active:scale-[0.98]"
          >
            <MessageCircle className="size-4" aria-hidden />
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

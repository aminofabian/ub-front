"use client";

import type { CSSProperties } from "react";

const ROW_ONE = [
  "Barcode scanner",
  "M-Pesa payments",
  "Offline-ready POS",
  "Multi-branch",
  "Stock transfers",
  "Supplier management",
  "Purchase orders",
  "Sales analytics",
] as const;

const ROW_TWO = [
  "Receipt printing",
  "Cash drawer",
  "Split payments",
  "Staff roles & shifts",
  "Stock-takes",
  "Low-stock alerts",
  "Online storefront",
  "CSV import",
] as const;

const FEATURE_COUNT = ROW_ONE.length + ROW_TWO.length;
const MARQUEE_SECONDS = { slow: 42, fast: 34 } as const;

type KitTicketProps = {
  name: string;
  sku: string;
  hidden?: boolean;
};

function KitTicket({ name, sku, hidden }: KitTicketProps) {
  return (
    <span className="kit-ticket" aria-hidden={hidden || undefined}>
      <span className="kit-ticket-stub" aria-hidden>
        <span className="kit-ticket-bars">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="kit-ticket-sku">{sku}</span>
      </span>
      <span className="kit-ticket-perf" aria-hidden />
      <span className="kit-ticket-body">
        <span className="kit-ticket-stamp">Inc</span>
        <span className="kit-ticket-label">{name}</span>
      </span>
    </span>
  );
}

type MarqueeRowProps = {
  items: readonly string[];
  durationSeconds: number;
  reverse?: boolean;
  startIndex: number;
};

function MarqueeRow({
  items,
  durationSeconds,
  reverse,
  startIndex,
}: MarqueeRowProps) {
  const doubled = [...items, ...items];
  const style = {
    "--aisle-marquee-duration": `${durationSeconds}s`,
    animationDirection: reverse ? "reverse" : undefined,
  } as CSSProperties;

  return (
    <div className="landing-marquee-mask kit-rail-track overflow-hidden">
      <div className="animate-aisle-marquee flex w-max items-stretch" style={style}>
        {doubled.map((name, i) => {
          const sku = String(startIndex + (i % items.length) + 1).padStart(
            2,
            "0",
          );
          return (
            <KitTicket
              key={`${name}-${i}`}
              name={name}
              sku={sku}
              hidden={i >= items.length}
            />
          );
        })}
      </div>
    </div>
  );
}

function KitReceiptFoot() {
  return (
    <div className="kit-receipt-foot" aria-hidden>
      <div className="kit-receipt-line">
        <span>Subtotal</span>
        <span>{FEATURE_COUNT} capabilities</span>
      </div>
      <div className="kit-receipt-line">
        <span>Modules / add-ons</span>
        <span>0.00</span>
      </div>
      <div className="kit-receipt-total">
        <span>Total on every plan</span>
        <span>Included</span>
      </div>
    </div>
  );
}

export function LandingTrustBar() {
  const allFeatures = [...ROW_ONE, ...ROW_TWO];

  return (
    <section
      aria-labelledby="kit-heading"
      className="section-reveal kit-section border-t border-[var(--kiosk-border-soft)] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1100px] px-4 sm:px-10">
        <header className="kit-head">
          <div className="kit-head-meta">
            <p className="landing-trust-kicker">Included on every plan</p>
            <p className="kit-head-chip" aria-hidden>
              Kit-{FEATURE_COUNT} · No add-ons
            </p>
          </div>

          <div className="kit-head-row">
            <p className="kit-head-count" aria-hidden>
              <span className="kit-head-count-num">{FEATURE_COUNT}</span>
              <span className="kit-head-count-label">in the till</span>
            </p>
            <h2 id="kit-heading" className="landing-trust-title kit-head-title">
              Everything you need at the counter — no add-ons, no modules
            </h2>
          </div>
        </header>
      </div>

      <div className="kit-aisle landing-trust-aisle mt-8 sm:mt-10">
        <div className="landing-trust-aisle-edge" aria-hidden />
        <div className="kit-scan" aria-hidden />

        <div className="kit-rail" aria-hidden>
          <span className="kit-rail-screw" />
          <span className="kit-rail-bar" />
          <span className="kit-rail-screw" />
        </div>

        <div className="flex flex-col gap-3 py-4 sm:gap-3.5 sm:py-5">
          <MarqueeRow
            items={ROW_ONE}
            durationSeconds={MARQUEE_SECONDS.slow}
            startIndex={0}
          />
          <div className="landing-trust-aisle-rule" aria-hidden />
          <MarqueeRow
            items={ROW_TWO}
            durationSeconds={MARQUEE_SECONDS.fast}
            reverse
            startIndex={ROW_ONE.length}
          />
        </div>

        <div className="kit-rail kit-rail--bottom" aria-hidden>
          <span className="kit-rail-screw" />
          <span className="kit-rail-bar" />
          <span className="kit-rail-screw" />
        </div>

        <div className="landing-trust-aisle-edge" aria-hidden />
      </div>

      <div className="mx-auto mt-6 max-w-[1100px] px-4 sm:mt-8 sm:px-10">
        <KitReceiptFoot />
        <ul className="sr-only">
          {allFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

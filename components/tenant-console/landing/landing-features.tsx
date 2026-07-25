"use client";

import { ArrowRight } from "lucide-react";

import { goldCtaClass, ghostCtaClass } from "./landing-styles";

const PILLARS = [
  {
    code: "01",
    title: "Sell faster at the counter",
    body: "Barcode scan, M-Pesa STK, cash, and split pay — checkout that keeps moving when the network drops.",
  },
  {
    code: "02",
    title: "Know your stock in real time",
    body: "One count across every branch and your online shop. Low-stock alerts before you run out.",
  },
  {
    code: "03",
    title: "Open an online storefront",
    body: "Your branded shop live in minutes. Same prices, same inventory, M-Pesa at checkout.",
  },
  {
    code: "04",
    title: "Run every branch from one place",
    body: "Staff roles, shifts, suppliers, and transfers — one dashboard for every location.",
  },
] as const;

type LandingFeaturesProps = {
  onCreateShop: () => void;
};

/** Conversion-focused platform section. */
export function LandingFeatures({ onCreateShop }: LandingFeaturesProps) {
  return (
    <section id="features" className="section-reveal convert-section">
      <div className="convert-inner">
        <header className="convert-head">
          <p className="convert-kicker">Built for Kenyan shops</p>
          <h2 className="convert-title">
            Everything you need to sell today.
            <span> Nothing you don’t.</span>
          </h2>
          <p className="convert-sub">
            POS, inventory, storefront, and multi-branch — free to start. No
            credit card. Your shop live in minutes.
          </p>
          <div className="convert-actions">
            <button
              type="button"
              className={`${goldCtaClass} convert-cta`}
              onClick={onCreateShop}
            >
              Start free
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <a href="#how" className={`${ghostCtaClass} convert-ghost`}>
              See how it works
            </a>
          </div>
          <p className="convert-assurance">
            Free for 300 products · Setup under 10 minutes · M-Pesa built in
          </p>
        </header>

        <ol className="convert-pillars">
          {PILLARS.map((pillar) => (
            <li key={pillar.code} className="convert-pillar">
              <span className="convert-pillar-code" aria-hidden>
                {pillar.code}
              </span>
              <h3 className="convert-pillar-title">{pillar.title}</h3>
              <p className="convert-pillar-body">{pillar.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

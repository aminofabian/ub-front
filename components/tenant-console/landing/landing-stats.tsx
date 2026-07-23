"use client";

import { useState } from "react";

import { landingDarkSectionStyle } from "./landing-styles";

const PILLARS = [
  {
    index: "01",
    name: "POS",
    summary: "Checkout that keeps moving when the network does not.",
    details: [
      {
        title: "Barcode scan",
        body: "Scan products and ring them up without leaving the till screen.",
      },
      {
        title: "M-Pesa & cash",
        body: "STK push, cash, or split pay — finish the sale in one flow.",
      },
      {
        title: "Offline sales",
        body: "Keep selling through outages; tickets sync when you are back.",
      },
      {
        title: "Receipts & shifts",
        body: "Print receipts, open and close shifts, track who is on the till.",
      },
    ],
  },
  {
    index: "02",
    name: "Inventory",
    summary: "One stock count for every branch and the online shop.",
    details: [
      {
        title: "Stock-takes",
        body: "Count shelves, reconcile variance, and lock the truth in one pass.",
      },
      {
        title: "Transfers",
        body: "Move stock between branches without dual spreadsheets.",
      },
      {
        title: "Supply batches",
        body: "Receive purchases, track suppliers, and update cost in place.",
      },
      {
        title: "Low-stock alerts",
        body: "Know what is running out before the shelf goes empty.",
      },
    ],
  },
  {
    index: "03",
    name: "Storefront",
    summary: "Your branded shop, live on the same ledger as the counter.",
    details: [
      {
        title: "Branded shop",
        body: "Logo, colors, and catalog — publish on your subdomain in minutes.",
      },
      {
        title: "Cart & checkout",
        body: "Customers browse and pay with M-Pesa from the same stock.",
      },
      {
        title: "Custom domain",
        body: "Map yourshop.com when the brand is ready — SSL included.",
      },
      {
        title: "Live inventory",
        body: "What cashiers see is what shoppers can buy. No double entry.",
      },
    ],
  },
  {
    index: "04",
    name: "Analytics",
    summary: "Numbers from the till — not a bolt-on reporting tool.",
    details: [
      {
        title: "Revenue & P&L",
        body: "Day, week, and month views tied to real sales and costs.",
      },
      {
        title: "Category performance",
        body: "See what moves, what stalls, and where margin hides.",
      },
      {
        title: "Staff reports",
        body: "Shift totals and cashier performance without extra exports.",
      },
      {
        title: "Branch compare",
        body: "Spot the location that needs stock, staffing, or attention.",
      },
    ],
  },
] as const;

export function LandingStats() {
  const [active, setActive] = useState(0);
  const pillar = PILLARS[active] ?? PILLARS[0];

  return (
    <section
      className="section-reveal landing-pillars relative overflow-hidden px-4 py-16 sm:px-10 sm:py-24"
      style={landingDarkSectionStyle()}
    >
      <div aria-hidden className="landing-pillars-glow" />
      <div className="relative z-10 mx-auto max-w-[1100px]">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--kiosk-gold)]">
              One platform · four pillars
            </p>
            <h2 className="font-heading text-[clamp(26px,5vw,44px)] leading-[1.12] tracking-[-0.02em] text-[var(--kiosk-text)]">
              The whole shop,
              <br className="hidden sm:block" /> one till.
            </h2>
          </div>
          <p className="max-w-[22rem] text-sm leading-[1.65] text-[var(--kiosk-text-muted)]">
            Every pillar reads from the same stock count and writes to the same
            ledger — nothing to sync, nothing to reconcile.
          </p>
        </div>

        <div className="landing-pillar-board">
          <nav className="landing-pillar-rail" aria-label="Platform pillars">
            {PILLARS.map((p, i) => {
              const selected = i === active;
              return (
                <button
                  key={p.name}
                  type="button"
                  className={`landing-pillar-tab ${selected ? "is-active" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setActive(i)}
                >
                  <span className="landing-pillar-tab-index">{p.index}</span>
                  <span className="landing-pillar-tab-name">{p.name}</span>
                  <span className="landing-pillar-tab-chevron" aria-hidden>
                    ›
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="landing-pillar-panel">
            <p className="landing-pillar-panel-kicker">{pillar.index} · {pillar.name}</p>
            <h3 className="landing-pillar-panel-title">{pillar.summary}</h3>
            <ul className="landing-pillar-details">
              {pillar.details.map((d) => (
                <li key={d.title} className="landing-pillar-detail">
                  <div className="landing-pillar-detail-mark" aria-hidden />
                  <div>
                    <p className="landing-pillar-detail-title">{d.title}</p>
                    <p className="landing-pillar-detail-body">{d.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

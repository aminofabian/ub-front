"use client";

import { useEffect, useState } from "react";

import { exampleShopHost, PLATFORM_DOMAIN } from "./landing-host";
import { LandingSectionHeader } from "./landing-section-header";
import {
  landingBentoCardClass,
  landingCardPadding,
  landingSectionClass,
  landingSectionHeaderMb,
  sectionLabelClass,
} from "./landing-styles";

export function LandingFeatures() {
  // SSR-safe default; exampleShopHost() reads window and differs on the client.
  const [shopHost, setShopHost] = useState(`yourshop.${PLATFORM_DOMAIN}`);

  useEffect(() => {
    setShopHost(exampleShopHost());
  }, []);
  return (
    <section id="features" className={`section-reveal ${landingSectionClass}`}>
      <div className="mx-auto max-w-[1100px]">
        <LandingSectionHeader
          index="01"
          label="Platform"
          title="POS, inventory, storefront, and analytics — in one system."
          description="One stock count behind the register and your online shop. No bolt-ons, no duplicate spreadsheets."
          className={landingSectionHeaderMb}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div
            className={`${landingBentoCardClass} ${landingCardPadding} md:col-span-2`}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-[280px] w-[280px]"
              style={{
                background:
                  "radial-gradient(ellipse at top right, var(--kiosk-gold-soft) 0%, transparent 70%)",
              }}
            />
            <p className={`${sectionLabelClass} mb-4`}>Point of sale</p>
            <h3 className="mb-4 font-heading text-2xl leading-[1.15] text-[var(--kiosk-text)] sm:text-[28px]">
              Checkout in seconds,
              <br />
              not steps.
            </h3>
            <p className="max-w-[380px] text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
              A fast, offline-ready POS with a built-in barcode scanner. Process
              sales, accept M-Pesa, split payments, apply discounts, and print
              receipts — all from one screen.
            </p>

            {/* Mini POS mockup */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <div
                className="flex-1 rounded-[10px] border p-4"
                style={{
                  backgroundColor: "var(--kiosk-elevated)",
                  borderColor: "var(--kiosk-border-soft)",
                }}
              >
                {[
                  { name: "Bottled Water 500ml", price: 45 },
                  { name: "White Bread 400g", price: 65 },
                  { name: "Milk 1L", price: 75 },
                ].map((item, i) => (
                  <div
                    key={item.name}
                    className="flex justify-between py-2 text-xs"
                    style={{
                      borderBottom:
                        i < 2 ? "1px solid var(--kiosk-border-soft)" : "none",
                    }}
                  >
                    <span className="text-[var(--kiosk-text-muted)]">
                      {item.name}
                    </span>
                    <span className="text-[var(--kiosk-text)]">
                      KES {item.price}
                    </span>
                  </div>
                ))}
                <div
                  className="mt-4 rounded-none py-3 text-center text-xs font-medium text-[var(--kiosk-cta-text)]"
                  style={{ backgroundColor: "var(--kiosk-gold)" }}
                >
                  Charge KES 185
                </div>
              </div>
              {/* Numpad hint */}
              <div className="hidden w-[100px] flex-col gap-2 sm:flex">
                {[
                  ["1", "2", "3"],
                  ["4", "5", "6"],
                  ["7", "8", "9"],
                ].map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    {row.map((n) => (
                      <div
                        key={n}
                        className="flex aspect-square flex-1 items-center justify-center rounded-md border text-[13px]"
                        style={{
                          backgroundColor: "var(--kiosk-panel)",
                          borderColor: "var(--kiosk-border-soft)",
                          color: "var(--kiosk-text-soft)",
                        }}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Small card — Inventory */}
          <div className={`${landingBentoCardClass} ${landingCardPadding}`}>
            <p className={`${sectionLabelClass} mb-4`}>Real-time inventory</p>
            <h3
              className="mb-4 font-heading text-2xl leading-[1.2] text-[var(--kiosk-text)]"
            >
              Stock truth, everywhere at once.
            </h3>
            <p className="text-sm leading-[1.6] text-[var(--kiosk-text-soft)]">
              Real-time stock across every branch and your online store. Run
              stock-takes, transfer between locations, track supply batches, and
              get low-stock alerts automatically.
            </p>

            <div className="mt-7 flex flex-col gap-2.5">
              {[
                { name: "Bread 400g", stock: 24, pct: 80 },
                { name: "Milk 1L", stock: 8, pct: 27 },
                { name: "Sugar 2kg", stock: 3, pct: 10 },
              ].map((item) => (
                <div key={item.name}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs text-[var(--kiosk-text-muted)]">
                      {item.name}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color:
                          item.stock < 5
                            ? "var(--kiosk-danger)"
                            : "var(--kiosk-text-soft)",
                      }}
                    >
                      {item.stock} left
                    </span>
                  </div>
                  <div
                    className="h-[3px] overflow-hidden rounded-sm"
                    style={{
                      backgroundColor: "var(--kiosk-border)",
                    }}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor:
                          item.stock < 5
                            ? "var(--kiosk-danger-bar)"
                            : "var(--kiosk-gold)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Small card — Storefront */}
          <div className={`${landingBentoCardClass} ${landingCardPadding}`}>
            <p className={`${sectionLabelClass} mb-4`}>Online storefront</p>
            <h3
              className="mb-4 font-heading text-2xl leading-[1.2] text-[var(--kiosk-text)]"
            >
              Your branded shop, live in minutes.
            </h3>
            <p className="text-sm leading-[1.6] text-[var(--kiosk-text-soft)]">
              Publish a branded online store with your logo and colors.
              Customers browse, add to cart, and check out with M-Pesa — all
              pulling from your live inventory.
            </p>
            <div className="mt-7 inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: "var(--kiosk-success)",
                  boxShadow: "0 0 0 2px var(--kiosk-success-shadow)",
                }}
              />
              <span
                className="break-all text-xs sm:break-normal"
                style={{ color: "var(--kiosk-success)" }}
              >
                {shopHost} is live
              </span>
            </div>
          </div>

          {/* Large card — Multi-branch */}
          <div className={`${landingBentoCardClass} ${landingCardPadding} md:col-span-2`}>
            <p className={`${sectionLabelClass} mb-4`}>Multi-branch</p>
            <h3 className="mb-4 font-heading text-2xl leading-[1.15] text-[var(--kiosk-text)] sm:text-[28px]">
              One dashboard.
              <br />
              Every location.
            </h3>
            <p className="max-w-[440px] text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
              Add branches, assign staff with role-based permissions, track
              shifts, manage suppliers and purchase orders, and transfer stock —
              all from one dashboard.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  branch: "Westlands",
                  sales: "KES 42,100",
                  status: "Open",
                },
                {
                  branch: "Karen",
                  sales: "KES 31,800",
                  status: "Open",
                },
                {
                  branch: "CBD",
                  sales: "KES 10,420",
                  status: "Closed",
                },
              ].map((b) => (
                <div
                  key={b.branch}
                  className="rounded-lg border p-3.5"
                  style={{
                    backgroundColor: "var(--kiosk-elevated)",
                    borderColor: "var(--kiosk-border-soft)",
                  }}
                >
                  <div
                    className="mb-1.5 text-[11px]"
                    style={{ color: "var(--kiosk-text-dim)" }}
                  >
                    {b.branch}
                  </div>
                  <div className="mb-1.5 text-base font-medium text-[var(--kiosk-text)]">
                    {b.sales}
                  </div>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px]"
                    style={{
                      backgroundColor:
                        b.status === "Open"
                          ? "var(--kiosk-success-bg)"
                          : "var(--kiosk-danger-bg)",
                      color:
                        b.status === "Open"
                          ? "var(--kiosk-success)"
                          : "var(--kiosk-danger)",
                    }}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

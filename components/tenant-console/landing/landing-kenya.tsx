"use client";

import { PLATFORM_AUDIENCES } from "@/lib/platform-seo-content";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingSectionAltClass,
  landingSectionBorderClass,
  landingSectionHeaderMb,
} from "./landing-styles";

/** Who Kiosk POS is built for — Kenya retail long-tail keywords. */
export function LandingKenya() {
  return (
    <section
      id="kenya"
      className={`section-reveal ${landingSectionBorderClass} ${landingSectionAltClass}`}
      aria-labelledby="kenya-heading"
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          label="Built for Kenya"
          title={
            <span id="kenya-heading">
              POS for every kind of Kenyan shop.
            </span>
          }
          description="From a single duka to multi-branch retail — the same point of sale, M-Pesa, and inventory stack."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[560px]"
        />

        <ul className="landing-kenya-grid">
          {PLATFORM_AUDIENCES.map((item) => (
            <li key={item.title} className="landing-kenya-item">
              <h3 className="landing-kenya-title">{item.title}</h3>
              <p className="landing-kenya-body">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

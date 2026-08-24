"use client";

import Link from "next/link";

import { PLATFORM_GUIDES } from "@/lib/platform-seo-content";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingSectionAltClass,
  landingSectionBorderClass,
  landingSectionHeaderMb,
} from "./landing-styles";

/** Internal links to POS Kenya pillar content for topical authority. */
export function LandingGuides() {
  return (
    <section
      id="guides"
      className={`section-reveal ${landingSectionBorderClass} ${landingSectionAltClass}`}
      aria-labelledby="guides-heading"
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          label="Guides"
          title={
            <span id="guides-heading">
              Learn how POS works in Kenya.
            </span>
          }
          description="Rankings, setup playbooks, and M-Pesa guidance — written for shop owners on the floor."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[520px]"
        />

        <ul className="landing-guides">
          {PLATFORM_GUIDES.map((guide, i) => (
            <li key={guide.href}>
              <Link href={guide.href} className="landing-guide-row">
                <span className="landing-guide-code" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="landing-guide-title">{guide.title}</h3>
                  <p className="landing-guide-blurb">{guide.blurb}</p>
                </div>
                <span className="landing-guide-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-[var(--kiosk-text-faint)]">
          More on the{" "}
          <Link
            href="/blog"
            className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
          >
            Kiosk blog
          </Link>{" "}
          and in{" "}
          <Link
            href="/help/merchants"
            className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
          >
            merchant help
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

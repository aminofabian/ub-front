"use client";

import { PLATFORM_FAQS } from "@/lib/platform-seo-content";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingSectionClass,
  landingSectionHeaderMb,
} from "./landing-styles";

/** FAQ targeting POS Kenya search intent — mirrored in FAQPage JSON-LD. */
export function LandingFaq() {
  return (
    <section
      id="faq"
      className={`section-reveal ${landingSectionClass}`}
      aria-labelledby="faq-heading"
    >
      <div className="relative mx-auto max-w-[800px]">
        <LandingSectionHeader
          label="FAQ"
          title={
            <span id="faq-heading">POS in Kenya — questions we hear.</span>
          }
          description="Straight answers on M-Pesa, offline sales, pricing, and setup for Kenyan shops."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[520px]"
        />

        <div className="landing-faq">
          {PLATFORM_FAQS.map((faq) => (
            <details key={faq.question} className="landing-faq-item">
              <summary className="landing-faq-q">
                <span>{faq.question}</span>
                <span className="landing-faq-icon" aria-hidden>
                  +
                </span>
              </summary>
              <p className="landing-faq-a">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

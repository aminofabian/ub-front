"use client";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingSectionAltClass,
  landingSectionClass,
  landingSectionHeaderMb,
} from "./landing-styles";

const STORIES = [
  {
    code: "S-01",
    quote:
      "Running two branches with one inventory used to mean a person reconciling stock every evening. Kiosk makes that role unnecessary.",
    title: "Multi-branch retailers",
    detail: "Real-time stock across locations",
  },
  {
    code: "S-02",
    quote:
      "We needed a POS that works when the internet doesn't. Kiosk's offline mode keeps us selling through outages — sales sync automatically when we're back online.",
    title: "High-volume counters",
    detail: "Offline-ready point of sale",
  },
  {
    code: "S-03",
    quote:
      "Our customers can now browse and order online from the same inventory our cashiers see at the register. One system, one stock count, zero confusion.",
    title: "Shops going online",
    detail: "Storefront + POS, unified",
  },
] as const;

export function LandingTestimonials() {
  return (
    <section
      id="stories"
      className={`section-reveal ${landingSectionClass} ${landingSectionAltClass}`}
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          index="03"
          label="Stories"
          title="Heard from the floor."
          description="Scenarios we built for — told in the language of people who actually run the till."
          className={landingSectionHeaderMb}
        />

        <div className="landing-stories">
          {STORIES.map((story) => (
            <article key={story.code} className="landing-story">
              <header className="landing-story-head">
                <span className="landing-story-code">{story.code}</span>
                <span className="landing-story-mark" aria-hidden>
                  Floor note
                </span>
              </header>

              <p className="landing-story-quote">{story.quote}</p>

              <div className="landing-story-dash" aria-hidden />

              <footer className="landing-story-foot">
                <p className="landing-story-title">{story.title}</p>
                <p className="landing-story-detail">{story.detail}</p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

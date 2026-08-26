"use client";

import { useCallback, useRef, useState } from "react";

import {
  BeautyEditCard,
} from "@/components/storefront/templates/store/beauty-edit-card";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export function BeautyEditCarousel({
  items,
  currency,
}: {
  items: PublicCatalogItemCard[];
  currency: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 4));

  const scrollToPage = useCallback((page: number) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    track.scrollTo({ left: page * width, behavior: "smooth" });
    setActiveDot(page);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={styles.carouselSection} aria-label="Our bestsellers">
      <div className={styles.sectionIntro}>
        <h2 className={styles.sectionTitle}>Our Bestsellers</h2>
        <p className={styles.sectionSub}>Pieces customers return for</p>
      </div>
      <div
        ref={trackRef}
        className={styles.carouselTrack}
        onScroll={() => {
          const track = trackRef.current;
          if (!track || track.clientWidth === 0) return;
          setActiveDot(Math.round(track.scrollLeft / track.clientWidth));
        }}
      >
        {items.map((item) => (
          <BeautyEditCard key={item.id} item={item} currency={currency} compact />
        ))}
      </div>
      {pages > 1 ? (
        <div className={styles.carouselDots} role="tablist" aria-label="Carousel pages">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={activeDot === i}
              className={cn(styles.dot, activeDot === i && styles.dotActive)}
              onClick={() => scrollToPage(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

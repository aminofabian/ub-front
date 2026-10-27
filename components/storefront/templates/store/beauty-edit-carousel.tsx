"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { BeautyEditCard } from "@/components/storefront/templates/store/beauty-edit-card";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export function BeautyEditCarousel({
  items,
  currency,
  totalCount,
}: {
  items: PublicCatalogItemCard[];
  currency: string;
  totalCount?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setPages(Math.max(1, Math.round(track.scrollWidth / track.clientWidth)));
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, items.length]);

  const scrollToPage = useCallback((page: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: page * track.clientWidth, behavior: "smooth" });
    setActivePage(page);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={styles.showcase} aria-labelledby="be-bestsellers-title">
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadCopy}>
          <h2 id="be-bestsellers-title" className={styles.sectionTitle}>
            Bestsellers
          </h2>
          <p className={styles.sectionDek}>Pieces customers come back for</p>
        </div>
        <Link href={APP_ROUTES.shop} className={styles.sectionLink}>
          {totalCount && totalCount > items.length ? "View all" : "Shop all"}
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div
        ref={trackRef}
        className={styles.carouselTrack}
        onScroll={() => {
          const track = trackRef.current;
          if (!track || track.clientWidth === 0) return;
          setActivePage(Math.round(track.scrollLeft / track.clientWidth));
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
              aria-selected={activePage === i}
              aria-label={`Page ${i + 1}`}
              className={cn(styles.dot, activePage === i && styles.dotActive)}
              onClick={() => scrollToPage(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

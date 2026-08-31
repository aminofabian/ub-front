"use client";

import type { ReactNode, RefObject } from "react";

import styles from "@/components/storefront/storefront-catalog-sentinel.module.css";

export function StorefrontCatalogSentinel({
  sentinelRef,
  hasMore,
  loading,
  error,
  willAutoRetry,
  exhausted,
  onRetry,
  onRequestMore,
  variant = "shelf",
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  willAutoRetry?: boolean;
  exhausted: boolean;
  onRetry: () => void;
  onRequestMore: () => void;
  variant?: "shelf" | "quiet";
}) {
  let body: ReactNode = null;

  if (error) {
    body = (
      <div className={styles.error} role="alert">
        <p className={styles.status}>{error}</p>
        {willAutoRetry ? (
          <p className={styles.status}>Trying that shelf again</p>
        ) : (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try that shelf again
          </button>
        )}
      </div>
    );
  } else if (exhausted) {
    body = <p className={styles.end}>That&apos;s the lot</p>;
  } else if (hasMore && variant === "quiet") {
    body = (
      <span className="sr-only">
        {loading ? "Loading more products" : "Scroll for more products"}
      </span>
    );
  } else if (hasMore) {
    body = (
      <div
        className={styles.aisle}
        data-loading={loading ? "true" : "false"}
      >
        <div className={styles.shelf} aria-hidden>
          <span className={styles.slot} />
          <span className={styles.slot} />
          <span className={styles.slot} />
          <span className={styles.slot} />
          <span className={styles.ticker} />
        </div>
        <p className={styles.status}>
          {loading ? "The next shelf is coming" : "More down the aisle"}
        </p>
        {!loading ? (
          <button type="button" className={styles.more} onClick={onRequestMore}>
            Show the next shelf
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={sentinelRef}
      className={!body || (hasMore && variant === "quiet" && !error) ? styles.quiet : undefined}
      aria-busy={loading}
      aria-live="polite"
    >
      {body}
    </div>
  );
}

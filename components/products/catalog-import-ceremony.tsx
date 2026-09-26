"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, ShieldAlert } from "lucide-react";

import type { GlobalCatalogAdoptProgress } from "@/lib/api";

import styles from "./catalog-import-ceremony.module.css";

type CatalogImportCeremonyProps = {
  progress: GlobalCatalogAdoptProgress;
};

function phaseTitle(
  progress: GlobalCatalogAdoptProgress,
  done: boolean,
): string {
  if (done) return "Products are on the shelf";
  if (progress.phase === "queued") return "Getting ready to upload";
  if (progress.phase === "finishing") return "Finishing the upload";
  return "Uploading your products";
}

function phaseHint(
  progress: GlobalCatalogAdoptProgress,
  done: boolean,
): string {
  if (done) {
    return "You can keep working — everything from this batch is saved.";
  }
  if (progress.phase === "queued") {
    return "Stay on this screen. Closing or refreshing will interrupt the upload.";
  }
  return "Please don’t leave, refresh, or close this tab until the upload finishes.";
}

export function CatalogImportCeremony({ progress }: CatalogImportCeremonyProps) {
  const done = progress.phase === "finishing" || progress.percent >= 100;
  const percent = Math.max(0, Math.min(100, progress.percent));
  const filled = Math.round((percent / 100) * 12);
  const title = phaseTitle(progress, done);
  const hint = phaseHint(progress, done);
  const detail =
    progress.message?.trim() ||
    `${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} products`;

  useEffect(() => {
    if (done) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [done]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const node = (
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-labelledby="catalog-import-title"
      aria-describedby="catalog-import-hint"
    >
      <div className={styles.backdrop} aria-hidden />
      <div className={styles.card}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.header}>
          <div className={styles.badge}>
            {done ? (
              <span className={styles.badgeDotDone} aria-hidden />
            ) : (
              <Loader2 className={styles.spinner} aria-hidden />
            )}
            <span>{done ? "Complete" : "Live upload"}</span>
          </div>
          <p className={styles.percent}>
            {percent}
            <span className={styles.percentMark}>%</span>
          </p>
        </div>

        <h2 id="catalog-import-title" className={styles.title}>
          {title}
        </h2>
        <p id="catalog-import-hint" className={styles.hint}>
          {hint}
        </p>

        {!done ? (
          <div className={styles.warning} role="status">
            <ShieldAlert className={styles.warningIcon} aria-hidden />
            <p>
              Products are uploading now. Keep this window open — navigating
              away can leave the catalogue half-filled.
            </p>
          </div>
        ) : null}

        <p className={styles.detail} key={detail}>
          {detail}
        </p>

        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className={styles.fill}
            style={{ transform: `scaleX(${percent / 100})` }}
          />
          {!done ? <div className={styles.shimmer} aria-hidden /> : null}
        </div>

        <div className={styles.cells} aria-hidden>
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              className={
                index < filled ? `${styles.cell} ${styles.cellOn}` : styles.cell
              }
              style={{ transitionDelay: `${index * 18}ms` }}
            />
          ))}
        </div>

        <p className={styles.footer}>
          {done
            ? `${progress.total.toLocaleString()} products ready`
            : `${Math.min(progress.processed, progress.total).toLocaleString()} / ${progress.total.toLocaleString()} products`}
        </p>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(node, document.body);
}

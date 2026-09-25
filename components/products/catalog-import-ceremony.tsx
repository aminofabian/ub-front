"use client";

import type { GlobalCatalogAdoptProgress } from "@/lib/api";

import styles from "./catalog-import-ceremony.module.css";

type CatalogImportCeremonyProps = {
  progress: GlobalCatalogAdoptProgress;
};

export function CatalogImportCeremony({ progress }: CatalogImportCeremonyProps) {
  const done = progress.phase === "finishing" || progress.percent >= 100;
  const percent = Math.max(0, Math.min(100, progress.percent));
  const filled = Math.round((percent / 100) * 12);
  const title = done
    ? "Sheet locked in"
    : progress.phase === "queued"
      ? "Lining up the rows"
      : "Filling the sheet";

  return (
    <div className={styles.dock} role="status" aria-live="polite">
      <div className={styles.row}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{title}</p>
          <p className={styles.name} key={progress.message ?? progress.processed}>
            {progress.message ||
              `${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()}`}
          </p>
        </div>
        <p className={styles.percent}>
          {percent}
          <span className="ml-0.5 text-sm font-medium">%</span>
        </p>
      </div>
      <div className={styles.track} aria-hidden>
        <div
          className={styles.fill}
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
      <div className={styles.cells} aria-hidden>
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className={index < filled ? `${styles.cell} ${styles.cellOn}` : styles.cell}
            style={{ transitionDelay: `${index * 18}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

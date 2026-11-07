"use client";

import { useEffect, useState } from "react";

import { NumberField } from "@/components/price-tags/price-tag-inputs";
import {
  useCatalogRun,
  type CatalogDestination,
  type CatalogScope,
} from "@/components/price-tags/use-catalog-run";
import {
  CATALOG_BTN_GHOST,
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
} from "@/app/(dashboard)/products/_components/catalog-chrome";
import { MAX_RUN_COPIES, type CatalogRunProgress } from "@/lib/price-tags/catalog-run";
import type { LabelPrinterSettings } from "@/lib/price-tags/label-printer";
import type { TagDrawJob } from "@/lib/price-tags/pdf";
import { cn } from "@/lib/utils";

function n(value: number): string {
  return value.toLocaleString("en-KE");
}

function ProgressLine({ progress }: { progress: CatalogRunProgress }) {
  const total = progress.total ?? 0;
  const share = total > 0 ? Math.min(100, Math.round((progress.position / total) * 100)) : 0;
  const skipped = progress.skippedUnpriced + progress.skippedUnsellable;
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-full overflow-hidden bg-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
      >
        <div className="h-full bg-[#1D4B3B] transition-[width]" style={{ width: `${share}%` }} />
      </div>
      <p className="text-[12px] tabular-nums text-[#556159]">
        {n(progress.position)} of {progress.total == null ? "…" : n(total)} products · {n(progress.tagsSent)} tags sent
        {skipped > 0 ? ` · ${n(skipped)} skipped` : ""}
        {progress.skippedUnpriced > 0 ? ` (${n(progress.skippedUnpriced)} without a price)` : ""}
      </p>
    </div>
  );
}

/**
 * "Print everything that matches": a non-stop run over the product list's
 * current filters, straight to the label printer or into one PDF.
 */
export function PriceTagCatalogRun({
  scope,
  job,
  rowGapMm,
  printer,
  labelPrinterReady,
  onClose,
  onRunningChange,
  confirmLabelRoll,
}: {
  scope: CatalogScope;
  job: Omit<TagDrawJob, "products" | "pages" | "wasOverrides">;
  rowGapMm: number;
  printer: LabelPrinterSettings;
  /** True when a label roll and a label printer are both set. */
  labelPrinterReady: boolean;
  onClose: () => void;
  /** Lets the page refuse a new scope while this run is still sending. */
  onRunningChange: (running: boolean) => void;
  /** False when the person cancels printing a roll size the printer was not taught. */
  confirmLabelRoll: () => boolean;
}) {
  const run = useCatalogRun({ scope, job, rowGapMm, printer });

  useEffect(() => {
    onRunningChange(run.running);
  }, [run.running, onRunningChange]);
  const [destination, setDestination] = useState<CatalogDestination>(labelPrinterReady ? "label-printer" : "pdf");
  const [copies, setCopies] = useState(1);
  const [skipUnpriced, setSkipUnpriced] = useState(true);
  const { state } = run;
  const settled = state.phase === "stopped" || state.phase === "failed";
  const begin = (startAt: number) => {
    if (destination === "label-printer" && !confirmLabelRoll()) return;
    void run.start({ destination, copies, skipUnpriced, startAt });
  };

  return (
    <section
      className="flex flex-col gap-2.5 border border-[#1D4B3B] bg-[var(--catalog-shelf,#FCFAF5)] px-3 py-3"
      aria-label="Print everything that matches"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--catalog-ink,#121A16)]">Print everything that matches</h2>
          <p className="text-[12.5px] text-[#556159]">{scope.summary}</p>
        </div>
        <button type="button" className={CATALOG_BTN_GHOST} disabled={run.running} onClick={onClose}>
          Close
        </button>
      </div>

      {state.phase === "ready" ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1" role="group" aria-label="Send to">
              {(["label-printer", "pdf"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={destination === option}
                  disabled={option === "label-printer" && !labelPrinterReady}
                  className={cn(
                    "h-8 border px-2.5 text-[12.5px] disabled:opacity-40",
                    destination === option
                      ? "border-[#1D4B3B] bg-[#1D4B3B] text-white"
                      : "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white",
                  )}
                  onClick={() => setDestination(option)}
                >
                  {option === "label-printer" ? "Label printer, non-stop" : "One PDF"}
                </button>
              ))}
            </div>
            <div className="w-28">
              <NumberField label="Copies each" value={copies} min={1} max={MAX_RUN_COPIES} onChange={setCopies} />
            </div>
            <label className="flex h-8 items-center gap-1.5 text-[12.5px]">
              <input type="checkbox" checked={skipUnpriced} onChange={(event) => setSkipUnpriced(event.target.checked)} />
              Skip products without a price
            </label>
          </div>
          <p className="text-[12px] leading-relaxed text-[#556159]">
            {labelPrinterReady
              ? "Products are read in batches, in the list's order, with today's prices, and sent as they are read. Pause or stop at any time; a stopped run picks up where it left off."
              : "To print non-stop, choose Label roll and a label printer above. Until then the run builds one PDF of every matching product."}{" "}
            The sheet on the right is not changed.
          </p>
          <button type="button" className={cn(CATALOG_BTN_PRIMARY, "self-start")} onClick={() => begin(0)}>
            Start
          </button>
        </>
      ) : (
        <>
          <ProgressLine progress={state.progress} />
          {state.phase === "failed" ? (
            <p className="text-[12.5px] text-[#A55237]">
              Stopped: {state.message}
              {state.uncertain ? " The last batch may have printed; check the labels before resuming." : ""}
            </p>
          ) : null}
          {state.phase === "done" ? (
            <p className="text-[12.5px] text-[#1D4B3B]">
              Done. {n(state.progress.tagsSent)} tags {destination === "pdf" ? "are in the PDF" : "sent to the printer"}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {state.phase === "running" ? (
              <button type="button" className={CATALOG_BTN_OUTLINE} onClick={run.pause}>
                Pause
              </button>
            ) : null}
            {state.phase === "paused" ? (
              <button type="button" className={CATALOG_BTN_PRIMARY} onClick={run.resume}>
                Resume
              </button>
            ) : null}
            {run.running ? (
              <button type="button" className={cn(CATALOG_BTN_GHOST, "text-[#A55237]")} onClick={run.stop}>
                Stop after this batch
              </button>
            ) : null}
            {settled ? (
              <button type="button" className={CATALOG_BTN_PRIMARY} onClick={() => begin(state.progress.position)}>
                Continue from product {n(state.progress.position + 1)}
              </button>
            ) : null}
            {!run.running ? (
              <button type="button" className={CATALOG_BTN_GHOST} onClick={run.reset}>
                Start over
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

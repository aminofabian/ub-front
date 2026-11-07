"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PriceTagActions, type OutputKind } from "@/components/price-tags/price-tag-actions";
import { PriceTagCatalogRun } from "@/components/price-tags/price-tag-catalog-run";
import { TAG_HAIRLINE, TAG_PANEL } from "@/components/price-tags/price-tag-chrome";
import { PriceTagLabelPrinter } from "@/components/price-tags/price-tag-label-printer";
import type { CatalogScope } from "@/components/price-tags/use-catalog-run";
import { PriceTagMediaBar } from "@/components/price-tags/price-tag-media-bar";
import { sendToLabelPrinter } from "@/components/price-tags/send-to-label-printer";
import { PriceTagPreview } from "@/components/price-tags/price-tag-preview";
import { PriceTagProductList } from "@/components/price-tags/price-tag-product-list";
import { PriceTagSettings } from "@/components/price-tags/price-tag-settings";
import { usePriceTagJob } from "@/components/price-tags/use-price-tag-job";
import { ProductsPageLayout } from "@/app/(dashboard)/products/_components/products-page-layout";
import { CATALOG_BTN_GHOST } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { barcodeSvgMarkup } from "@/lib/price-tags/barcode";
import { barcodeValueFor } from "@/lib/price-tags/face";
import { clampSkip, pageCount, paginateCells, resolveSheet } from "@/lib/price-tags/layout";
import type { TagRenderContext } from "@/lib/price-tags/markup";
import { downloadPriceTagsPdf } from "@/lib/price-tags/pdf";
import { printPriceTagPages } from "@/lib/price-tags/print";
import {
  calibrateLabelPrinter,
  printAlignmentToLabelPrinter,
  rollMismatchWarning,
  taughtRollOf,
  readLabelPrinter,
  writeLabelPrinter,
  type LabelPrinterSettings,
} from "@/lib/price-tags/label-printer";
import { NO_CALIBRATION, readPriceTagPreferences, writePriceTagPreferences } from "@/lib/price-tags/storage";
import { DEFAULT_LAYOUT } from "@/lib/price-tags/templates";
import type { PrinterCalibration, SavedTagLayout, TagLayout } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

function count(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n.toLocaleString("en-KE")} ${many}`;
}

function pdfFileName(): string {
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return `price-tags-${stamp}.pdf`;
}

export function PriceTagsWorkspace() {
  const { branchId, branchName } = useSessionBranch();
  const business = useSessionBootstrapSnapshot().business;
  const businessId = business?.id ?? "";
  const businessName = business?.branding?.displayName?.trim() || business?.name?.trim() || "";
  const currency = business?.currency;
  const job = usePriceTagJob(businessId, branchId);

  const [layout, setLayout] = useState<TagLayout>(() => ({ ...DEFAULT_LAYOUT, fields: DEFAULT_LAYOUT.fields.slice() }));
  const [saved, setSaved] = useState<SavedTagLayout[]>([]);
  const [calibration, setCalibration] = useState<PrinterCalibration>(NO_CALIBRATION);
  const [prefsFor, setPrefsFor] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [printFrom, setPrintFrom] = useState(1);
  const [printTo, setPrintTo] = useState(1);
  const [startAt, setStartAt] = useState(1);
  const [barcodes, setBarcodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<OutputKind | null>(null);
  const [catalogScope, setCatalogScope] = useState<CatalogScope | null>(null);
  const [catalogRunActive, setCatalogRunActive] = useState(false);
  const [labelPrinter, setLabelPrinterState] = useState<LabelPrinterSettings>({ queueName: "", flip: false, taughtRoll: null });

  useEffect(() => {
    setLabelPrinterState(readLabelPrinter());
  }, []);

  const setLabelPrinter = (next: LabelPrinterSettings) => {
    setLabelPrinterState(next);
    writeLabelPrinter(next);
  };

  useEffect(() => {
    if (!businessId || prefsFor === businessId) return;
    const stored = readPriceTagPreferences(businessId);
    setLayout(stored.layout);
    setSaved(stored.saved);
    setCalibration(stored.calibration);
    setPrefsFor(businessId);
  }, [businessId, prefsFor]);

  useEffect(() => {
    if (!businessId || prefsFor !== businessId) return;
    writePriceTagPreferences(businessId, { layout, saved, calibration });
  }, [businessId, prefsFor, layout, saved, calibration]);

  const geometry = useMemo(() => resolveSheet(layout), [layout]);
  const skip = clampSkip(startAt - 1, geometry.perPage);
  const pages = useMemo(
    () => paginateCells(job.instances, geometry.perPage, skip),
    [job.instances, geometry.perPage, skip],
  );
  const totalPages = pageCount(job.instances.length, geometry.perPage, skip);

  useEffect(() => {
    setPrintFrom(1);
    setPrintTo(totalPages);
    setPageIndex((current) => Math.min(current, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const barcodeKey = useMemo(() => {
    const codes = new Set<string>();
    if (layout.fields.includes("barcode")) {
      for (const id of job.selectedIds) {
        const product = job.products.get(id);
        const code = product ? barcodeValueFor(product, layout) : "";
        if (code) codes.add(code);
      }
    }
    return Array.from(codes).sort().join("\n");
  }, [job.selectedIds, job.products, layout]);

  useEffect(() => {
    // Only draw codes that are new; a big sheet would otherwise redraw hundreds per edit.
    setBarcodes((current) => {
      const next: Record<string, string> = {};
      for (const code of barcodeKey ? barcodeKey.split("\n") : []) {
        next[code] = current[code] ?? barcodeSvgMarkup(code);
      }
      return next;
    });
  }, [barcodeKey]);

  const context: TagRenderContext = {
    layout,
    geometry,
    businessName,
    currency,
    products: job.products,
    wasOverrides: job.wasOverrides,
    barcodes,
  };

  // A multi-across roll prints whole rows; a part-filled last row wastes labels.
  const blankInLastRow =
    layout.media === "label-roll" && geometry.perPage > 1 && job.instances.length > 0
      ? (geometry.perPage - (job.instances.length % geometry.perPage)) % geometry.perPage
      : 0;

  const unpricedIds = job.selectedIds.filter((id) => {
    const product = job.products.get(id);
    return product != null && product.sellingPrice == null;
  });

  async function runOutput(kind: OutputKind) {
    if (kind === "label" && !labelPrinter.queueName.trim()) {
      toast.error("Choose the label printer first, under the roll settings.");
      return;
    }
    if (kind === "label" && !confirmLabelRoll()) return;
    if (job.instances.length === 0 || busy) return;
    setBusy(kind);
    try {
      const outcome = await job.refreshForOutput();
      if (outcome.failed.length > 0) {
        toast.error(
          `Could not confirm the price of ${count(outcome.failed.length, "product", "products")}. Check the connection and try again.`,
        );
        return;
      }
      if (outcome.unavailable.length > 0) {
        toast.warning(
          `${count(outcome.unavailable.length, "product is", "products are")} no longer for sale and left the sheet. Check it, then print again.`,
        );
        return;
      }
      if (outcome.changed.length > 0) {
        toast.message(`${count(outcome.changed.length, "price has", "prices have")} changed since you added them. The tags use today's prices.`);
      }
      // A refreshed product may carry a new barcode or SKU; draw any code the preview never drew.
      const liveBarcodes = { ...barcodes };
      if (layout.fields.includes("barcode")) {
        for (const id of job.selectedIds) {
          const product = outcome.products.get(id);
          const code = product ? barcodeValueFor(product, layout) : "";
          if (code && !liveBarcodes[code]) liveBarcodes[code] = barcodeSvgMarkup(code);
        }
      }
      const live: TagRenderContext = { ...context, products: outcome.products, barcodes: liveBarcodes };
      const start = Math.max(1, Math.min(printFrom, printTo, totalPages));
      const end = Math.min(totalPages, Math.max(printFrom, printTo));
      if (kind === "print") {
        if (!printPriceTagPages(pages, live, start, end, { offset: calibration, skip })) {
          toast.error("Could not open the print dialog");
        }
        return;
      }
      if (kind === "label") {
        await sendToLabelPrinter({
          job: {
            layout,
            geometry,
            pages: [],
            products: outcome.products,
            wasOverrides: job.wasOverrides,
            businessName,
            currency,
            calibration,
          },
          rows: pages.slice(start - 1, end),
          rowGapMm: layout.rollRowGapMm,
          printer: labelPrinter,
        });
        return;
      }
      await downloadPriceTagsPdf({
        layout,
        geometry,
        pages: pages.slice(start - 1, end),
        products: outcome.products,
        wasOverrides: job.wasOverrides,
        businessName,
        currency,
        calibration,
        fileName: pdfFileName(),
      });
    } catch {
      toast.error(
        kind === "print"
          ? "Could not open the print dialog"
          : kind === "label"
            ? "Could not prepare the labels"
            : "Could not build the PDF",
      );
    } finally {
      setBusy(null);
    }
  }

  /** Ask before printing a roll size the printer was not taught. */
  function confirmLabelRoll(): boolean {
    const warning = rollMismatchWarning(labelPrinter, geometry);
    return warning == null || window.confirm(warning);
  }

  return (
    <ProductsPageLayout className="max-w-none">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {/*
          The picker scrolls as one column (a fieldset cannot shrink as a flex
          item, so the list must not try to scroll inside it); the search and
          filters stay pinned at its top. On a phone it takes the upper half.
        */}
        <section
          className={cn(
            "flex max-h-[48vh] min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain lg:max-h-none lg:w-[24rem]",
            TAG_PANEL,
          )}
        >
          <header className={cn("flex items-start justify-between gap-2 border-b px-3 py-3", TAG_HAIRLINE)}>
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-cormorant)] text-[1.65rem] font-normal leading-none text-[var(--catalog-ink,#121A16)]">
                Price tags
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">
                {job.restoring
                  ? "Loading your last sheet…"
                  : job.selectedIds.length === 0
                    ? "Nothing selected"
                    : `${count(job.selectedIds.length, "product", "products")} · ${count(job.instances.length, "tag", "tags")}`}
                {branchName ? ` · ${branchName}` : ""}
              </p>
            </div>
            {job.instances.length > 0 ? (
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, "shrink-0 text-[#A55237]")}
                disabled={busy != null}
                onClick={() => {
                  if (window.confirm(`Clear all ${job.instances.length} tags from the sheet?`)) job.clearAll();
                }}
              >
                Clear sheet
              </button>
            ) : null}
          </header>
          {/* Locked while prices are checked: the job prints the sheet as it was when Print was pressed. */}
          <fieldset disabled={busy != null} aria-busy={busy != null} className="m-0 min-w-0 border-0 p-0">
            <PriceTagProductList
              job={job}
              branchId={branchId}
              currency={currency}
              showWasInput={layout.fields.includes("previousPrice")}
              showBarcode={layout.fields.includes("barcode")}
              onShowBarcode={(on) =>
                setLayout((current) => ({
                  ...current,
                  generateBarcodeFromSku: false,
                  fields: on
                    ? current.fields.includes("barcode")
                      ? current.fields
                      : current.fields.concat("barcode")
                    : current.fields.filter((field) => field !== "barcode"),
                }))
              }
            onPrintAll={(scope) => {
              if (catalogRunActive) {
                toast.message("A print run is still going. Stop it before starting another.");
                return;
              }
              setCatalogScope(scope);
            }}
            />
          </fieldset>
        </section>

        {/* Scrolls as a whole: the roll set-up and printer panel must not squash the preview. */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          <div className={cn(TAG_PANEL, "flex flex-col gap-3 p-3")}>
          <PriceTagMediaBar layout={layout} geometry={geometry} onLayout={setLayout} />
          {layout.media === "label-roll" ? (
            <PriceTagLabelPrinter
              settings={labelPrinter}
              onChange={setLabelPrinter}
              onCalibrate={() =>
                calibrateLabelPrinter(labelPrinter, {
                  widthMm: geometry.pageWidthMm,
                  heightMm: geometry.pageHeightMm,
                  rowGapMm: layout.rollRowGapMm,
                })
                  .then(() => {
                    setLabelPrinter({ ...labelPrinter, taughtRoll: taughtRollOf(geometry) });
                    toast.success("Sent. The printer feeds a few labels while it measures; then print the alignment test.");
                  })
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Could not reach the label printer.");
                  })
              }
            />
          ) : null}
          <PriceTagActions
            layout={layout}
            geometry={geometry}
            totalPages={totalPages}
            printFrom={printFrom}
            printTo={printTo}
            startAt={startAt}
            busy={busy}
            canOutput={job.instances.length > 0 && busy == null && !job.restoring}
            labelPrinterReady={labelPrinter.queueName.trim() !== ""}
            onLayout={setLayout}
            onPrintFrom={setPrintFrom}
            onPrintTo={setPrintTo}
            onStartAt={setStartAt}
            onOutput={(kind) => void runOutput(kind)}
          />
          </div>

          {blankInLastRow > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#556159]">
              <p>
                The last row of the roll has {count(blankInLastRow, "blank label", "blank labels")}.
              </p>
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, "text-[#1D4B3B] underline underline-offset-2")}
                disabled={busy != null}
                onClick={() => {
                  const last = job.instances[job.instances.length - 1];
                  for (let index = 0; index < blankInLastRow; index += 1) job.duplicateTag(last.key);
                }}
              >
                Fill it with copies of the last tag
              </button>
            </div>
          ) : null}

          {unpricedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#A55237]">
              <p>
                {count(unpricedIds.length, "selected product has", "selected products have")} no selling price; their
                tags will read “No price”.
              </p>
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, "text-[#A55237] underline underline-offset-2")}
                disabled={busy != null}
                onClick={() => job.dropProducts(unpricedIds)}
              >
                Remove them
              </button>
            </div>
          ) : null}

          {catalogScope ? (
            <PriceTagCatalogRun
              key={`${catalogScope.summary}|${catalogScope.search}`}
              scope={catalogScope}
              job={{ layout, geometry, businessName, currency, calibration }}
              rowGapMm={layout.rollRowGapMm}
              printer={labelPrinter}
              labelPrinterReady={layout.media === "label-roll" && labelPrinter.queueName.trim() !== ""}
              onClose={() => setCatalogScope(null)}
              onRunningChange={setCatalogRunActive}
              confirmLabelRoll={confirmLabelRoll}
            />
          ) : null}

          <PriceTagPreview
            pages={pages}
            pageIndex={pageIndex}
            skip={skip}
            context={context}
            onPageIndex={setPageIndex}
            onReorder={(from, to) => {
              if (!busy) job.reorder(from, to);
            }}
            onRemove={(key) => {
              if (!busy) job.removeTag(key);
            }}
            onDuplicate={(key) => {
              if (!busy) job.duplicateTag(key);
            }}
          />

          <PriceTagSettings
            layout={layout}
            geometry={geometry}
            calibration={calibration}
            saved={saved}
            onLayout={setLayout}
            onCalibration={setCalibration}
            onSaved={setSaved}
            onPrintAlignment={
              layout.media === "label-roll" && labelPrinter.queueName
                ? () => {
                    void printAlignmentToLabelPrinter(geometry, calibration, layout.rollRowGapMm, labelPrinter)
                      .then(() => toast.success(`Alignment test sent to ${labelPrinter.queueName}.`))
                      .catch((error: unknown) =>
                        toast.error(error instanceof Error ? error.message : "Could not send the alignment test."),
                      );
                  }
                : undefined
            }
          />
        </section>
      </div>
    </ProductsPageLayout>
  );
}

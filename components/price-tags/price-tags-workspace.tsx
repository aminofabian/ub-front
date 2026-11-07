"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DraftNumberInput, rangeParser } from "@/components/price-tags/price-tag-inputs";
import { PriceTagMediaBar } from "@/components/price-tags/price-tag-media-bar";
import { PriceTagPreview } from "@/components/price-tags/price-tag-preview";
import { PriceTagProductList } from "@/components/price-tags/price-tag-product-list";
import { PriceTagSettings } from "@/components/price-tags/price-tag-settings";
import { usePriceTagJob } from "@/components/price-tags/use-price-tag-job";
import { ProductsPageLayout } from "@/app/(dashboard)/products/_components/products-page-layout";
import {
  CATALOG_BTN_GHOST,
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
} from "@/app/(dashboard)/products/_components/catalog-chrome";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { barcodeSvgMarkup } from "@/lib/price-tags/barcode";
import { barcodeValueFor } from "@/lib/price-tags/face";
import { clampSkip, pageCount, paginateCells, resolveSheet } from "@/lib/price-tags/layout";
import type { TagRenderContext } from "@/lib/price-tags/markup";
import { downloadPriceTagsPdf } from "@/lib/price-tags/pdf";
import { printPriceTagPages } from "@/lib/price-tags/print";
import { NO_CALIBRATION, readPriceTagPreferences, writePriceTagPreferences } from "@/lib/price-tags/storage";
import { DEFAULT_LAYOUT, TEMPLATE_COPY, applyTemplate } from "@/lib/price-tags/templates";
import type { PrinterCalibration, SavedTagLayout, TagLayout, TagTemplateId } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const TEMPLATES = Object.keys(TEMPLATE_COPY) as TagTemplateId[];

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
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);

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

  async function runOutput(kind: "print" | "pdf") {
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
      toast.error(kind === "print" ? "Could not open the print dialog" : "Could not build the PDF");
    } finally {
      setBusy(null);
    }
  }

  const pageInput = "h-8 w-12 text-center";

  return (
    <ProductsPageLayout className="max-w-none">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <section className="flex max-h-[46vh] min-h-0 w-full shrink-0 flex-col border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)] lg:max-h-none lg:w-[24rem]">
          <header className="flex items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] px-3 py-3">
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
          <fieldset
            disabled={busy != null}
            aria-busy={busy != null}
            className="m-0 flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0"
          >
            <PriceTagProductList
              job={job}
              branchId={branchId}
              currency={currency}
              showWasInput={layout.fields.includes("previousPrice")}
            />
          </fieldset>
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <PriceTagMediaBar layout={layout} geometry={geometry} onLayout={setLayout} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((templateId) => (
                <button
                  key={templateId}
                  type="button"
                  title={TEMPLATE_COPY[templateId].detail}
                  aria-pressed={layout.templateId === templateId}
                  className={cn(
                    "h-8 border px-2.5 text-[12px]",
                    layout.templateId === templateId
                      ? "border-[#1D4B3B] bg-[#1D4B3B] text-white"
                      : "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[var(--catalog-ink,#121A16)]",
                  )}
                  onClick={() => setLayout((current) => applyTemplate(current, templateId))}
                >
                  {TEMPLATE_COPY[templateId].label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
{geometry.perPage > 1 && layout.media !== "label-roll" ? (
              <label
                className="flex flex-col gap-1 text-[11px] text-[#556159]"
                title="On a part-used sticker sheet, start at the first free label (counted left to right, top to bottom)."
              >
                Start at label
                <DraftNumberInput
                  value={startAt}
                  inputMode="numeric"
                  aria-label="Start at label number"
                  className={pageInput}
                  parse={rangeParser(1, geometry.perPage, true)}
                  onValue={setStartAt}
                />
              </label>
              ) : null}
              <div className="flex flex-col gap-1 text-[11px] text-[#556159]">
                {layout.media !== "label-roll" ? "Pages" : geometry.perPage > 1 ? "Rows" : "Labels"}
                <div className="flex items-center">
                  <DraftNumberInput
                    value={printFrom}
                    inputMode="numeric"
                    aria-label="First page to print"
                    className={pageInput}
                    parse={rangeParser(1, totalPages, true)}
                    onValue={setPrintFrom}
                  />
                  <span className="px-1">–</span>
                  <DraftNumberInput
                    value={printTo}
                    inputMode="numeric"
                    aria-label="Last page to print"
                    className={pageInput}
                    parse={rangeParser(1, totalPages, true)}
                    onValue={setPrintTo}
                  />
                </div>
              </div>
              <button
                type="button"
                className={CATALOG_BTN_OUTLINE}
                disabled={job.instances.length === 0 || busy != null || job.restoring}
                onClick={() => void runOutput("pdf")}
              >
                {busy === "pdf" ? "Checking prices…" : "Download PDF"}
              </button>
              <button
                type="button"
                className={CATALOG_BTN_PRIMARY}
                disabled={job.instances.length === 0 || busy != null || job.restoring}
                onClick={() => void runOutput("print")}
              >
                {busy === "print" ? "Checking prices…" : "Print"}
              </button>
            </div>
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
          />
        </section>
      </div>
    </ProductsPageLayout>
  );
}

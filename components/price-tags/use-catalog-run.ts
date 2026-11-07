"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchItemsPage, type FetchItemsOpts } from "@/lib/api";
import {
  CatalogRunError,
  runCatalog,
  type CatalogRunProgress,
} from "@/lib/price-tags/catalog-run";
import { LabelPrintError, printRowsToLabelPrinter, type LabelPrinterSettings } from "@/lib/price-tags/label-printer";
import { paginateCells } from "@/lib/price-tags/layout";
import { downloadPriceTagsPdf, type TagDrawJob } from "@/lib/price-tags/pdf";
import { tagProductFromSummary } from "@/lib/price-tags/product";
import type { TagInstance, TagProduct } from "@/lib/price-tags/types";

/** What to print: the product list's search and filters at the moment "Print all" was pressed. */
export type CatalogScope = {
  search: string;
  filters: FetchItemsOpts;
  /** Plain words for the person, e.g. "Dairy · Shelf zone A3". */
  summary: string;
};

export type CatalogDestination = "label-printer" | "pdf";

export type CatalogRunState =
  | { phase: "ready" }
  | { phase: "running" | "paused"; progress: CatalogRunProgress }
  | { phase: "stopped" | "done"; progress: CatalogRunProgress }
  | { phase: "failed"; progress: CatalogRunProgress; message: string; uncertain: boolean };

type WakeLockSentinelLike = { release: () => Promise<void> };

/** Keep the screen on during a long run; a sleeping laptop stops the browser sending. */
async function holdScreenAwake(): Promise<WakeLockSentinelLike | null> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
  };
  try {
    return (await nav.wakeLock?.request("screen")) ?? null;
  } catch {
    return null;
  }
}

function slotsFor(products: readonly TagProduct[], copies: number): TagInstance[] {
  const slots: TagInstance[] = [];
  for (const product of products) {
    for (let copy = 0; copy < copies; copy += 1) slots.push({ key: `${product.id}-${copy}`, itemId: product.id });
  }
  return slots;
}

export function useCatalogRun({
  scope,
  job,
  rowGapMm,
  printer,
}: {
  scope: CatalogScope;
  /** Layout, geometry, branding and nudge; products are filled in per batch. */
  job: Omit<TagDrawJob, "products" | "pages" | "wasOverrides">;
  rowGapMm: number;
  printer: LabelPrinterSettings;
}) {
  const [state, setState] = useState<CatalogRunState>({ phase: "ready" });
  const pausedRef = useRef(false);
  const stopRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
  const running = state.phase === "running" || state.phase === "paused";

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const start = useCallback(
    async (options: { destination: CatalogDestination; copies: number; skipUnpriced: boolean; startAt: number }) => {
      stopRef.current = false;
      pausedRef.current = false;
      const wake = await holdScreenAwake();
      const collected: TagProduct[] = [];
      const draw = (products: TagProduct[]): TagDrawJob => ({
        ...job,
        pages: [],
        wasOverrides: {},
        products: new Map(products.map((product) => [product.id, product])),
      });
      let last: CatalogRunProgress = {
        position: options.startAt,
        total: null,
        productsSent: 0,
        tagsSent: 0,
        skippedUnpriced: 0,
        skippedUnsellable: 0,
      };
      setState({ phase: "running", progress: last });
      try {
        const result = await runCatalog({
          startAt: options.startAt,
          copies: options.copies,
          skipUnpriced: options.skipUnpriced,
          perRow: options.destination === "label-printer" ? job.geometry.perPage : 1,
          fetchPage: async (page, size) => {
            const result = await fetchItemsPage(scope.search, { ...scope.filters, page, size });
            return {
              products: result.content.map(tagProductFromSummary),
              total: result.totalElements,
              last: result.last,
            };
          },
          send: async (products, copies) => {
            if (options.destination === "pdf") {
              for (const product of products) for (let copy = 0; copy < copies; copy += 1) collected.push(product);
              return;
            }
            const rows = paginateCells(slotsFor(products, copies), job.geometry.perPage);
            await printRowsToLabelPrinter(draw(products), rows, rowGapMm, printer);
          },
          checkpoint: async () => {
            while (pausedRef.current && !stopRef.current) {
              await new Promise<void>((resolve) => {
                resumeRef.current = resolve;
              });
            }
            return stopRef.current;
          },
          onProgress: (progress) => {
            last = progress;
            setState({ phase: pausedRef.current ? "paused" : "running", progress });
          },
        });
        last = result;
        if (options.destination === "pdf" && collected.length > 0) {
          const unique = Array.from(new Map(collected.map((product) => [product.id, product])).values());
          const slots = collected.map((product, index) => ({ key: `${product.id}-${index}`, itemId: product.id }));
          await downloadPriceTagsPdf({
            ...draw(unique),
            pages: paginateCells(slots, job.geometry.perPage),
            fileName: `price-tags-${scope.summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "catalogue"}.pdf`,
          });
        }
        setState({ phase: result.finished ? "done" : "stopped", progress: result });
      } catch (error) {
        const progress = error instanceof CatalogRunError ? error.progress : last;
        const cause = error instanceof CatalogRunError ? error.cause : error;
        setState({
          phase: "failed",
          progress,
          message: error instanceof Error ? error.message : "The run stopped.",
          uncertain: cause instanceof LabelPrintError && cause.uncertain,
        });
      } finally {
        await wake?.release().catch(() => undefined);
      }
    },
    [job, printer, rowGapMm, scope],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((current) => (current.phase === "running" ? { ...current, phase: "paused" } : current));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    resumeRef.current?.();
    resumeRef.current = null;
    setState((current) => (current.phase === "paused" ? { ...current, phase: "running" } : current));
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    resumeRef.current?.();
    resumeRef.current = null;
  }, []);

  return { state, running, start, pause, resume, stop, reset: () => setState({ phase: "ready" }) };
}

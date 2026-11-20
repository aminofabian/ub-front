"use client";

import { Check, Loader2, Printer, Search, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProductsPageLayout } from "@/app/(dashboard)/products/_components/products-page-layout";
import {
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
  CATALOG_SURFACE,
} from "@/app/(dashboard)/products/_components/catalog-chrome";
import { Button } from "@/components/ui/button";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { fetchItemsPage, type ItemSummaryRecord } from "@/lib/api";
import { reserveBarcodes, saveBarcode } from "@/lib/barcode-generate-client";
import { APP_ROUTES } from "@/lib/config";
import { barcodeSvgMarkup } from "@/lib/price-tags/barcode";
import { MAX_QUEUED_TAGS, readTagQueue, writeTagQueue } from "@/lib/price-tags/storage";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const SAVE_CONCURRENCY = 4;

type RowState = { status: "saved"; code: string } | { status: "failed" } | { status: "saving" };

function rowName(item: ItemSummaryRecord): string {
  return [item.name, item.variantName].filter(Boolean).join(" · ");
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-KE")} ${n === 1 ? one : many}`;
}

export function BarcodeGeneratorWorkspace() {
  const router = useRouter();
  const businessId = useSessionBootstrapSnapshot().business?.id ?? "";

  const [rows, setRows] = useState<ItemSummaryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [state, setState] = useState<Map<string, RowState>>(new Map());
  const [working, setWorking] = useState(false);
  const saved = useRef<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchPage = useCallback(
    (pageIndex: number) =>
      fetchItemsPage(debounced || undefined, {
        noBarcode: true,
        catalogScope: "SKUS_ONLY",
        size: PAGE_SIZE,
        page: pageIndex,
      }),
    [debounced],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage(0)
      .then((result) => {
        if (cancelled) return;
        setRows(result.content);
        setTotal(result.totalElements);
        setPage(0);
        setHasMore(!result.last);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your products. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchPage(page + 1);
      setRows((current) => {
        const have = new Set(current.map((r) => r.id));
        return [...current, ...result.content.filter((r) => !have.has(r.id))];
      });
      setPage(page + 1);
      setHasMore(!result.last);
    } catch {
      toast.error("Couldn't load more. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const isSaved = (id: string) => state.get(id)?.status === "saved";
  const todo = useMemo(() => rows.filter((r) => !isSaved(r.id)), [rows, state]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = useMemo(() => todo.filter((r) => !unticked.has(r.id)), [todo, unticked]);

  const toggle = (id: string) => {
    if (working) return;
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const make = async (targets: ItemSummaryRecord[]) => {
    if (targets.length === 0 || working) return;
    setWorking(true);
    setState((prev) => {
      const next = new Map(prev);
      targets.forEach((t) => next.set(t.id, { status: "saving" }));
      return next;
    });
    let failed = 0;
    try {
      const codes = await reserveBarcodes(targets.length);
      for (let i = 0; i < targets.length; i += SAVE_CONCURRENCY) {
        const slice = targets.slice(i, i + SAVE_CONCURRENCY);
        await Promise.all(
          slice.map(async (item, j) => {
            const code = codes[i + j];
            try {
              await saveBarcode(item.id, code);
              saved.current.push(item.id);
              setState((prev) => new Map(prev).set(item.id, { status: "saved", code }));
            } catch {
              failed += 1;
              setState((prev) => new Map(prev).set(item.id, { status: "failed" }));
            }
          }),
        );
      }
      setSavedIds([...saved.current]);
      const ok = targets.length - failed;
      if (failed > 0) toast.error(`${plural(failed, "product", "products")} didn't save. Tap Try again.`);
      else toast.success(`${plural(ok, "barcode", "barcodes")} saved.`);
    } catch {
      setState((prev) => {
        const next = new Map(prev);
        targets.forEach((t) => next.delete(t.id));
        return next;
      });
      toast.error("Couldn't make barcodes. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  };

  const printLabels = () => {
    if (businessId && savedIds.length > 0) {
      const queue = readTagQueue(businessId);
      const merged = [...new Set([...queue.itemIds, ...savedIds])].slice(0, MAX_QUEUED_TAGS);
      writeTagQueue(businessId, { ...queue, itemIds: merged });
    }
    router.push(APP_ROUTES.priceTags);
  };

  const doneCount = savedIds.length;
  const remaining = Math.max(0, total - doneCount);
  const allDone = !loading && rows.length > 0 && todo.length === 0 && !hasMore;

  return (
    <ProductsPageLayout>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-24 pt-3 sm:px-0 sm:pb-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--catalog-ink)]">Barcodes</h2>
            <p className="mt-0.5 text-[13px] text-[color-mix(in_srgb,var(--catalog-ink)_65%,transparent)]">
              {loading
                ? "Looking for products without a barcode…"
                : remaining === 0 && doneCount === 0 && !debounced
                  ? "Every product has a barcode."
                  : `${plural(remaining, "product has", "products have")} no barcode. We'll make one for each you pick.`}
            </p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search products without a barcode</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-50"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU"
              className="h-9 w-full rounded-none border border-[color-mix(in_srgb,var(--catalog-ink)_12%,transparent)] bg-white pl-8 pr-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary)_28%,transparent)]"
            />
          </label>
        </div>

        {doneCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--catalog-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--catalog-primary)_7%,white)] px-3 py-2">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--catalog-primary)]">
              <Check className="size-4" aria-hidden />
              {plural(doneCount, "barcode", "barcodes")} saved to your products
            </p>
            <Button type="button" size="sm" className={CATALOG_BTN_PRIMARY} onClick={printLabels}>
              <Printer className="size-3.5" aria-hidden />
              Print labels for these
            </Button>
          </div>
        ) : null}

        <div className={cn("min-h-0", CATALOG_SURFACE)}>
          {loading ? (
            <ul aria-hidden className="divide-y divide-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-3">
                  <span className="size-4 bg-black/10" />
                  <span className="h-9 w-9 bg-black/5" />
                  <span className="h-3 w-1/3 bg-black/5" />
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
              <Check className="size-7 text-[var(--catalog-primary)]" aria-hidden />
              <p className="text-[14px] font-medium">
                {debounced ? "No match" : "All set"}
              </p>
              <p className="text-[13px] opacity-65">
                {debounced
                  ? "No product without a barcode matches that search."
                  : "Every product already has a barcode."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]">
              {rows.map((item) => {
                const row = state.get(item.id);
                const code = row?.status === "saved" ? row.code : null;
                const saving = row?.status === "saving";
                const failed = row?.status === "failed";
                const ticked = !code && !unticked.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      !code && "cursor-pointer hover:bg-black/[0.02]",
                    )}
                    onClick={() => (!code && !saving ? toggle(item.id) : undefined)}
                  >
                    {code ? (
                      <Check className="size-4 shrink-0 text-[var(--catalog-primary)]" aria-label="Saved" />
                    ) : (
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-[var(--catalog-primary)]"
                        checked={ticked}
                        disabled={working}
                        onChange={() => toggle(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Make a barcode for ${rowName(item)}`}
                      />
                    )}
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt="" className="size-9 shrink-0 object-cover" loading="lazy" />
                    ) : (
                      <span aria-hidden className="size-9 shrink-0 bg-black/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{rowName(item)}</p>
                      <p className="truncate text-[11px] opacity-60">
                        {[item.categoryName, item.sku].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {code ? (
                      <div className="flex shrink-0 flex-col items-end">
                        <span
                          className="h-7 w-24 [&>svg]:h-full [&>svg]:w-full"
                          dangerouslySetInnerHTML={{ __html: barcodeSvgMarkup(code) }}
                        />
                        <span className="font-mono text-[11px]">{code}</span>
                      </div>
                    ) : saving ? (
                      <Loader2 className="size-4 shrink-0 animate-spin opacity-60" aria-label="Saving" />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(CATALOG_BTN_OUTLINE, "shrink-0", failed && "border-red-300 text-red-700")}
                        disabled={working}
                        onClick={(e) => {
                          e.stopPropagation();
                          void make([item]);
                        }}
                      >
                        {failed ? "Try again" : "Make"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(CATALOG_BTN_OUTLINE, "self-center")}
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Show more
          </Button>
        ) : null}
        {allDone ? (
          <p className="text-center text-[13px] opacity-65">That&apos;s all of them. Nothing left without a barcode.</p>
        ) : null}
      </div>

      {todo.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--catalog-ink)_12%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-2">
          <div className="flex items-center gap-2 text-[12px]">
            <button
              type="button"
              className="underline underline-offset-2 disabled:no-underline disabled:opacity-40"
              disabled={working}
              onClick={() => setUnticked(chosen.length === todo.length ? new Set(todo.map((r) => r.id)) : new Set())}
            >
              {chosen.length === todo.length ? "Untick all" : "Tick all"}
            </button>
          </div>
          <Button
            type="button"
            className={cn(CATALOG_BTN_PRIMARY, "h-10 px-4 text-[13px] sm:h-9")}
            disabled={chosen.length === 0 || working}
            onClick={() => void make(chosen)}
          >
            {working ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <WandSparkles className="size-4" aria-hidden />
            )}
            {working
              ? "Making barcodes…"
              : chosen.length === 0
                ? "Tick products to continue"
                : `Make ${plural(chosen.length, "barcode", "barcodes")}`}
          </Button>
        </div>
      ) : null}
    </ProductsPageLayout>
  );
}

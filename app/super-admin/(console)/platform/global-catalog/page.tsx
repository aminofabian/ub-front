"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ImageOff, PackageSearch, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { GlobalCatalogCategoriesPanel } from "@/components/super-admin/global-catalog-categories-panel";
import { GlobalCatalogPacksPanel } from "@/components/super-admin/global-catalog-packs-panel";
import { GlobalCatalogSuppliersPanel } from "@/components/super-admin/global-catalog-suppliers-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applySaGlobalProductMargins,
  backfillSaGlobalProductImages,
  clearSaGlobalProductImage,
  commitSaPromote,
  exportSaGlobalProductsCsv,
  fetchAllSaSourceItemIds,
  fetchSaCatalogs,
  fetchSaGlobalCatalogMeta,
  fetchSaGlobalProduct,
  fetchSaGlobalProducts,
  fetchSaSourceBusinesses,
  fetchSaSourceItems,
  importSaGlobalProductsCsv,
  patchSaGlobalProduct,
  previewSaPromote,
  publishSaGlobalProducts,
  saArchiveCatalogProducts,
  saPurgeCatalog,
  uploadSaGlobalProductImage,
  type SaCatalogSummary,
  type SaGlobalCatalogMeta,
  type SaGlobalProduct,
  type SaPromoteProgress,
  type SaPromoteResult,
  type SaSourceBusiness,
  type SaSourceItem,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

const SOURCE_PAGE_SIZE = 40;
const PROMOTE_PREVIEW_MAX_ITEMS = 100;

function keepPromoteSourceRow(
  row: SaSourceItem,
  opts: {
    hideAlreadyInGlobal: boolean;
    onlyWithImages: boolean;
    onlyWithBarcode: boolean;
  },
): boolean {
  if (opts.hideAlreadyInGlobal && row.alreadyInGlobal) return false;
  if (opts.onlyWithImages && !row.imageUrl?.trim()) return false;
  if (opts.onlyWithBarcode && !row.barcode?.trim()) return false;
  return true;
}

function statusBadgeClass(status: string): string {
  if (status === "published") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  if (status === "draft") return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
  return "bg-muted text-muted-foreground";
}

type Mode = "curate" | "promote" | "packs" | "categories" | "suppliers";

function promotedGlobalIds(result: SaPromoteResult | null): string[] {
  if (!result) return [];
  return result.lines
    .filter((line) => line.action === "created" || line.action === "updated")
    .map((line) => line.globalProductId)
    .filter((id): id is string => Boolean(id));
}

function moneyDraft(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Enter a valid non-negative price or margin.");
  }
  return n;
}

export default function SuperAdminGlobalCatalogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catalogIdFromUrl = searchParams.get("catalogId");

  const [mode, setMode] = useState<Mode>("curate");
  const [catalogs, setCatalogs] = useState<SaCatalogSummary[]>([]);
  const [catalogId, setCatalogId] = useState<string>(catalogIdFromUrl ?? "");
  const [meta, setMeta] = useState<SaGlobalCatalogMeta | null>(null);
  const [products, setProducts] = useState<SaGlobalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [missingImage, setMissingImage] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SaGlobalProduct | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("draft");
  const [buyDraft, setBuyDraft] = useState("");
  const [sellDraft, setSellDraft] = useState("");
  const [marginDraft, setMarginDraft] = useState("");
  const [bulkMarginPct, setBulkMarginPct] = useState("25");
  const [bulkMarginMode, setBulkMarginMode] = useState<"fromBuying" | "fromSelling">(
    "fromBuying",
  );

  const [businesses, setBusinesses] = useState<SaSourceBusiness[]>([]);
  const [sourceBusinessId, setSourceBusinessId] = useState("");
  const [sourceQ, setSourceQ] = useState("");
  const [sourcePage, setSourcePage] = useState(0);
  const [sourceItems, setSourceItems] = useState<SaSourceItem[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceHasMore, setSourceHasMore] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<SaPromoteResult | null>(null);
  const [promoteAsPublished, setPromoteAsPublished] = useState(false);
  /** Archive everything in the target catalog first so the promote replaces it exactly. */
  const [replaceCatalog, setReplaceCatalog] = useState(false);
  const [lastPromoteResult, setLastPromoteResult] = useState<SaPromoteResult | null>(null);
  const [promoteProgress, setPromoteProgress] = useState<SaPromoteProgress | null>(null);
  /** Default on: only show / select items not yet in the global catalog. */
  const [hideAlreadyInGlobal, setHideAlreadyInGlobal] = useState(true);
  /** Promote only source items that already have a portable HTTPS image. */
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  /** Promote only source items that have a barcode. */
  const [onlyWithBarcode, setOnlyWithBarcode] = useState(false);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const sourceFetchGen = useRef(0);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of meta?.categories ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [meta]);

  const reloadMeta = useCallback(async () => {
    if (!catalogId) return;
    setMeta(await fetchSaGlobalCatalogMeta(catalogId));
  }, [catalogId]);

  const reloadProducts = useCallback(async () => {
    if (!catalogId) {
      setProducts([]);
      setTotal(0);
      return;
    }
    const result = await fetchSaGlobalProducts({
      catalogId,
      q,
      status: status || undefined,
      missingImage,
      page,
      size: 40,
    });
    setProducts(result.content ?? []);
    setTotal(result.totalElements ?? 0);
  }, [catalogId, q, status, missingImage, page]);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      await Promise.all([reloadMeta(), reloadProducts()]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load global catalog.");
    }
  }, [reloadMeta, reloadProducts]);

  const reloadPromoteSources = useCallback(async () => {
    const rows = await fetchSaSourceBusinesses();
    setBusinesses(rows);
    setSourceBusinessId((current) => {
      if (current) return current;
      const preferred = rows.find((r) => r.preferred) ?? rows[0];
      return preferred?.id ?? "";
    });
  }, []);

  const loadSourcePage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (!sourceBusinessId || !catalogId) {
        setSourceItems([]);
        setSourceTotal(0);
        setSourceHasMore(false);
        setSourcePage(0);
        return;
      }
      const gen = ++sourceFetchGen.current;
      setSourceLoading(true);
      try {
        let nextPage = page;
        let accumulated: SaSourceItem[] = [];
        let total = 0;
        let hasMore = true;

        // When hiding already-in-global, keep walking pages until the list
        // has a usable batch (or we run out) so the picker isn't mostly empty.
        while (hasMore) {
          const result = await fetchSaSourceItems({
            businessId: sourceBusinessId,
            catalogId,
            q: sourceQ,
            page: nextPage,
            size: SOURCE_PAGE_SIZE,
          });
          if (gen !== sourceFetchGen.current) return;
          const rows = result.content ?? [];
          total = result.totalElements ?? 0;
          const clientFiltered =
            hideAlreadyInGlobal || onlyWithImages || onlyWithBarcode;
          const kept = rows.filter((row) =>
            keepPromoteSourceRow(row, {
              hideAlreadyInGlobal,
              onlyWithImages,
              onlyWithBarcode,
            }),
          );
          accumulated = [...accumulated, ...kept];
          hasMore = (nextPage + 1) * SOURCE_PAGE_SIZE < total;
          nextPage += 1;
          if (!clientFiltered || accumulated.length >= SOURCE_PAGE_SIZE || !hasMore) {
            break;
          }
        }

        if (gen !== sourceFetchGen.current) return;
        setSourceTotal(total);
        setSourcePage(nextPage - 1);
        setSourceItems((prev) => {
          if (mode === "append") {
            const seen = new Set(prev.map((row) => row.id));
            return [...prev, ...accumulated.filter((row) => !seen.has(row.id))];
          }
          return accumulated;
        });
        setSourceHasMore(hasMore);
      } finally {
        if (gen === sourceFetchGen.current) {
          setSourceLoading(false);
        }
      }
    },
    [
      catalogId,
      hideAlreadyInGlobal,
      onlyWithBarcode,
      onlyWithImages,
      sourceBusinessId,
      sourceQ,
    ],
  );

  const reloadSourceItems = useCallback(async () => {
    setSourceItems([]);
    setSourcePage(0);
    setSourceHasMore(false);
    await loadSourcePage(0, "replace");
  }, [loadSourcePage]);

  const onLoadMoreSourceItems = useCallback(() => {
    if (sourceLoading || !sourceHasMore) return;
    void loadSourcePage(sourcePage + 1, "append").catch((e) => {
      toast.error(e instanceof Error ? e.message : "Could not load more source items.");
    });
  }, [loadSourcePage, sourceHasMore, sourceLoading, sourcePage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchSaCatalogs();
        if (cancelled) return;
        setCatalogs(rows);
        setCatalogId((current) => {
          if (current && rows.some((r) => r.id === current)) return current;
          if (catalogIdFromUrl && rows.some((r) => r.id === catalogIdFromUrl)) {
            return catalogIdFromUrl;
          }
          const preferred =
            rows.find((r) => r.code === "default") ?? rows[0] ?? null;
          return preferred?.id ?? "";
        });
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load catalogs.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogIdFromUrl]);

  useEffect(() => {
    if (!catalogId) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("catalogId") === catalogId) return;
    params.set("catalogId", catalogId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [catalogId, pathname, router, searchParams]);

  useEffect(() => {
    if (!catalogId) return;
    setSelectedId(null);
    setSelected(null);
    setPage(0);
    setPreview(null);
    setLastPromoteResult(null);
    setSelectedSourceIds(new Set());
  }, [catalogId]);

  useEffect(() => {
    if (!catalogId) return;
    void reload();
  }, [catalogId, reload]);

  useEffect(() => {
    if (mode !== "promote") return;
    void (async () => {
      try {
        await reloadPromoteSources();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load businesses.");
      }
    })();
  }, [mode, reloadPromoteSources]);

  useEffect(() => {
    if (mode !== "promote") return;
    void (async () => {
      try {
        await reloadSourceItems();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load source items.");
      }
    })();
  }, [mode, reloadSourceItems]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchSaGlobalProduct(selectedId, catalogId);
        if (cancelled) return;
        setSelected(row);
        setNameDraft(row.name);
        setStatusDraft(row.status);
        setBuyDraft(moneyDraft(row.recommendedBuyingPrice));
        setSellDraft(moneyDraft(row.recommendedSellingPrice));
        setMarginDraft(moneyDraft(row.suggestedMarginPct));
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load product.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, catalogId]);

  const onSaveSelected = async () => {
    if (!selected) return;
    let buy: number | null;
    let sell: number | null;
    let margin: number | null;
    try {
      buy = parseMoneyInput(buyDraft);
      sell = parseMoneyInput(sellDraft);
      margin = parseMoneyInput(marginDraft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid price.");
      return;
    }
    if (buy != null && sell != null && buy > 0 && marginDraft.trim() === "") {
      margin = Number((((sell - buy) / buy) * 100).toFixed(2));
    }
    setBusy(true);
    try {
      const updated = await patchSaGlobalProduct(
        selected.id,
        {
          version: selected.version,
          name: nameDraft.trim(),
          status: statusDraft,
          ...(buy != null ? { recommendedBuyingPrice: buy } : {}),
          ...(sell != null ? { recommendedSellingPrice: sell } : {}),
          ...(margin != null ? { suggestedMarginPct: margin } : {}),
        },
        catalogId,
      );
      setSelected(updated);
      setNameDraft(updated.name);
      setStatusDraft(updated.status);
      setBuyDraft(moneyDraft(updated.recommendedBuyingPrice));
      setSellDraft(moneyDraft(updated.recommendedSellingPrice));
      setMarginDraft(moneyDraft(updated.suggestedMarginPct));
      toast.success("Product updated.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const onApplyMarginToVisible = async () => {
    const pct = Number(bulkMarginPct);
    if (!Number.isFinite(pct) || pct < 0) {
      toast.error("Enter a valid margin %.");
      return;
    }
    if (products.length === 0) {
      toast.error("No products on this page.");
      return;
    }
    if (
      !window.confirm(
        `Apply ${pct}% margin (${bulkMarginMode === "fromBuying" ? "buy → sell" : "sell → buy"}) to ${products.length} product(s) on this page?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await applySaGlobalProductMargins({
        ids: products.map((p) => p.id),
        marginPct: pct,
        mode: bulkMarginMode,
      }, catalogId);
      toast.success(
        `Margin applied: ${result.updatedCount} updated, ${result.skippedCount} skipped`,
      );
      await reload();
      if (selectedId) {
        const row = await fetchSaGlobalProduct(selectedId, catalogId);
        setSelected(row);
        setBuyDraft(moneyDraft(row.recommendedBuyingPrice));
        setSellDraft(moneyDraft(row.recommendedSellingPrice));
        setMarginDraft(moneyDraft(row.suggestedMarginPct));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Margin apply failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPublishSelected = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await publishSaGlobalProducts([selected.id]);
      toast.success("Published.");
      await reload();
      const row = await fetchSaGlobalProduct(selected.id, catalogId);
      setSelected(row);
      setStatusDraft(row.status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!selected || !file) return;
    setBusy(true);
    try {
      const updated = await uploadSaGlobalProductImage(selected.id, file, catalogId);
      setSelected(updated);
      toast.success("Image uploaded to global-catalog/.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onClearImage = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await clearSaGlobalProductImage(selected.id, catalogId);
      setSelected(updated);
      toast.success("Image cleared.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed.");
    } finally {
      setBusy(false);
    }
  };

  const onBackfillAdopted = async () => {
    if (!selected?.imageUrl) return;
    if (
      !window.confirm(
        "Push this image to tenant products that already adopted it but still have no cover?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await backfillSaGlobalProductImages(selected.id, { catalogId });
      toast.success(
        `Backfill: ${result.itemsUpdated} updated, ${result.itemsSkipped} skipped, ${result.itemsFailed} failed`,
      );
      if (result.warnings?.length) {
        console.info("Backfill warnings", result.warnings.slice(0, 20));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed.");
    } finally {
      setBusy(false);
    }
  };

  const onExportCsv = async () => {
    setBusy(true);
    try {
      const blob = await exportSaGlobalProductsCsv({
        catalogId,
        status: status || undefined,
        missingImage,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "global-catalog-products.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const onImportCsv = async (file: File) => {
    setBusy(true);
    try {
      const result = await importSaGlobalProductsCsv(file, catalogId);
      toast.success(
        `Import: ${result.createdCount} created, ${result.updatedCount} updated, ${result.skippedCount} skipped`,
      );
      if (result.warnings?.length) {
        console.info("CSV import warnings", result.warnings.slice(0, 30));
      }
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSourceId = (id: string) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreview(null);
  };

  const onSelectAllMatching = async () => {
    if (!sourceBusinessId || !catalogId) return;
    setBusy(true);
    try {
      const ids = await fetchAllSaSourceItemIds({
        businessId: sourceBusinessId,
        catalogId,
        q: sourceQ,
        excludeAlreadyInGlobal: hideAlreadyInGlobal,
        requireImage: onlyWithImages,
        requireBarcode: onlyWithBarcode,
      });
      setSelectedSourceIds(new Set(ids));
      setPreview(null);
      const filterBits = [
        hideAlreadyInGlobal ? "not yet in global" : null,
        onlyWithImages ? "with images" : null,
        onlyWithBarcode ? "with barcode" : null,
      ].filter(Boolean);
      const filterNote =
        filterBits.length > 0 ? ` (${filterBits.join(", ")})` : "";
      toast.success(
        ids.length === 0
          ? "No matching source items for the current filters."
          : `Selected ${ids.toLocaleString()} matching item${ids.length === 1 ? "" : "s"}${filterNote}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not select all matching items.");
    } finally {
      setBusy(false);
    }
  };

  const onPreviewPromote = async () => {
    if (!sourceBusinessId || selectedSourceIds.size === 0) return;
    const allIds = [...selectedSourceIds];
    const previewIds = allIds.slice(0, PROMOTE_PREVIEW_MAX_ITEMS);
    setBusy(true);
    try {
      const result = await previewSaPromote({
        sourceBusinessId,
        itemIds: previewIds,
        onConflict: "update",
        publish: promoteAsPublished,
        catalogId,
      });
      setPreview(result);
      if (allIds.length > previewIds.length) {
        toast.success(
          `Preview (first ${previewIds.length} of ${allIds.length}): ${result.createdCount} create, ${result.updatedCount} update, ${result.skippedCount} skip`,
        );
      } else {
        toast.success(
          `Preview: ${result.createdCount} create, ${result.updatedCount} update, ${result.skippedCount} skip`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const runCommitPromote = async () => {
    if (!sourceBusinessId || selectedSourceIds.size === 0) return;
    const n = selectedSourceIds.size;
    setBusy(true);
    setPromoteProgress({
      phase: "queued",
      processed: 0,
      total: n,
      message: replaceCatalog ? "Archiving current catalog contents…" : "Starting…",
      chunkIndex: 0,
      chunkCount: 1,
    });
    try {
      if (replaceCatalog) {
        const archived = await saArchiveCatalogProducts(catalogId);
        toast.message(
          `Archived ${archived.archivedProductCount.toLocaleString()} existing product${
            archived.archivedProductCount === 1 ? "" : "s"
          } before promoting.`,
        );
      }
      const result = await commitSaPromote(
        {
          sourceBusinessId,
          itemIds: [...selectedSourceIds],
          onConflict: "update",
          publish: promoteAsPublished,
          catalogId,
        },
        setPromoteProgress,
      );
      setPreview(result);
      setLastPromoteResult(result);
      setSelectedSourceIds(new Set());
      const committed = result.createdCount + result.updatedCount;
      if (committed === 0) {
        toast.error(
          `Nothing was written (${result.skippedCount.toLocaleString()} skipped). Check skip reasons in the preview panel.`,
        );
      } else if (result.skippedCount > 0) {
        toast.message(
          `Promoted ${committed.toLocaleString()} (${result.createdCount} created, ${result.updatedCount} updated, ${result.imageRehostCount} images). Skipped ${result.skippedCount.toLocaleString()}.`,
        );
      } else {
        toast.success(
          `Promoted: ${result.createdCount} created, ${result.updatedCount} updated, ${result.imageRehostCount} images`,
        );
      }
      // Land on Curate with the status that matches what we just wrote — draft promote
      // previously looked like "nothing published" when the filter stayed on published.
      const nextStatus = promoteAsPublished ? "published" : "draft";
      setMode("curate");
      setStatus(nextStatus);
      setPage(0);
      setLoadError("");
      try {
        const [nextMeta, nextProducts] = await Promise.all([
          fetchSaGlobalCatalogMeta(catalogId),
          fetchSaGlobalProducts({
            catalogId,
            q,
            status: nextStatus,
            missingImage,
            page: 0,
            size: 40,
          }),
        ]);
        setMeta(nextMeta);
        setProducts(nextProducts.content ?? []);
        setTotal(nextProducts.totalElements ?? 0);
      } catch (reloadErr) {
        setLoadError(
          reloadErr instanceof Error ? reloadErr.message : "Could not reload global catalog.",
        );
      }
      await reloadSourceItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Promote failed.");
    } finally {
      setBusy(false);
      setPromoteProgress(null);
    }
  };

  const onCommitPromote = () => {
    if (!sourceBusinessId || selectedSourceIds.size === 0) return;
    const n = selectedSourceIds.size;
    const statusLabel = promoteAsPublished ? "published" : "drafts";
    const catalogLabel = meta?.catalogName ?? "the global catalog";
    const descriptionParts = [
      `Promote into “${catalogLabel}” as ${statusLabel}.`,
      replaceCatalog
        ? `CLEAR OLD CATALOG: every product and category currently in “${catalogLabel}” will be archived first, so the result matches the source shop exactly.`
        : null,
      n > PROMOTE_PREVIEW_MAX_ITEMS
        ? "Large batches run as background jobs and may take a few minutes."
        : null,
    ].filter((part): part is string => part != null);

    showThemedConfirmToast({
      id: "sa-promote-confirm",
      title: `Promote ${n.toLocaleString()} product${n === 1 ? "" : "s"}?`,
      description: descriptionParts.join("\n\n"),
      confirmLabel: replaceCatalog ? "Clear & promote" : "Promote",
      confirmVariant: replaceCatalog ? "destructive" : "default",
      onConfirm: () => runCommitPromote(),
    });
  };

  const onPublishPromotedDrafts = async () => {
    const ids = promotedGlobalIds(lastPromoteResult);
    if (ids.length === 0) return;
    if (!window.confirm(`Publish ${ids.length} promoted product${ids.length === 1 ? "" : "s"} now?`)) {
      return;
    }
    setBusy(true);
    try {
      const result = await publishSaGlobalProducts(ids);
      toast.success(`Published ${result.publishedCount}; skipped ${result.skippedIds.length}.`);
      setLastPromoteResult(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const selectedCatalog = catalogs.find((c) => c.id === catalogId) ?? null;

  const runPurgeCatalog = async (confirmCode: string) => {
    if (!catalogId) return;
    setBusy(true);
    try {
      const result = await saPurgeCatalog(catalogId, confirmCode);
      setSelectedId(null);
      setSelected(null);
      setPreview(null);
      setLastPromoteResult(null);
      toast.success(
        `Cleared ${result.catalogCode}: ${result.deletedProductCount.toLocaleString()} products, ${result.deletedCategoryCount.toLocaleString()} categories, ${result.deletedPackCount.toLocaleString()} packs.`,
      );
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear catalog.");
    } finally {
      setBusy(false);
    }
  };

  const onClearCatalog = () => {
    if (!catalogId || !selectedCatalog) return;
    const code = selectedCatalog.code;
    const label = selectedCatalog.name;
    showThemedConfirmToast({
      id: "sa-purge-catalog-confirm",
      title: `Clear “${label}” completely?`,
      description: [
        "This permanently deletes all products, categories, packs, images, and supplier templates in this catalog.",
        "The catalog shell stays. Shop inventory is never deleted — purge is refused if any shop still references these templates.",
        `Next you will type the catalog code (${code}) to confirm.`,
      ].join("\n\n"),
      confirmLabel: "Continue",
      confirmVariant: "destructive",
      onConfirm: () => {
        const typed = window.prompt(`Type ${code} to permanently clear this catalog:`);
        if (typed == null) return;
        if (typed.trim() !== code) {
          toast.error(`Confirmation did not match “${code}”. Catalog was not cleared.`);
          return;
        }
        void runPurgeCatalog(code);
      },
    });
  };

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Global catalog"
        description="Curate regional retail templates and promote assortment + images from a flagship shop (defaults to Palmart)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="sa-catalog-picker" className="sr-only">
              Catalog
            </Label>
            <select
              id="sa-catalog-picker"
              className="h-9 max-w-[16rem] rounded-md border border-border/70 bg-background px-2 text-sm"
              value={catalogId}
              disabled={busy || catalogs.length === 0}
              onChange={(e) => setCatalogId(e.target.value)}
            >
              {catalogs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}
                  {c.regionCode ? ` · ${c.regionCode}` : ""} · {c.currency})
                </option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-border/70 p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "curate" ? "bg-primary/12 font-medium" : "text-muted-foreground",
                )}
                onClick={() => setMode("curate")}
              >
                Curate
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "promote" ? "bg-primary/12 font-medium" : "text-muted-foreground",
                )}
                onClick={() => setMode("promote")}
              >
                Promote
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "packs" ? "bg-primary/12 font-medium" : "text-muted-foreground",
                )}
                onClick={() => setMode("packs")}
              >
                Packs
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "categories" ? "bg-primary/12 font-medium" : "text-muted-foreground",
                )}
                onClick={() => setMode("categories")}
              >
                Categories
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "suppliers" ? "bg-primary/12 font-medium" : "text-muted-foreground",
                )}
                onClick={() => setMode("suppliers")}
              >
                Suppliers
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => void reload()} disabled={busy}>
              <RefreshCw className="size-4" aria-hidden />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearCatalog}
              disabled={busy || !catalogId || !selectedCatalog}
            >
              <Trash2 className="size-4" aria-hidden />
              Clear catalog
            </Button>
          </div>
        }
      />

      {loadError ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {meta ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Products" value={meta.productCount} />
          <Stat label="Missing image" value={meta.missingImageCount} accent />
          <Stat label="Published" value={meta.publishedCount} />
          <Stat label="Draft" value={meta.draftCount} />
          <Stat label="Archived" value={meta.archivedCount} />
        </div>
      ) : null}

      {meta?.packs?.length ? (
        <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Starter pack imaging
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {meta.packs.map((pack) => {
              const pct =
                pack.productCount > 0
                  ? Math.round((pack.imagedProductCount / pack.productCount) * 100)
                  : 0;
              return (
                <div key={pack.id} className="rounded-xl border border-border/60 px-3 py-2">
                  <div className="truncate text-sm font-medium">{pack.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pack.imagedProductCount}/{pack.productCount} imaged ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "promote" ? (
        <PromotePanel
          businesses={businesses}
          sourceBusinessId={sourceBusinessId}
          onBusinessChange={(id) => {
            setSourceBusinessId(id);
            setSelectedSourceIds(new Set());
            setPreview(null);
          }}
          sourceQ={sourceQ}
          onSourceQChange={(value) => {
            setSourceQ(value);
          }}
          sourceItems={sourceItems}
          sourceTotal={sourceTotal}
          sourceLoading={sourceLoading}
          sourceHasMore={sourceHasMore}
          onLoadMore={onLoadMoreSourceItems}
          selectedSourceIds={selectedSourceIds}
          onToggle={toggleSourceId}
          onSelectAllVisible={() => {
            setSelectedSourceIds(
              new Set(
                sourceItems
                  .filter((i) =>
                    keepPromoteSourceRow(i, {
                      hideAlreadyInGlobal,
                      onlyWithImages,
                      onlyWithBarcode,
                    }),
                  )
                  .map((i) => i.id),
              ),
            );
            setPreview(null);
          }}
          onSelectAllMatching={() => void onSelectAllMatching()}
          onClearSelection={() => {
            setSelectedSourceIds(new Set());
            setPreview(null);
          }}
          preview={preview}
          promoteAsPublished={promoteAsPublished}
          onPromoteAsPublishedChange={setPromoteAsPublished}
          replaceCatalog={replaceCatalog}
          onReplaceCatalogChange={setReplaceCatalog}
          hideAlreadyInGlobal={hideAlreadyInGlobal}
          onHideAlreadyInGlobalChange={(value) => {
            setHideAlreadyInGlobal(value);
            if (value) {
              setSelectedSourceIds((prev) => {
                const knownInGlobal = new Set(
                  sourceItems.filter((i) => i.alreadyInGlobal).map((i) => i.id),
                );
                if (knownInGlobal.size === 0) return prev;
                const next = new Set([...prev].filter((id) => !knownInGlobal.has(id)));
                return next.size === prev.size ? prev : next;
              });
            }
            setPreview(null);
          }}
          onlyWithImages={onlyWithImages}
          onOnlyWithImagesChange={(value) => {
            setOnlyWithImages(value);
            if (value) {
              setSelectedSourceIds((prev) => {
                const withoutImage = new Set(
                  sourceItems.filter((i) => !i.imageUrl?.trim()).map((i) => i.id),
                );
                if (withoutImage.size === 0) return prev;
                const next = new Set([...prev].filter((id) => !withoutImage.has(id)));
                return next.size === prev.size ? prev : next;
              });
            }
            setPreview(null);
          }}
          onlyWithBarcode={onlyWithBarcode}
          onOnlyWithBarcodeChange={(value) => {
            setOnlyWithBarcode(value);
            if (value) {
              setSelectedSourceIds((prev) => {
                const withoutBarcode = new Set(
                  sourceItems.filter((i) => !i.barcode?.trim()).map((i) => i.id),
                );
                if (withoutBarcode.size === 0) return prev;
                const next = new Set([...prev].filter((id) => !withoutBarcode.has(id)));
                return next.size === prev.size ? prev : next;
              });
            }
            setPreview(null);
          }}
          publishableIds={promotedGlobalIds(lastPromoteResult)}
          busy={busy}
          progress={promoteProgress}
          onPreview={() => void onPreviewPromote()}
          onCommit={() => void onCommitPromote()}
          onPublishPromoted={() => void onPublishPromotedDrafts()}
        />
      ) : mode === "packs" ? (
        <GlobalCatalogPacksPanel
          catalogId={catalogId}
          packs={meta?.packs ?? []}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={reload}
        />
      ) : mode === "categories" ? (
        <GlobalCatalogCategoriesPanel
          catalogId={catalogId}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={reload}
        />
      ) : mode === "suppliers" ? (
        <GlobalCatalogSuppliersPanel
          catalogId={catalogId}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={reload}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="gc-q">Search</Label>
                <Input
                  id="gc-q"
                  value={q}
                  onChange={(e) => {
                    setPage(0);
                    setQ(e.target.value);
                  }}
                  placeholder="Name, brand, barcode…"
                />
              </div>
              <div className="w-full space-y-1.5 sm:w-44">
                <Label htmlFor="gc-status">Status</Label>
                <select
                  id="gc-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => {
                    setPage(0);
                    setStatus(e.target.value);
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={missingImage}
                  onChange={(e) => {
                    setPage(0);
                    setMissingImage(e.target.checked);
                  }}
                />
                Missing image
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onExportCsv()}
                >
                  <Download className="size-4" aria-hidden />
                  Export CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => csvImportRef.current?.click()}
                >
                  <Upload className="size-4" aria-hidden />
                  Import CSV
                </Button>
                <input
                  ref={csvImportRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void onImportCsv(file);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:flex-row sm:items-end">
              <div className="w-full space-y-1.5 sm:w-28">
                <Label htmlFor="gc-bulk-margin">Margin %</Label>
                <Input
                  id="gc-bulk-margin"
                  inputMode="decimal"
                  value={bulkMarginPct}
                  onChange={(e) => setBulkMarginPct(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="w-full space-y-1.5 sm:w-44">
                <Label htmlFor="gc-bulk-mode">Derive</Label>
                <select
                  id="gc-bulk-mode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bulkMarginMode}
                  disabled={busy}
                  onChange={(e) =>
                    setBulkMarginMode(e.target.value as "fromBuying" | "fromSelling")
                  }
                >
                  <option value="fromBuying">Sell from buy</option>
                  <option value="fromSelling">Buy from sell</option>
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || products.length === 0}
                onClick={() => void onApplyMarginToVisible()}
              >
                Apply to page ({products.length})
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span>
                  {total.toLocaleString()} products
                  {missingImage ? " · missing image filter on" : ""}
                </span>
                <span>
                  Page {page + 1} / {Math.max(1, Math.ceil(total / 40))}
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {products.length === 0 ? (
                  <li className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
                    <PackageSearch className="size-8 opacity-50" aria-hidden />
                    No products match these filters.
                  </li>
                ) : (
                  products.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                          selectedId === p.id && "bg-primary/8",
                        )}
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <ImageOff className="size-4 text-muted-foreground" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[p.brand, p.size, p.barcode].filter(Boolean).join(" · ") || "No identity fields"}
                            {p.globalCategoryId
                              ? ` · ${categoryNameById.get(p.globalCategoryId) ?? "Category"}`
                              : ""}
                            {p.recommendedSellingPrice != null
                              ? ` · sell ${p.recommendedSellingPrice}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge className={cn("border-0 font-normal", statusBadgeClass(p.status))}>
                            {p.status}
                          </Badge>
                          {p.barcodeDuplicateWarning ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300">Dup barcode</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={(page + 1) * 40 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-border/70 bg-card/50 p-4 lg:sticky lg:top-20 lg:self-start">
            {!selected ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <PackageSearch className="size-8 opacity-40" aria-hidden />
                Select a product to edit status, name, or image.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-heading text-lg font-semibold tracking-tight">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.skuTemplate || "No SKU template"} · v{selected.version}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageOff className="size-8 opacity-50" aria-hidden />
                      <span className="text-xs">No image yet</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50">
                    <Upload className="size-4" aria-hidden />
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {selected.imageUrl ? (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void onClearImage()}>
                      Clear image
                    </Button>
                  ) : null}
                  {selected.imageUrl ? (
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void onBackfillAdopted()}>
                      Backfill adopted
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gc-name">Name</Label>
                  <Input
                    id="gc-name"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gc-edit-status">Status</Label>
                  <select
                    id="gc-edit-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={statusDraft}
                    disabled={busy}
                    onChange={(e) => setStatusDraft(e.target.value)}
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gc-buy">Buy</Label>
                    <Input
                      id="gc-buy"
                      inputMode="decimal"
                      value={buyDraft}
                      onChange={(e) => setBuyDraft(e.target.value)}
                      disabled={busy}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gc-sell">Sell</Label>
                    <Input
                      id="gc-sell"
                      inputMode="decimal"
                      value={sellDraft}
                      onChange={(e) => setSellDraft(e.target.value)}
                      disabled={busy}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gc-margin">Margin %</Label>
                    <Input
                      id="gc-margin"
                      inputMode="decimal"
                      value={marginDraft}
                      onChange={(e) => setMarginDraft(e.target.value)}
                      disabled={busy}
                      placeholder="auto"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button disabled={busy || !nameDraft.trim()} onClick={() => void onSaveSelected()}>
                    Save
                  </Button>
                  {selected.status !== "published" ? (
                    <Button variant="secondary" disabled={busy} onClick={() => void onPublishSelected()}>
                      Publish
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function PromotePanel({
  businesses,
  sourceBusinessId,
  onBusinessChange,
  sourceQ,
  onSourceQChange,
  sourceItems,
  sourceTotal,
  sourceLoading,
  sourceHasMore,
  onLoadMore,
  selectedSourceIds,
  onToggle,
  onSelectAllVisible,
  onSelectAllMatching,
  onClearSelection,
  preview,
  promoteAsPublished,
  onPromoteAsPublishedChange,
  replaceCatalog,
  onReplaceCatalogChange,
  hideAlreadyInGlobal,
  onHideAlreadyInGlobalChange,
  onlyWithImages,
  onOnlyWithImagesChange,
  onlyWithBarcode,
  onOnlyWithBarcodeChange,
  publishableIds,
  busy,
  progress,
  onPreview,
  onCommit,
  onPublishPromoted,
}: {
  businesses: SaSourceBusiness[];
  sourceBusinessId: string;
  onBusinessChange: (id: string) => void;
  sourceQ: string;
  onSourceQChange: (value: string) => void;
  sourceItems: SaSourceItem[];
  sourceTotal: number;
  sourceLoading: boolean;
  sourceHasMore: boolean;
  onLoadMore: () => void;
  selectedSourceIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAllVisible: () => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  preview: SaPromoteResult | null;
  promoteAsPublished: boolean;
  onPromoteAsPublishedChange: (value: boolean) => void;
  replaceCatalog: boolean;
  onReplaceCatalogChange: (value: boolean) => void;
  hideAlreadyInGlobal: boolean;
  onHideAlreadyInGlobalChange: (value: boolean) => void;
  onlyWithImages: boolean;
  onOnlyWithImagesChange: (value: boolean) => void;
  onlyWithBarcode: boolean;
  onOnlyWithBarcodeChange: (value: boolean) => void;
  publishableIds: string[];
  busy: boolean;
  progress: SaPromoteProgress | null;
  onPreview: () => void;
  onCommit: () => void;
  onPublishPromoted: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const clientFiltered =
    hideAlreadyInGlobal || onlyWithImages || onlyWithBarcode;
  const allMatchingSelected =
    !clientFiltered &&
    sourceTotal > 0 &&
    selectedSourceIds.size >= sourceTotal &&
    selectedSourceIds.size > 0;

  useEffect(() => {
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { root, rootMargin: "120px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, sourceItems.length, sourceHasMore]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="promote-business">Source business</Label>
          <select
            id="promote-business"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sourceBusinessId}
            onChange={(e) => onBusinessChange(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.preferred ? " (preferred)" : ""} — {b.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[1.2] space-y-1.5">
          <Label htmlFor="promote-q">Search source items</Label>
          <Input
            id="promote-q"
            value={sourceQ}
            onChange={(e) => onSourceQChange(e.target.value)}
            placeholder="Name, SKU, barcode…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy || sourceItems.length === 0} onClick={onSelectAllVisible}>
            Select loaded
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || sourceTotal === 0 || allMatchingSelected}
            onClick={onSelectAllMatching}
          >
            Select all matching
            {clientFiltered
              ? " (filtered)"
              : sourceTotal > 0
                ? ` (${sourceTotal.toLocaleString()})`
                : ""}
          </Button>
          <Button variant="ghost" size="sm" disabled={selectedSourceIds.size === 0} onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={hideAlreadyInGlobal}
            onChange={(e) => onHideAlreadyInGlobalChange(e.target.checked)}
          />
          Hide items already in global
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyWithImages}
            onChange={(e) => onOnlyWithImagesChange(e.target.checked)}
          />
          Only with images
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyWithBarcode}
            onChange={(e) => onOnlyWithBarcodeChange(e.target.checked)}
          />
          Only with barcode
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span>
            {hideAlreadyInGlobal ? "Not yet in global · " : ""}
            {onlyWithImages ? "With images · " : ""}
            {onlyWithBarcode ? "With barcode · " : ""}
            {sourceItems.length.toLocaleString()} shown
            {!clientFiltered ? ` of ${sourceTotal.toLocaleString()} source` : ""}
            {" · "}
            {selectedSourceIds.size.toLocaleString()} selected
          </span>
          <span>
            {sourceHasMore ? "Scroll for more" : "End of list"}
          </span>
        </div>
        <div ref={listRef} className="max-h-[28rem] overflow-y-auto">
          <ul className="divide-y divide-border/60">
            {sourceItems.length === 0 && !sourceLoading ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                {clientFiltered
                  ? "No source items match the current filters."
                  : "No source items match."}
              </li>
            ) : (
              sourceItems.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.has(item.id)}
                      onChange={() => onToggle(item.id)}
                    />
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[item.sku, item.barcode, item.brand].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {item.alreadyInGlobal ? (
                      <Badge className="border-0 bg-emerald-500/15 font-normal text-emerald-800 dark:text-emerald-200">
                        In global
                      </Badge>
                    ) : null}
                  </label>
                </li>
              ))
            )}
          </ul>
          <div ref={sentinelRef} className="h-8" aria-hidden />
          {sourceLoading ? (
            <div className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground">
              Loading more…
            </div>
          ) : null}
          {!sourceLoading && !sourceHasMore && sourceItems.length > 0 ? (
            <div className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground">
              End of list
            </div>
          ) : null}
        </div>
      </div>

      {progress ? <PromoteProgressCard progress={progress} /> : null}

      <div
        className={cn(
          "rounded-xl border px-3 py-3",
          replaceCatalog
            ? "border-destructive/40 bg-destructive/5"
            : "border-border/70 bg-muted/20",
        )}
      >
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border"
            checked={replaceCatalog}
            onChange={(e) => onReplaceCatalogChange(e.target.checked)}
          />
          <span>
            <span
              className={cn(
                "font-medium",
                replaceCatalog ? "text-destructive" : "text-foreground",
              )}
            >
              Clear old catalog first
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Archives every product and category currently in this catalog before
              promoting, so the result matches the source shop (e.g. Palmart)
              instead of mixing with the old seed. Recommended for a full replace.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={promoteAsPublished}
            onChange={(e) => onPromoteAsPublishedChange(e.target.checked)}
          />
          Publish immediately (trusted bulk)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={busy || selectedSourceIds.size === 0} variant="outline" onClick={onPreview}>
            Preview
          </Button>
          <Button disabled={busy || selectedSourceIds.size === 0} onClick={onCommit}>
            Promote {selectedSourceIds.size || ""} as {promoteAsPublished ? "published" : "drafts"}
          </Button>
          {publishableIds.length > 0 && !promoteAsPublished ? (
            <Button variant="secondary" disabled={busy} onClick={onPublishPromoted}>
              Publish {publishableIds.length} promoted drafts
            </Button>
          ) : null}
        </div>
        {preview ? (
          <span className="text-sm text-muted-foreground">
            Last result: {preview.createdCount} created · {preview.updatedCount} updated ·{" "}
            {preview.skippedCount} skipped · {preview.imageRehostCount} images
          </span>
        ) : null}
      </div>
    </div>
  );
}

const PROMOTE_PHASE_LABELS: Record<SaPromoteProgress["phase"], string> = {
  queued: "Queued",
  processing: "Promoting",
  finalizing: "Finishing up",
};

function PromoteProgressCard({ progress }: { progress: SaPromoteProgress }) {
  const startedAtRef = useRef(Date.now());
  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;
  const indeterminate = progress.phase === "queued" || progress.processed === 0;
  const elapsedMs = Date.now() - startedAtRef.current;
  const etaLabel = estimatePromoteEta(progress.processed, progress.total, elapsedMs);

  return (
    <div
      className="space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium">
            {PROMOTE_PHASE_LABELS[progress.phase]}
            {progress.chunkCount > 1
              ? ` · batch ${progress.chunkIndex + 1} of ${progress.chunkCount}`
              : ""}
          </span>
        </div>
        <span className="font-heading text-sm font-semibold tabular-nums">
          {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
          {indeterminate ? "" : ` · ${percent}%`}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-[promote-slide_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
        ) : (
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          >
            <div className="absolute inset-0 animate-[promote-shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {progress.message ?? "Working…"}
        </span>
        {etaLabel ? <span className="shrink-0 tabular-nums">{etaLabel}</span> : null}
      </div>
    </div>
  );
}

const ETA_MIN_SAMPLE_ITEMS = 5;
const ETA_MIN_ELAPSED_MS = 4000;

function estimatePromoteEta(processed: number, total: number, elapsedMs: number): string | null {
  if (processed < ETA_MIN_SAMPLE_ITEMS || elapsedMs < ETA_MIN_ELAPSED_MS || processed >= total) {
    return null;
  }
  const msPerItem = elapsedMs / processed;
  const remainingMs = msPerItem * (total - processed);
  const remainingSec = Math.round(remainingMs / 1000);
  if (remainingSec < 60) return `~${Math.max(remainingSec, 5)}s left`;
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  return `~${minutes}m ${seconds.toString().padStart(2, "0")}s left`;
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 px-4 py-3",
        accent ? "bg-amber-500/8" : "bg-card/40",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  Package,
  PackageX,
  RefreshCw,
  ScanLine,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import {
  resolveCatalogItemName,
  resolveCatalogVariantListTitle,
} from "@/lib/catalog-display";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchItemById,
  fetchItemsPage,
  patchItem,
  type BranchRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import {
  canViewStockLevels,
  filterInventoryQuickLinksForUser,
} from "@/lib/inventory-access";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supFilterRail,
  supInput,
  supKicker,
  supSelect,
  supTableCell,
  supTableHead,
  supTableRow,
  supWorkspaceShell,
} from "../../suppliers/_components/supplier-ui-tokens";

const PAGE_SIZE = 100;
const MAX_SCAN_PAGES = 40;

type ParentMeta = {
  id: string;
  name: string;
  sku: string;
};

type VariantGroup = {
  parentId: string | null;
  parent: ParentMeta | null;
  variants: ItemSummaryRecord[];
};

function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtQty(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function parentLabelFromVariant(row: ItemSummaryRecord): string {
  const title = resolveCatalogVariantListTitle(row, { parentInList: false });
  return title.family ?? "Unknown parent";
}

function variantOptionLabel(row: ItemSummaryRecord): string {
  return resolveCatalogVariantListTitle(row, { parentInList: true }).option;
}

async function loadParentMap(
  parentIds: string[],
): Promise<Map<string, ParentMeta>> {
  const map = new Map<string, ParentMeta>();
  const unique = [...new Set(parentIds.map((id) => id.trim()).filter(Boolean))];
  const chunkSize = 8;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((id) => fetchItemById(id)),
    );
    results.forEach((result, index) => {
      const id = chunk[index];
      if (result.status !== "fulfilled") return;
      const item = result.value;
      map.set(id, {
        id: item.id,
        name: resolveCatalogItemName(item).label,
        sku: item.sku?.trim() || "",
      });
    });
  }
  return map;
}

export default function InventoryMissingBarcodesPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = canViewStockLevels(me, business);
  const canWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchFilter,
    setValue: setBranchFilter,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });

  const [variants, setVariants] = useState<ItemSummaryRecord[]>([]);
  const [parents, setParents] = useState<Map<string, ParentMeta>>(new Map());
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [capped, setCapped] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [barcodeDrafts, setBarcodeDrafts] = useState<Record<string, string>>(
    {},
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());

  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchFilter(id);
      if (!isBranchLockedRole && id.trim()) setHeaderBranchId(id.trim());
    },
    [isBranchLockedRole, setHeaderBranchId],
  );

  const runLoad = useCallback(async (branchId: string, searchText: string) => {
    setMessage("");
    setLoading(true);
    setCapped(false);
    try {
      const found: ItemSummaryRecord[] = [];
      let page = 0;
      let hitCap = false;
      let total = 0;
      for (;;) {
        const res = await fetchItemsPage(searchText.trim() || undefined, {
          catalogScope: "VARIANTS_ONLY",
          noBarcode: true,
          branchId: branchId.trim() || undefined,
          page,
          size: PAGE_SIZE,
          sort: [{ property: "name", direction: "asc" }],
        });
        total = res.totalElements;
        found.push(...res.content);
        if (res.last || res.content.length === 0) break;
        page += 1;
        if (page >= MAX_SCAN_PAGES) {
          hitCap = true;
          break;
        }
      }

      const parentIds = found
        .map((row) => row.variantOfItemId?.trim())
        .filter((id): id is string => Boolean(id));
      const parentMap = await loadParentMap(parentIds);

      setVariants(found);
      setParents(parentMap);
      setTotalElements(total);
      setCapped(hitCap);
      setBarcodeDrafts({});
      setSavingIds(new Set());
    } catch (error) {
      setVariants([]);
      setParents(new Map());
      setTotalElements(0);
      setBarcodeDrafts({});
      setSavingIds(new Set());
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load variants without barcodes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const setBarcodeDraft = useCallback((itemId: string, value: string) => {
    setBarcodeDrafts((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  const saveBarcode = useCallback(
    async (row: ItemSummaryRecord) => {
      if (!canWrite) {
        toast.error("You do not have permission to update barcodes.");
        return;
      }
      const code = (barcodeDrafts[row.id] ?? "").trim();
      if (!code) {
        toast.error("Enter a barcode first.");
        return;
      }

      let alreadySaving = false;
      setSavingIds((prev) => {
        if (prev.has(row.id)) {
          alreadySaving = true;
          return prev;
        }
        const next = new Set(prev);
        next.add(row.id);
        return next;
      });
      if (alreadySaving) return;

      try {
        await patchItem(row.id, { barcode: code });
        setVariants((prev) => prev.filter((v) => v.id !== row.id));
        setTotalElements((prev) => Math.max(0, prev - 1));
        setBarcodeDrafts((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        toast.success(`Barcode saved for ${variantOptionLabel(row)}.`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save barcode.",
        );
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [barcodeDrafts, canWrite],
  );

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list);
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load branches.");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    if (isBranchLockedRole && !me?.branchId?.trim()) return;
    void runLoad(branchFilter, query);
  }, [allowed, branchFilter, isBranchLockedRole, me?.branchId, query, runLoad]);

  const activeBranchName = useMemo(() => {
    if (!branchFilter) return "All branches";
    return (
      branches.find((b) => b.id === branchFilter)?.name?.trim() || branchFilter
    );
  }, [branchFilter, branches]);

  const groups = useMemo((): VariantGroup[] => {
    const byParent = new Map<string, ItemSummaryRecord[]>();
    const orphanKey = "__orphan__";

    for (const row of variants) {
      const parentId = row.variantOfItemId?.trim() || orphanKey;
      const list = byParent.get(parentId);
      if (list) list.push(row);
      else byParent.set(parentId, [row]);
    }

    const result: VariantGroup[] = [];
    for (const [parentId, rows] of byParent) {
      rows.sort((a, b) =>
        variantOptionLabel(a).localeCompare(variantOptionLabel(b), undefined, {
          sensitivity: "base",
        }),
      );
      if (parentId === orphanKey) {
        result.push({ parentId: null, parent: null, variants: rows });
        continue;
      }
      result.push({
        parentId,
        parent: parents.get(parentId) ?? null,
        variants: rows,
      });
    }

    result.sort((a, b) => {
      const aName =
        a.parent?.name ??
        (a.variants[0] ? parentLabelFromVariant(a.variants[0]) : "ZZZ");
      const bName =
        b.parent?.name ??
        (b.variants[0] ? parentLabelFromVariant(b.variants[0]) : "ZZZ");
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });
    return result;
  }, [variants, parents]);

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
        {
          href: APP_ROUTES.inventoryStock,
          label: "Stock",
          desc: "On-hand",
          icon: Warehouse,
        },
        {
          href: APP_ROUTES.inventoryRestock,
          label: "Out of stock",
          desc: "Restock",
          icon: PackageX,
        },
        {
          href: APP_ROUTES.inventoryValuation,
          label: "Valuation",
          desc: "Extension value",
          icon: BarChart3,
        },
        {
          href: APP_ROUTES.inventorySupplyBatches,
          label: "Supply batches",
          desc: "Cost layers",
          icon: Layers,
        },
        {
          href: APP_ROUTES.inventoryStockTake,
          label: "Stock take",
          desc: "Counts",
          icon: ClipboardList,
        },
        {
          href: APP_ROUTES.inventoryTransfers,
          label: "Transfers",
          desc: "Move stock",
          icon: ArrowRightLeft,
        },
        {
          href: APP_ROUTES.products,
          label: "Products",
          desc: "Catalog",
          icon: Package,
        },
      ]),
    [me],
  );

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Missing barcodes"
        description={
          <>
            You do not have permission to review catalog variants. Ask an
            administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.InventoryRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.inventoryStock}
        backLabel="Stock"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="flex min-h-0 flex-col gap-0 overflow-hidden border border-border bg-card">
        <header className="space-y-2 border-b border-border px-3 py-3">
          <DashboardPageHero
            compact
            showActiveScope
            icon={ScanLine}
            eyebrow="Inventory"
            title="Missing barcodes"
            description="Variant SKUs with no barcode, grouped under their parent. Scan or type a barcode and save it here — the row drops off once labeled."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div
          className={cn(
            supFilterRail,
            "flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end",
          )}
        >
          <div className="flex flex-1 flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-[18rem]">
              <span className={supFieldLabel}>Search</span>
              <input
                className={cn(supInput, "h-8 bg-background")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setQuery(search.trim());
                }}
                placeholder="Parent, variant, or SKU…"
                aria-label="Search variants"
              />
            </label>

            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
              <span className={supFieldLabel}>Branch</span>
              <select
                className={cn(
                  supSelect,
                  "h-8 bg-background disabled:cursor-not-allowed disabled:opacity-60",
                )}
                value={branchFilter}
                disabled={isBranchLockedRole}
                onChange={(event) => onChangeBranch(event.target.value)}
                aria-label="Branch filter"
              >
                {isBranchLockedRole ? null : (
                  <option value="">All branches</option>
                )}
                {branches
                  .filter((b) => b.active)
                  .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-none px-3"
              disabled={loading || (isBranchLockedRole && !me?.branchId?.trim())}
              onClick={() => {
                setQuery(search.trim());
                void runLoad(branchFilter, search.trim());
              }}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              {loading ? "…" : "Refresh"}
            </Button>
          </div>
        </div>

        {message ? (
          <p className="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {message}
          </p>
        ) : null}

        {capped && !loading ? (
          <p className="border-b border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Showing the first {variants.length.toLocaleString("en-KE")} of{" "}
            {totalElements.toLocaleString("en-KE")} matching variants. Narrow
            the search to see the rest.
          </p>
        ) : null}

        <div className={cn(supWorkspaceShell, "border-0 border-t")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
            <h2 className="text-xs font-semibold tracking-tight text-foreground">
              {loading
                ? "Loading…"
                : `Variants without barcode · ${activeBranchName}`}
            </h2>
            {!loading ? (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {variants.length.toLocaleString("en-KE")} variants ·{" "}
                {groups.length.toLocaleString("en-KE")} parents
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse border-0 text-left text-xs">
              <thead>
                <tr className={supTableHead}>
                  <th className={cn(supTableCell, "min-w-[12rem]")}>
                    Parent / variant
                  </th>
                  <th className={cn(supTableCell, "min-w-[6rem]")}>SKU</th>
                  <th className={cn(supTableCell, "text-right")}>Stock</th>
                  <th className={cn(supTableCell, "min-w-[14rem]")}>Barcode</th>
                  <th className={cn(supTableCell, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={supTableRow}>
                    <td
                      colSpan={5}
                      className={cn(
                        supTableCell,
                        "py-8 text-center text-sm text-muted-foreground",
                      )}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr className={supTableRow}>
                    <td
                      colSpan={5}
                      className={cn(
                        supTableCell,
                        "py-8 text-center text-sm text-muted-foreground",
                      )}
                    >
                      {query
                        ? "No variants without a barcode match this search."
                        : "Every variant has a barcode."}
                    </td>
                  </tr>
                ) : (
                  groups.flatMap((group) => {
                    const parentName =
                      group.parent?.name ??
                      (group.variants[0]
                        ? parentLabelFromVariant(group.variants[0])
                        : "Unknown parent");
                    const parentSku = group.parent?.sku ?? "";
                    const parentSearch =
                      parentSku || parentName || group.parentId || "";
                    const headerKey = `parent-${group.parentId ?? "orphan"}`;

                    const header = (
                      <tr
                        key={headerKey}
                        className="border-b border-border bg-[#eef2f7] dark:bg-muted/30"
                      >
                        <td className={cn(supTableCell, "py-2")} colSpan={3}>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Parent
                            </span>
                            <span className="truncate text-sm font-semibold text-foreground">
                              {parentName}
                            </span>
                            {parentSku ? (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {parentSku}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={supTableCell} />
                        <td className={cn(supTableCell, "text-right")}>
                          {parentSearch ? (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-none px-2.5 text-xs"
                            >
                              <Link
                                href={`${APP_ROUTES.products}?search=${encodeURIComponent(parentSearch)}`}
                              >
                                Open
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );

                    const variantRows = group.variants.map((row) => {
                      const option = variantOptionLabel(row);
                      const stock = branchFilter
                        ? toNum(row.stockQty)
                        : null;
                      const draft = barcodeDrafts[row.id] ?? "";
                      const saving = savingIds.has(row.id);
                      return (
                        <tr key={row.id} className={supTableRow}>
                          <td className={supTableCell}>
                            <div className="flex min-w-0 items-start gap-2 pl-3">
                              <span
                                className="mt-1.5 size-1.5 shrink-0 bg-muted-foreground/50"
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {option}
                                </div>
                                {row.packageVariant ? (
                                  <div className="text-[10px] text-muted-foreground">
                                    Package variant
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td
                            className={cn(
                              supTableCell,
                              "font-mono text-[11px] tabular-nums text-muted-foreground",
                            )}
                          >
                            {row.sku?.trim() || "—"}
                          </td>
                          <td
                            className={cn(
                              supTableCell,
                              "text-right font-mono tabular-nums",
                            )}
                          >
                            {branchFilter ? fmtQty(stock) : "—"}
                          </td>
                          <td className={supTableCell}>
                            {canWrite ? (
                              <input
                                className={cn(
                                  supInput,
                                  "h-8 w-full min-w-[10rem] bg-background font-mono text-xs",
                                )}
                                value={draft}
                                disabled={saving}
                                onChange={(e) =>
                                  setBarcodeDraft(row.id, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void saveBarcode(row);
                                  }
                                }}
                                placeholder="Scan or type…"
                                aria-label={`Barcode for ${option}`}
                                autoComplete="off"
                              />
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                No write access
                              </span>
                            )}
                          </td>
                          <td className={cn(supTableCell, "text-right")}>
                            {canWrite ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-none px-2.5 text-xs"
                                disabled={saving || !draft.trim()}
                                onClick={() => void saveBarcode(row)}
                              >
                                {saving ? "Saving…" : "Save"}
                              </Button>
                            ) : (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-none px-2.5 text-xs"
                              >
                                <Link
                                  href={`${APP_ROUTES.products}?search=${encodeURIComponent(row.sku?.trim() || option)}`}
                                >
                                  Open
                                </Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    });

                    return [header, ...variantRows];
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && variants.length > 0 ? (
            <div className="border-t border-border bg-[#eef2f7] px-2.5 py-1.5 text-[10px] text-muted-foreground dark:bg-muted/25">
              <span className={supKicker}>Summary</span>
              <span className="ml-2 font-mono tabular-nums text-foreground">
                {variants.length}
              </span>{" "}
              variants across{" "}
              <span className="font-mono tabular-nums text-foreground">
                {groups.length}
              </span>{" "}
              parents
              {totalElements > variants.length ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {totalElements}
                  </span>{" "}
                  total matching
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Barcode,
  Boxes,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GitBranch,
  LayoutGrid,
  Package,
  PackageSearch,
  RefreshCw,
  Tag,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { APP_ROUTES, categorySlugPath, categoryAnalyticsPath } from "@/lib/config";
import {
  fetchCategories,
  fetchItemsPage,
  itemListThumbnailUrl,
  type CategoryRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { cn, categoryIconImageUrl } from "@/lib/utils";

function categoryCoverUrl(row: CategoryRecord): string | null {
  const thumb = row.thumbnailUrl?.trim();
  if (thumb) return thumb;
  const key = row.imageKey?.trim();
  if (key?.startsWith("http://") || key?.startsWith("https://")) return key;
  return null;
}

type TreeNode = {
  item: ItemSummaryRecord;
  depth: number;
  isParent: boolean;
  isVariant: boolean;
  isLabel: boolean;
  childIds: string[];
  parentId?: string;
};

function buildProductTree(products: ItemSummaryRecord[]): TreeNode[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const childrenMap = new Map<string, ItemSummaryRecord[]>();

  for (const p of products) {
    if (p.variantOfItemId) {
      const list = childrenMap.get(p.variantOfItemId) ?? [];
      list.push(p);
      childrenMap.set(p.variantOfItemId, list);
    }
  }

  // Sort children by name
  for (const [key, list] of childrenMap) {
    childrenMap.set(
      key,
      list.sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  const visited = new Set<string>();
  const result: TreeNode[] = [];

  const walk = (item: ItemSummaryRecord, depth: number) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);

    const kids = childrenMap.get(item.id) ?? [];
    result.push({
      item,
      depth,
      isParent: kids.length > 0,
      isVariant: Boolean(item.variantOfItemId),
      isLabel: item.groupLabelOnly === true,
      childIds: kids.map((c) => c.id),
      parentId: item.variantOfItemId ?? undefined,
    });

    for (const child of kids) {
      walk(child, depth + 1);
    }
  };

  // First pass: items that are parents (have children) or are standalone
  const parents = products
    .filter((p) => {
      const hasChildren = (childrenMap.get(p.id)?.length ?? 0) > 0;
      return hasChildren || !p.variantOfItemId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const p of parents) {
    walk(p, 0);
  }

  // Second pass: orphaned variants (parent not in list)
  for (const p of products) {
    if (!visited.has(p.id)) {
      walk(p, 0);
    }
  }

  return result;
}

function rowTone(node: TreeNode) {
  if (node.isLabel) {
    return {
      label: "Label",
      icon: Tag,
      accent: "bg-amber-500",
      accentLight: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-800 dark:text-amber-300",
      muted: "text-amber-700/60 dark:text-amber-400/60",
      rowBg: "hover:bg-amber-500/[0.03]",
    };
  }
  if (node.isVariant) {
    return {
      label: "Variant",
      icon: CornerDownRight,
      accent: "bg-violet-500",
      accentLight: "bg-violet-500/10",
      border: "border-violet-500/30",
      text: "text-violet-800 dark:text-violet-300",
      muted: "text-violet-700/60 dark:text-violet-400/60",
      rowBg: "hover:bg-violet-500/[0.03]",
    };
  }
  return {
    label: node.isParent ? "Parent" : "Product",
    icon: Package,
    accent: "bg-emerald-500",
    accentLight: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-800 dark:text-emerald-300",
    muted: "text-emerald-700/60 dark:text-emerald-400/60",
    rowBg: "hover:bg-emerald-500/[0.03]",
  };
}

function stockMeta(qty: number | string | null | undefined) {
  const n = qty == null ? null : Number(qty);
  if (n == null || !Number.isFinite(n)) {
    return { badge: null, bar: 0, tone: "neutral" as const };
  }
  if (n <= 0) {
    return { badge: "Out of stock", bar: 0, tone: "danger" as const };
  }
  if (n <= 5) {
    return { badge: "Low", bar: Math.min((n / 20) * 100, 100), tone: "warning" as const };
  }
  return { badge: "Healthy", bar: Math.min((n / 50) * 100, 100), tone: "success" as const };
}

const TONE_STYLES = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  neutral: "bg-muted",
};

const BADGE_STYLES = {
  danger: "bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
};

export default function CategorySlugPage() {
  const params = useParams();
  const slug = (params.slug as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryRecord | null>(null);
  const [products, setProducts] = useState<ItemSummaryRecord[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildProductTree(products), [products]);

  const visibleTree = useMemo(() => {
    const hidden = new Set<string>();
    for (const node of tree) {
      if (node.parentId && collapsedParentIds.has(node.parentId)) {
        hidden.add(node.item.id);
      }
      // Also hide descendants of collapsed
      if (node.parentId && hidden.has(node.parentId)) {
        hidden.add(node.item.id);
      }
    }
    return tree.filter((n) => !hidden.has(n.item.id));
  }, [tree, collapsedParentIds]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const allCategories = await fetchCategories();
      const found = allCategories.find((c) => c.slug === slug);
      if (!found) {
        setError(`Category "${slug}" not found.`);
        setLoading(false);
        return;
      }
      setCategory(found);

      const page = await fetchItemsPage(undefined, {
        categoryId: found.id,
        includeCategoryDescendants: includeDescendants,
        size: 200,
        includeInactive: true,
        catalogScope: "ALL",
      });
      setProducts(page.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category.");
    } finally {
      setLoading(false);
    }
  }, [slug, includeDescendants]);

  useEffect(() => {
    if (!slug) return;
    void load();
  }, [load, slug]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const toggleParent = useCallback((id: string) => {
    setCollapsedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!slug) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <p className="text-sm text-muted-foreground">No category slug provided.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={APP_ROUTES.categories}>Back to categories</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <DashboardLoading label="Loading category…" />;
  }

  if (error || !category) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageSearch className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">{error ?? "Category not found"}</h1>
        <Button asChild variant="outline" className="mt-6 gap-2">
          <Link href={APP_ROUTES.categories}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to categories
          </Link>
        </Button>
      </div>
    );
  }

  const cover = categoryCoverUrl(category);
  const iconImage = categoryIconImageUrl(category.icon);
  const activeProducts = products.filter((p) => p.active !== false).length;
  const inactiveProducts = products.filter((p) => p.active === false).length;

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href={APP_ROUTES.categories} className="transition-colors hover:text-foreground">
            Categories
          </Link>
          <ChevronRight className="size-3.5 opacity-50" aria-hidden />
          <span className="truncate font-medium text-foreground">{category.name}</span>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="relative h-40 sm:h-48">
            {cover ? (
              <Image src={cover} alt="" fill className="object-cover" sizes="(max-width: 1200px) 100vw, 1200px" unoptimized />
            ) : (
              <div className="h-full bg-gradient-to-br from-primary/10 via-muted/40 to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="flex items-end gap-4">
                <div className="relative -mb-8 hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-background bg-muted shadow-md sm:block">
                  {iconImage ? (
                    <Image src={iconImage} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg text-muted-foreground">
                      {category.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{category.name}</h1>
                    {category.active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{category.slug}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-10 pb-4 sm:px-6 sm:pt-12">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-2xl">
                {category.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/60">No description set.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <Boxes className="size-4 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Products</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{products.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <Package className="size-4 text-emerald-600" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Active</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-700">{activeProducts}</p>
                  </div>
                </div>
                {inactiveProducts > 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <Package className="size-4 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Inactive</p>
                      <p className="text-sm font-bold tabular-nums text-muted-foreground">{inactiveProducts}</p>
                    </div>
                  </div>
                ) : null}
                {category.linkedSuppliers.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <Warehouse className="size-4 text-primary" aria-hidden />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Suppliers</p>
                      <p className="text-sm font-bold tabular-nums text-foreground">{category.linkedSuppliers.length}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DashboardPageHero
              compact
              icon={LayoutGrid}
              eyebrow="Catalog"
              title="Products"
              description={`Everything filed under ${category.name}.`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button asChild type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
              <Link href={categoryAnalyticsPath(category.slug)}>
                <BarChart3 className="size-3.5" aria-hidden />
                Analytics
              </Link>
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                checked={includeDescendants}
                onChange={(e) => setIncludeDescendants(e.target.checked)}
                className="size-3.5 rounded border-input"
              />
              Include subcategories
            </label>
          </div>
        </div>

        {/* Hierarchical Product Tree */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/50">
              <PackageSearch className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {includeDescendants
                  ? "This branch of the category tree has no products yet."
                  : "This category has no direct products yet."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setIncludeDescendants((p) => !p)}>
              {includeDescendants ? "Show direct only" : "Include subcategories"}
            </Button>
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            {/* Table header */}
            <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_1fr_7rem_7rem_5rem_4.5rem] items-center gap-2 border-b border-border/50 bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm sm:grid-cols-[2.5rem_1fr_9rem_9rem_6rem_5rem]">
              <span className="sr-only">Expand</span>
              <span>Product</span>
              <span className="hidden sm:block">SKU / Barcode</span>
              <span className="sm:hidden">SKU</span>
              <span className="text-right">Stock</span>
              <span className="text-right">Status</span>
            </div>

            {/* Tree body */}
            <div className="divide-y divide-border/30">
              {visibleTree.map((node, index) => {
                const { item, depth, isParent, childIds } = node;
                const tone = rowTone(node);
                const TypeIcon = tone.icon;
                const thumb = itemListThumbnailUrl(item);
                const collapsed = collapsedParentIds.has(item.id);
                const stock = stockMeta(item.stockQty);
                const isLastInGroup =
                  index === visibleTree.length - 1 ||
                  visibleTree[index + 1]?.depth !== depth ||
                  (visibleTree[index + 1]?.depth === 0 && depth > 0);

                const indentPx = depth * 28;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative grid grid-cols-[2.5rem_1fr_7rem_7rem_5rem_4.5rem] items-center gap-2 px-3 py-2.5 text-sm transition-colors sm:grid-cols-[2.5rem_1fr_9rem_9rem_6rem_5rem]",
                      tone.rowBg,
                      item.active === false && "opacity-60",
                    )}
                  >
                    {/* Left accent + expand */}
                    <div className="flex items-center justify-center">
                      {/* Vertical tree connector */}
                      {depth > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" style={{ marginLeft: `${indentPx - 14}px` }} />
                      )}
                      {/* Horizontal connector */}
                      {depth > 0 && (
                        <div
                          className="absolute h-px w-3 bg-border/40"
                          style={{ marginLeft: `${indentPx - 14}px`, marginTop: "-1px" }}
                        />
                      )}
                      {/* Corner/branch connector for variants */}
                      {depth > 0 && !isLastInGroup && (
                        <div
                          className="absolute w-px bg-border/40"
                          style={{
                            left: `${indentPx - 14}px`,
                            top: "50%",
                            bottom: "-1px",
                          }}
                        />
                      )}

                      {/* Accent bar */}
                      <div className={cn("absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full", tone.accent)} />

                      {/* Expand/collapse toggle for parents */}
                      {isParent ? (
                        <button
                          type="button"
                          onClick={() => toggleParent(item.id)}
                          className="inline-flex size-6 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={collapsed ? `Expand ${item.name} variants` : `Collapse ${item.name} variants`}
                        >
                          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                      ) : depth > 0 ? (
                        <span className="inline-flex size-6 items-center justify-center">
                          <CornerDownRight className={cn("size-3.5", tone.muted)} />
                        </span>
                      ) : (
                        <span className="inline-flex size-6 items-center justify-center">
                          <TypeIcon className={cn("size-3.5", tone.muted)} />
                        </span>
                      )}
                    </div>

                    {/* Name + thumbnail */}
                    <div className="flex min-w-0 items-center gap-2.5" style={{ paddingLeft: indentPx }}>
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {thumb ? (
                          <Image src={thumb} alt="" fill className="object-cover" sizes="36px" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <TypeIcon className={cn("size-4 opacity-30", tone.text)} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("truncate text-sm font-medium", tone.text)}>{item.name}</span>
                          {isParent && childIds.length > 0 && (
                            <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums", tone.accentLight, tone.text)}>
                              {childIds.length}
                            </span>
                          )}
                        </div>
                        {item.variantName && (
                          <p className={cn("truncate text-[11px]", tone.muted)}>{item.variantName}</p>
                        )}
                      </div>
                    </div>

                    {/* SKU / Barcode */}
                    <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {item.sku ? (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                      {item.barcode ? (
                        <span className="truncate font-mono text-[10px] text-muted-foreground/60">
                          <Barcode className="mr-1 inline size-2.5" />
                          {item.barcode}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5 sm:hidden">
                      {item.sku ? (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Stock with visual bar */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {stock.badge ? (
                          <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", BADGE_STYLES[stock.tone])}>
                            {stock.badge}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </div>
                      {item.stockQty != null && Number.isFinite(Number(item.stockQty)) && (
                        <div className="flex w-full items-center gap-1.5">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full transition-all", TONE_STYLES[stock.tone])}
                              style={{ width: `${stock.bar}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">{item.stockQty}</span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      {item.active === false ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                {visibleTree.length} of {products.length} visible
                {collapsedParentIds.size > 0 && ` · ${collapsedParentIds.size} parent${collapsedParentIds.size !== 1 ? "s" : ""} collapsed`}
              </p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground"
                  disabled={collapsedParentIds.size === 0}
                  onClick={() => setCollapsedParentIds(new Set())}
                >
                  Expand all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground"
                  disabled={collapsedParentIds.size === tree.filter((n) => n.isParent).length}
                  onClick={() => setCollapsedParentIds(new Set(tree.filter((n) => n.isParent).map((n) => n.item.id)))}
                >
                  Collapse all
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href={APP_ROUTES.categories}>
              <ArrowLeft className="size-3.5" aria-hidden />
              All categories
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {includeDescendants ? " (including subcategories)" : " (direct only)"}
          </p>
        </div>
      </div>
    </div>
  );
}

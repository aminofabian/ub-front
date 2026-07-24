"use client";

import Link from "next/link";
import {
  Building2,
  CircleDollarSign,
  Layers,
  LayoutGrid,
  PackagePlus,
  Library,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export type AttentionFilterId =
  | "missingBarcode"
  | "noPrice"
  | "zeroStock"
  | "lowStock"
  | "inactive";

type AttentionStat = {
  id: AttentionFilterId;
  count: number;
  label: string;
  active: boolean;
};

type Props = {
  itemTypeCount: number;
  attentionStats?: AttentionStat[];
  onAttentionToggle?: (id: AttentionFilterId) => void;
  onCreateNew: () => void;
  onAddVariant?: () => void;
  canAddVariant?: boolean;
  onAddFromCatalog?: () => void;
  canAddFromCatalog?: boolean;
};

const relatedLinks = [
  { href: APP_ROUTES.categories, label: "Categories", icon: LayoutGrid },
  { href: APP_ROUTES.suppliers, label: "Suppliers", icon: Building2 },
  { href: APP_ROUTES.pricing, label: "Pricing", icon: CircleDollarSign },
] as const;

export function ProductHeroHeader({
  itemTypeCount,
  attentionStats = [],
  onAttentionToggle,
  onCreateNew,
  onAddVariant,
  canAddVariant = true,
  onAddFromCatalog,
  canAddFromCatalog = true,
}: Props) {
  const canCreate = itemTypeCount > 0;
  const visibleAttention = attentionStats.filter((s) => s.count > 0);

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-1.5 border border-border bg-card px-2 py-1.5",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-2.5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
        <ActiveScopeSubtitle className="w-full text-[11px] sm:w-auto" />

        {visibleAttention.length > 0 ? (
          <div
            className="flex min-w-0 flex-wrap items-center gap-1"
            role="group"
            aria-label="Needs attention filters"
          >
            {visibleAttention.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => onAttentionToggle?.(stat.id)}
                aria-pressed={stat.active}
                title={
                  stat.active
                    ? `Clear “${stat.label}” filter`
                    : `Filter: ${stat.label}`
                }
                className={cn(
                  "inline-flex h-6 items-center gap-1 border px-1.5 text-[10px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  stat.active
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="tabular-nums font-semibold">
                  {stat.count.toLocaleString()}
                </span>
                <span>{stat.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        <nav
          aria-label="Related catalog pages"
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:border-l sm:border-border/50 sm:pl-3"
        >
          {relatedLinks.map(({ href, label, icon: Icon }, index) => (
            <span key={href} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span className="text-border" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={href}
                className={cn(
                  "inline-flex items-center gap-1 font-medium text-muted-foreground",
                  "transition-colors hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
              >
                <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
                {label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onAddVariant ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canCreate || !canAddVariant}
            onClick={onAddVariant}
            className="h-7 gap-1 rounded-none px-1.5 text-xs text-muted-foreground shadow-none hover:text-foreground"
          >
            <Layers className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Add variant</span>
          </Button>
        ) : null}
        {onAddFromCatalog ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canCreate || !canAddFromCatalog}
            onClick={onAddFromCatalog}
            className="h-7 gap-1 rounded-none px-1.5 text-xs text-muted-foreground shadow-none hover:text-foreground"
          >
            <Library className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">From catalog</span>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!canCreate}
          onClick={onCreateNew}
          className="h-7 gap-1.5 rounded-none px-2.5 text-xs shadow-none"
        >
          <PackagePlus className="size-3.5" aria-hidden />
          New product
        </Button>
      </div>
    </header>
  );
}

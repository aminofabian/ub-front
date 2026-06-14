"use client";

import Link from "next/link";
import {
  Building2,
  CircleDollarSign,
  Layers,
  LayoutGrid,
  PackagePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type AttentionStat = {
  count: number;
  label: string;
};

type Props = {
  itemTypeCount: number;
  totalProducts?: number;
  attentionStats?: AttentionStat[];
  onCreateNew: () => void;
  onAddVariant?: () => void;
  canAddVariant?: boolean;
};

const relatedLinks = [
  { href: APP_ROUTES.categories, label: "Categories", icon: LayoutGrid },
  { href: APP_ROUTES.suppliers, label: "Suppliers", icon: Building2 },
  { href: APP_ROUTES.pricing, label: "Pricing", icon: CircleDollarSign },
] as const;

export function ProductHeroHeader({
  itemTypeCount,
  totalProducts,
  attentionStats = [],
  onCreateNew,
  onAddVariant,
  canAddVariant = true,
}: Props) {
  const canCreate = itemTypeCount > 0;
  const visibleAttention = attentionStats.filter((s) => s.count > 0);

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-2 border border-border bg-card px-2.5 py-2",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
        {totalProducts != null ? (
          <p className="text-xs text-muted-foreground">
            <span className="tabular-nums font-semibold text-foreground">
              {totalProducts.toLocaleString()}
            </span>{" "}
            in catalog
          </p>
        ) : null}

        <nav
          aria-label="Related catalog pages"
          className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Related
          </span>
          <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {relatedLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground",
                    "transition-colors hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                >
                  <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {visibleAttention.length > 0 ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            {visibleAttention.map((stat, index) => (
              <span key={stat.label}>
                {index > 0 ? (
                  <span className="mx-1.5 text-border">·</span>
                ) : null}
                <span className="tabular-nums font-semibold text-foreground">
                  {stat.count.toLocaleString()}
                </span>{" "}
                {stat.label}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {onAddVariant ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canCreate || !canAddVariant}
            onClick={onAddVariant}
            className="h-8 gap-1.5 rounded-none border-border px-2.5 text-xs shadow-none"
          >
            <Layers className="size-3.5" aria-hidden />
            Add variant
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!canCreate}
          onClick={onCreateNew}
          className="h-8 gap-1.5 rounded-none px-3 text-xs shadow-none"
        >
          <PackagePlus className="size-3.5" aria-hidden />
          New product
        </Button>
      </div>
    </header>
  );
}

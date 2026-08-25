"use client";

import Link from "next/link";
import { BookOpen, FileUp, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ProductGuideDrawer } from "./ProductGuideDrawer";

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

export function ProductHeroHeader({
  itemTypeCount,
  attentionStats = [],
  onAttentionToggle,
  onCreateNew,
}: Props) {
  const canCreate = itemTypeCount > 0;
  const visibleAttention = attentionStats.filter((s) => s.count > 0);

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-background px-1 py-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <ActiveScopeSubtitle className="text-[11px]" />
        </div>

        {visibleAttention.length > 0 ? (
          <div
            className="flex min-w-0 flex-wrap items-center gap-1"
            role="group"
            aria-label="Needs a look"
          >
            <span className="pr-1 text-[11px] text-muted-foreground">
              Needs a look
            </span>
            {visibleAttention.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => onAttentionToggle?.(stat.id)}
                aria-pressed={stat.active}
                title={
                  stat.active
                    ? `Clear “${stat.label}” filter`
                    : `Show products with ${stat.label}`
                }
                className={cn(
                  "inline-flex h-7 items-center gap-1 border px-2 text-[11px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  stat.active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground",
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
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ProductGuideDrawer
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-none px-2 text-[12px] text-muted-foreground shadow-none hover:text-foreground"
              title="How to add products"
            >
              <BookOpen className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Help</span>
            </Button>
          }
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-none px-2.5 text-[12px] shadow-none"
        >
          <Link href={APP_ROUTES.businessImport} title="Add many products from a spreadsheet">
            <FileUp className="size-3.5" aria-hidden />
            Import
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canCreate}
          onClick={onCreateNew}
          className="h-8 gap-1.5 rounded-none px-3 text-[12px] shadow-none"
        >
          <PackagePlus className="size-3.5" aria-hidden />
          Add product
        </Button>
      </div>
    </header>
  );
}

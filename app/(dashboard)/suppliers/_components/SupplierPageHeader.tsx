"use client";

import Link from "next/link";
import {
  BookOpen,
  ChartNoAxesColumn,
  CircleDollarSign,
  LayoutGrid,
  Package,
  PackagePlus,
  Plus,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupplierGuideDrawer } from "./SupplierGuideDrawer";
import { HAIRLINE, supBtnPrimary } from "./supplier-ui-tokens";

const RELATED_LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    href: APP_ROUTES.products,
    label: "Products",
    icon: Package,
  },
  {
    href: APP_ROUTES.categories,
    label: "Categories",
    icon: LayoutGrid,
  },
  {
    href: APP_ROUTES.purchasingSpend,
    label: "Spend",
    icon: ChartNoAxesColumn,
  },
  {
    href: APP_ROUTES.purchasingIntelligence,
    label: "Compare",
    icon: CircleDollarSign,
  },
];

export function SupplierPageHeader({
  canWrite,
  canOpenNewSupply,
  listLoadingInitial,
  totalCount,
  onNewSupplier,
  onNewSupply,
  receiveTillHref,
}: {
  canWrite: boolean;
  canOpenNewSupply: boolean;
  listLoadingInitial: boolean;
  totalCount?: number;
  receiveTillHref?: string | null;
  onNewSupplier: () => void;
  onNewSupply: () => void;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:px-3",
        HAIRLINE,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#e6f4f0] text-[#0f766e]">
            <Truck className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1
              className="hidden truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground 2xl:block"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Suppliers
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
              <ActiveScopeSubtitle className="text-[11px]" />
              {totalCount != null && totalCount > 0 ? (
                <p>
                  <span className="tabular-nums font-semibold text-foreground">
                    {totalCount.toLocaleString()}
                  </span>{" "}
                  vendors
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <nav
          aria-label="Related pages"
          className="hidden min-w-0 flex-wrap items-center gap-0.5 lg:flex"
        >
          {RELATED_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-semibold tracking-[-0.02em] text-muted-foreground",
                "transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
              )}
            >
              <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
              {label}
            </Link>
          ))}
          <SupplierGuideDrawer
            trigger={
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-semibold tracking-[-0.02em] text-muted-foreground",
                  "transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
                )}
                title="The complete supplier flow — summary + full guide"
                aria-label="Supplier guide"
              >
                <BookOpen className="size-3 shrink-0 opacity-70" aria-hidden />
                <span className="hidden sm:inline">Guide</span>
              </button>
            }
          />
        </nav>
      </div>

      {(canWrite || canOpenNewSupply) && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {canOpenNewSupply && receiveTillHref ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-xl px-2.5 text-[12px] font-medium shadow-none"
              asChild
            >
              <Link href={receiveTillHref}>
                <PackagePlus className="size-3.5" aria-hidden />
                Open till
              </Link>
            </Button>
          ) : null}
          {canOpenNewSupply ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-xl px-2.5 text-[12px] font-medium shadow-none"
              onClick={onNewSupply}
            >
              <PackagePlus className="size-3.5" aria-hidden />
              New supply
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className={cn(supBtnPrimary, "h-8 px-2.5 text-[12px]")}
              disabled={listLoadingInitial}
              onClick={onNewSupplier}
            >
              <Plus className="size-3.5" aria-hidden />
              New supplier
            </Button>
          ) : null}
        </div>
      )}
    </header>
  );
}

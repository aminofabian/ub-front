"use client";

import Link from "next/link";
import {
  CircleDollarSign,
  LayoutGrid,
  Package,
  PackagePlus,
  Plus,
} from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { supBtnPrimary } from "./supplier-ui-tokens";

const RELATED_LINKS = [
  {
    href: APP_ROUTES.purchasingAddSupplies,
    label: "Supplies",
    icon: PackagePlus,
  },
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
    href: APP_ROUTES.purchasingIntelligence,
    label: "Intelligence",
    icon: CircleDollarSign,
  },
] as const;

export function SupplierPageHeader({
  canWrite,
  canOpenNewSupply,
  listLoadingInitial,
  totalCount,
  onNewSupplier,
  onNewSupply,
}: {
  canWrite: boolean;
  canOpenNewSupply: boolean;
  listLoadingInitial: boolean;
  totalCount?: number;
  onNewSupplier: () => void;
  onNewSupply: () => void;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-2 border border-border/70 bg-card px-3 py-2.5 shadow-sm",
        "rounded-xl sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3.5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
        <div className="min-w-0">
          {/* Desktop sidebar chrome has no large title — show it only at 2xl+. */}
          <h1 className="hidden font-heading text-xl font-semibold leading-tight tracking-tight text-foreground 2xl:block sm:text-2xl">
            Suppliers
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <ActiveScopeSubtitle className="text-[11px]" />
            {totalCount != null && totalCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="tabular-nums font-semibold text-foreground">
                  {totalCount.toLocaleString()}
                </span>{" "}
                vendors
              </p>
            ) : null}
          </div>
        </div>

        <nav
          aria-label="Related purchasing pages"
          className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Related
          </span>
          <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {RELATED_LINKS.map(({ href, label, icon: Icon }) => (
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
      </div>

      {(canWrite || canOpenNewSupply) && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {canOpenNewSupply ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 rounded-lg px-3 text-sm font-medium"
              onClick={onNewSupply}
            >
              <PackagePlus className="size-4" aria-hidden />
              New supply
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className={cn(supBtnPrimary, "h-9")}
              disabled={listLoadingInitial}
              onClick={onNewSupplier}
            >
              <Plus className="size-4" aria-hidden />
              New supplier
            </Button>
          ) : null}
        </div>
      )}
    </header>
  );
}

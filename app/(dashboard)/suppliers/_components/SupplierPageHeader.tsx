"use client";

import Link from "next/link";
import {
  BookOpen,
  CircleDollarSign,
  LayoutGrid,
  Package,
  PackagePlus,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupplierGuideDrawer } from "./SupplierGuideDrawer";
import { supBtnPrimary } from "./supplier-ui-tokens";

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
    <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ActiveScopeSubtitle className="text-[11px]" />
            {totalCount != null && totalCount > 0 ? (
              <p className="text-xs text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                <span className="tabular-nums font-semibold text-[var(--order-ink,#15231f)]">
                  {totalCount.toLocaleString()}
                </span>{" "}
                vendors in directory
              </p>
            ) : null}
          </div>
        </div>

        <nav
          aria-label="Related pages"
          className="flex min-w-0 flex-wrap items-center gap-1.5"
        >
          {RELATED_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)] px-2.5 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
                "transition hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
                  "inline-flex h-8 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)] px-2.5 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
                  "transition hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                )}
                title="The complete supplier flow — summary + full guide"
              >
                <BookOpen className="size-3 shrink-0 opacity-70" aria-hidden />
                Guide
              </button>
            }
          />
        </nav>
      </div>

      {(canWrite || canOpenNewSupply) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canOpenNewSupply && receiveTillHref ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 rounded-md px-3 text-sm font-medium"
              asChild
            >
              <Link href={receiveTillHref}>
                <PackagePlus className="size-4" aria-hidden />
                Open till
              </Link>
            </Button>
          ) : null}
          {canOpenNewSupply ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 rounded-md px-3 text-sm font-medium"
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
              className={cn(supBtnPrimary, "h-9 bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]")}
              disabled={listLoadingInitial}
              onClick={onNewSupplier}
            >
              <Plus className="size-4" aria-hidden />
              New supplier
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  BookOpen,
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
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1 sm:px-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
            <Truck className="size-3.5" aria-hidden />
          </span>
          <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            Suppliers
          </h1>
        </div>

        <span
          aria-hidden
          className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        />

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          <ActiveScopeSubtitle className="text-[11px]" />
          {totalCount != null && totalCount > 0 ? (
            <p>
              <span className="tabular-nums font-semibold text-[var(--order-ink,#15231f)]">
                {totalCount.toLocaleString()}
              </span>{" "}
              vendors
            </p>
          ) : null}
        </div>

        <nav
          aria-label="Related pages"
          className="flex min-w-0 flex-wrap items-center gap-1"
        >
          {RELATED_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
                "transition-colors hover:text-[var(--order-ink,#15231f)]",
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
                  "inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
                  "transition-colors hover:text-[var(--order-ink,#15231f)]",
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
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {canOpenNewSupply && receiveTillHref ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-none px-2.5 text-[12px] font-medium"
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
              className="h-8 gap-1 rounded-none px-2.5 text-[12px] font-medium"
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
              className={cn(
                supBtnPrimary,
                "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[12px] hover:bg-[#0d6b63]",
              )}
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

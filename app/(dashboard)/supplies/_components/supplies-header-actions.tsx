"use client";

import {
  BarChart3,
  BookOpen,
  CreditCard,
  PackagePlus,
  RefreshCw,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupplierGuideDrawer } from "../../suppliers/_components/SupplierGuideDrawer";

const chip = cn(
  "inline-flex h-8 items-center gap-1 rounded-none px-2 text-[12px] font-semibold tracking-[-0.02em] text-muted-foreground",
  "transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
);

const chipActive = cn(
  "inline-flex h-8 items-center gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] px-2 text-[12px] font-semibold tracking-[-0.02em] text-white",
);

export function SuppliesHeaderActions({
  canViewApAging,
  canShowProcurementLinks,
  canOpenNewSupply,
  canPayAdvance,
  listLoading,
  unpaidActive,
  onRefresh,
  onNewSupply,
  onPayAdvance,
  onPayOpen,
}: {
  canViewApAging: boolean;
  canShowProcurementLinks: boolean;
  canOpenNewSupply: boolean;
  canPayAdvance?: boolean;
  listLoading: boolean;
  unpaidActive?: boolean;
  onRefresh: () => void;
  onNewSupply: () => void;
  onPayAdvance?: () => void;
  onPayOpen?: () => void;
}) {
  return (
    <>
      {canShowProcurementLinks ? (
        <>
          {canViewApAging ? (
            <Link href={APP_ROUTES.purchasingApAging} className={chip}>
              <BarChart3 className="size-3" aria-hidden />
              Aging
            </Link>
          ) : null}
          {onPayOpen ? (
            <button
              type="button"
              onClick={onPayOpen}
              className={unpaidActive ? chipActive : chip}
            >
              <CreditCard className="size-3" aria-hidden />
              Unpaid
            </button>
          ) : (
            <Link
              href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
              className={unpaidActive ? chipActive : chip}
            >
              <CreditCard className="size-3" aria-hidden />
              Unpaid
            </Link>
          )}
          <Link
            href={APP_ROUTES.suppliers}
            className={cn(chip, "hidden sm:inline-flex")}
          >
            <Truck className="size-3" aria-hidden />
            Vendors
          </Link>
        </>
      ) : null}
      <SupplierGuideDrawer
        trigger={
          <button
            type="button"
            className={cn(chip, "hidden md:inline-flex")}
            title="Supplier flow guide"
          >
            <BookOpen className="size-3" aria-hidden />
            Guide
          </button>
        }
      />
      <button
        type="button"
        disabled={listLoading}
        onClick={onRefresh}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-none text-muted-foreground",
          "transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        aria-label="Refresh supplies"
      >
        <RefreshCw
          className={cn("size-3", listLoading && "animate-spin")}
          aria-hidden
        />
      </button>
      {canPayAdvance && onPayAdvance ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-none px-2.5 text-[12px] font-semibold shadow-none"
          onClick={onPayAdvance}
        >
          <Wallet className="size-3" aria-hidden />
          Advance / deposit
        </Button>
      ) : null}
      {canOpenNewSupply ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 rounded-none px-2.5 text-[12px] font-semibold shadow-none"
          onClick={onNewSupply}
        >
          <PackagePlus className="size-3" aria-hidden />
          Walk-in supply
        </Button>
      ) : null}
    </>
  );
}

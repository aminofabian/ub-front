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
  "inline-flex h-7 items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_40%,transparent)] px-2 text-[10px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
  "transition hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
              className={cn(
                chip,
                unpaidActive &&
                  "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-[var(--pos-primary,#0f766e)]",
              )}
            >
              <CreditCard className="size-3" aria-hidden />
              Unpaid
            </button>
          ) : (
            <Link
              href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
              className={cn(
                chip,
                unpaidActive &&
                  "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-[var(--pos-primary,#0f766e)]",
              )}
            >
              <CreditCard className="size-3" aria-hidden />
              Unpaid
            </Link>
          )}
          <Link href={APP_ROUTES.suppliers} className={cn(chip, "hidden sm:inline-flex")}>
            <Truck className="size-3" aria-hidden />
            Vendors
          </Link>
        </>
      ) : null}
      <SupplierGuideDrawer
        trigger={
          <button type="button" className={cn(chip, "hidden md:inline-flex")} title="Supplier flow guide">
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
          "inline-flex size-7 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white",
          "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        aria-label="Refresh supplies"
      >
        <RefreshCw className={cn("size-3", listLoading && "animate-spin")} aria-hidden />
      </button>
      {canPayAdvance && onPayAdvance ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 rounded-md border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] px-2 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)] shadow-none"
          onClick={onPayAdvance}
        >
          <Wallet className="size-3" aria-hidden />
          Deposit
        </Button>
      ) : null}
      {canOpenNewSupply ? (
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 rounded-md bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-semibold text-white shadow-none hover:bg-[#0d6b63]"
          onClick={onNewSupply}
        >
          <PackagePlus className="size-3" aria-hidden />
          New supply
        </Button>
      ) : null}
    </>
  );
}

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

const actionBtnOutline = cn(
  "h-9 gap-1 rounded-lg border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 text-[12px] shadow-none",
);

const actionBtnPrimary = cn(
  "h-9 gap-1.5 rounded-lg bg-[var(--order-ink,#15231f)] px-3.5 text-[12px] text-white shadow-none hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,#000)]",
);

export function SuppliesHeaderActions({
  canViewApAging,
  canShowProcurementLinks,
  canOpenNewSupply,
  canPayAdvance,
  listLoading,
  onRefresh,
  onNewSupply,
  onPayAdvance,
}: {
  canViewApAging: boolean;
  canShowProcurementLinks: boolean;
  canOpenNewSupply: boolean;
  canPayAdvance?: boolean;
  listLoading: boolean;
  onRefresh: () => void;
  onNewSupply: () => void;
  onPayAdvance?: () => void;
}) {
  return (
    <>
      {canShowProcurementLinks ? (
        <>
          {canViewApAging ? (
            <Button asChild variant="outline" size="sm" className={actionBtnOutline}>
              <Link href={APP_ROUTES.purchasingApAging}>
                <BarChart3 className="size-3.5" aria-hidden />
                AP aging
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm" className={actionBtnOutline}>
            <Link href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}>
              <CreditCard className="size-3.5" aria-hidden />
              Pay open
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className={actionBtnOutline}>
            <Link href={APP_ROUTES.suppliers}>
              <Truck className="size-3.5" aria-hidden />
              Suppliers
            </Link>
          </Button>
        </>
      ) : null}
      <SupplierGuideDrawer
        trigger={
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1 rounded-lg px-2 text-[12px]">
            <BookOpen className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Guide</span>
          </Button>
        }
      />
      <button
        type="button"
        disabled={listLoading}
        onClick={onRefresh}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
          "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] transition-colors hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--order-ink,#15231f)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        aria-label="Refresh supplies"
      >
        <RefreshCw className={cn("size-3.5", listLoading && "animate-spin")} aria-hidden />
      </button>
      {canPayAdvance && onPayAdvance ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(actionBtnOutline, "border-[var(--pos-primary,#0f766e)]/35 text-[var(--pos-primary,#0f766e)]")}
          onClick={onPayAdvance}
        >
          <Wallet className="size-3.5" aria-hidden />
          Deposit
        </Button>
      ) : null}
      {canOpenNewSupply ? (
        <Button type="button" size="sm" className={actionBtnPrimary} onClick={onNewSupply}>
          <PackagePlus className="size-3.5" aria-hidden />
          New supply
        </Button>
      ) : null}
    </>
  );
}

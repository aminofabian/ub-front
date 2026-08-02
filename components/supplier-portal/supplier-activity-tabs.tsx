"use client";

import { useState, type ReactNode } from "react";
import { Activity, Package } from "lucide-react";

import { SupplierRestockBoard } from "@/components/supplier-portal/supplier-restock-board";
import { SupplierSalesPulse } from "@/components/supplier-portal/supplier-sales-pulse";
import { cn } from "@/lib/utils";

type Tab = "pulse" | "restock";

type Props = {
  className?: string;
  defaultTab?: Tab;
};

export function SupplierActivityTabs({ className, defaultTab = "pulse" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className={cn("space-y-0", className)}>
      <div
        className={cn(
          "flex border border-b-0 border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-[color-mix(in_srgb,#faf8f4_92%,transparent)]",
        )}
      >
        <TabButton
          active={tab === "pulse"}
          onClick={() => setTab("pulse")}
          icon={<Activity className="size-3.5" />}
          label="Live pulse"
        />
        <TabButton
          active={tab === "restock"}
          onClick={() => setTab("restock")}
          icon={<Package className="size-3.5" />}
          label="Restock plan"
        />
      </div>
      {tab === "pulse" ? (
        <SupplierSalesPulse className="border-t-0" />
      ) : (
        <SupplierRestockBoard className="border-t-0" />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 border-r px-3 text-[11px] font-bold uppercase tracking-[0.12em] last:border-r-0",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
        "transition-colors",
        active
          ? "bg-white text-[var(--pos-ink,#1c1915)] shadow-[inset_0_-2px_0_0_var(--pos-primary,#0f766e)]"
          : "text-muted-foreground hover:bg-white/70 hover:text-[var(--pos-ink,#1c1915)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

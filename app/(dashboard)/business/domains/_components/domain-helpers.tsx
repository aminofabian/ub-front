"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { DomainRecord } from "@/lib/api";

export type SortKey = "domain" | "status" | "source";

export function sortDomains(
  rows: DomainRecord[],
  key: SortKey,
  dir: "asc" | "desc",
): DomainRecord[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "domain") return mul * a.domain.localeCompare(b.domain);
    if (key === "source")
      return mul * (a.source || "").localeCompare(b.source || "");
    const sa = (a.status || (a.active ? "active" : "pending")).toLowerCase();
    const sb = (b.status || (b.active ? "active" : "pending")).toLowerCase();
    return mul * sa.localeCompare(sb);
  });
}

export function statusMeta(row: DomainRecord): {
  text: string;
  className: string;
} {
  const status = (
    row.status || (row.active ? "active" : "pending")
  ).toLowerCase();
  const source = (row.source || "").toLowerCase();
  if (status === "active" && row.active)
    return {
      text: "Live",
      className:
        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white",
    };
  if (status === "verifying")
    return {
      text: "Verifying",
      className:
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
    };
  if (status === "failed")
    return {
      text: "Failed",
      className: "border-[#9a2e16]/35 text-[#9a2e16]",
    };
  if (source === "hostafrica_purchase")
    return {
      text: "Provisioning",
      className:
        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]",
    };
  return {
    text: "Pending DNS",
    className:
      "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
  };
}

export function sourceLabel(row: DomainRecord): string {
  const source = (row.source || "").toLowerCase();
  if (source === "platform_subdomain") return "Platform";
  if (source === "hostafrica_purchase") return "Purchased";
  if (source === "manual_connect") return "Connected";
  return "Domain";
}

export function DomainChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function domainInitials(domain: string): string {
  const host = domain.split(".")[0]?.trim() || domain;
  if (host.length <= 2) return host.toUpperCase();
  return host.slice(0, 2).toUpperCase();
}

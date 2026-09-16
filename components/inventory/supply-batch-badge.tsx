"use client";

import Link from "next/link";

interface Props {
  supplyBatchId: string;
  batchNumber: string;
  batchName?: string | null;
}

export function SupplyBatchBadge({ supplyBatchId, batchNumber, batchName }: Props) {
  return (
    <Link
      href={`/inventory/supply-batches/${supplyBatchId}`}
      title={batchName || batchNumber}
      className="inline-flex items-center rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-px text-[11px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
    >
      {batchNumber}
    </Link>
  );
}

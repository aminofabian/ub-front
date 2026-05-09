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
      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
    >
      {batchNumber}
    </Link>
  );
}

import { use } from "react";
import { SupplyBatchDetailPage } from "@/components/inventory/supply-batch-detail-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SupplyBatchDetailPage batchId={id} />;
}

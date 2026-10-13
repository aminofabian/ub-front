import { Suspense } from "react";

import { CountBatchesPageClient } from "./_components/count-batches-page-client";

export default function CountBatchesPage() {
  return (
    <Suspense fallback={null}>
      <CountBatchesPageClient />
    </Suspense>
  );
}

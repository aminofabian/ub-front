import { Suspense } from "react";

import { LoadTestPage } from "@/components/super-admin/load-test/load-test-page";

export default function SuperAdminPlatformLoadTestPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading load-test console…</p>}>
      <LoadTestPage />
    </Suspense>
  );
}

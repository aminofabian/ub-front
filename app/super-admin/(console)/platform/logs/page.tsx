"use client";

import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";

export default function SuperAdminPlatformLogsPage() {
  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Client logs"
        description="API reachability and BACKEND_ORIGIN / proxy-config errors captured in this browser. Shop tills never toast this detail — it is recorded here instead."
      />
      <OpsClientLogsPanel
        emptyDescription="When this console cannot reach the API, the technical detail lands here instead of a toast."
        storageNote="Stored on this browser only. Shop tills never toast this detail."
      />
    </div>
  );
}

"use client";

import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";

export default function SuperAdminPlatformLogsPage() {
  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Client logs"
        description="API reachability and BACKEND_ORIGIN / proxy-config errors captured in this browser. Shop tills never toast this detail — it is recorded here instead."
      />
      <OpsClientLogsPanel />
    </div>
  );
}

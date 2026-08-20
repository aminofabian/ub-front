"use client";

import { DesktopInstallLogsPanel } from "@/components/super-admin/desktop-install-logs-panel";
import { PlatformRequestLogsPanel } from "@/components/super-admin/platform-request-logs-panel";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";

export default function SuperAdminPlatformLogsPage() {
  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Platform logs"
        description="Live view of every API and webhook request across all businesses — cashier processing, M-Pesa, airtime purchases and KPLC tokens — with success counts, plus log bundles shipped from Kiosk Desktop installs."
      />
      <PlatformRequestLogsPanel />
      <DesktopInstallLogsPanel />
      <OpsClientLogsPanel
        emptyDescription="When this console cannot reach the API, the technical detail lands here instead of a toast."
        storageNote="Stored on this browser only. Shop tills never toast this detail."
      />
    </div>
  );
}

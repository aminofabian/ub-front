"use client";

import { Suspense } from "react";

import { SaSupportInbox } from "@/components/support/sa-support-inbox";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";

export default function SuperAdminSupportPage() {
  return (
    <div className="space-y-5">
      <SuperAdminPageHeader
        title="Support"
        description="Every tenant's live chat thread with the platform team. Replies go out in real time."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading inbox…</p>}>
        <SaSupportInbox />
      </Suspense>
    </div>
  );
}

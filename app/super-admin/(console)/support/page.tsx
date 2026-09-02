"use client";

import { Suspense } from "react";

import { SaSupportInbox } from "@/components/support/sa-support-inbox";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";

export default function SuperAdminSupportPage() {
  return (
    <div className="space-y-5">
      <SuperAdminPageHeader
        title="Support"
        description="Every tenant's live chat. Leads and agents can break a rambling thread into a numbered list the shop ticks off."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading inbox…</p>}>
        <SaSupportInbox />
      </Suspense>
    </div>
  );
}

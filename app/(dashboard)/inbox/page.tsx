"use client";

import { MessageCircle, Settings } from "lucide-react";

import { InboxWorkspace } from "./_components/inbox-workspace";
import {
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function InboxPage() {
  const { loading, me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.CrmInboxRead);
  const canManage = hasPermission(me?.permissions, Permission.CrmInboxManage);

  if (loading) {
    return <DashboardLoading label="Loading inbox…" />;
  }
  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="No access to the WhatsApp inbox"
        description="Ask an owner or admin to grant you the inbox permission."
        backHref={APP_ROUTES.business}
        backLabel="Back to Business"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      <DashboardPageHero
        icon={MessageCircle}
        title="WhatsApp inbox"
        description="Reply to your shop's WhatsApp conversations."
      >
        {canManage ? (
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.inboxSettings,
                label: "AI & knowledge base",
                desc: "Auto-reply and the assistant's facts",
                icon: Settings,
              },
            ]}
          />
        ) : null}
      </DashboardPageHero>
      <InboxWorkspace />
    </div>
  );
}

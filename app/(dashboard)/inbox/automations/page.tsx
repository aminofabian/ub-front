"use client";

import { MessageCircle, Settings, Zap } from "lucide-react";

import { AutomationsWorkspace } from "./_components/automations-workspace";
import {
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function InboxAutomationsPage() {
  const { loading, me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.CrmInboxRead);

  if (loading) {
    return <DashboardLoading label="Loading automations…" />;
  }
  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="No access to WhatsApp automations"
        description="Ask an owner or admin to grant you the inbox permission."
        backHref={APP_ROUTES.inbox}
        backLabel="Back to Inbox"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      <DashboardPageHero
        icon={Zap}
        title="WhatsApp automations"
        description="No-code rules that reply and act on incoming messages."
      >
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.inbox,
              label: "Inbox",
              desc: "Back to conversations",
              icon: MessageCircle,
            },
            {
              href: APP_ROUTES.inboxSettings,
              label: "Settings",
              desc: "AI & knowledge base",
              icon: Settings,
            },
          ]}
        />
      </DashboardPageHero>
      <AutomationsWorkspace />
    </div>
  );
}

"use client";

import { MessageCircle, Settings } from "lucide-react";

import { WhatsappSettingsWorkspace } from "./_components/whatsapp-settings-workspace";
import {
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function InboxSettingsPage() {
  const { loading, me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.CrmInboxRead);

  if (loading) {
    return <DashboardLoading label="Loading settings…" />;
  }
  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="No access to WhatsApp settings"
        description="Ask an owner or admin to grant you the inbox permission."
        backHref={APP_ROUTES.inbox}
        backLabel="Back to Inbox"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      <DashboardPageHero
        icon={Settings}
        title="WhatsApp AI & knowledge base"
        description="Auto-reply behaviour and the facts the assistant may use."
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
          ]}
        />
      </DashboardPageHero>
      <WhatsappSettingsWorkspace />
    </div>
  );
}

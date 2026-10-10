"use client";

import { MessageCircle, Settings, Send, Zap } from "lucide-react";

import { BroadcastsWorkspace } from "./_components/broadcasts-workspace";
import {
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function InboxBroadcastsPage() {
  const { loading, me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.CrmInboxRead);

  if (loading) {
    return <DashboardLoading label="Loading broadcasts…" />;
  }
  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="No access to WhatsApp broadcasts"
        description="Ask an owner or admin to grant you the inbox permission."
        backHref={APP_ROUTES.inbox}
        backLabel="Back to Inbox"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      <DashboardPageHero
        icon={Send}
        title="WhatsApp broadcasts"
        description="Send one message to many customers and track delivery."
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
              href: APP_ROUTES.inboxAutomations,
              label: "Automations",
              desc: "Reply rules",
              icon: Zap,
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
      <BroadcastsWorkspace />
    </div>
  );
}

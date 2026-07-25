"use client";

import { useCallback } from "react";
import { MessageSquare } from "lucide-react";

import { ContactMessagesInbox } from "@/components/contact/contact-messages-inbox";
import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchContactMessage,
  fetchContactMessages,
  replyToContactMessage,
} from "@/lib/api";

export default function MessagesPage() {
  const { loading, canViewMessages, canReplyMessages } = useDashboard();

  const listMessages = useCallback(
    (opts?: { status?: "UNREAD" | "READ" }) => fetchContactMessages(opts),
    [],
  );
  const getMessage = useCallback(
    (id: string) => fetchContactMessage(id),
    [],
  );
  const replyMessage = useCallback(
    (
      id: string,
      body: { channel: "EMAIL" | "WHATSAPP" | "SMS"; body: string },
    ) => replyToContactMessage(id, body),
    [],
  );

  if (loading) {
    return null;
  }
  if (!canViewMessages) {
    return (
      <DashboardAccessDenied
        title="Messages unavailable"
        description="You don’t have permission to view Talk to Us messages."
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={MessageSquare}
        eyebrow="Inbox"
        title="Messages"
        description="Talk to Us messages from your storefront."
      />
      <ContactMessagesInbox
        canReply={canReplyMessages}
        listMessages={listMessages}
        getMessage={getMessage}
        replyMessage={replyMessage}
      />
    </div>
  );
}

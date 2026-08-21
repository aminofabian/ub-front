"use client";

import { useCallback } from "react";

import { ContactMessagesInbox } from "@/components/contact/contact-messages-inbox";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import {
  fetchSaContactMessage,
  fetchSaContactMessages,
  replySaContactMessage,
} from "@/lib/super-admin-api";

export default function SuperAdminMessagesPage() {
  const listMessages = useCallback(
    (opts?: { status?: "UNREAD" | "READ" }) => fetchSaContactMessages(opts),
    [],
  );
  const getMessage = useCallback(
    (id: string) => fetchSaContactMessage(id),
    [],
  );
  const replyMessage = useCallback(
    (
      id: string,
      body: { channel: "EMAIL" | "WHATSAPP" | "SMS"; body: string },
    ) => replySaContactMessage(id, body),
    [],
  );

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Messages"
        description="Talk to Us messages from the Kiosk platform landing and help pages."
      />
      <ContactMessagesInbox
        canReply
        listMessages={listMessages}
        getMessage={getMessage}
        replyMessage={replyMessage}
      />
    </div>
  );
}

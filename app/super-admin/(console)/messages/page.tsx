"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ContactMessagesInbox } from "@/components/contact/contact-messages-inbox";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSaContactMessage,
  fetchSaContactMessages,
  openSaTicketFromContact,
  organizeSaContactToTicket,
  replySaContactMessage,
} from "@/lib/super-admin-api";

export default function SuperAdminMessagesPage() {
  const router = useRouter();
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
        onOpenTicket={async (id) => {
          const ticket = await openSaTicketFromContact(id);
          router.push(APP_ROUTES.superAdminServingTicket(ticket.id));
        }}
        onOrganize={async (id) => {
          const result = await organizeSaContactToTicket(id);
          router.push(APP_ROUTES.superAdminServingTicket(result.ticket.ticket.id));
        }}
      />
    </div>
  );
}

import { apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

// ─── Types ──────────────────────────────────────────────────────────────

export type SupportSenderType = "TENANT" | "SUPER_ADMIN";

export type SupportConversation = {
  id: string;
  businessId: string;
  businessName: string | null;
  businessSlug: string | null;
  status: "OPEN" | "RESOLVED" | string;
  subject: string | null;
  createdByName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  tenantLastReadAt: string | null;
  adminLastReadAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  senderType: SupportSenderType | "GUEST";
  senderUserId: string;
  senderName: string | null;
  body: string;
  messageKind?: "TEXT" | "ORDER_CARD" | "WELCOME_CARD" | string | null;
  orderCard?: {
    orderId: string;
    orderCode: string;
    status: string;
    currency: string | null;
    grandTotal: number | string | null;
    customerName: string | null;
    customerPhone: string | null;
    branchName: string | null;
    channel: string | null;
    lines: Array<{
      itemName: string;
      variantName?: string | null;
      quantity: number | string;
      lineTotal: number | string;
    }>;
    lineCount: number;
  } | null;
  welcomeCard?: {
    recipientName: string | null;
    businessName: string | null;
    supportPhone: string | null;
    supportEmail: string | null;
    helpItems: string[];
  } | null;
  attachment?: {
    url: string;
    publicId?: string | null;
    fileName?: string | null;
    contentType?: string | null;
    bytes?: number | null;
  } | null;
  replyTo?: {
    messageId: string;
    senderType: SupportSenderType | "GUEST";
    senderName: string | null;
    body: string;
    messageKind?: string | null;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export type SupportConversationDetail = {
  conversation: SupportConversation | null;
  messages: SupportMessage[];
};

// ─── API ────────────────────────────────────────────────────────────────

/** The tenant's support thread (null conversation when never opened). */
export async function fetchSupportConversation(): Promise<SupportConversationDetail> {
  return apiRequest<SupportConversationDetail>(`${API_ROUTES.support}/conversation`);
}

/** Open the thread (idempotent — returns the existing one when present). */
export async function openSupportConversation(
  subject?: string,
): Promise<SupportConversationDetail> {
  return apiRequest<SupportConversationDetail>(`${API_ROUTES.support}/conversation`, {
    method: "POST",
    body: subject?.trim() ? { subject: subject.trim() } : undefined,
  });
}

export async function sendSupportMessage(
  body: string,
  attachment?: SupportMessage["attachment"],
  replyToMessageId?: string | null,
): Promise<SupportMessage> {
  return apiRequest<SupportMessage>(`${API_ROUTES.support}/conversation/messages`, {
    method: "POST",
    body: {
      body: body || "",
      replyToMessageId: replyToMessageId ?? undefined,
      attachment: attachment
        ? {
            url: attachment.url,
            publicId: attachment.publicId ?? undefined,
            fileName: attachment.fileName ?? undefined,
            contentType: attachment.contentType ?? undefined,
            bytes: attachment.bytes ?? undefined,
          }
        : undefined,
    },
  });
}

export async function markSupportConversationRead(): Promise<void> {
  await apiRequest<void>(`${API_ROUTES.support}/conversation/read`, { method: "POST" });
}

export async function resolveSupportConversation(): Promise<void> {
  await apiRequest<void>(`${API_ROUTES.support}/conversation/resolve`, { method: "POST" });
}

export async function reopenSupportConversation(): Promise<void> {
  await apiRequest<void>(`${API_ROUTES.support}/conversation/reopen`, { method: "POST" });
}

export async function fetchSupportUnreadCount(): Promise<number> {
  const payload = await apiRequest<{ count?: number }>(`${API_ROUTES.support}/unread-count`);
  return typeof payload?.count === "number" ? payload.count : 0;
}

// ── Storefront buyer threads (tenant staff answers shoppers here) ─────────

export type StorefrontBuyerConversation = {
  id: string;
  businessId: string;
  businessName: string | null;
  businessSlug: string | null;
  conversationType: "STOREFRONT";
  guestId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  status: "OPEN" | "RESOLVED" | string;
  subject: string | null;
  createdByName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  tenantLastReadAt: string | null;
  adminLastReadAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function fetchStorefrontBuyerConversations(opts?: {
  status?: "OPEN" | "RESOLVED" | "ALL";
}): Promise<{
  conversations: StorefrontBuyerConversation[];
  total: number;
  unread: number;
}> {
  const params = new URLSearchParams();
  if (opts?.status && opts.status !== "ALL") {
    params.set("status", opts.status);
  }
  const suffix = params.toString();
  return apiRequest<{ conversations: StorefrontBuyerConversation[]; total: number; unread: number }>(
    `${API_ROUTES.support}/storefront/conversations${suffix ? `?${suffix}` : ""}`,
  );
}

export async function fetchStorefrontBuyerConversation(
  id: string,
): Promise<SupportConversationDetail> {
  return apiRequest<SupportConversationDetail>(
    `${API_ROUTES.support}/storefront/conversations/${encodeURIComponent(id)}`,
  );
}

export async function sendStorefrontBuyerReply(
  id: string,
  body: string,
  attachment?: SupportMessage["attachment"],
  replyToMessageId?: string | null,
): Promise<SupportMessage> {
  return apiRequest<SupportMessage>(
    `${API_ROUTES.support}/storefront/conversations/${encodeURIComponent(id)}/messages`,
    {
      method: "POST",
      body: {
        body: body || "",
        replyToMessageId: replyToMessageId ?? undefined,
        attachment: attachment
          ? {
              url: attachment.url,
              publicId: attachment.publicId ?? undefined,
              fileName: attachment.fileName ?? undefined,
              contentType: attachment.contentType ?? undefined,
              bytes: attachment.bytes ?? undefined,
            }
          : undefined,
      },
    },
  );
}

export async function markStorefrontBuyerConversationRead(id: string): Promise<void> {
  await apiRequest<void>(
    `${API_ROUTES.support}/storefront/conversations/${encodeURIComponent(id)}/read`,
    { method: "POST" },
  );
}

export async function fetchStorefrontBuyerUnreadCount(): Promise<number> {
  const payload = await apiRequest<{ count?: number }>(
    `${API_ROUTES.support}/storefront/unread-count`,
  );
  return typeof payload?.count === "number" ? payload.count : 0;
}

export async function escalateStorefrontBuyerConversation(
  id: string,
): Promise<import("@/lib/super-admin-api").ServingTicketSummary> {
  return apiRequest(
    `${API_ROUTES.support}/storefront/conversations/${encodeURIComponent(id)}/escalate`,
    { method: "POST" },
  );
}

export async function createTenantServingTicket(body: {
  subject: string;
  category?: string;
  body?: string;
}): Promise<import("@/lib/super-admin-api").ServingTicketSummary> {
  return apiRequest(`${API_ROUTES.support}/tickets`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchTenantServingTickets(opts?: {
  status?: string;
}): Promise<{ tickets: import("@/lib/super-admin-api").ServingTicketSummary[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  const qs = params.toString();
  return apiRequest(`${API_ROUTES.support}/tickets${qs ? `?${qs}` : ""}`);
}

export async function fetchTenantServingTicket(
  id: string,
): Promise<import("@/lib/super-admin-api").ServingTicketDetail> {
  return apiRequest(`${API_ROUTES.support}/tickets/${encodeURIComponent(id)}`);
}

export async function replyTenantServingTicket(
  id: string,
  body: string,
): Promise<SupportMessage> {
  return apiRequest(`${API_ROUTES.support}/tickets/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

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
  senderType: SupportSenderType;
  senderUserId: string;
  senderName: string | null;
  body: string;
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

export async function sendSupportMessage(body: string): Promise<SupportMessage> {
  return apiRequest<SupportMessage>(`${API_ROUTES.support}/conversation/messages`, {
    method: "POST",
    body: { body },
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

import { apiRequest } from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────────────

export type CrmConversationRow = {
  id: string;
  status: string;
  assignedUserId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  windowExpiresAt: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactTags: string[];
};

export type CrmMessageRow = {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  status: string | null;
  waMessageId: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type CrmConversationDetail = {
  conversation: CrmConversationRow;
  messages: CrmMessageRow[];
};

export type CrmNoteRow = {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type CrmQuickReplyRow = {
  id: string;
  shortcut: string;
  body: string;
  createdAt: string;
};

export type CrmTagRow = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
};

export type CrmConversationsResult = {
  items: CrmConversationRow[];
  page: number;
  size: number;
  total: number;
};

export type CrmPaymentPromptResult = {
  accepted: boolean;
  reference: string | null;
  detail: string | null;
};

// ── Conversations ───────────────────────────────────────────────────────

export async function fetchCrmConversations(opts?: {
  status?: string;
  assignee?: string;
  page?: number;
  size?: number;
}): Promise<CrmConversationsResult> {
  const params = new URLSearchParams({
    page: String(opts?.page ?? 0),
    size: String(opts?.size ?? 30),
  });
  if (opts?.status) params.set("status", opts.status);
  if (opts?.assignee) params.set("assignee", opts.assignee);
  const payload = await apiRequest<Partial<CrmConversationsResult>>(
    `/api/v1/crm/conversations?${params.toString()}`,
  );
  return {
    items: payload.items ?? [],
    page: payload.page ?? 0,
    size: payload.size ?? 30,
    total: payload.total ?? 0,
  };
}

export async function fetchCrmConversation(
  id: string,
): Promise<CrmConversationDetail> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}`);
}

export async function sendCrmMessage(
  id: string,
  body: string,
): Promise<{ queued: boolean; message: CrmMessageRow | null }> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: { body },
  });
}

export async function assignCrmConversation(
  id: string,
  userId: string | null,
): Promise<CrmConversationRow> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: { userId },
  });
}

export async function setCrmContactTags(
  id: string,
  tags: string[],
): Promise<CrmConversationRow> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/tags`, {
    method: "POST",
    body: { tags },
  });
}

/** M5: request an M-Pesa STK prompt for the customer. */
export async function requestCrmPayment(
  id: string,
  amount: number,
): Promise<CrmPaymentPromptResult> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/payment-prompt`, {
    method: "POST",
    body: { amount },
  });
}

/** M5: draft a reply with SokoMind (AI) for the agent to review. */
export async function draftCrmAiReply(id: string): Promise<{ draft: string }> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/ai-draft`, {
    method: "POST",
  });
}

// ── Notes ───────────────────────────────────────────────────────────────

export async function fetchCrmNotes(id: string): Promise<CrmNoteRow[]> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/notes`);
}

export async function addCrmNote(id: string, body: string): Promise<CrmNoteRow> {
  return apiRequest(`/api/v1/crm/conversations/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: { body },
  });
}

// ── Quick replies ───────────────────────────────────────────────────────

export async function fetchCrmQuickReplies(): Promise<CrmQuickReplyRow[]> {
  return apiRequest("/api/v1/crm/quick-replies");
}

export async function createCrmQuickReply(
  shortcut: string,
  body: string,
): Promise<CrmQuickReplyRow> {
  return apiRequest("/api/v1/crm/quick-replies", {
    method: "POST",
    body: { shortcut, body },
  });
}

export async function deleteCrmQuickReply(id: string): Promise<void> {
  await apiRequest(`/api/v1/crm/quick-replies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Tags ────────────────────────────────────────────────────────────────

export async function fetchCrmTags(): Promise<CrmTagRow[]> {
  return apiRequest("/api/v1/crm/tags");
}

export async function createCrmTag(
  name: string,
  color?: string,
): Promise<CrmTagRow> {
  return apiRequest("/api/v1/crm/tags", {
    method: "POST",
    body: { name, color },
  });
}

export async function deleteCrmTag(id: string): Promise<void> {
  await apiRequest(`/api/v1/crm/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Knowledge base (M5) ─────────────────────────────────────────────────

export type CrmKnowledgeDocRow = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function fetchCrmKnowledge(): Promise<CrmKnowledgeDocRow[]> {
  return apiRequest("/api/v1/crm/knowledge");
}

export async function createCrmKnowledge(
  title: string,
  content: string,
): Promise<CrmKnowledgeDocRow> {
  return apiRequest("/api/v1/crm/knowledge", {
    method: "POST",
    body: { title, content },
  });
}

export async function updateCrmKnowledge(
  id: string,
  title: string,
  content: string,
): Promise<CrmKnowledgeDocRow> {
  return apiRequest(`/api/v1/crm/knowledge/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { title, content },
  });
}

export async function deleteCrmKnowledge(id: string): Promise<void> {
  await apiRequest(`/api/v1/crm/knowledge/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── AI / auto-reply settings (M5) ───────────────────────────────────────

export type CrmAiSettings = {
  autoReplyEnabled: boolean;
  maxRepliesPerConversation: number;
  handoffUserId: string | null;
};

export async function fetchCrmAiSettings(): Promise<CrmAiSettings> {
  return apiRequest("/api/v1/crm/ai-settings");
}

export async function updateCrmAiSettings(
  settings: CrmAiSettings,
): Promise<CrmAiSettings> {
  return apiRequest("/api/v1/crm/ai-settings", {
    method: "PUT",
    body: settings,
  });
}

// ── Hand-off agents (M5) ────────────────────────────────────────────────

export type CrmAgentRow = {
  id: string;
  name: string;
};

/** Active users who can work the inbox (hold `crm.inbox.read`). */
export async function fetchCrmAgents(): Promise<CrmAgentRow[]> {
  return apiRequest("/api/v1/crm/agents");
}

// ── Automations (M3) ────────────────────────────────────────────────────

export type CrmAutomationStepRow = {
  id: string;
  type: string;
  configJson: string | null;
};

export type CrmAutomationRow = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfigJson: string | null;
  active: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
};

export type CrmAutomationDetail = {
  automation: CrmAutomationRow;
  steps: CrmAutomationStepRow[];
};

export type CrmAutomationRunRow = {
  id: string;
  automationId: string;
  conversationId: string | null;
  triggerEvent: string;
  status: string;
  stepsJson: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type CrmAutomationRunsPage = {
  items: CrmAutomationRunRow[];
  page: number;
  size: number;
  total: number;
};

export type CrmAutomationStepInput = {
  type: string;
  configJson: string;
};

export type CrmAutomationInput = {
  name: string;
  triggerType: string;
  triggerConfigJson: string;
  active: boolean;
  steps: CrmAutomationStepInput[];
};

export async function fetchCrmAutomations(): Promise<CrmAutomationRow[]> {
  return apiRequest("/api/v1/crm/automations");
}

export async function fetchCrmAutomation(
  id: string,
): Promise<CrmAutomationDetail> {
  return apiRequest(`/api/v1/crm/automations/${encodeURIComponent(id)}`);
}

export async function createCrmAutomation(
  input: CrmAutomationInput,
): Promise<CrmAutomationDetail> {
  return apiRequest("/api/v1/crm/automations", {
    method: "POST",
    body: input,
  });
}

export async function updateCrmAutomation(
  id: string,
  input: CrmAutomationInput,
): Promise<CrmAutomationDetail> {
  return apiRequest(`/api/v1/crm/automations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

export async function setCrmAutomationActive(
  id: string,
  active: boolean,
): Promise<CrmAutomationRow> {
  return apiRequest(`/api/v1/crm/automations/${encodeURIComponent(id)}/active`, {
    method: "POST",
    body: { active },
  });
}

export async function deleteCrmAutomation(id: string): Promise<void> {
  await apiRequest(`/api/v1/crm/automations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchCrmAutomationRuns(
  page = 0,
  size = 30,
): Promise<CrmAutomationRunsPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const payload = await apiRequest<Partial<CrmAutomationRunsPage>>(
    `/api/v1/crm/automations/runs?${params.toString()}`,
  );
  return {
    items: payload.items ?? [],
    page: payload.page ?? 0,
    size: payload.size ?? size,
    total: payload.total ?? 0,
  };
}

// ── Broadcasts (M4) ─────────────────────────────────────────────────────

export type CrmBroadcastAudience = { type: string; tag?: string | null };

export type CrmBroadcastRow = {
  id: string;
  name: string;
  mode: string;
  status: string;
  totalCount: number;
  createdAt: string;
};

export type CrmBroadcastsPage = {
  items: CrmBroadcastRow[];
  page: number;
  size: number;
  total: number;
};

export type CrmBroadcastRecipientRow = {
  id: string;
  contactId: string | null;
  phoneE164: string;
  status: string;
  waMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type CrmBroadcastDetail = {
  broadcast: CrmBroadcastRow;
  pendingCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  skippedCount: number;
  recipients: CrmBroadcastRecipientRow[];
};

export type CrmBroadcastInput = {
  name: string;
  mode: string;
  body?: string;
  templateName?: string;
  templateLanguage?: string;
  audience: CrmBroadcastAudience;
};

export async function fetchCrmBroadcasts(
  page = 0,
  size = 30,
): Promise<CrmBroadcastsPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const payload = await apiRequest<Partial<CrmBroadcastsPage>>(
    `/api/v1/crm/broadcasts?${params.toString()}`,
  );
  return {
    items: payload.items ?? [],
    page: payload.page ?? 0,
    size: payload.size ?? size,
    total: payload.total ?? 0,
  };
}

export async function fetchCrmBroadcast(
  id: string,
): Promise<CrmBroadcastDetail> {
  return apiRequest(`/api/v1/crm/broadcasts/${encodeURIComponent(id)}`);
}

export async function createCrmBroadcast(
  input: CrmBroadcastInput,
): Promise<CrmBroadcastDetail> {
  return apiRequest("/api/v1/crm/broadcasts", {
    method: "POST",
    body: input,
  });
}

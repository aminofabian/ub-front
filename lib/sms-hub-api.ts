/**
 * SMS Hub API client (docs/scopes/SMS_HUB_SCOPE.md). Kept apart from `lib/api.ts`
 * so the hub can be read in one place; requests still go through the shared
 * `apiRequest` (proxy, tenant headers, auth refresh, idempotency keys).
 */
import { apiRequest, type CustomerEmailAudienceFilter } from "@/lib/api";

export type SmsReach = "CAN_TEXT" | "RECEIPTS_ONLY" | "OPTED_OUT" | "NO_NUMBER";
export type SmsConsentStatus = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";

export type SmsContactCounts = {
  total: number;
  canText: number;
  receiptsOnly: number;
  optedOut: number;
  noNumber: number;
};

export type SmsHubSummary = {
  contacts: SmsContactCounts;
  messagesLast30Days: number;
  creditsLast30Days: number;
  byReason: Array<{ reason: string; messages: number; credits: number }>;
  smsConfigured: boolean;
  sendWindow: string;
};

export type SmsContactRow = {
  customerId: string;
  name: string;
  phone: string | null;
  maskedNumber: string | null;
  origin: string | null;
  reach: SmsReach;
  consentSource: string | null;
  consentUpdatedAt: string | null;
  lastPurchaseAt: string | null;
  purchaseCount: number;
};

export type SmsContactsPage = {
  rows: SmsContactRow[];
  page: number;
  size: number;
  totalRows: number;
  totalPages: number;
  counts: SmsContactCounts;
};

export type SmsMessageRow = {
  id: string;
  customerId: string | null;
  phone: string;
  body: string;
  parts: number;
  credits: number;
  messageClass: "TRANSACTIONAL" | "PROMOTIONAL";
  reason: string | null;
  campaignId: string | null;
  provider: string | null;
  status: "SENT" | "DELIVERED" | "FAILED" | "BLOCKED";
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type SmsOrderNoticeKey =
  | "stk_sent"
  | "payment_received"
  | "confirmed"
  | "dispatched"
  | "completed";

export type SmsOrderNoticeSetting = {
  enabled: boolean;
  template: string | null;
};

export type SmsAutomations = {
  orderNotices: Record<SmsOrderNoticeKey, SmsOrderNoticeSetting>;
  thankYouEnabled: boolean;
  thankYouTemplate: string | null;
  thankYouDefault: string;
  winbackEnabled: boolean;
  winbackDays: number;
  winbackTemplate: string | null;
  winbackDefault: string;
  promoWeeklyCap: number;
  sendWindow: string;
  optOutFooter: string;
};

export type SmsAutomationsUpdate = {
  orderNotices?: Partial<Record<SmsOrderNoticeKey, SmsOrderNoticeSetting>>;
  thankYouEnabled?: boolean;
  thankYouTemplate?: string;
  winbackEnabled?: boolean;
  winbackDays?: number;
  winbackTemplate?: string;
  promoWeeklyCap?: number;
};

export type SmsRecipientMethod = "specific" | "filtered" | "all_eligible";

export type SmsAudiencePerson = {
  customerId: string;
  name: string;
  phone: string | null;
  skipReason: string | null;
};

export type SmsAudiencePreview = {
  matched: number;
  automaticallyExcluded: number;
  finalRecipients: number;
  sample: SmsAudiencePerson[];
  excludedSample: SmsAudiencePerson[];
};

export type SmsEstimate = {
  text: string;
  characters: number;
  parts: number;
  encoding: "GSM" | "UNICODE";
  unknownVariables: string[];
};

export type SmsCampaignStatus =
  | "DRAFT"
  | "QUEUED"
  | "SCHEDULED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type SmsCampaignSummary = {
  id: string;
  name: string;
  body: string;
  recipientMethod: SmsRecipientMethod;
  status: SmsCampaignStatus;
  scheduledAt: string | null;
  recipientsTargeted: number;
  recipientsSent: number;
  recipientsFailed: number;
  recipientsSkipped: number;
  creditsUsed: number;
  createdAt: string;
  completedAt: string | null;
};

export type SmsCampaignRecipient = {
  id: string;
  customerId: string;
  customerName: string | null;
  phone: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "SKIPPED";
  skipReason: string | null;
  error: string | null;
  parts: number;
  sentAt: string | null;
};

export type SmsCampaignDetail = SmsCampaignSummary & {
  text: string;
  partsPerMessage: number;
  filter: CustomerEmailAudienceFilter | null;
  recipientsPending: number;
  estimatedCredits: number;
  boughtWithin48Hours: number | null;
  updatedAt: string;
  startedAt: string | null;
  recipients: SmsCampaignRecipient[];
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
};

export function fetchSmsHubSummary(): Promise<SmsHubSummary> {
  return apiRequest("/api/v1/sms-hub/summary");
}

export function fetchSmsContacts(opts: {
  reach?: SmsReach | null;
  q?: string;
  page?: number;
  size?: number;
}): Promise<SmsContactsPage> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 0),
    size: String(opts.size ?? 50),
  });
  if (opts.reach) params.set("reach", opts.reach);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  return apiRequest(`/api/v1/sms-hub/contacts?${params}`);
}

export function updateSmsConsent(body: {
  customerIds: string[];
  status: SmsConsentStatus;
  customerAgreed?: boolean;
}): Promise<{ changed: number }> {
  return apiRequest("/api/v1/sms-hub/contacts/consent", {
    method: "POST",
    body,
  });
}

export function fetchSmsMessages(opts: {
  customerId?: string;
  campaignId?: string;
  page?: number;
  size?: number;
}): Promise<SpringPage<SmsMessageRow>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 0),
    size: String(opts.size ?? 50),
  });
  if (opts.customerId) params.set("customerId", opts.customerId);
  if (opts.campaignId) params.set("campaignId", opts.campaignId);
  return apiRequest(`/api/v1/sms-hub/messages?${params}`);
}

export function fetchSmsAutomations(): Promise<SmsAutomations> {
  return apiRequest("/api/v1/sms-hub/automations");
}

export function updateSmsAutomations(
  body: SmsAutomationsUpdate,
): Promise<SmsAutomations> {
  return apiRequest("/api/v1/sms-hub/automations", { method: "PUT", body });
}

export function previewSmsAudience(body: {
  recipientMethod: SmsRecipientMethod;
  customerIds?: string[];
  filter?: CustomerEmailAudienceFilter;
}): Promise<SmsAudiencePreview> {
  return apiRequest("/api/v1/customer-sms-campaigns/audience-preview", {
    method: "POST",
    body,
  });
}

export function estimateSms(body: string): Promise<SmsEstimate> {
  return apiRequest("/api/v1/customer-sms-campaigns/estimate", {
    method: "POST",
    body: { body },
  });
}

export function fetchSmsCampaigns(opts?: {
  page?: number;
  size?: number;
}): Promise<SpringPage<SmsCampaignSummary>> {
  const params = new URLSearchParams({
    page: String(opts?.page ?? 0),
    size: String(opts?.size ?? 50),
  });
  return apiRequest(`/api/v1/customer-sms-campaigns?${params}`);
}

export function fetchSmsCampaign(id: string): Promise<SmsCampaignDetail> {
  return apiRequest(`/api/v1/customer-sms-campaigns/${encodeURIComponent(id)}`);
}

export function createSmsCampaign(body: {
  name: string;
  body: string;
  recipientMethod: SmsRecipientMethod;
  customerIds?: string[];
  filter?: CustomerEmailAudienceFilter;
}): Promise<SmsCampaignDetail> {
  return apiRequest("/api/v1/customer-sms-campaigns", { method: "POST", body });
}

export function sendSmsCampaign(
  id: string,
  confirmPhrase?: string,
): Promise<SmsCampaignDetail> {
  return apiRequest(
    `/api/v1/customer-sms-campaigns/${encodeURIComponent(id)}/send`,
    { method: "POST", body: { confirmPhrase } },
  );
}

export function scheduleSmsCampaign(
  id: string,
  scheduledAt: string,
  confirmPhrase?: string,
): Promise<SmsCampaignDetail> {
  return apiRequest(
    `/api/v1/customer-sms-campaigns/${encodeURIComponent(id)}/schedule`,
    { method: "POST", body: { scheduledAt, confirmPhrase } },
  );
}

export function cancelSmsCampaign(id: string): Promise<SmsCampaignDetail> {
  return apiRequest(
    `/api/v1/customer-sms-campaigns/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: {} },
  );
}

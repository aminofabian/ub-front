import { apiUrl } from "@/lib/config";

/**
 * Public guest chat client — the anonymous visitor/buyer side of support.
 *
 * Identity lives in localStorage: one shared guest id per browser, plus a
 * per-shop thread secret minted by the server (never re-sent anywhere but the
 * X-Guest-Token header).
 */

export type GuestChatType = "VISITOR" | "STOREFRONT";

export type GuestConversation = {
  id: string;
  businessId: string;
  conversationType: GuestChatType;
  guestName: string | null;
  guestPhone: string | null;
  status: "OPEN" | "RESOLVED" | string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GuestMessage = {
  id: string;
  conversationId: string;
  senderType: "GUEST" | "TENANT" | "SUPER_ADMIN";
  senderUserId: string;
  senderName: string | null;
  body: string;
  messageKind?: "TEXT" | "ORDER_CARD" | string | null;
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
  attachment?: {
    url: string;
    publicId?: string | null;
    fileName?: string | null;
    contentType?: string | null;
    bytes?: number | null;
  } | null;
  replyTo?: {
    messageId: string;
    senderType: "GUEST" | "TENANT" | "SUPER_ADMIN";
    senderName: string | null;
    body: string;
    messageKind?: string | null;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export type GuestThreadPayload = {
  conversation: GuestConversation | null;
  token: string | null;
  messages: GuestMessage[];
};

export type GuestSession = {
  guestId: string;
  token: string | null;
  conversationId: string | null;
  name: string | null;
  phone: string | null;
};

const NS = "ub.support.guest";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota — chat still works, just won't survive reloads
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** The shared browser-wide guest id — one visitor identity across all shops. */
export function ensureGuestId(): string {
  let id = read(`${NS}.id`);
  if (!id) {
    id = uuid();
    write(`${NS}.id`, id);
  }
  return id;
}

export function getGuestName(): string | null {
  return read(`${NS}.name`);
}

export function setGuestName(name: string): void {
  write(`${NS}.name`, name.trim() ? name.trim().slice(0, 120) : null);
}

export function getGuestPhone(): string | null {
  return read(`${NS}.phone`);
}

export function setGuestPhone(phone: string): void {
  write(`${NS}.phone`, phone.trim() ? phone.trim().slice(0, 32) : null);
}

/** Per-shop thread credentials. `ns` isolates shops (slug) and the platform. */
function threadKey(ns: string): string {
  return `${NS}.thread.${ns}`;
}

export function loadGuestSession(ns: string): GuestSession {
  const raw = read(threadKey(ns));
  let parsed: { token?: string; conversationId?: string } | null = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as { token?: string; conversationId?: string };
    } catch {
      parsed = null;
    }
  }
  return {
    guestId: ensureGuestId(),
    token: parsed?.token ?? null,
    conversationId: parsed?.conversationId ?? null,
    name: getGuestName(),
    phone: getGuestPhone(),
  };
}

export function saveGuestSession(ns: string, session: GuestSession): void {
  write(
    threadKey(ns),
    JSON.stringify({ token: session.token, conversationId: session.conversationId }),
  );
}

function guestHeaders(guestId: string, token: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (guestId) headers["X-Guest-Id"] = guestId;
  if (token) headers["X-Guest-Token"] = token;
  const phone = getGuestPhone();
  if (phone) headers["X-Guest-Phone"] = phone;
  return headers;
}

/** Start a guest thread (optionally with the first message) — returns a fresh token. */
export async function startGuestThread(
  ns: string,
  opts: {
    type: GuestChatType;
    businessSlug?: string;
    body?: string;
    name?: string | null;
  },
): Promise<GuestThreadPayload> {
  const attempt = async (guestId: string, token: string | null): Promise<Response> => {
    return fetch(apiUrl("/api/v1/public/support/threads"), {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(guestId, token),
      body: JSON.stringify({
        type: opts.type,
        businessSlug: opts.businessSlug,
        guestId,
        guestName: opts.name ?? getGuestName() ?? undefined,
        body: opts.body,
      }),
    });
  };

  let guestId = ensureGuestId();
  let session = loadGuestSession(ns);
  let response = await attempt(guestId, session.token);

  if (response.status === 400 || response.status === 401) {
    // The stored thread credential is stale (another device rotated it) or the
    // thread was lost. Drop the stored token and retry — the phone re-claims
    // the same thread.
    write(threadKey(ns), null);
    session = loadGuestSession(ns);
    response = await attempt(guestId, session.token);
  }

  if (response.status === 401) {
    // Still rejected: this identity no longer opens the thread and there's no
    // matching phone. Regenerate the identity so the visitor is never locked
    // out — the old thread is left behind rather than blocking the chat.
    write(`${NS}.id`, uuid());
    write(threadKey(ns), null);
    guestId = ensureGuestId();
    response = await attempt(guestId, null);
  }

  if (!response.ok) {
    throw new Error(`Could not start conversation (${response.status})`);
  }
  const payload = (await response.json()) as GuestThreadPayload;
  if (payload.token && payload.conversation) {
    saveGuestSession(ns, {
      guestId,
      token: payload.token,
      conversationId: payload.conversation.id,
      name: getGuestName(),
      phone: getGuestPhone(),
    });
  }
  return payload;
}

/** Resume an existing thread; null when the visitor has never chatted here. */
export async function resumeGuestThread(
  ns: string,
  opts: { type: GuestChatType; businessSlug?: string },
): Promise<GuestThreadPayload | null> {
  const guestId = ensureGuestId();
  const session = loadGuestSession(ns);
  const phone = getGuestPhone();
  // Need either a stored thread credential or a phone to reclaim one.
  if (!session.token && !phone) {
    return null;
  }
  const params = new URLSearchParams({
    type: opts.type,
    guestId,
  });
  if (opts.businessSlug) params.set("businessSlug", opts.businessSlug);
  const response = await fetch(
    apiUrl(`/api/v1/public/support/threads/me?${params.toString()}`),
    { credentials: "include", headers: guestHeaders(guestId, session.token) },
  );
  if (response.status === 401) {
    // Our credential was rotated out (another device claimed the phone).
    // Forget the thread — the intro re-identifies with the phone and the
    // server rotates a fresh secret back to us.
    write(threadKey(ns), null);
    return null;
  }
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Could not load conversation (${response.status})`);
  }
  const payload = (await response.json()) as GuestThreadPayload;
  // A new-device resume via phone returns a freshly rotated token — keep it.
  if (payload.token && payload.conversation) {
    saveGuestSession(ns, {
      guestId,
      token: payload.token,
      conversationId: payload.conversation.id,
      name: getGuestName(),
      phone: getGuestPhone(),
    });
  } else if (payload.conversation && session.token) {
    // Same device resume returns token:null — keep the stored secret + id.
    saveGuestSession(ns, {
      guestId,
      token: session.token,
      conversationId: payload.conversation.id,
      name: getGuestName(),
      phone: getGuestPhone(),
    });
  }
  return payload;
}

export async function sendGuestMessage(
  ns: string,
  conversationId: string,
  body: string,
  opts: {
    type: GuestChatType;
    businessSlug?: string;
    attachment?: GuestMessage["attachment"];
    replyToMessageId?: string | null;
  },
): Promise<GuestMessage> {
  const guestId = ensureGuestId();
  let session = loadGuestSession(ns);
  const post = (id: string, token: string | null) =>
    fetch(apiUrl(`/api/v1/public/support/threads/${encodeURIComponent(id)}/messages`), {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(guestId, token),
      body: JSON.stringify({
        body: body || "",
        guestName: getGuestName() ?? undefined,
        replyToMessageId: opts.replyToMessageId ?? undefined,
        attachment: opts.attachment
          ? {
              url: opts.attachment.url,
              publicId: opts.attachment.publicId ?? undefined,
              fileName: opts.attachment.fileName ?? undefined,
              contentType: opts.attachment.contentType ?? undefined,
              bytes: opts.attachment.bytes ?? undefined,
            }
          : undefined,
      }),
    });

  let response = await post(conversationId, session.token);
  if (response.status === 401) {
    // Token rotated (another device) — reclaim via phone when we have one.
    write(threadKey(ns), null);
    const recovered = await resumeGuestThread(ns, opts).catch(() => null);
    if (recovered?.conversation?.id) {
      session = loadGuestSession(ns);
      response = await post(recovered.conversation.id, session.token);
    }
  }
  if (!response.ok) {
    throw new Error(`Could not send message (${response.status})`);
  }
  return (await response.json()) as GuestMessage;
}

export async function getGuestCloudinarySignature(
  ns: string,
  conversationId: string,
): Promise<{
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType?: string;
}> {
  const guestId = ensureGuestId();
  const session = loadGuestSession(ns);
  const response = await fetch(
    apiUrl(`/api/v1/public/support/threads/${encodeURIComponent(conversationId)}/cloudinary-signature`),
    {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(guestId, session.token),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not prepare upload (${response.status})`);
  }
  return (await response.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    resourceType?: string;
  };
}

export async function markGuestThreadRead(ns: string, conversationId: string): Promise<void> {
  const guestId = ensureGuestId();
  const session = loadGuestSession(ns);
  await fetch(apiUrl(`/api/v1/public/support/threads/${encodeURIComponent(conversationId)}/read`), {
    method: "POST",
    credentials: "include",
    headers: guestHeaders(guestId, session.token),
  }).catch(() => {});
}

/** Mint a guest WebSocket ticket for the shared browser guest. */
export async function mintGuestRealtimeTicket(preferredNs?: string): Promise<{
  ticket: string;
  expiresAt: number;
  wsUrl: string;
}> {
  const guestId = ensureGuestId();
  const tokens = collectGuestTokens(preferredNs);
  if (tokens.length === 0) {
    throw new Error("Ticket mint failed: no guest token");
  }
  let lastStatus = 0;
  for (const token of tokens) {
    const response = await fetch(apiUrl("/api/v1/public/support/realtime/tickets"), {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(guestId, token),
    });
    lastStatus = response.status;
    if (response.ok) {
      return (await response.json()) as { ticket: string; expiresAt: number; wsUrl: string };
    }
  }
  throw new Error(`Ticket mint failed: ${lastStatus}`);
}

/**
 * Prefer the active shop/platform thread token, then any other stored secrets.
 * Rotated-out tokens are tried last so mint does not fail on the first stale hit.
 */
function collectGuestTokens(preferredNs?: string): string[] {
  if (typeof window === "undefined") return [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (token: string | null | undefined) => {
    if (!token || seen.has(token)) return;
    seen.add(token);
    ordered.push(token);
  };
  if (preferredNs) {
    push(loadGuestSession(preferredNs).token);
  }
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NS}.thread.`)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { token?: string };
          push(parsed.token);
        }
      }
    }
  } catch {
    // ignore — private mode / quota
  }
  return ordered;
}

/** The guest's realtime channel — the only channel their socket ever joins. */
export function guestRealtimeChannel(guestId: string): string {
  return `support.guest:${guestId}`;
}

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
    // The server rejected this guest identity: the thread may already exist
    // with a token we lost (or a stale duplicate key blocked the insert).
    // Regenerate the identity and start a fresh thread.
    write(`${NS}.id`, uuid());
    write(threadKey(ns), null);
    guestId = ensureGuestId();
    session = loadGuestSession(ns);
    response = await attempt(guestId, session.token);
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
  if (!session.token || !session.conversationId) {
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
  }
  return payload;
}

export async function sendGuestMessage(
  ns: string,
  conversationId: string,
  body: string,
): Promise<GuestMessage> {
  const guestId = ensureGuestId();
  const session = loadGuestSession(ns);
  const response = await fetch(
    apiUrl(`/api/v1/public/support/threads/${encodeURIComponent(conversationId)}/messages`),
    {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(guestId, session.token),
      body: JSON.stringify({ body, guestName: getGuestName() ?? undefined }),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not send message (${response.status})`);
  }
  return (await response.json()) as GuestMessage;
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
export async function mintGuestRealtimeTicket(): Promise<{
  ticket: string;
  expiresAt: number;
  wsUrl: string;
}> {
  const guestId = ensureGuestId();
  // Any valid per-shop token proves the visitor owns their threads.
  const token = guessValidGuestToken();
  const response = await fetch(apiUrl("/api/v1/public/support/realtime/tickets"), {
    method: "POST",
    credentials: "include",
    headers: guestHeaders(guestId, token),
  });
  if (!response.ok) {
    throw new Error(`Ticket mint failed: ${response.status}`);
  }
  return (await response.json()) as { ticket: string; expiresAt: number; wsUrl: string };
}

/** Find any stored thread token (the server accepts any token that opens a thread). */
function guessValidGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NS}.thread.`)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { token?: string };
          if (parsed.token) return parsed.token;
        }
      }
    }
  } catch {
    // ignore — no token means the visitor has no threads yet
  }
  return null;
}

/** The guest's realtime channel — the only channel their socket ever joins. */
export function guestRealtimeChannel(guestId: string): string {
  return `support.guest:${guestId}`;
}

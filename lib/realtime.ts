/**
 * PalMart WebSocket realtime client.
 *
 * Manages a multiplexed WebSocket connection to `/api/v1/realtime` with:
 * - Ticket-based handshake (single-use, 60s TTL)
 * - Exponential backoff reconnection with full jitter
 * - Heartbeat (server ping / client pong)
 * - Frame dispatch by type
 * - Automatic re-auth when JWT access token nears expiry
 * - Graceful fallback to REST polling when WS is unavailable
 *
 * @see docs/architecture/REALTIME_WEBSOCKET_PLAN.md
 */

import {
  getSessionTenantHost,
  getSessionTenantId,
  getSessionTokens,
  registerRealtimeDisconnect,
} from "./auth";
import { refreshAccessToken } from "./api";
import {
  isPosSoftAuthActive,
  notifyPosSessionExpired,
} from "./pos-soft-auth";
import { beginSessionReconnect } from "./session-reconnect";
import { tryRecoverSessionBeforeSignOut } from "./session-recovery";
import {
  apiUrl,
  resolveRealtimeWebSocketBaseUrl,
} from "./config";
import { normalizeNotificationData } from "./notification-display";
import { getSuperAdminAccessToken } from "./super-admin-session";
import { refreshSaTokenIfNeeded } from "./super-admin-api";

/** Which auth world this client connects as. */
export type RealtimeScope = "tenant" | "super-admin" | "guest";

/** Parse notification timestamps from REST (ISO string, epoch ms/s, etc.). */
function coerceNotificationTimestamp(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Heuristic: seconds vs milliseconds
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  return null;
}

// ── Types ──

export type RealtimeEventType =
  | "notification.created"
  | "notification.read"
  | "stock.depleted"
  | "price.changed"
  | "payment.confirmed"
  | "stk.payment.settled"
  | "kiosk_pay.balance.updated"
  | "sms_credits.balance.updated"
  | "airtime.order.updated"
  | "sale.completed"
  | "supply.posted"
  | "shift.opened"
  | "shift.closed"
  | "shift.variance_detected"
  | "approval.requested"
  | "approval.resolved"
  | "transfer.initiated"
  | "transfer.received"
  | "grocery.invoice.created"
  | "grocery.invoice.locked"
  | "grocery.invoice.unlocked"
  | "grocery.invoice.paid"
  | "grocery.invoice.cancelled"
  | "grocery.invoice.expired"
  | "grocery.invoice.stk"
  | "pos_draft.created"
  | "pos_draft.updated"
  | "pos_draft.cancelled"
  | "pos_draft.completed"
  | "support.message"
  | "support.read"
  | "support.typing"
  | "support.conversation"
  | "support.presence"
  | "setup_progress.updated"
  | "catch-up.overflow"
  | "error"
  | "ping";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface RealtimeFrame {
  v: number;
  type: RealtimeEventType;
  eventId: string;
  at: string;
  priority: Priority;
  data: Record<string, unknown>;
  /**
   * How the frame was obtained. REST poll replays inbox history and must never
   * trigger side effects like auto-printing. Live WS frames omit this (or use "live").
   */
  delivery?: "live" | "poll";
}

export interface RealtimeError {
  code: number;
  message: string;
}

export type FrameHandler = (frame: RealtimeFrame) => void;
export type ErrorHandler = (error: RealtimeError) => void;
export type ConnectionStateHandler = (state: RealtimeConnectionState) => void;

export type RealtimeConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface RealtimeClientOptions {
  channels?: string[];
  onNotification?: FrameHandler;
  onStockDepleted?: FrameHandler;
  onPriceChanged?: FrameHandler;
  onPaymentConfirmed?: FrameHandler;
  onStkPaymentSettled?: FrameHandler;
  onKioskPayBalanceUpdated?: FrameHandler;
  onSmsCreditsUpdated?: FrameHandler;
  onAirtimeOrderUpdated?: FrameHandler;
  onSaleCompleted?: FrameHandler;
  onSupplyPosted?: FrameHandler;
  onShiftOpened?: FrameHandler;
  onShiftClosed?: FrameHandler;
  onApprovalRequested?: FrameHandler;
  onApprovalResolved?: FrameHandler;
  onGroceryInvoiceCreated?: FrameHandler;
  onGroceryInvoiceLocked?: FrameHandler;
  onGroceryInvoiceUnlocked?: FrameHandler;
  onGroceryInvoicePaid?: FrameHandler;
  onGroceryInvoiceCancelled?: FrameHandler;
  onGroceryInvoiceExpired?: FrameHandler;
  onGroceryInvoiceStk?: FrameHandler;
  onPosDraftCreated?: FrameHandler;
  onPosDraftUpdated?: FrameHandler;
  onPosDraftCancelled?: FrameHandler;
  onPosDraftCompleted?: FrameHandler;
  onSupportMessage?: FrameHandler;
  onSupportRead?: FrameHandler;
  onSupportTyping?: FrameHandler;
  onSupportConversation?: FrameHandler;
  onSupportPresence?: FrameHandler;
  onSetupProgressUpdated?: FrameHandler;
  onError?: ErrorHandler;
  onConnectionStateChange?: ConnectionStateHandler;
}

// ── Constants ──

const HEARTBEAT_TIMEOUT_MS = 60_000;
const RECONNECT_MAX_RETRIES = 10;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const TICKET_REFRESH_MARGIN_MS = 10_000;
const REST_POLL_INTERVAL_MS = 30_000;
const CONNECT_TIMEOUT_MS = 20_000;

const TYPE_HANDLER_MAP: Record<string, keyof RealtimeClientOptions> = {
  "notification.created": "onNotification",
  "notification.read": "onNotification",
  "stock.depleted": "onStockDepleted",
  "price.changed": "onPriceChanged",
  "payment.confirmed": "onPaymentConfirmed",
  "stk.payment.settled": "onStkPaymentSettled",
  "kiosk_pay.balance.updated": "onKioskPayBalanceUpdated",
  "sms_credits.balance.updated": "onSmsCreditsUpdated",
  "airtime.order.updated": "onAirtimeOrderUpdated",
  "sale.completed": "onSaleCompleted",
  "supply.posted": "onSupplyPosted",
  "shift.opened": "onShiftOpened",
  "shift.closed": "onShiftClosed",
  "approval.requested": "onApprovalRequested",
  "approval.resolved": "onApprovalResolved",
  "grocery.invoice.created": "onGroceryInvoiceCreated",
  "grocery.invoice.locked": "onGroceryInvoiceLocked",
  "grocery.invoice.unlocked": "onGroceryInvoiceUnlocked",
  "grocery.invoice.paid": "onGroceryInvoicePaid",
  "grocery.invoice.cancelled": "onGroceryInvoiceCancelled",
  "grocery.invoice.expired": "onGroceryInvoiceExpired",
  "grocery.invoice.stk": "onGroceryInvoiceStk",
  "pos_draft.created": "onPosDraftCreated",
  "pos_draft.updated": "onPosDraftUpdated",
  "pos_draft.cancelled": "onPosDraftCancelled",
  "pos_draft.completed": "onPosDraftCompleted",
  "support.message": "onSupportMessage",
  "support.read": "onSupportRead",
  "support.typing": "onSupportTyping",
  "support.conversation": "onSupportConversation",
  "support.presence": "onSupportPresence",
  "setup_progress.updated": "onSetupProgressUpdated",
};

// ── WS URL Resolution ──

function pageUsesHttps(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

/** Normalize any WS base/path to wss on HTTPS pages (avoids mixed-content blocks). */
function coerceWebSocketOrigin(url: URL): string {
  if (pageUsesHttps()) {
    url.protocol = "wss:";
  } else if (url.protocol === "https:" || url.protocol === "wss:") {
    url.protocol = "wss:";
  } else {
    url.protocol = "ws:";
  }
  return `${url.origin}${url.pathname}`;
}

function resolveWebSocketUrl(ticket?: TicketResponse | null): string {
  const ticketPath = ticket?.wsUrl?.trim();
  if (ticketPath?.startsWith("ws://") || ticketPath?.startsWith("wss://")) {
    const raw = ticketPath.split("?")[0] ?? ticketPath;
    if (pageUsesHttps() && raw.startsWith("ws://")) {
      return raw.replace(/^ws:\/\//, "wss://");
    }
    return raw;
  }

  const base = resolveRealtimeWebSocketBaseUrl();
  if (ticketPath?.startsWith("/")) {
    const parsed = new URL(base);
    return coerceWebSocketOrigin(
      new URL(`${parsed.origin}${ticketPath}`),
    );
  }

  return base;
}

// ── Ticket Minting ──

interface TicketResponse {
  ticket: string;
  expiresAt: number;
  wsUrl: string;
}

async function mintTicket(channels: string[], scope: RealtimeScope = "tenant"): Promise<TicketResponse> {
  if (scope === "super-admin") {
    return mintSuperAdminTicket(channels);
  }
  if (scope === "guest") {
    return mintGuestTicket(channels);
  }
  /*
  /*
   * Ticket mint is a normal authenticated API call. If our access token has
   * just expired the first attempt will 401; rather than letting the WS layer
   * see a bogus failure and tear the connection down, route the 401 through
   * the shared single-flight refresh and retry exactly once. That way WS
   * reconnection never races with a parallel API refresh and never trips
   * the backend reuse cascade.
   */
  const attempt = async (): Promise<Response> => {
    // Gap G: prefer httpOnly `ub.access` via BFF Bearer inject. Memory access
    // is optional (sent when present for direct-API / desktop).
    const access = getSessionTokens()?.accessToken?.trim();
    return fetch(apiUrl("/api/v1/realtime/tickets"), {
      method: "POST",
      credentials: "include",
      headers: buildAuthHeaders(access),
      body: JSON.stringify({ channels }),
    });
  };

  let response = await attempt();
  if (response.status === 401) {
    const outcome = await refreshAccessToken();
    if (outcome.kind === "ok") {
      response = await attempt();
    } else if (outcome.kind === "rejected") {
      throw new Error("Unauthorized");
    }
    // network failure: fall through with the original 401 below
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.title || `Ticket mint failed: ${response.status}`);
  }

  return response.json() as Promise<TicketResponse>;
}

/**
 * Anonymous visitor/buyer socket: tickets mint against the public support
 * endpoint with the guest's localStorage credentials.
 */
async function mintGuestTicket(channels: string[]): Promise<TicketResponse> {
  const { mintGuestRealtimeTicket } = await import("@/lib/public-support-api");
  const outcome = await mintGuestRealtimeTicket();
  // The guest endpoint mints for the browser guest's own channel — the client
  // must be requesting exactly that channel (per-guest isolation).
  if (channels.length === 0) {
    throw new Error("Guest socket needs its own channel");
  }
  return outcome;
}

/** Super-admin console: same single-use ticket, minted against the SA endpoint. */
async function mintSuperAdminTicket(channels: string[]): Promise<TicketResponse> {
  const attempt = async (): Promise<Response> => {
    const token = getSuperAdminAccessToken()?.trim();
    return fetch(apiUrl("/api/v1/super-admin/realtime/tickets"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ channels }),
    });
  };

  let response = await attempt();
  if (response.status === 401) {
    const token = getSuperAdminAccessToken();
    if (token) {
      const refreshed = await refreshSaTokenIfNeeded(token);
      if (refreshed) {
        response = await attempt();
      }
    }
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.title || `Ticket mint failed: ${response.status}`);
  }

  return response.json() as Promise<TicketResponse>;
}

function buildAuthHeaders(accessToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const bearer = accessToken?.trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (typeof window !== "undefined") {
    const host = getSessionTenantHost();
    if (host) headers["X-Tenant-Host"] = host;
    const tid = getSessionTenantId();
    if (tid) headers["X-Tenant-Id"] = tid;
  }
  return headers;
}

// ── Jitter ──

function jitter(delayMs: number): number {
  return delayMs + Math.floor(Math.random() * delayMs);
}

export type RealtimeListenerOptions = Pick<
  RealtimeClientOptions,
  | "channels"
  | "onNotification"
  | "onStockDepleted"
  | "onPriceChanged"
  | "onPaymentConfirmed"
  | "onStkPaymentSettled"
  | "onKioskPayBalanceUpdated"
  | "onSmsCreditsUpdated"
  | "onAirtimeOrderUpdated"
  | "onSaleCompleted"
  | "onSupplyPosted"
  | "onShiftOpened"
  | "onShiftClosed"
  | "onApprovalRequested"
  | "onApprovalResolved"
  | "onGroceryInvoiceCreated"
  | "onGroceryInvoiceLocked"
  | "onGroceryInvoiceUnlocked"
  | "onGroceryInvoicePaid"
  | "onGroceryInvoiceCancelled"
  | "onGroceryInvoiceExpired"
  | "onGroceryInvoiceStk"
  | "onPosDraftCreated"
  | "onPosDraftUpdated"
  | "onPosDraftCancelled"
  | "onPosDraftCompleted"
  | "onSupportMessage"
  | "onSupportRead"
  | "onSupportTyping"
  | "onSupportConversation"
  | "onSupportPresence"
  | "onSetupProgressUpdated"
  | "onError"
  | "onConnectionStateChange"
>;

const LISTENER_HANDLER_KEYS = [
  "onNotification",
  "onStockDepleted",
  "onPriceChanged",
  "onPaymentConfirmed",
  "onStkPaymentSettled",
  "onKioskPayBalanceUpdated",
  "onSmsCreditsUpdated",
  "onAirtimeOrderUpdated",
  "onSaleCompleted",
  "onSupplyPosted",
  "onShiftOpened",
  "onShiftClosed",
  "onApprovalRequested",
  "onApprovalResolved",
  "onGroceryInvoiceCreated",
  "onGroceryInvoiceLocked",
  "onGroceryInvoiceUnlocked",
  "onGroceryInvoicePaid",
  "onGroceryInvoiceCancelled",
  "onGroceryInvoiceExpired",
  "onGroceryInvoiceStk",
  "onPosDraftCreated",
  "onPosDraftUpdated",
  "onPosDraftCancelled",
  "onPosDraftCompleted",
  "onSupportMessage",
  "onSupportRead",
  "onSupportTyping",
  "onSupportConversation",
  "onSupportPresence",
  "onSetupProgressUpdated",
  "onError",
  "onConnectionStateChange",
] as const satisfies readonly (keyof RealtimeListenerOptions)[];

function channelsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ── RealtimeClient ──

export class RealtimeClient {
  private scope: RealtimeScope;
  private ws: WebSocket | null = null;
  private ticket: TicketResponse | null = null;
  private channels: string[] = ["notifications"];
  private handlers: RealtimeClientOptions = {};
  private listeners = new Map<string, RealtimeListenerOptions>();
  private state: RealtimeConnectionState = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPingAt = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ticketExpiresAt = 0;
  private ticketRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tracks last-seen notification id to avoid duplicate emissions during REST polling. */
  private lastPollNotificationId: string | null = null;
  /**
   * First successful notifications poll only baselines the newest id.
   * Never reset this when restarting REST fallback — otherwise reconnects
   * replay inbox history (and cashiers re-print old web orders).
   */
  private notificationsPollBaselined = false;
  /** Single-flight connect guard — prevents parallel ticket mint + socket opens. */
  private connectPromise: Promise<void> | null = null;
  /** Bumped whenever a socket is torn down so stale onclose handlers are ignored. */
  private wsGeneration = 0;
  /** Number of consecutive abnormal closures (1006). Fast-fallback to REST polling after a few. */
  private consecutiveAbnormalClosures = 0;

  constructor(opts?: { scope?: RealtimeScope }) {
    this.scope = opts?.scope ?? "tenant";
  }

  /** Register a multiplexed listener and merge channels/handlers. */
  registerListener(id: string, listener: RealtimeListenerOptions): () => void {
    this.listeners.set(id, listener);
    void this.syncListeners();
    listener.onConnectionStateChange?.(this.state);
    return () => {
      this.listeners.delete(id);
      void this.syncListeners();
    };
  }

  /** Open the WebSocket connection. Idempotent. */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    this.stopRestPolling();
    this.setState("connecting");
    this.clearTimers();

    try {
      const channelsForTicket = [...this.channels].sort();
      this.ticket = await mintTicket(channelsForTicket, this.scope);
      // Child listeners often register while the ticket request is in flight.
      if (!channelsEqual(channelsForTicket, this.channels)) {
        this.ticket = await mintTicket(this.channels, this.scope);
      }
      this.ticketExpiresAt = this.ticket.expiresAt;
      this.scheduleTicketRefresh();
      const wsUrl = resolveWebSocketUrl(this.ticket);
      console.debug("[realtime] Opening WebSocket:", wsUrl);
      this.openWebSocket();
    } catch (err) {
      console.warn(
        "[realtime] Failed to mint ticket, falling back to REST polling:",
        err,
      );
      this.setState("disconnected");
      this.startRestPolling();
    }
  }

  /** Gracefully close the connection. */
  disconnect(): void {
    this.reconnectAttempt = RECONNECT_MAX_RETRIES;
    this.clearTimers();
    this.stopRestPolling();
    this.teardownWebSocket(1000, "Client disconnect");
    this.setState("disconnected");
  }

  /** Update allowed channels (requires reconnection). */
  async setChannels(channels: string[]): Promise<void> {
    this.applyChannelChange([...channels].sort(), { forceReconnect: true });
  }

  private applyChannelChange(
    nextChannels: string[],
    opts?: { forceReconnect?: boolean },
  ): void {
    const prevChannels = this.channels;
    const channelsChanged = !channelsEqual(nextChannels, prevChannels);
    if (!channelsChanged && !opts?.forceReconnect) {
      return;
    }
    const addedChannels = nextChannels.filter((c) => !prevChannels.includes(c));
    this.channels = nextChannels;

    // New channels must be on the ticket's allowedChannels — mid-session
    // subscribe alone is rejected by the server. Remint + reconnect.
    const needsRemint =
      addedChannels.length > 0 &&
      (this.state === "connected" ||
        this.ws?.readyState === WebSocket.OPEN ||
        this.state === "connecting" ||
        this.state === "reconnecting");

    if (needsRemint || opts?.forceReconnect) {
      if (this.ws) {
        this.teardownWebSocket(1000, "Channel set expanded");
      }
      void this.connect();
      return;
    }

    if (
      this.state === "connected" &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      for (const channel of addedChannels) {
        this.send({ op: "subscribe", channel });
      }
      return;
    }
  }

  private async syncListeners(): Promise<void> {
    const channels = new Set<string>();
    const handlers: RealtimeClientOptions = {};

    for (const listener of this.listeners.values()) {
      for (const channel of listener.channels ?? []) {
        channels.add(channel);
      }
    }
    if (channels.size === 0) {
      channels.add("notifications");
    }

    for (const key of LISTENER_HANDLER_KEYS) {
      const callbacks: Array<NonNullable<RealtimeListenerOptions[typeof key]>> =
        [];
      for (const listener of this.listeners.values()) {
        const callback = listener[key];
        if (callback) {
          callbacks.push(callback);
        }
      }
      if (callbacks.length === 0) {
        continue;
      }
      if (key === "onError") {
        handlers.onError = (error) => {
          for (const callback of callbacks as ErrorHandler[]) {
            callback(error);
          }
        };
        continue;
      }
      if (key === "onConnectionStateChange") {
        handlers.onConnectionStateChange = (state) => {
          for (const callback of callbacks as ConnectionStateHandler[]) {
            callback(state);
          }
        };
        continue;
      }
      handlers[key] = (frame) => {
        for (const callback of callbacks as FrameHandler[]) {
          callback(frame);
        }
      };
    }

    this.handlers = handlers;
    if (this.listeners.size === 0) {
      return;
    }

    const nextChannels = Array.from(channels).sort();
    this.applyChannelChange(nextChannels);
  }

  // ── Internal ──

  private teardownWebSocket(code = 1000, reason = ""): void {
    const ws = this.ws;
    if (!ws) return;
    this.wsGeneration += 1;
    this.ws = null;
    ws.onopen = null;
    ws.onclose = null;
    ws.onmessage = null;
    ws.onerror = null;
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    try {
      ws.close(code, reason);
    } catch {
      // Ignore close errors on already-dead sockets.
    }
  }

  private openWebSocket(): void {
    if (!this.ticket) return;

    const wsUrl = `${resolveWebSocketUrl(this.ticket)}?ticket=${encodeURIComponent(this.ticket.ticket)}`;
    const generation = ++this.wsGeneration;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    this.connectTimeoutTimer = setTimeout(() => {
      if (generation !== this.wsGeneration || this.ws !== ws) return;
      console.warn("[realtime] WebSocket connect timeout — retrying");
      this.teardownWebSocket(4001, "Connect timeout");
      this.attemptReconnect();
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (generation !== this.wsGeneration || this.ws !== ws) return;
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.lastPingAt = Date.now();
      this.startHeartbeatMonitor();

      for (const channel of this.channels) {
        this.send({ op: "subscribe", channel });
      }
    };

    ws.onmessage = (event) => {
      if (generation !== this.wsGeneration || this.ws !== ws) return;
      this.lastPingAt = Date.now();
      try {
        const frame = JSON.parse(event.data as string) as RealtimeFrame;
        this.dispatch(frame);
      } catch {
        console.warn("[realtime] Failed to parse frame:", event.data);
      }
    };

    ws.onclose = (event) => {
      if (generation !== this.wsGeneration || this.ws !== ws) return;
      this.ws = null;
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      if (event.code !== 1000) {
        console.warn(
          "[realtime] WebSocket closed:",
          `code=${event.code}`,
          event.reason ? `reason=${event.reason}` : "",
          event.code === 1006
            ? "(abnormal — often invalid ticket, too many tabs, or proxy blocking upgrade)"
            : "",
        );
      }
      if (event.code === 1000) {
        this.consecutiveAbnormalClosures = 0;
        this.setState("disconnected");
        this.startRestPolling();
        return;
      }
      if (event.code === 1006) {
        this.consecutiveAbnormalClosures += 1;
        if (this.consecutiveAbnormalClosures >= 3) {
          console.warn(
            "[realtime] Repeated abnormal WebSocket closures — falling back to REST polling",
          );
          this.setState("disconnected");
          this.startRestPolling();
          return;
        }
      } else {
        this.consecutiveAbnormalClosures = 0;
      }
      if (event.code === 4401) {
        this.consecutiveAbnormalClosures = 0;
        this.handleReauthAndReconnect();
        return;
      }
      this.attemptReconnect();
    };

    ws.onerror = (event) => {
      console.warn("[realtime] WebSocket error:", event.type, wsUrl);
    };
  }

  private dispatch(frame: RealtimeFrame): void {
    if (frame.type === "ping") {
      this.send({ op: "pong" });
      return;
    }

    if (frame.type === "error") {
      this.handlers.onError?.({
        code: (frame.data.code as number) ?? 0,
        message: (frame.data.message as string) ?? "Unknown error",
      });
      return;
    }

    if (frame.type === "catch-up.overflow") {
      console.debug(
        "[realtime] Catch-up overflow, client should REST backfill",
      );
      return;
    }

    const handlerKey = TYPE_HANDLER_MAP[frame.type];
    if (handlerKey && this.handlers[handlerKey]) {
      if (frame.type === "notification.created") {
        this.advanceNotificationPollCursor(frame);
      }
      (this.handlers[handlerKey] as FrameHandler)(frame);
    }
  }

  /** Keep REST poll cursor in sync with live WS so reconnects don't re-emit. */
  private advanceNotificationPollCursor(frame: RealtimeFrame): void {
    const id =
      typeof frame.data?.id === "string" && frame.data.id.trim()
        ? frame.data.id.trim()
        : frame.eventId?.trim() || "";
    if (!id || !this.notificationsPollBaselined) {
      return;
    }
    this.lastPollNotificationId = id;
  }

  private send(frame: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ v: 1, ...frame }));
    }
  }

  private setState(state: RealtimeConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.handlers.onConnectionStateChange?.(state);
    }
  }

  // ── Reconnection ──

  private attemptReconnect(): void {
    if (this.reconnectAttempt >= RECONNECT_MAX_RETRIES) {
      console.warn(
        "[realtime] Max reconnection attempts reached, falling back to REST polling",
      );
      void logRealtimeDiagnostics();
      this.setState("disconnected");
      this.startRestPolling();
      return;
    }

    this.setState("reconnecting");
    const delay =
      this.reconnectAttempt < 5
        ? jitter(
            Math.min(
              RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt),
              RECONNECT_MAX_DELAY_MS,
            ),
          )
        : jitter(RECONNECT_MAX_DELAY_MS);

    this.reconnectAttempt++;
    console.debug(
      `[realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${RECONNECT_MAX_RETRIES})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // connect() will trigger another attemptReconnect via onclose
      });
    }, delay);
  }

  /*
   * The server sent close code 4401: our credentials were rejected on the WS
   * upgrade or during a reauth round-trip. Route the refresh through the
   * shared single-flight helper so this never races against a parallel API
   * refresh. A transient (network) failure must not sign the user out -
   * attemptReconnect will retry with exponential backoff.
   */
  private async handleReauthAndReconnect(): Promise<void> {
    if (this.scope === "guest") {
      // Anonymous visitor: nothing to refresh — just retry with the stored
      // localStorage credentials (token lost? the chat falls back to REST and
      // offers a fresh thread).
      this.attemptReconnect();
      return;
    }
    if (this.scope === "super-admin") {
      // Platform console: refresh the SA token (no tenant session flows apply),
      // then retry. If the session is gone the inbox page's own 401 handling
      // redirects to the SA login.
      try {
        const token = getSuperAdminAccessToken();
        if (token) {
          await refreshSaTokenIfNeeded(token);
        }
      } catch {
        // keep the current token and retry — the request will 4401 again
      }
      this.attemptReconnect();
      return;
    }
    try {
      // Gap G: memory may be empty after reload; refresh/restore still work via
      // httpOnly cookies. Only hard-fail when refresh itself is rejected.
      const outcome = await refreshAccessToken();
      if (outcome.kind === "ok") {
        this.attemptReconnect();
        return;
      }
      if (outcome.kind === "rejected") {
        const recovered = await tryRecoverSessionBeforeSignOut(
          getSessionTokens()?.accessToken,
        );
        if (recovered) {
          this.attemptReconnect();
          return;
        }
        if (isPosSoftAuthActive()) {
          notifyPosSessionExpired();
          return;
        }
        beginSessionReconnect("realtime reauth: refresh rejected", {
          definitive: true,
        });
        return;
      }
      // network: keep the session, try to reconnect later with current tokens
      this.attemptReconnect();
    } catch {
      this.attemptReconnect();
    }
  }

  // ── Ticket refresh ──

  private scheduleTicketRefresh(): void {
    if (this.ticketRefreshTimer) {
      clearTimeout(this.ticketRefreshTimer);
    }
    const now = Date.now();
    const refreshAt = this.ticketExpiresAt - TICKET_REFRESH_MARGIN_MS;
    const delay = Math.max(0, refreshAt - now);

    this.ticketRefreshTimer = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.refreshTicket();
      }
    }, delay);
  }

  private async refreshTicket(): Promise<void> {
    try {
      const newTicket = await mintTicket(this.channels, this.scope);
      this.send({ op: "reauth", ticket: newTicket.ticket });
      this.ticketExpiresAt = newTicket.expiresAt;
      this.scheduleTicketRefresh();
    } catch {
      console.warn("[realtime] Ticket refresh failed, will reconnect on 4401");
    }
  }

  /**
   * Broadcast typing presence for the support chat. Safe to call when the
   * socket is closed — frames are dropped and presence recovers on reconnect.
   */
  sendTyping(conversationId: string, typing: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.send({ op: "typing", conversationId, typing });
  }

  // ── Heartbeat ──

  private startHeartbeatMonitor(): void {
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPingAt > HEARTBEAT_TIMEOUT_MS) {
        console.warn("[realtime] Heartbeat timeout - reconnecting");
        this.teardownWebSocket(4001, "Heartbeat timeout");
        this.attemptReconnect();
      }
    }, 10_000);
  }

  // ── REST polling fallback ──

  private startRestPolling(): void {
    if (this.scope !== "tenant") return; // platform surfaces poll their own inbox
    if (!this.channels.includes("notifications")) return;
    if (this.pollTimer) return;
    // Keep lastPollNotificationId / notificationsPollBaselined across WS↔REST
    // flips so we never replay the inbox after a reconnect.
    console.debug(
      "[realtime] Starting REST polling fallback at",
      REST_POLL_INTERVAL_MS,
      "ms",
    );
    this.pollTimer = setInterval(() => {
      this.pollNotifications();
    }, REST_POLL_INTERVAL_MS);
    this.pollNotifications();
  }

  private stopRestPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollNotifications(): Promise<void> {
    if (!this.channels.includes("notifications")) return;
    try {
      const url = apiUrl("/api/v1/notifications");
      const response = await fetch(url, {
        credentials: "include",
        headers: buildAuthHeaders(getSessionTokens()?.accessToken),
      });
      if (response.ok) {
        const notifications = await response.json();
        if (Array.isArray(notifications)) {
          const newestId =
            notifications.length > 0 && notifications[0]?.id
              ? String(notifications[0].id)
              : null;

          // Baseline only — never emit historical inbox rows.
          // Also covers empty→non-empty: still baseline, do not dump the list.
          if (!this.notificationsPollBaselined || !this.lastPollNotificationId) {
            if (newestId) {
              this.lastPollNotificationId = newestId;
            }
            this.notificationsPollBaselined = true;
            return;
          }

          for (const n of notifications) {
            // Deduplicate: only emit notifications newer than lastPollNotificationId
            if (n.id === this.lastPollNotificationId) {
              break; // notifications are ordered by created_at DESC
            }
            const createdAt = coerceNotificationTimestamp(n.createdAt);
            this.handlers.onNotification?.({
              v: 1,
              type: "notification.created",
              eventId: n.id ?? "",
              // Never invent "now" — that makes old rows look brand new to printers.
              at: createdAt ?? "",
              priority: "MEDIUM",
              delivery: "poll",
              data: normalizeNotificationData(n as Record<string, unknown>),
            });
          }
          // Remember the newest notification id for next poll
          if (newestId) {
            this.lastPollNotificationId = newestId;
          }
        }
      }
    } catch {
      // Silently ignore poll errors
    }
  }

  // ── Cleanup ──

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ticketRefreshTimer) {
      clearTimeout(this.ticketRefreshTimer);
      this.ticketRefreshTimer = null;
    }
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }
}

async function logRealtimeDiagnostics(): Promise<void> {
  try {
    const response = await fetch(apiUrl("/api/v1/realtime/status"));
    if (!response.ok) {
      console.warn(
        "[realtime] Diagnostics: status probe returned",
        response.status,
        "— backend may need redeploy",
      );
      return;
    }
    const status = (await response.json()) as Record<string, unknown>;
    console.warn("[realtime] Diagnostics:", status);
    const hint = status.hint;
    if (typeof hint === "string" && hint.length > 0) {
      console.warn("[realtime]", hint);
    }
  } catch {
    console.warn("[realtime] Diagnostics: could not reach /api/v1/realtime/status");
  }
}

/** Singleton convenience — most apps only need one connection. */
let _instance: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!_instance) {
    _instance = new RealtimeClient();
  }
  return _instance;
}

export function disconnectRealtimeClient(): void {
  _instance?.disconnect();
  _instance = null;
}

/**
 * Super-admin console client (platform scope). Kept separate from the tenant
 * client — super-admin tickets mint against a different endpoint with the SA
 * bearer token and connect with the {@code platform} business scope.
 */
let _saInstance: RealtimeClient | null = null;

export function getSuperAdminRealtimeClient(): RealtimeClient {
  if (!_saInstance) {
    _saInstance = new RealtimeClient({ scope: "super-admin" });
  }
  return _saInstance;
}

/**
 * Guest client (anonymous visitor/buyer scope). Shared across launchers — one
 * socket per browser, subscribed to the browser guest's own channel, receives
 * events for every thread that guest owns across shops.
 */
let _guestInstance: RealtimeClient | null = null;

export function getGuestRealtimeClient(): RealtimeClient {
  if (!_guestInstance) {
    _guestInstance = new RealtimeClient({ scope: "guest" });
  }
  return _guestInstance;
}

export function disconnectSuperAdminRealtimeClient(): void {
  _saInstance?.disconnect();
  _saInstance = null;
}

// Register the disconnect function so signOutClientAndRedirectToLogin can tear down
// the realtime connection without a circular import on auth.ts.
registerRealtimeDisconnect(disconnectRealtimeClient);

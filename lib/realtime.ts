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
 * @see docs/REALTIME_WEBSOCKET_PLAN.md
 */

import { getSessionTokens, setSessionTokens } from "./auth";
import {
  API_ROUTES,
  apiUrl,
  resolveRealtimeWebSocketBaseUrl,
  STORAGE_KEYS,
} from "./config";
import { normalizeNotificationData } from "./notification-display";

// ── Types ──

export type RealtimeEventType =
  | "notification.created"
  | "notification.read"
  | "stock.depleted"
  | "price.changed"
  | "payment.confirmed"
  | "approval.requested"
  | "approval.resolved"
  | "transfer.initiated"
  | "transfer.received"
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
  onApprovalRequested?: FrameHandler;
  onApprovalResolved?: FrameHandler;
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

const TYPE_HANDLER_MAP: Record<string, keyof RealtimeClientOptions> = {
  "notification.created": "onNotification",
  "notification.read": "onNotification",
  "stock.depleted": "onStockDepleted",
  "price.changed": "onPriceChanged",
  "payment.confirmed": "onPaymentConfirmed",
  "approval.requested": "onApprovalRequested",
  "approval.resolved": "onApprovalResolved",
};

// ── WS URL Resolution ──

function resolveWebSocketUrl(ticket?: TicketResponse | null): string {
  const ticketPath = ticket?.wsUrl?.trim();
  if (ticketPath?.startsWith("ws://") || ticketPath?.startsWith("wss://")) {
    return ticketPath.split("?")[0] ?? ticketPath;
  }

  const base = resolveRealtimeWebSocketBaseUrl();
  if (ticketPath?.startsWith("/")) {
    const url = new URL(ticketPath, base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${url.origin}${url.pathname}`;
  }

  return base;
}

// ── Ticket Minting ──

interface TicketResponse {
  ticket: string;
  expiresAt: number;
  wsUrl: string;
}

async function mintTicket(channels: string[]): Promise<TicketResponse> {
  const tokens = getSessionTokens();
  if (!tokens) {
    throw new Error("No session tokens available");
  }

  const response = await fetch(apiUrl("/api/v1/realtime/tickets"), {
    method: "POST",
    headers: buildAuthHeaders(tokens.accessToken),
    body: JSON.stringify({ channels }),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.title || `Ticket mint failed: ${response.status}`);
  }

  return response.json() as Promise<TicketResponse>;
}

function buildAuthHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (typeof window !== "undefined") {
    const host = window.sessionStorage.getItem(STORAGE_KEYS.tenantHost);
    if (host) headers["X-Tenant-Host"] = host;
    const tid = window.sessionStorage.getItem(STORAGE_KEYS.tenantId);
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
  | "onApprovalRequested"
  | "onApprovalResolved"
  | "onError"
  | "onConnectionStateChange"
>;

const LISTENER_HANDLER_KEYS = [
  "onNotification",
  "onStockDepleted",
  "onPriceChanged",
  "onPaymentConfirmed",
  "onApprovalRequested",
  "onApprovalResolved",
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
  private ws: WebSocket | null = null;
  private ticket: TicketResponse | null = null;
  private channels: string[] = ["notifications"];
  private handlers: RealtimeClientOptions = {};
  private listeners = new Map<string, RealtimeListenerOptions>();
  private state: RealtimeConnectionState = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPingAt = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ticketExpiresAt = 0;
  private ticketRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tracks last-seen notification id to avoid duplicate emissions during REST polling. */
  private lastPollNotificationId: string | null = null;

  /** Register a multiplexed listener and merge channels/handlers. */
  registerListener(
    id: string,
    listener: RealtimeListenerOptions,
  ): () => void {
    this.listeners.set(id, listener);
    void this.syncListeners();
    return () => {
      this.listeners.delete(id);
      void this.syncListeners();
    };
  }

  /** Open the WebSocket connection. Idempotent. */
  async connect(): Promise<void> {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.setState("connecting");
    this.clearTimers();

    try {
      this.ticket = await mintTicket(this.channels);
      this.ticketExpiresAt = this.ticket.expiresAt;
      this.scheduleTicketRefresh();
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
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.setState("disconnected");
  }

  /** Update allowed channels (requires reconnection). */
  async setChannels(channels: string[]): Promise<void> {
    const next = [...channels].sort();
    if (channelsEqual(next, this.channels)) {
      return;
    }
    this.channels = next;
    if (this.ws) {
      this.ws.close(1000, "Channel set changed");
      this.ws = null;
    }
    await this.connect();
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
      const callbacks: Array<
        NonNullable<RealtimeListenerOptions[typeof key]>
      > = [];
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

    const nextChannels = Array.from(channels).sort();
    const channelsChanged = !channelsEqual(nextChannels, this.channels);
    this.channels = nextChannels;
    this.handlers = handlers;

    if (
      channelsChanged &&
      this.state !== "disconnected" &&
      this.listeners.size > 0
    ) {
      await this.setChannels(nextChannels);
    }
  }

  // ── Internal ──

  private openWebSocket(): void {
    if (!this.ticket) return;

    const wsUrl = `${resolveWebSocketUrl(this.ticket)}?ticket=${encodeURIComponent(this.ticket.ticket)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.lastPingAt = Date.now();
      this.startHeartbeatMonitor();

      for (const channel of this.channels) {
        this.send({ op: "subscribe", channel });
      }
    };

    this.ws.onmessage = (event) => {
      this.lastPingAt = Date.now();
      try {
        const frame = JSON.parse(event.data as string) as RealtimeFrame;
        this.dispatch(frame);
      } catch {
        console.warn("[realtime] Failed to parse frame:", event.data);
      }
    };

    this.ws.onclose = (event) => {
      this.ws = null;
      if (event.code === 1000) {
        this.setState("disconnected");
        this.startRestPolling();
        return;
      }
      if (event.code === 4401) {
        this.handleReauthAndReconnect();
        return;
      }
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
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
      (this.handlers[handlerKey] as FrameHandler)(frame);
    }
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

  private async handleReauthAndReconnect(): Promise<void> {
    try {
      const tokens = getSessionTokens();
      if (!tokens) {
        this.startRestPolling();
        return;
      }
      const refreshUrl = apiUrl(API_ROUTES.refresh);
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: buildAuthHeaders(tokens.accessToken),
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (response.ok) {
        const body = await response.json();
        setSessionTokens({
          accessToken: body.accessToken,
          refreshToken: body.refreshToken ?? tokens.refreshToken,
        });
      }
    } catch {
      // Token refresh failed — will fall through to REST polling
    }
    this.attemptReconnect();
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
      const newTicket = await mintTicket(this.channels);
      this.send({ op: "reauth", ticket: newTicket.ticket });
      this.ticketExpiresAt = newTicket.expiresAt;
      this.scheduleTicketRefresh();
    } catch {
      console.warn("[realtime] Ticket refresh failed, will reconnect on 4401");
    }
  }

  // ── Heartbeat ──

  private startHeartbeatMonitor(): void {
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPingAt > HEARTBEAT_TIMEOUT_MS) {
        console.warn("[realtime] Heartbeat timeout - reconnecting");
        if (this.ws) {
          this.ws.close(4001, "Heartbeat timeout");
          this.ws = null;
        }
        this.attemptReconnect();
      }
    }, 10_000);
  }

  // ── REST polling fallback ──

  private startRestPolling(): void {
    if (!this.channels.includes("notifications")) return;
    if (this.pollTimer) return;
    this.lastPollNotificationId = null; // reset dedup tracker on new poll cycle
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
      const tokens = getSessionTokens();
      if (!tokens) return;
      const url = apiUrl("/api/v1/notifications");
      const response = await fetch(url, {
        headers: buildAuthHeaders(tokens.accessToken),
      });
      if (response.ok) {
        const notifications = await response.json();
        if (Array.isArray(notifications)) {
          for (const n of notifications) {
            // Deduplicate: only emit notifications newer than lastPollNotificationId
            if (
              this.lastPollNotificationId &&
              n.id === this.lastPollNotificationId
            ) {
              break; // notifications are ordered by created_at DESC
            }
            this.handlers.onNotification?.({
              v: 1,
              type: "notification.created",
              eventId: n.id ?? "",
              at: n.createdAt ?? new Date().toISOString(),
              priority: "MEDIUM",
              data: normalizeNotificationData(n as Record<string, unknown>),
            });
          }
          // Remember the newest notification id for next poll
          if (notifications.length > 0 && notifications[0].id) {
            this.lastPollNotificationId = notifications[0].id as string;
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

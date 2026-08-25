"use client";

import * as React from "react";
import { ArrowDown, Headset, MessageCircle, X } from "lucide-react";

import {
  type ChatMessageShape,
  Avatar,
  Composer,
  DayDivider,
  LiveStatusPill,
  MessageBubble,
  TypingBubble,
  chatDayLabel,
  mergeByTimestamp,
} from "@/components/support/support-chat-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type GuestChatType,
  type GuestConversation,
  type GuestMessage,
  type GuestThreadPayload,
  ensureGuestId,
  getGuestName,
  guestRealtimeChannel,
  markGuestThreadRead,
  resumeGuestThread,
  sendGuestMessage,
  setGuestName,
  setGuestPhone,
  startGuestThread,
} from "@/lib/public-support-api";
import {
  getGuestRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeFrame,
} from "@/lib/realtime";
import { playSupportMessageSound, unlockSupportAudio } from "@/lib/support-sound";
import { cn } from "@/lib/utils";

/**
 * Guest support chat — the anonymous visitor/buyer side.
 *
 * One component serves both kiosk.ke visitors (VISITOR → super-admin team) and
 * storefront buyers (STOREFRONT → tenant staff). Identity is a shared
 * localStorage guest id + a per-shop thread secret; a single guest WebSocket
 * socket (scoped to {@code support.guest:<guestId>}) carries the whole chat.
 */

export type GuestSupportContext = {
  /** localStorage namespace separating shops (slug) and the platform. */
  ns: string;
  type: GuestChatType;
  businessSlug?: string;
  title: string;
  teamName: string;
  blurb: string;
  accentHex?: string | null;
  quickPrompts: string[];
};

function toLocalMessage(message: GuestMessage): ChatMessageShape {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType as ChatMessageShape["senderType"],
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

const TYPING_STOP_MS = 4000;

export function GuestSupportLauncher({ context }: { context: GuestSupportContext }) {
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");

  const live = connectionState === "connected";
  const busy =
    connectionState === "connecting" || connectionState === "reconnecting";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-black/30 supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-[2px]"
          className="gap-0 border-border/60 p-0 sm:w-[min(100%,26rem)]"
        >
          <DialogTitle className="sr-only">{context.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Chat with {context.teamName}.
          </DialogDescription>
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <GuestSupportPanel
              context={context}
              open={open}
              onUnreadChange={setUnread}
              onConnectionStateChange={setConnectionState}
              onClose={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : `Chat with ${context.teamName}`}
        title={open ? "Close chat" : `Chat with ${context.teamName}`}
        className={cn(
          "group fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]",
          open ? "bg-muted-foreground text-white" : "text-primary-foreground",
        )}
        style={{ backgroundColor: !open ? context.accentHex || "var(--primary)" : undefined }}
      >
        {unread > 0 && !open ? (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-current opacity-20"
            aria-hidden
          />
        ) : null}
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <MessageCircle className="size-6" aria-hidden />
        )}
        <span
          className={cn(
            "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background",
            live ? "bg-emerald-400" : busy ? "bg-amber-400" : "bg-muted-foreground/70",
          )}
          title={live ? "Connected" : busy ? "Connecting…" : "Offline"}
          aria-hidden
        />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold leading-none text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </>
  );
}

function GuestSupportPanel({
  context,
  open,
  onUnreadChange,
  onConnectionStateChange,
  onClose,
}: {
  context: GuestSupportContext;
  open: boolean;
  onUnreadChange: (updater: number | ((n: number) => number)) => void;
  onConnectionStateChange: (state: RealtimeConnectionState) => void;
  onClose: () => void;
}) {
  const guestId = React.useMemo(() => ensureGuestId(), []);
  const channel = guestRealtimeChannel(guestId);

  const [conversation, setConversation] = React.useState<GuestConversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageShape[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [theirTyping, setTheirTyping] = React.useState(false);
  const [showJump, setShowJump] = React.useState(false);
  const [introName, setIntroName] = React.useState("");
  const [introPhone, setIntroPhone] = React.useState("");
  const [introError, setIntroError] = React.useState("");
  const [showIntro, setShowIntro] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const typingStopRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = conversation?.id ?? null;
  const hasThread = Boolean(conversationId);

  // Unlock WebAudio on first gesture so the reply chime is audible.
  React.useEffect(() => {
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const isMine = (message: ChatMessageShape) => message.senderType === "GUEST";

  const applyPayload = React.useCallback((payload: GuestThreadPayload, silent: boolean) => {
    const list = (payload.messages ?? []).map(toLocalMessage);
    for (const message of list) seenIdsRef.current.add(message.id);
    setConversation(payload.conversation);
    setMessages((prev) => (silent ? mergeByTimestamp(prev, list) : list));
    setLoadError("");
  }, []);

  // ── Load / resume the thread ─────────────────────────────────────────────
  const loadThread = React.useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const payload = await resumeGuestThread(context.ns, {
          type: context.type,
          businessSlug: context.businessSlug,
        });
        if (!payload || !payload.conversation) {
          if (!silent) setShowIntro(true);
          return;
        }
        applyPayload(payload, silent);
        setShowIntro(false);
        if (open) {
          void markGuestThreadRead(context.ns, payload.conversation.id).catch(() => {});
          onUnreadChange(0);
        } else {
          onUnreadChange(payload.conversation.unreadCount ?? 0);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load the chat.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context.ns, context.type, context.businessSlug, open],
  );

  React.useEffect(() => {
    void loadThread();
  }, [loadThread]);

  // Connect the guest socket once a thread exists (ticket mint needs a token).
  const hasThreadRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasThread || hasThreadRef.current) return;
    hasThreadRef.current = true;
    const client = getGuestRealtimeClient();
    client.connect().catch(() => {});
  }, [hasThread]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const client = getGuestRealtimeClient();
    const unregister = client.registerListener(`guest-chat-${context.ns}`, {
      channels: [channel],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const messageId = String(data.messageId ?? "");
        const convId = String(data.conversationId ?? "");
        if (!messageId || !convId || seenIdsRef.current.has(messageId)) return;
        if (convId !== conversationId) return; // another shop's thread
        seenIdsRef.current.add(messageId);

        const incoming: ChatMessageShape = {
          id: messageId,
          conversationId: convId,
          senderType: String(data.senderType ?? "GUEST") as ChatMessageShape["senderType"],
          senderUserId: String(data.senderUserId ?? ""),
          senderName: String(data.senderName ?? "") || null,
          body: String(data.body ?? ""),
          readAt: null,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
        };
        const fromStaff = incoming.senderType !== "GUEST";
        if (fromStaff) {
          playSupportMessageSound();
          if (!open) onUnreadChange((n) => n + 1);
          else void markGuestThreadRead(context.ns, convId).catch(() => {});
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const next = [...prev, incoming];
          if (fromStaff && open) {
            // We're looking at it — flip receipts for our own sent messages.
            return next.map((m) =>
              m.senderType === "GUEST" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
            );
          }
          return next;
        });
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessageAt: incoming.createdAt,
                lastMessagePreview: incoming.body,
              }
            : prev,
        );
      },
      onSupportRead: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.conversationId ?? "") !== conversationId) return;
        // Staff read our messages — our sent ticks flip to ✓✓.
        setMessages((prev) =>
          prev.map((m) =>
            m.senderType === "GUEST" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
          ),
        );
      },
      onSupportTyping: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.conversationId ?? "") !== conversationId) return;
        if (data.fromAdmin !== true) return; // only staff typing matters to us
        setTheirTyping(data.typing === true);
        if (typingStopRef.current) clearTimeout(typingStopRef.current);
        if (data.typing === true) {
          typingStopRef.current = setTimeout(() => setTheirTyping(false), TYPING_STOP_MS);
        }
      },
      onSupportConversation: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.conversationId ?? "") !== conversationId) return;
        setConversation((prev) =>
          prev ? { ...prev, status: String(data.status ?? prev.status) } : prev,
        );
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
        onConnectionStateChange(state);
      },
    });

    return () => {
      unregister();
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, conversationId, context.ns, open]);

  // ── Scroll ───────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, theirTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
    if (nearBottom) setShowJump(false);
  };

  // ── Send / start ─────────────────────────────────────────────────────────
  const send = React.useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || sending) return;
      if (!conversationId) {
        // First message creates the thread (and the server mints the token).
        setSending(true);
        try {
          const savedName = getGuestName();
          const payload = await startGuestThread(context.ns, {
            type: context.type,
            businessSlug: context.businessSlug,
            body,
            name: savedName,
          });
          if (payload.conversation) {
            applyPayload(payload, false);
            setShowIntro(false);
            if (open) {
              void markGuestThreadRead(context.ns, payload.conversation.id).catch(() => {});
              onUnreadChange(0);
            }
          }
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : "Could not start the conversation.");
        } finally {
          setSending(false);
        }
        return;
      }
      setSending(true);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const optimistic: ChatMessageShape = {
        id: tempId,
        conversationId,
        senderType: "GUEST",
        senderUserId: guestId,
        senderName: getGuestName(),
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setDraft("");
      try {
        const saved = await sendGuestMessage(context.ns, conversationId, body);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? toLocalMessage(saved) : m)));
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
        setLoadError(e instanceof Error ? e.message : "Message failed to send.");
      } finally {
        setSending(false);
      }
    },
    [conversationId, context.ns, context.type, context.businessSlug, guestId, open, sending, applyPayload, onUnreadChange],
  );

  const beginIntro = () => {
    const name = introName.trim();
    const phone = introPhone.trim();
    const digits = phone.replace(/[^0-9+]/g, "");
    if (digits.length < 9 || digits.length > 16) {
      setIntroError("Please enter a valid phone number so we can follow up.");
      return;
    }
    setIntroError("");
    if (name) setGuestName(name);
    setGuestPhone(phone);
    setShowIntro(false);
  };

  const resolved = conversation?.status === "RESOLVED";
  const accent = context.accentHex || undefined;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={`Chat with ${context.teamName}`}>
      <header
        className="flex items-center gap-3 border-b border-border/60 px-4 py-3"
        style={
          accent
            ? { backgroundColor: `${accent}0d` } // ~5% tint of the brand colour
            : undefined
        }
      >
        <Avatar name={context.title} seed={context.ns} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{context.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {theirTyping ? (
              <span className="font-medium text-primary">typing…</span>
            ) : resolved ? (
              "Conversation resolved"
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Usually replies in minutes
              </span>
            )}
          </p>
        </div>
        <LiveStatusPill state={connectionState} className="hidden sm:inline-flex" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-6 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-full shadow-md"
            style={{
              backgroundColor: accent || "var(--primary)",
              color: accent ? "#fff" : "var(--primary-foreground)",
            }}
          >
            <Headset className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{context.blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tell us who you are so we can keep your conversation in one place.
            </p>
          </div>
          <div className="flex w-full max-w-64 flex-col gap-2">
            <input
              value={introName}
              onChange={(e) => setIntroName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") beginIntro();
              }}
              placeholder="Your name"
              aria-label="Your name"
              className="h-10 w-full rounded-xl border border-border/70 bg-muted/40 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <input
              value={introPhone}
              onChange={(e) => setIntroPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") beginIntro();
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Phone number — e.g. 0712 345 678"
              aria-label="Phone number"
              className="h-10 w-full rounded-xl border border-border/70 bg-muted/40 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {introError ? (
              <p className="text-left text-[11px] text-destructive">{introError}</p>
            ) : null}
            <button
              type="button"
              onClick={beginIntro}
              className="mt-1 inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: accent || "var(--primary)",
                color: accent ? "#fff" : "var(--primary-foreground)",
              }}
            >
              Start chatting
            </button>
          </div>
          <p className="max-w-56 text-[11px] leading-relaxed text-muted-foreground">
            No account needed — we only use this to recognise you when you come back.
          </p>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1 bg-muted/20">
            <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading conversation…
                </div>
              ) : loadError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadThread()}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Say hello to {context.teamName}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {context.quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void send(prompt)}
                        className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const mine = isMine(message);
                    const prev = messages[index - 1];
                    const newDay = !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                    const showAvatar = !mine && (index === 0 || isMine(prev));
                    return (
                      <React.Fragment key={message.id}>
                        {newDay && index > 0 ? <DayDivider iso={message.createdAt} /> : null}
                        <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
                          <MessageBubble message={message} mine={mine} showAvatar={showAvatar} />
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {theirTyping ? <TypingBubble label={`${context.teamName} is typing`} /> : null}
                </>
              )}
            </div>
            {showJump ? (
              <button
                type="button"
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTop = el.scrollHeight;
                  stickToBottomRef.current = true;
                  setShowJump(false);
                }}
                aria-label="Jump to latest messages"
                className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
              >
                <ArrowDown className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="border-t border-border/60 p-3">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={(text) => void send(text)}
              disabled={Boolean(loadError)}
              sending={sending}
            />
            {resolved ? (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                This conversation was resolved — sending a new message reopens it.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

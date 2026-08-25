"use client";

import * as React from "react";
import { ArrowDown, LifeBuoy, MessageCircleQuestion, RotateCw, Volume2, VolumeX, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  ChatMessageShape,
  Composer,
  DayDivider,
  LiveStatusPill,
  MessageBubble,
  PlatformAvatar,
  ResolvedBanner,
  TypingBubble,
  chatDayLabel,
  mergeByTimestamp,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import { getRealtimeClient, type RealtimeConnectionState, type RealtimeFrame } from "@/lib/realtime";
import {
  type SupportConversation,
  type SupportMessage,
  fetchSupportConversation,
  markSupportConversationRead,
  reopenSupportConversation,
  resolveSupportConversation,
  sendSupportMessage,
} from "@/lib/support-api";
import { isSupportSoundEnabled, setSupportSoundEnabled } from "@/lib/support-sound";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "How do I add a new cashier to my till?",
  "My M-Pesa till number isn't receiving payments",
  "I need help setting up my online store",
];

type LocalMessage = ChatMessageShape;

function toLocalMessage(message: SupportMessage): LocalMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

const TYPING_EMIT_MS = 2500;
const TYPING_STOP_MS = 3000;

export function SupportChat({
  variant = "panel",
  onClose,
}: {
  /** `drawer` fills a left-edge sheet; `panel` keeps the card shell used on /support. */
  variant?: "panel" | "drawer";
  onClose?: () => void;
} = {}) {
  const { me } = useDashboard();
  const meId = me?.id ?? "";
  const meName = me?.name?.trim() || me?.email?.trim() || "You";
  const isDrawer = variant === "drawer";

  const [conversation, setConversation] = React.useState<SupportConversation | null>(null);
  const [messages, setMessages] = React.useState<LocalMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [theirTyping, setTheirTyping] = React.useState(false);
  const [showJump, setShowJump] = React.useState(false);
  const [jumpCount, setJumpCount] = React.useState(0);
  const [soundOn, setSoundOn] = React.useState(true);

  React.useEffect(() => {
    setSoundOn(isSupportSoundEnabled());
  }, []);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const typingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const typingStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = React.useRef(false);

  const conversationId = conversation?.id ?? null;

  // ── Load the thread ─────────────────────────────────────────────────────
  const loadThread = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const detail = await fetchSupportConversation();
      setConversation(detail.conversation);
      for (const message of detail.messages ?? []) {
        seenIdsRef.current.add(message.id);
      }
      if (silent) {
        // Background sync: merge so optimistic rows and scroll position survive.
        setMessages((prev) => mergeByTimestamp(prev, (detail.messages ?? []).map(toLocalMessage)));
      } else {
        setMessages((detail.messages ?? []).map(toLocalMessage));
      }
      setLoadError("");
      if (detail.conversation) {
        // Opened the thread: mark our side read (server marks receipt ticks).
        void markSupportConversationRead().catch(() => {});
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the support chat.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadThread();
  }, [loadThread]);

  // ── Realtime listener ───────────────────────────────────────────────────
  React.useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("support-chat", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const messageId = String(data.messageId ?? "");
        if (!messageId || seenIdsRef.current.has(messageId)) return;
        seenIdsRef.current.add(messageId);

        const incoming: LocalMessage = {
          id: messageId,
          conversationId: String(data.conversationId ?? ""),
          senderType: String(data.senderType ?? "TENANT") as LocalMessage["senderType"],
          senderUserId: String(data.senderUserId ?? ""),
          senderName: String(data.senderName ?? "") || null,
          body: String(data.body ?? ""),
          readAt: null,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
        };

        // This panel only renders the tenant's platform thread — storefront
        // buyer chats (separate conversation ids) belong to the buyer inbox.
        const frameType = String(data.conversationType ?? "");
        if (frameType && frameType !== "TENANT") return;
        if (!conversationId || incoming.conversationId !== conversationId) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const next = [...prev, incoming];
          // The other side always counts as read while we have the thread open.
          if (incoming.senderType === "SUPER_ADMIN") {
            void markSupportConversationRead().catch(() => {});
          }
          return next;
        });
      },
      onSupportRead: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (convId && conversationId && convId !== conversationId) return;
        const reader = String(data.readerType ?? "");
        if (reader === "SUPER_ADMIN") {
          // The platform read our messages — flip our ticks to ✓✓.
          setMessages((prev) =>
            prev.map((m) =>
              m.senderType === "TENANT" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
            ),
          );
        }
      },
      onSupportTyping: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (conversationId && convId && convId !== conversationId) return;
        const fromAdmin = data.fromAdmin === true;
        if (!fromAdmin) return; // ignore our own tenants typing
        setTheirTyping(data.typing === true);
      },
      onSupportConversation: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (conversationId && convId && convId !== conversationId) return;
        const status = String(data.status ?? "");
        if (status) {
          setConversation((prev) => (prev ? { ...prev, status } : prev));
        }
      },
      onConnectionStateChange: (state) => setConnectionState(state),
    });

    const connectTimer = window.setTimeout(() => {
      client.connect().catch(() => {
        // REST/refresh fallback handled by the client
      });
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      unregister();
    };
  }, [conversationId]);

  // ── Scroll management ───────────────────────────────────────────────────
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

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
    setShowJump(false);
    setJumpCount(0);
  };

  // Count unseen while scrolled up.
  React.useEffect(() => {
    if (showJump) {
      setJumpCount((c) => c + 1);
    }
  }, [messages.length, showJump]);

  // ── Outbound typing presence ───────────────────────────────────────────
  const stopTyping = React.useCallback(() => {
    if (typingActiveRef.current && conversationId) {
      getRealtimeClient().sendTyping(conversationId, false);
      typingActiveRef.current = false;
    }
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [conversationId]);

  React.useEffect(() => {
    if (!conversationId) return;
    if (draft.trim().length === 0) {
      stopTyping();
      return;
    }
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      getRealtimeClient().sendTyping(conversationId, true);
    }
    if (!typingTimerRef.current) {
      typingTimerRef.current = setInterval(() => {
        if (draft.trim().length > 0 && typingActiveRef.current) {
          getRealtimeClient().sendTyping(conversationId, true);
        }
      }, TYPING_EMIT_MS);
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(stopTyping, TYPING_STOP_MS);
  }, [draft, conversationId, stopTyping]);

  React.useEffect(() => () => stopTyping(), [stopTyping]);

  // Always-on background sync: 5s keeps the thread fresh even if the socket is
  // down (or a frame was dropped), and tab focus catches up instantly.
  React.useEffect(() => {
    const timer = window.setInterval(() => void loadThread(true), 5000);
    const onVisible = () => {
      if (!document.hidden) void loadThread(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadThread]);

  // ── Send ────────────────────────────────────────────────────────────────
  const send = React.useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || sending) return;
      stopTyping();
      setSending(true);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const optimistic: LocalMessage = {
        id: tempId,
        conversationId: conversationId ?? "",
        senderType: "TENANT",
        senderUserId: meId,
        senderName: meName,
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const saved = await sendSupportMessage(body);
        seenIdsRef.current.add(saved.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) {
            // The realtime echo landed before the HTTP response — drop the optimistic row.
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? toLocalMessage(saved) : m));
        });
        // First message creates the thread — refresh header state.
        if (!conversationId) {
          const detail = await fetchSupportConversation().catch(() => null);
          if (detail?.conversation) {
            setConversation(detail.conversation);
            setMessages(detail.messages.map(toLocalMessage));
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, meId, meName, sending, stopTyping],
  );

  const retry = (message: LocalMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    void send(message.body);
  };

  const toggleStatus = async () => {
    if (!conversation || statusBusy) return;
    setStatusBusy(true);
    try {
      const target = conversation.status === "OPEN" ? "RESOLVED" : "OPEN";
      if (target === "RESOLVED") {
        await resolveSupportConversation();
      } else {
        await reopenSupportConversation();
      }
      setConversation((prev) => (prev ? { ...prev, status: target } : prev));
    } finally {
      setStatusBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const resolved = conversation?.status === "RESOLVED";
  const otherTypingLabel = "Kiosk Support is typing";

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card",
        isDrawer
          ? "rounded-none border-0 shadow-none"
          : "rounded-2xl border border-border/70 shadow-sm",
      )}
      aria-label="Support chat with Kiosk"
    >
      {/* Header */}
      <header
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-border/60 bg-background px-4 py-3.5",
          isDrawer && "pt-[max(0.875rem,env(safe-area-inset-top))]",
        )}
      >
        <div className="relative shrink-0">
          <PlatformAvatar className="size-10" />
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            Kiosk Support
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {theirTyping
              ? "typing…"
              : connectionState === "connected"
                ? "Platform team · usually replies within minutes"
                : "Live sync paused — new messages appear automatically"}
          </p>
        </div>
        <LiveStatusPill state={connectionState} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={soundOn ? "Mute message sounds" : "Unmute message sounds"}
          title={soundOn ? "Message sounds on" : "Message sounds off"}
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSupportSoundEnabled(next);
          }}
        >
          {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Button>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Close support chat"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      <ResolvedBanner resolved={resolved} onReopen={toggleStatus} busy={statusBusy} />

      {/* Messages */}
      <div className="relative min-h-0 flex-1 bg-muted/25">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 py-5 sm:px-5"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadThread()}>
                <RotateCw className="size-3.5" />
                Try again
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-5">
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <LifeBuoy className="size-7 text-primary" aria-hidden />
              </div>
              <p className="text-base font-semibold tracking-tight text-foreground">Hi there 👋</p>
              <p className="mt-1.5 max-w-[18rem] text-center text-sm leading-relaxed text-muted-foreground">
                This is your direct line to the Kiosk team. Ask us anything — setup, payments,
                your online store, you name it.
              </p>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="group flex items-start gap-2.5 rounded-2xl border border-border/80 bg-card px-3.5 py-3 text-left text-sm leading-snug text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-primary/35 hover:bg-primary/[0.03] hover:text-foreground"
                  >
                    <MessageCircleQuestion
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {messages.map((message, index) => {
                const mine = message.senderType === "TENANT";
                const prev = messages[index - 1];
                const newDay =
                  !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                const showAvatar =
                  !mine && (!prev || prev.senderUserId !== message.senderUserId || newDay);
                return (
                  <React.Fragment key={message.id}>
                    {newDay ? <DayDivider iso={message.createdAt} /> : null}
                    <div
                      className={cn(
                        "flex flex-col gap-1",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      <MessageBubble message={message} mine={mine} showAvatar={showAvatar} />
                      {message.failed ? (
                        <button
                          type="button"
                          onClick={() => retry(message)}
                          className="mr-2 inline-flex items-center gap-1 text-[11px] font-medium text-destructive underline-offset-2 hover:underline"
                        >
                          <RotateCw className="size-3" />
                          Failed to send — tap to retry
                        </button>
                      ) : null}
                    </div>
                  </React.Fragment>
                );
              })}
              {theirTyping ? (
                <div className="mt-1">
                  <TypingBubble label={otherTypingLabel} />
                </div>
              ) : null}
              <div className="h-2" aria-hidden />
            </div>
          )}
        </div>

        {showJump ? (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg transition-transform hover:scale-105"
          >
            <ArrowDown className="size-3.5" />
            {jumpCount > 1
              ? `${Math.min(jumpCount, 99)} new message${jumpCount === 1 ? "" : "s"}`
              : "New messages"}
          </button>
        ) : null}
      </div>

      {/* Composer */}
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={(text) => void send(text)}
        disabled={resolved}
        disabledHint={resolved ? "Reopen the conversation to send a message" : undefined}
        sending={sending}
      />
    </section>
  );
}

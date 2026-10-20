"use client";

import * as React from "react";
import { ArrowDown, Check, LifeBuoy, MessageCircleQuestion, RotateCw, Volume2, VolumeX, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  ChatMessageShape,
  ChatThreadSurface,
  ChatThreadSkeleton,
  Composer,
  type ComposerReplyTarget,
  type ComposerSendPayload,
  DayDivider,
  NewMessagesDivider,
  MessageBubble,
  PlatformAvatar,
  ResolvedBanner,
  TypingBubble,
  chatDayLabel,
  getMessageCluster,
  mergeByTimestamp,
  replyFromRealtime,
  toReplyTarget,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import { newClientId } from "@/lib/client-id";
import { getRealtimeClient, type RealtimeConnectionState, type RealtimeFrame } from "@/lib/realtime";
import { uploadSupportAttachmentToCloudinary } from "@/lib/support-attachments";
import {
  type SupportConversation,
  type SupportMessage,
  fetchSupportConversation,
  markSupportConversationRead,
  openSupportConversation,
  reopenSupportConversation,
  resolveSupportConversation,
  sendSupportMessage,
} from "@/lib/support-api";
import { setSupportConversationFocused } from "@/lib/support-focus";
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
    messageKind: message.messageKind ?? "TEXT",
    orderCard: message.orderCard ?? null,
    welcomeCard: message.welcomeCard ?? null,
    attachment: message.attachment ?? null,
    replyTo: message.replyTo ?? null,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

function attachmentFromRealtime(data: Record<string, unknown>): ChatMessageShape["attachment"] {
  const raw = data.attachment;
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const url = typeof a.url === "string" ? a.url : "";
  if (!url) return null;
  return {
    url,
    publicId: typeof a.publicId === "string" ? a.publicId : null,
    fileName: typeof a.fileName === "string" ? a.fileName : null,
    contentType: typeof a.contentType === "string" ? a.contentType : null,
    bytes: typeof a.bytes === "number" ? a.bytes : null,
  };
}

function welcomeCardFromRealtime(
  data: Record<string, unknown>,
): ChatMessageShape["welcomeCard"] {
  const raw = data.welcomeCard;
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Record<string, unknown>;
  const helpRaw = w.helpItems;
  const helpItems = Array.isArray(helpRaw)
    ? helpRaw.filter((item): item is string => typeof item === "string")
    : [];
  return {
    recipientName: typeof w.recipientName === "string" ? w.recipientName : null,
    businessName: typeof w.businessName === "string" ? w.businessName : null,
    supportPhone: typeof w.supportPhone === "string" ? w.supportPhone : null,
    supportEmail: typeof w.supportEmail === "string" ? w.supportEmail : null,
    helpItems,
  };
}

function orderCardFromRealtime(
  data: Record<string, unknown>,
): ChatMessageShape["orderCard"] {
  const raw = data.orderCard;
  if (!raw || typeof raw !== "object") return null;
  return raw as ChatMessageShape["orderCard"];
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
  const [syncError, setSyncError] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [theirTyping, setTheirTyping] = React.useState(false);
  const [showJump, setShowJump] = React.useState(false);
  const [jumpCount, setJumpCount] = React.useState(0);
  const [soundOn, setSoundOn] = React.useState(true);
  const [replyTo, setReplyTo] = React.useState<ComposerReplyTarget | null>(null);
  const [highlightMessageId, setHighlightMessageId] = React.useState<string | null>(null);
  const [firstUnreadId, setFirstUnreadId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSoundOn(isSupportSoundEnabled());
  }, []);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  /** Newest platform message we have already acknowledged with a read POST. */
  const lastMarkedReadIdRef = React.useRef("");
  const typingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const typingStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = React.useRef(false);

  const conversationId = conversation?.id ?? null;

  // Mark the platform thread focused so shell toasts/unread skip while open.
  React.useEffect(() => {
    if (!conversationId) return;
    setSupportConversationFocused(conversationId, true);
    return () => setSupportConversationFocused(conversationId, false);
  }, [conversationId]);

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
        const firstUnread = (detail.messages ?? []).find(
          (m) => m.senderType === "SUPER_ADMIN" && !m.readAt,
        );
        setFirstUnreadId(firstUnread?.id ?? null);
        setMessages((detail.messages ?? []).map(toLocalMessage));
      }
      setLoadError("");
      setSyncError("");
      // Only acknowledge what is actually unread, and only once per new
      // platform message — the 5 s sync must not POST `read` on every tick.
      const newestUnreadId =
        (detail.messages ?? [])
          .filter((m) => m.senderType === "SUPER_ADMIN" && !m.readAt)
          .at(-1)?.id ?? "";
      if (
        detail.conversation &&
        newestUnreadId &&
        newestUnreadId !== lastMarkedReadIdRef.current
      ) {
        lastMarkedReadIdRef.current = newestUnreadId;
        void markSupportConversationRead().catch(() => {
          if (lastMarkedReadIdRef.current === newestUnreadId) {
            lastMarkedReadIdRef.current = "";
          }
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load the support chat.";
      if (silent) {
        // A background refresh failing must never replace a readable thread.
        setSyncError(message);
      } else {
        setLoadError(message);
      }
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
          messageKind: String(data.messageKind ?? "TEXT"),
          orderCard: orderCardFromRealtime(data),
          welcomeCard: welcomeCardFromRealtime(data),
          attachment: attachmentFromRealtime(data),
          replyTo: replyFromRealtime(data),
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

  const scrollToMessage = React.useCallback((messageId: string) => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-message-id="${messageId}"]`);
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightMessageId(messageId);
    window.setTimeout(() => setHighlightMessageId((current) => (current === messageId ? null : current)), 1400);
  }, []);

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

  // Fallback sync: only poll while the socket is down. Tab focus still catches
  // up on its own, and the listener above keeps the thread live when connected.
  React.useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void loadThread(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer =
      connectionState === "connected"
        ? null
        : window.setInterval(() => {
            if (document.hidden) return;
            void loadThread(true);
          }, 5000);
    return () => {
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadThread, connectionState]);

  // ── Send ────────────────────────────────────────────────────────────────
  const send = React.useCallback(
    async (payload: ComposerSendPayload | string) => {
      const body = typeof payload === "string" ? payload.trim() : payload.body.trim();
      const file = typeof payload === "string" ? null : payload.file ?? null;
      const existingAttachment =
        typeof payload === "string" ? null : payload.attachment ?? null;
      const replyToMessageId =
        typeof payload === "string" ? null : payload.replyToMessageId ?? replyTo?.messageId ?? null;
      const clientMessageId =
        (typeof payload === "string" ? null : payload.clientMessageId?.trim()) ||
        newClientId();
      if ((!body && !file && !existingAttachment) || sending) return;
      stopTyping();
      setSending(true);
      setReplyTo(null);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const localPreviewUrl =
        file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      const optimistic: LocalMessage = {
        id: tempId,
        conversationId: conversationId ?? "",
        senderType: "TENANT",
        senderUserId: meId,
        senderName: meName,
        body,
        attachment:
          existingAttachment ??
          (file
            ? {
                url: localPreviewUrl || "#",
                fileName: file.name,
                contentType: file.type || null,
                bytes: file.size,
              }
            : null),
        replyTo: replyToMessageId
          ? {
              messageId: replyToMessageId,
              senderType: replyTo?.senderType ?? "SUPER_ADMIN",
              senderName: replyTo?.senderName ?? null,
              body: replyTo?.body ?? "",
              messageKind: replyTo?.messageKind ?? "TEXT",
            }
          : null,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
        localFile: file,
        clientMessageId,
      };
      setMessages((prev) => [...prev, optimistic]);
      let confirmed = false;
      let uploadedAttachment = existingAttachment;
      try {
        let convId = conversationId;
        if ((file || existingAttachment) && !convId) {
          const opened = await openSupportConversation();
          if (opened.conversation) {
            setConversation(opened.conversation);
            convId = opened.conversation.id;
          }
        }
        let attachment = existingAttachment;
        if (file) {
          if (!convId) throw new Error("Could not open support thread for upload");
          attachment = await uploadSupportAttachmentToCloudinary(convId, file);
          uploadedAttachment = attachment;
        }
        const saved = await sendSupportMessage(
          body,
          attachment,
          replyToMessageId,
          clientMessageId,
        );
        confirmed = true;
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
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  pending: false,
                  failed: true,
                  attachment: uploadedAttachment ?? m.attachment,
                  localFile: file,
                }
              : m,
          ),
        );
      } finally {
        // Keep the local preview alive on failure so the retry row still shows
        // the photo; revoke only once the server has the message.
        if (localPreviewUrl && confirmed) URL.revokeObjectURL(localPreviewUrl);
        setSending(false);
      }
    },
    [conversationId, meId, meName, replyTo, sending, stopTyping],
  );

  const retry = (message: LocalMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    void send({
      body: message.body,
      file: message.localFile ?? null,
      clientMessageId: message.clientMessageId ?? null,
      attachment:
        message.attachment?.url && message.attachment.url !== "#"
          ? message.attachment
          : null,
    });
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
        "support-chat-theme support-chat-theme--platform flex h-full min-h-0 flex-1 flex-col overflow-hidden support-surface",
        isDrawer
          ? "rounded-none border-0"
          : "rounded-2xl border support-rule",
      )}
      aria-label="Support chat with Kiosk"
    >
      {/* Header */}
      <header
        className={cn(
          "support-chat-header flex shrink-0 items-center gap-3 border-b support-rule px-4 py-3",
          isDrawer && "pt-[max(0.875rem,env(safe-area-inset-top))]",
        )}
      >
        <div className="relative shrink-0">
          <PlatformAvatar className="size-10" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--conversation-panel,#fcfaf5)]",
              connectionState === "connected"
                ? "bg-emerald-500"
                : connectionState === "connecting" ||
                    connectionState === "reconnecting"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
            Kiosk Support
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {theirTyping
              ? "Kiosk Support is typing…"
              : connectionState === "connected"
                ? "Platform team"
                : connectionState === "connecting" ||
                    connectionState === "reconnecting"
                  ? "Reconnecting…"
                  : "Offline — messages still sync"}
          </p>
        </div>
        {!resolved ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Resolve conversation"
            title="Resolve conversation. A new message reopens it."
            disabled={statusBusy}
            onClick={() => void toggleStatus()}
          >
            <Check className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Resolve</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
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
            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Close support chat"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      <ResolvedBanner resolved={resolved} onReopen={toggleStatus} busy={statusBusy} />

      {syncError && !loading && !loadError ? (
        <div
          role="status"
          className="flex shrink-0 items-center justify-center gap-2 border-b border-border/50 bg-amber-500/[0.06] px-3 py-1.5 text-[11px] text-muted-foreground"
        >
          <RotateCw className="size-3" aria-hidden />
          <span>Showing the last synced messages — reconnecting…</span>
          <button
            type="button"
            onClick={() => void loadThread(true)}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Messages */}
      <ChatThreadSurface>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversation messages"
          className="support-chat-scroll absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        >
          {loading ? (
            <ChatThreadSkeleton />
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
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LifeBuoy className="size-6" aria-hidden />
              </div>
              <p className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                How can we help?
              </p>
              <p className="mt-1.5 max-w-[22rem] text-center text-[13.5px] leading-relaxed text-muted-foreground">
                A direct line to the Kiosk team for setup, payments, your online
                store, or anything else.
              </p>
              <div className="mt-5 flex w-full max-w-sm flex-col gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="flex items-start gap-2.5 rounded-xl border support-rule support-panel px-3.5 py-2.5 text-left text-[13.5px] leading-snug text-foreground transition-colors hover:bg-muted/40"
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
            <div className="mx-auto flex w-full max-w-[40rem] flex-col">
              {messages.map((message, index) => {
                const mine = message.senderType === "TENANT";
                const prev = messages[index - 1];
                const newDay =
                  !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                const cluster = getMessageCluster(messages, index, (m) => m.senderType === "TENANT");
                return (
                  <React.Fragment key={message.id}>
                    {newDay ? <DayDivider iso={message.createdAt} /> : null}
                    {message.id === firstUnreadId ? <NewMessagesDivider /> : null}
                    <div className={cluster.gapClass}>
                      <MessageBubble
                        message={message}
                        mine={mine}
                        showAvatar={cluster.showAvatar}
                        clusterPosition={cluster.clusterPosition}
                        highlighted={highlightMessageId === message.id}
                        onReply={resolved ? undefined : (target) => setReplyTo(toReplyTarget(target))}
                        onScrollToMessage={scrollToMessage}
                        onRetry={message.failed ? () => retry(message) : undefined}
                      />
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
            className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-[2px] border support-rule support-panel px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_12px_28px_-18px_rgba(18,26,22,0.45)] transition-colors hover:bg-[var(--conversation-paper,#f4f1ea)]"
          >
            <ArrowDown className="size-3.5" />
            {jumpCount > 1
              ? `${Math.min(jumpCount, 99)} new`
              : "Latest"}
          </button>
        ) : null}
      </ChatThreadSurface>

      {/* Composer */}
      <div className="min-w-0 shrink-0 overflow-hidden border-t support-rule support-panel">
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={(payload) => void send(payload)}
          disabled={resolved}
          disabledHint={resolved ? "Reopen the conversation to send a message" : undefined}
          sending={sending}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </section>
  );
}

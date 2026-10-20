"use client";

import * as React from "react";
import { ArrowDown, Headset, MessageCircle, RotateCw, X } from "lucide-react";

import {
  type ChatMessageShape,
  Avatar,
  ChatThreadSurface,
  ChatThreadSkeleton,
  Composer,
  type ComposerReplyTarget,
  type ComposerSendPayload,
  DayDivider,
  MessageBubble,
  NewMessagesDivider,
  PlatformAvatar,
  TypingBubble,
  chatDayLabel,
  getMessageCluster,
  mergeByTimestamp,
  replyFromRealtime,
  toReplyTarget,
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
  getGuestCloudinarySignature,
  uploadGuestAttachment,
  getGuestName,
  getGuestPhone,
  guestRealtimeChannel,
  markGuestThreadRead,
  resumeGuestThread,
  sendGuestMessage,
  setGuestName,
  setGuestPhone,
  startGuestThread,
  subscribeGuestIdentityChange,
} from "@/lib/public-support-api";
import { uploadSupportAttachmentToCloudinary } from "@/lib/support-attachments";
import {
  getGuestRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeFrame,
} from "@/lib/realtime";
import { playSupportMessageSound, unlockSupportAudio } from "@/lib/support-sound";
import { newClientId } from "@/lib/client-id";
import { readableInkOn } from "@/lib/color-contrast";
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
    messageKind: message.messageKind ?? "TEXT",
    orderCard: message.orderCard ?? null,
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

function orderCardFromRealtime(data: Record<string, unknown>): ChatMessageShape["orderCard"] {
  const raw = data.orderCard;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderId = typeof o.orderId === "string" ? o.orderId : "";
  const orderCode = typeof o.orderCode === "string" ? o.orderCode : "";
  if (!orderId && !orderCode) return null;
  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  return {
    orderId,
    orderCode: orderCode || orderId.slice(0, 8),
    status: typeof o.status === "string" ? o.status : "",
    currency: typeof o.currency === "string" ? o.currency : null,
    grandTotal:
      typeof o.grandTotal === "number" || typeof o.grandTotal === "string"
        ? o.grandTotal
        : null,
    customerName: typeof o.customerName === "string" ? o.customerName : null,
    customerPhone: typeof o.customerPhone === "string" ? o.customerPhone : null,
    branchName: typeof o.branchName === "string" ? o.branchName : null,
    channel: typeof o.channel === "string" ? o.channel : null,
    lines: linesRaw
      .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
      .map((l) => ({
        itemName: typeof l.itemName === "string" ? l.itemName : "Item",
        variantName: typeof l.variantName === "string" ? l.variantName : null,
        quantity:
          typeof l.quantity === "number" || typeof l.quantity === "string"
            ? l.quantity
            : 1,
        lineTotal:
          typeof l.lineTotal === "number" || typeof l.lineTotal === "string"
            ? l.lineTotal
            : 0,
      })),
    lineCount: typeof o.lineCount === "number" ? o.lineCount : linesRaw.length,
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

  // Browsers need a gesture before WebAudio can play the reply chime while the
  // chat is closed.
  React.useEffect(() => {
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <>
      <GuestUnreadWatcher
        context={context}
        open={open}
        onUnread={setUnread}
        onConnectionState={setConnectionState}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-black/35 supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-[3px]"
          className="gap-0 overflow-hidden border-border/50 p-0 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[min(100%,26.5rem)] sm:rounded-l-2xl"
        >
          <DialogTitle className="sr-only">{context.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Chat with {context.teamName}.
          </DialogDescription>
          <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
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
          "group fixed z-40 flex size-[3.6rem] items-center justify-center rounded-full outline-none transition-[transform,box-shadow,background-color] duration-200",
          "bottom-[calc(env(safe-area-inset-bottom,0px)+1.15rem)] right-4",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open
            ? "bg-foreground text-background shadow-[0_10px_28px_-12px_rgba(15,23,42,0.55)] hover:scale-[1.03]"
            : "text-primary-foreground shadow-[0_14px_36px_-12px_rgba(40,167,69,0.65)] hover:scale-[1.06] hover:shadow-[0_18px_40px_-12px_rgba(40,167,69,0.7)]",
        )}
        style={{
          backgroundColor: !open
            ? context.type === "VISITOR"
              ? "#1d4b3b"
              : context.accentHex || "var(--primary)"
            : undefined,
        }}
      >
        <span className="relative transition-transform duration-200 group-hover:scale-105">
          {open ? (
            <X className="size-5" strokeWidth={2.25} aria-hidden />
          ) : (
            <MessageCircle className="size-6" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span
          className={cn(
            "absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-background",
            live ? "bg-emerald-400" : busy ? "bg-amber-400" : "bg-white/55",
          )}
          title={live ? "Connected" : busy ? "Connecting…" : "Offline"}
          aria-hidden
        />
        {unread > 0 && !open ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold leading-none text-background shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </>
  );
}

/**
 * Keeps the guest socket subscribed and the launcher badge live while the chat
 * dialog is closed. Radix unmounts DialogContent when closed, so the panel's
 * own listener cannot do this job.
 */
function GuestUnreadWatcher({
  context,
  open,
  onUnread,
  onConnectionState,
}: {
  context: GuestSupportContext;
  open: boolean;
  onUnread: React.Dispatch<React.SetStateAction<number>>;
  onConnectionState: React.Dispatch<React.SetStateAction<RealtimeConnectionState>>;
}) {
  const [guestId, setGuestId] = React.useState(() => ensureGuestId());
  const channel = guestRealtimeChannel(guestId);

  React.useEffect(
    () =>
      subscribeGuestIdentityChange(context.ns, () =>
        setGuestId(ensureGuestId()),
      ),
    [context.ns],
  );

  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      onUnread(0);
      return;
    }
    let cancelled = false;
    void resumeGuestThread(context.ns, {
      type: context.type,
      businessSlug: context.businessSlug,
    })
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.conversation) {
          setConversationId(null);
          onUnread(0);
          return;
        }
        setConversationId(payload.conversation.id);
        onUnread(payload.conversation.unreadCount ?? 0);
        getGuestRealtimeClient().connect().catch(() => {});
      })
      .catch(() => {
        // Offline — keep whatever count we last knew.
      });
    return () => {
      cancelled = true;
    };
  }, [context.ns, context.type, context.businessSlug, guestId, open, onUnread]);

  React.useEffect(() => {
    if (!conversationId) return;
    const client = getGuestRealtimeClient();
    const unregister = client.registerListener(`guest-unread-${context.ns}`, {
      channels: [channel],
      onSupportMessage: (frame: RealtimeFrame) => {
        if (open) return;
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (!convId || convId !== conversationId) return;
        if (String(data.senderType ?? "GUEST") === "GUEST") return;
        const messageId = String(data.messageId ?? "");
        if (messageId && seenRef.current.has(messageId)) return;
        if (messageId) seenRef.current.add(messageId);
        onUnread((n) => n + 1);
        playSupportMessageSound();
      },
      onConnectionStateChange: (state) => onConnectionState(state),
    });
    client.connect().catch(() => {});
    return () => unregister();
  }, [channel, conversationId, context.ns, open, onUnread, onConnectionState]);

  return null;
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
  const [guestId, setGuestId] = React.useState(() => ensureGuestId());
  const channel = guestRealtimeChannel(guestId);

  React.useEffect(
    () =>
      subscribeGuestIdentityChange(context.ns, () =>
        setGuestId(ensureGuestId()),
      ),
    [context.ns],
  );

  const [conversation, setConversation] = React.useState<GuestConversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageShape[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [syncError, setSyncError] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [theirTyping, setTheirTyping] = React.useState(false);
  const [showJump, setShowJump] = React.useState(false);
  const [introName, setIntroName] = React.useState(() => getGuestName() ?? "");
  const [introPhone, setIntroPhone] = React.useState(() => getGuestPhone() ?? "");
  const [introError, setIntroError] = React.useState("");
  const [showIntro, setShowIntro] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [replyTo, setReplyTo] = React.useState<ComposerReplyTarget | null>(null);
  const [highlightMessageId, setHighlightMessageId] = React.useState<string | null>(null);
  const [firstUnreadId, setFirstUnreadId] = React.useState<string | null>(null);

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
    if (!silent) {
      const firstUnread = list.find(
        (m) => m.senderType !== "GUEST" && !m.readAt,
      );
      setFirstUnreadId(firstUnread?.id ?? null);
    }
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
        setSyncError("");
        setShowIntro(false);
        if (open) {
          const hasUnread = (payload.messages ?? []).some(
            (m) => m.senderType !== "GUEST" && !m.readAt,
          );
          if (hasUnread) {
            void markGuestThreadRead(context.ns, payload.conversation.id).catch(() => {});
          }
          onUnreadChange(0);
        } else {
          onUnreadChange(payload.conversation.unreadCount ?? 0);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not load the chat.";
        if (silent) {
          setSyncError(message);
        } else {
          setLoadError(message);
        }
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

  // Silent fallback sync: the socket can drop on a flaky mobile network, and
  // guests have no dashboard-level unread poll to recover the thread.
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void loadThread(true);
    }, 5000);
    const onVisible = () => {
      if (!document.hidden) void loadThread(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadThread]);

  // Connect (or reconnect) once a thread token exists — mint needs a valid secret.
  React.useEffect(() => {
    if (!hasThread) return;
    const client = getGuestRealtimeClient();
    client.connect().catch(() => {});
  }, [hasThread, conversationId]);

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
          messageKind: String(data.messageKind ?? "TEXT"),
          orderCard: orderCardFromRealtime(data),
          attachment: attachmentFromRealtime(data),
          replyTo: replyFromRealtime(data),
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
    setShowJump(!nearBottom);
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

  // ── Send / start ─────────────────────────────────────────────────────────
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

      // First message may need to create the thread (and mint the guest token).
      let threadId = conversationId;
      if (!threadId) {
        setSending(true);
        try {
          const savedName = getGuestName();
          // Empty body is fine when attaching — creates the thread without a text row.
          const payloadStart = await startGuestThread(context.ns, {
            type: context.type,
            businessSlug: context.businessSlug,
            body: file || existingAttachment ? "" : body,
            name: savedName,
            clientMessageId,
          });
          if (!payloadStart.conversation) {
            throw new Error("Could not start the conversation.");
          }
          applyPayload(payloadStart, false);
          setShowIntro(false);
          threadId = payloadStart.conversation.id;
          if (open) {
            void markGuestThreadRead(context.ns, threadId).catch(() => {});
            onUnreadChange(0);
          }
          // Text-only first message was already persisted by startGuestThread.
          if (!file && !existingAttachment) {
            return;
          }
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : "Could not start the conversation.");
          setSending(false);
          return;
        }
      }

      setSending(true);
      setReplyTo(null);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const localPreviewUrl =
        file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      const optimistic: ChatMessageShape = {
        id: tempId,
        conversationId: threadId,
        senderType: "GUEST",
        senderUserId: guestId,
        senderName: getGuestName(),
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
              senderType: replyTo?.senderType ?? "TENANT",
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
      setDraft("");
      let confirmed = false;
      let uploadedAttachment = existingAttachment;
      try {
        let attachment = existingAttachment;
        if (file) {
          attachment = await uploadSupportAttachmentToCloudinary(
            threadId,
            file,
            async () => getGuestCloudinarySignature(context.ns, threadId!),
            (upload) => uploadGuestAttachment(context.ns, threadId!, upload),
          );
          uploadedAttachment = attachment;
        }
        const saved = await sendGuestMessage(context.ns, threadId, body, {
          type: context.type,
          businessSlug: context.businessSlug,
          attachment,
          replyToMessageId,
          clientMessageId,
        });
        confirmed = true;
        seenIdsRef.current.add(saved.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? toLocalMessage(saved) : m));
        });
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
        // Do not set loadError: a failed send must leave the conversation
        // readable and show the failed bubble + Retry, not blank the thread.
      } finally {
        if (localPreviewUrl && confirmed) URL.revokeObjectURL(localPreviewUrl);
        setSending(false);
      }
    },
    [
      conversationId,
      context.ns,
      context.type,
      context.businessSlug,
      guestId,
      open,
      sending,
      applyPayload,
      onUnreadChange,
      replyTo,
    ],
  );

  const retry = (message: ChatMessageShape) => {
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
    <section
      className={cn(
        "support-chat-theme flex h-full min-h-0 flex-col support-surface",
        context.type === "VISITOR"
          ? "support-chat-theme--platform"
          : "support-chat-theme--shop",
      )}
      aria-label={`Chat with ${context.teamName}`}
    >
      <header className="support-chat-header flex items-center gap-2.5 border-b border-border/50 px-4 py-2.5">
        <div className="relative shrink-0">
          {context.type === "VISITOR" ? (
            <PlatformAvatar className="size-10" />
          ) : (
            <Avatar name={context.title} seed={context.ns} className="size-10 text-sm" />
          )}
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
            {context.title}
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {theirTyping ? (
              <span className="font-medium text-primary">
                {context.teamName} is typing…
              </span>
            ) : resolved ? (
              "Conversation resolved"
            ) : connectionState === "connecting" ||
              connectionState === "reconnecting" ? (
              "Reconnecting…"
            ) : connectionState === "disconnected" ? (
              "Offline — messages still sync"
            ) : context.type === "VISITOR" ? (
              "Kiosk platform team"
            ) : (
              "Storefront chat"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      {syncError && !loading && !loadError && !showIntro ? (
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

      {showIntro ? (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-6 text-center">
            <span
              className="flex size-12 items-center justify-center rounded-full"
              style={{
                backgroundColor: accent || "var(--conversation-accent)",
                color: accent ? readableInkOn(accent) : "var(--conversation-accent-ink)",
              }}
            >
              <Headset className="size-6" aria-hidden />
            </span>
            <div className="max-w-[17.5rem]">
              <p className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                We&apos;re here to help
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {context.blurb}
              </p>
            </div>
            <div className="flex w-full max-w-[17.5rem] flex-col gap-2 text-left">
              <label className="space-y-1">
                <span className="px-0.5 text-xs font-medium text-muted-foreground">Your name</span>
                <input
                  value={introName}
                  onChange={(e) => setIntroName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") beginIntro();
                  }}
                  placeholder="e.g. Wanjiru"
                  aria-label="Your name"
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <label className="space-y-1">
                <span className="px-0.5 text-xs font-medium text-muted-foreground">Phone number</span>
                <input
                  value={introPhone}
                  onChange={(e) => setIntroPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") beginIntro();
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712 345 678"
                  aria-label="Phone number"
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </label>
              {introError ? (
                <p className="px-0.5 text-[11px] text-destructive">{introError}</p>
              ) : null}
              <button
                type="button"
                onClick={beginIntro}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-[opacity,transform] hover:opacity-95 active:scale-[0.99]"
                style={{
                  backgroundColor: accent || "var(--conversation-accent)",
                  color: accent ? readableInkOn(accent) : "var(--conversation-accent-ink)",
                }}
              >
                Start chatting
              </button>
            </div>
            <p className="max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
              No account needed. We keep this chat on this device so you can pick it up where you left off.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ChatThreadSurface>
            <div
              ref={scrollRef}
              onScroll={onScroll}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Conversation messages"
              className="support-chat-scroll h-full space-y-2.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4"
            >
              {loading ? (
                <ChatThreadSkeleton />
              ) : loadError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadThread()}
                    className="rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    Try again
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
                  <div className="max-w-[16rem]">
                    <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                      Say hello to {context.teamName}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      Pick a prompt or write your own — we&apos;ll pick it up from here.
                    </p>
                  </div>
                  <div className="flex max-w-[20rem] flex-wrap items-center justify-center gap-2">
                    {context.quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void send(prompt)}
                        className="rounded-full border border-border/70 bg-card/90 px-3.5 py-2 text-left text-xs leading-snug text-foreground/80 shadow-sm transition-[border-color,background-color,transform] hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground active:scale-[0.98]"
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
                    const newDay =
                      !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                    const cluster = getMessageCluster(messages, index, isMine);
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
                            onReply={(target) => setReplyTo(toReplyTarget(target))}
                            onScrollToMessage={scrollToMessage}
                            onRetry={message.failed ? () => retry(message) : undefined}
                            staffActions={false}
                          />
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
                className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-card/95 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-colors hover:bg-card"
              >
                <ArrowDown className="size-3.5" aria-hidden />
                Latest
              </button>
            ) : null}
          </ChatThreadSurface>
          <div className="min-w-0 shrink-0 overflow-hidden border-t border-border/50 bg-background">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={(payload) => void send(payload)}
              disabled={Boolean(loadError)}
              sending={sending}
              accentHex={accent}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
            />
            {resolved ? (
              <p className="-mt-1 pb-2.5 text-center text-[11px] text-muted-foreground">
                Resolved — a new message will reopen this conversation.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  RotateCw,
  Search,
} from "lucide-react";

import {
  Avatar,
  ChatEmptyState,
  ChatMessageShape,
  Composer,
  type ComposerSendPayload,
  DayDivider,
  LiveStatusPill,
  MessageBubble,
  ResolvedBanner,
  TypingBubble,
  chatDayLabel,
  listTime,
  mergeByTimestamp,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import {
  getSuperAdminRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeFrame,
} from "@/lib/realtime";
import { uploadSupportAttachmentToCloudinary } from "@/lib/support-attachments";
import {
  type SaSupportConversation,
  type SaSupportMessage,
  type SaSupportPresence,
  fetchSaSupportConversation,
  fetchSaSupportConversations,
  fetchSaSupportPresence,
  getSaCloudinarySignature,
  markSaSupportConversationRead,
  reopenSaSupportConversation,
  resolveSaSupportConversation,
  sendSaSupportMessage,
} from "@/lib/super-admin-api";
import { APP_ROUTES } from "@/lib/config";
import { playSupportMessageSound, unlockSupportAudio } from "@/lib/support-sound";
import { cn } from "@/lib/utils";

type Filter = "OPEN" | "RESOLVED" | "ALL";
type InboxTab = "TENANT" | "VISITOR";
type MobileView = "list" | "chat";

function toLocalMessage(message: SaSupportMessage): ChatMessageShape {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    attachment: message.attachment ?? null,
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

/** Human "last seen" label for an offline tenant, or null when unknown. */
function lastSeenLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

/** Live presence dot + label for a tenant row in the inbox list. */
function PresenceLine({ presence }: { presence: SaSupportPresence | undefined }) {
  if (presence?.online) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        Online
      </p>
    );
  }
  const lastSeen = lastSeenLabel(presence?.lastSeenAt);
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      {lastSeen ? `Last seen ${lastSeen}` : "Offline"}
    </p>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" },
];

export function SaSupportInbox() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkId = searchParams.get("c")?.trim() || null;

  const [tab, setTab] = React.useState<InboxTab>("TENANT");
  const [filter, setFilter] = React.useState<Filter>(deepLinkId ? "ALL" : "OPEN");
  const [search, setSearch] = React.useState("");
  const [conversations, setConversations] = React.useState<SaSupportConversation[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");

  const [activeId, setActiveId] = React.useState<string | null>(deepLinkId);
  const [detail, setDetail] = React.useState<SaSupportConversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageShape[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [typingByConv, setTypingByConv] = React.useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = React.useState<MobileView>(deepLinkId ? "chat" : "list");
  const [showJump, setShowJump] = React.useState(false);
  const [presence, setPresence] = React.useState<Record<string, SaSupportPresence>>({});
  const [onlineOnly, setOnlineOnly] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const typingStopRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const deepLinkHandledRef = React.useRef<string | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeId) ?? (detail ? { ...detail } : null) ?? null;

  // ── List ────────────────────────────────────────────────────────────────
  const loadList = React.useCallback(
    async (silent = false) => {
      if (!silent) setListLoading(true);
      try {
        const [payload, presencePayload] = await Promise.all([
          fetchSaSupportConversations({ status: filter, type: tab }),
          fetchSaSupportPresence().catch(() => null),
        ]);
        setConversations(payload.conversations);
        if (presencePayload) {
          setPresence((prev) => ({ ...prev, ...presencePayload.presence, ...presencePayload.guestPresence }));
        }
        setListError("");
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Could not load conversations.");
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [filter, tab],
  );

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  // ── Select conversation ─────────────────────────────────────────────────
  const openConversation = React.useCallback(async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setDetailLoading(true);
    setTypingByConv((prev) => ({ ...prev, [id]: false }));
    try {
      const fetched = await fetchSaSupportConversation(id); // marks read server-side
      setDetail(fetched.conversation);
      for (const message of fetched.messages ?? []) {
        seenIdsRef.current.add(message.id);
      }
      setMessages((fetched.messages ?? []).map(toLocalMessage));
      setConversations((prev) => {
        const mapped = prev.map((c) =>
          c.id === id
            ? { ...(fetched.conversation ?? c), unreadCount: 0 }
            : c,
        );
        if (fetched.conversation && !prev.some((c) => c.id === id)) {
          return [{ ...fetched.conversation, unreadCount: 0 }, ...mapped];
        }
        return mapped;
      });
      // Receipts: our GET marked peer messages (tenant or visitor) as read.
      setMessages((prev) =>
        prev.map((m) =>
          (m.senderType === "TENANT" || m.senderType === "GUEST") && !m.readAt
            ? { ...m, readAt: new Date().toISOString() }
            : m,
        ),
      );
    } catch {
      // keep list usable
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Deep-link from a tenant business page: /super-admin/support?c=<conversationId>
  React.useEffect(() => {
    if (!deepLinkId || deepLinkHandledRef.current === deepLinkId) return;
    deepLinkHandledRef.current = deepLinkId;
    setTab("TENANT");
    setFilter("ALL");
    void openConversation(deepLinkId);
    router.replace(APP_ROUTES.superAdminSupport, { scroll: false });
  }, [deepLinkId, openConversation, router]);

  // ── Realtime (super-admin client) ───────────────────────────────────────
  React.useEffect(() => {
    // Unlock WebAudio on the first interaction so reply chimes are audible.
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const client = getSuperAdminRealtimeClient();
    const unregister = client.registerListener("sa-support", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const conversationType = String(data.conversationType ?? "");
        // Storefront buyer chats belong to the tenant staff inbox — ignore them here.
        if (conversationType === "STOREFRONT") return;

        const messageId = String(data.messageId ?? "");
        const convId = String(data.conversationId ?? "");
        if (!messageId || !convId || seenIdsRef.current.has(messageId)) return;
        seenIdsRef.current.add(messageId);

        const incoming: ChatMessageShape = {
          id: messageId,
          conversationId: convId,
          senderType: String(data.senderType ?? "TENANT") as ChatMessageShape["senderType"],
          senderUserId: String(data.senderUserId ?? ""),
          senderName: String(data.senderName ?? "") || null,
          body: String(data.body ?? ""),
          attachment: attachmentFromRealtime(data),
          readAt: null,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
        };

        const isActive = convId === activeId;
        // Soft chime for every incoming tenant/visitor message — whether the agent is
        // staring at this thread, skimming the list, or has the tab in the background.
        const isStaffMatter =
          incoming.senderType === "TENANT" ||
          (incoming.senderType === "GUEST" && conversationType === "VISITOR");
        if (isStaffMatter) {
          playSupportMessageSound();
        }
        if (isActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          // We're looking at it — read tenant + visitor messages instantly.
          if (incoming.senderType === "TENANT" || incoming.senderType === "GUEST") {
            const peerType = incoming.senderType;
            setMessages((prev) =>
              prev.map((m) =>
                m.senderType === peerType && !m.readAt
                  ? { ...m, readAt: new Date().toISOString() }
                  : m,
              ),
            );
            void markSaSupportConversationRead(convId).catch(() => {});
          }
        }

        setConversations((prev) => {
          const row = prev.find((c) => c.id === convId);
          if (!row) return prev;
          // Only bump unread for peers this inbox actually staffs.
          const countsAsUnread =
            !isActive &&
            incoming.senderType !== "SUPER_ADMIN" &&
            (incoming.senderType === "TENANT" ||
              (incoming.senderType === "GUEST" && conversationType === "VISITOR"));
          return [
            {
              ...row,
              lastMessageAt: incoming.createdAt,
              lastMessagePreview: incoming.body,
              unreadCount: countsAsUnread ? row.unreadCount + 1 : row.unreadCount,
            },
            ...prev.filter((c) => c.id !== convId),
          ].sort(byLatest);
        });
      },
      onSupportRead: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (convId !== activeId) return;
        const reader = String(data.readerType ?? "");
        if (reader === "TENANT" || reader === "GUEST") {
          // Tenant/visitor read our replies — flip our sent ticks to ✓✓.
          setMessages((prev) =>
            prev.map((m) =>
              m.senderType === "SUPER_ADMIN" && !m.readAt
                ? { ...m, readAt: new Date().toISOString() }
                : m,
            ),
          );
        }
      },
      onSupportTyping: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        const fromAdmin = data.fromAdmin === true;
        if (!convId || fromAdmin) return; // we only care about tenants typing
        setTypingByConv((prev) => ({ ...prev, [convId]: data.typing === true }));
        if (typingStopRef.current[convId]) clearTimeout(typingStopRef.current[convId]);
        if (data.typing === true) {
          typingStopRef.current[convId] = setTimeout(() => {
            setTypingByConv((prev) => ({ ...prev, [convId]: false }));
          }, 4000);
        }
      },
      onSupportConversation: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        const status = String(data.status ?? "");
        if (!convId || !status) return;
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status } : c)));
        if (convId === activeId) {
          setDetail((prev) => (prev ? { ...prev, status } : prev));
        }
      },
      onSupportPresence: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const businessId = String(data.businessId ?? "");
        if (!businessId) return;
        setPresence((prev) => ({
          ...prev,
          [businessId]: {
            online: data.online === true,
            lastSeenAt: data.lastSeenAt ? String(data.lastSeenAt) : null,
          },
        }));
      },
      onConnectionStateChange: (state) => setConnectionState(state),
    });

    const connectTimer = window.setTimeout(() => {
      client.connect().catch(() => {
        // inbox polling below keeps the list fresh
      });
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      unregister();
      // The console shell owns the socket lifecycle — don't disconnect here,
      // or the sidebar unread badge would lose its live updates.
      for (const timer of Object.values(typingStopRef.current)) {
        clearTimeout(timer);
      }
      typingStopRef.current = {};
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [activeId]);

  // Fast background sync keeps the inbox live even when the socket is down.
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(true);
      if (activeId) {
        fetchSaSupportConversation(activeId)
          .then((fetched) => {
            setDetail(fetched.conversation);
            setMessages((prev) => mergeByTimestamp(prev, (fetched.messages ?? []).map(toLocalMessage)));
          })
          .catch(() => {});
      }
    }, 5000);
    const onVisible = () => {
      if (document.hidden) return;
      void loadList(true);
      if (activeId) {
        fetchSaSupportConversation(activeId)
          .then((fetched) => {
            setDetail(fetched.conversation);
            setMessages((prev) => mergeByTimestamp(prev, (fetched.messages ?? []).map(toLocalMessage)));
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, loadList]);

  // ── Derived (declared early so effects can read them) ───────────────────
  const theirTyping = typingByConv[activeId ?? ""] === true;
  const resolved = (detail?.status ?? activeConversation?.status) === "RESOLVED";
  const activeTyping = typingByConv[activeId ?? ""];

  // ── Scroll ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, activeTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stickToBottomRef.current) setShowJump(false);
    else setShowJump(true);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
    setShowJump(false);
  };

  // ── Reply / status ──────────────────────────────────────────────────────
  const send = React.useCallback(
    async (payload: ComposerSendPayload | string) => {
      if (!activeId || sending) return;
      const body = typeof payload === "string" ? payload.trim() : payload.body.trim();
      const file = typeof payload === "string" ? null : payload.file ?? null;
      const existingAttachment =
        typeof payload === "string" ? null : payload.attachment ?? null;
      if (!body && !file && !existingAttachment) return;
      setSending(true);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const localPreviewUrl =
        file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      const optimistic: ChatMessageShape = {
        id: tempId,
        conversationId: activeId,
        senderType: "SUPER_ADMIN",
        senderUserId: "platform",
        senderName: "Kiosk Team",
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
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        let attachment = existingAttachment;
        if (file) {
          attachment = await uploadSupportAttachmentToCloudinary(
            activeId,
            file,
            (folder) => getSaCloudinarySignature(folder, "auto"),
          );
        }
        const saved = await sendSaSupportMessage(activeId, body, attachment);
        seenIdsRef.current.add(saved.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? toLocalMessage(saved) : m));
        });
        setConversations((prev) =>
          prev
            .map((c) =>
              c.id === activeId
                ? {
                    ...c,
                    lastMessageAt: saved.createdAt,
                    lastMessagePreview:
                      saved.body?.trim() ||
                      (saved.attachment?.fileName
                        ? `📎 ${saved.attachment.fileName}`
                        : saved.body),
                  }
                : c,
            )
            .sort(byLatest),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
      } finally {
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setSending(false);
      }
    },
    [activeId, sending],
  );

  const retry = (message: ChatMessageShape) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    void send({
      body: message.body,
      attachment:
        message.attachment?.url && message.attachment.url !== "#"
          ? message.attachment
          : null,
    });
  };

  const toggleStatus = async () => {
    if (!activeId || statusBusy) return;
    setStatusBusy(true);
    try {
      const current = detail?.status ?? activeConversation?.status ?? "OPEN";
      const target = current === "OPEN" ? "RESOLVED" : "OPEN";
      if (target === "RESOLVED") await resolveSaSupportConversation(activeId);
      else await reopenSaSupportConversation(activeId);
      setDetail((prev) => (prev ? { ...prev, status: target } : prev));
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, status: target } : c)));
    } finally {
      setStatusBusy(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const normalizedSearch = search.trim().toLowerCase();
  const presenceKey = (c: SaSupportConversation) =>
    c.conversationType === "VISITOR" ? c.guestId ?? c.id : c.businessId;
  const displayName = (c: SaSupportConversation) =>
    c.businessName?.trim() || (c.conversationType === "VISITOR" ? "Visitor" : "Tenant");
  const onlineCount = conversations.filter((c) => presence[presenceKey(c)]?.online === true).length;
  const tabUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  const tenantPresence = activeConversation ? presence[presenceKey(activeConversation)] : undefined;
  const tenantLastSeen = tenantPresence ? lastSeenLabel(tenantPresence.lastSeenAt) : null;
  const visible = conversations.filter((c) => {
    if (onlineOnly && presence[presenceKey(c)]?.online !== true) return false;
    if (normalizedSearch) {
      const haystack = [c.businessName, c.guestName, c.subject, c.createdByName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const listPane = (
    <div className="flex min-h-0 w-full flex-col bg-background md:w-[19.5rem] md:shrink-0 md:border-r md:border-border/50">
      <div className="border-b border-border/50 bg-[linear-gradient(180deg,rgba(40,167,69,0.05),transparent)] p-3">
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          {(["TENANT", "VISITOR"] as InboxTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-semibold tracking-wide transition-colors",
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "TENANT" ? "Tenants" : "Visitors"}
            </button>
          ))}
        </div>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "VISITOR" ? "Search visitors…" : "Search tenants…"}
            className="h-10 w-full rounded-xl border border-border/70 bg-background/90 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="mt-2 flex items-center gap-1">
          {FILTERS.map((f) => {
            const count =
              f.key === "ALL"
                ? conversations.length
                : conversations.filter((c) => c.status === f.key).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("text-[10px]", filter === f.key ? "text-primary/80" : "text-muted-foreground/60")}>
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOnlineOnly((v) => !v)}
            aria-pressed={onlineOnly}
            title="Show only tenants that are online right now"
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
              onlineOnly
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", onlineOnly ? "bg-emerald-500" : "bg-muted-foreground/40")} />
            Online
            <span className={cn("text-[10px]", onlineOnly ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-muted-foreground/60")}>
              {onlineCount}
            </span>
          </button>
        </div>
        {tabUnread > 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {tabUnread > 9 ? "9+" : tabUnread}
            </span>
            unread across {tab === "VISITOR" ? "visitors" : "tenants"}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {listLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading conversations…
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{listError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadList()}>
              <RotateCw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="size-6 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {search
                ? `No ${tab === "VISITOR" ? "visitors" : "tenants"} match your search.`
                : onlineOnly
                  ? "No one online right now."
                  : tab === "VISITOR"
                    ? "No visitor conversations yet."
                    : "No conversations here yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-1.5">
            {visible.map((conversation) => {
              const isActive = conversation.id === activeId;
              const isResolved = conversation.status === "RESOLVED";
              const unread = conversation.unreadCount ?? 0;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-primary/[0.09] ring-1 ring-primary/15"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={displayName(conversation)}
                        seed={conversation.guestId ?? conversation.businessId}
                        className="size-10"
                      />
                      {isResolved ? (
                        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-card">
                          <CheckCircle2 className="size-3 text-emerald-500" aria-hidden />
                        </span>
                      ) : unread > 0 ? (
                        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="flex min-w-0 items-baseline gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              isResolved ? "text-muted-foreground" : "font-semibold text-foreground",
                            )}
                          >
                            {displayName(conversation)}
                          </span>
                          {conversation.guestPhone ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground/70">
                              · {conversation.guestPhone}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                              conversation.conversationType === "VISITOR"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {conversation.conversationType === "VISITOR" ? "Visitor" : "Tenant"}
                          </span>
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {listTime(conversation.lastMessageAt ?? conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        {theirTyping && conversation.id === activeId ? (
                          <span className="font-medium text-primary">typing…</span>
                        ) : conversation.lastMessagePreview ? (
                          <>
                            {conversation.lastMessageAt && (
                              <span className="font-medium text-foreground/60">
                                {conversation.lastMessagePreview.length > 60
                                  ? `${conversation.lastMessagePreview.slice(0, 60)}…`
                                  : conversation.lastMessagePreview}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="italic">No messages yet</span>
                        )}
                      </p>
                      <PresenceLine presence={presence[presenceKey(conversation)]} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const chatPane = activeConversation ? (
    <section
      className="relative flex h-full min-h-0 flex-col overflow-hidden border-border/50 bg-background md:border-l-0 md:rounded-none"
      aria-label={`Support chat with ${displayName(activeConversation)}`}
    >
      <header className="flex items-center gap-3 border-b border-border/50 bg-[linear-gradient(135deg,rgba(40,167,69,0.07)_0%,transparent_62%)] px-3 py-3.5 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Back to conversations"
          onClick={() => {
            setMobileView("list");
            setActiveId(null);
          }}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Avatar
          name={displayName(activeConversation)}
          seed={activeConversation.guestId ?? activeConversation.businessId}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate">{displayName(activeConversation)}</span>
            {activeConversation.guestPhone ? (
              <span className="shrink-0 text-[10px] font-normal text-muted-foreground/70">
                · {activeConversation.guestPhone}
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {theirTyping ? (
              "typing…"
            ) : resolved ? (
              "Resolved"
            ) : tenantPresence?.online ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Online now
              </span>
            ) : tenantLastSeen ? (
              `Last seen ${tenantLastSeen}`
            ) : tenantPresence ? (
              "Offline"
            ) : (
              "Open conversation"
            )}
          </p>
        </div>
        <div className="hidden sm:block">
          <LiveStatusPill state={connectionState} />
        </div>
        <div className="hidden sm:block">
          <ResolvedBanner resolved={resolved} onReopen={toggleStatus} busy={statusBusy} />
        </div>
      </header>

      {activeConversation ? (
        <div className="sm:hidden">
          <ResolvedBanner resolved={resolved} onReopen={toggleStatus} busy={statusBusy} />
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 bg-muted/20">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-3 py-4 sm:px-5">
          {detailLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-foreground">
                {resolved ? "This conversation is resolved" : "Nothing here yet"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {resolved
                  ? "Reopen it to message the tenant again."
                  : "Say hi and let the tenant know you're on it — they'll get it live."}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const mine = message.senderType === "SUPER_ADMIN";
                const prev = messages[index - 1];
                const newDay = !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                const showAvatar =
                  !mine && (!prev || prev.senderUserId !== message.senderUserId || newDay);
                return (
                  <React.Fragment key={message.id}>
                    {newDay ? <DayDivider iso={message.createdAt} /> : null}
                    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
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
              {theirTyping ? <TypingBubble label="Tenant is typing" /> : null}
              <div className="h-2" aria-hidden />
            </>
          )}
        </div>

        {showJump ? (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg transition-transform hover:scale-105"
          >
            <ArrowDown className="size-3.5" />
            New messages
          </button>
        ) : null}
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSend={(payload) => void send(payload)}
        disabled={resolved}
        disabledHint={resolved ? "Reopen the conversation to reply" : undefined}
        sending={sending}
      />
    </section>
  ) : (
    <div className="hidden min-h-0 flex-1 md:flex">
      <ChatEmptyState
        icon={<Inbox className="size-5 text-muted-foreground" aria-hidden />}
        title="Select a conversation"
        body="Pick a tenant on the left to read their thread and reply live."
      />
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:flex-row">
      <div className={cn("min-h-0 flex-1 md:flex", mobileView === "chat" && "hidden")}>{listPane}</div>
      <div className={cn("min-h-0 flex-1", mobileView === "list" && "hidden md:block")}>{chatPane}</div>
    </div>
  );
}

function byLatest(a: SaSupportConversation, b: SaSupportConversation): number {
  const at = (c: SaSupportConversation) =>
    new Date(c.lastMessageAt ?? c.updatedAt ?? c.createdAt).getTime() || 0;
  return at(b) - at(a);
}

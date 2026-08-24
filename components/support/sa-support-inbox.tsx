"use client";

import * as React from "react";
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
  DayDivider,
  LiveStatusPill,
  MessageBubble,
  ResolvedBanner,
  TypingBubble,
  chatDayLabel,
  listTime,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import {
  getSuperAdminRealtimeClient,
  type RealtimeConnectionState,
  type RealtimeFrame,
} from "@/lib/realtime";
import {
  type SaSupportConversation,
  type SaSupportMessage,
  fetchSaSupportConversation,
  fetchSaSupportConversations,
  markSaSupportConversationRead,
  reopenSaSupportConversation,
  resolveSaSupportConversation,
  sendSaSupportMessage,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

type Filter = "OPEN" | "RESOLVED" | "ALL";
type MobileView = "list" | "chat";

function toLocalMessage(message: SaSupportMessage): ChatMessageShape {
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

const FILTERS: { key: Filter; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" },
];

export function SaSupportInbox() {
  const [filter, setFilter] = React.useState<Filter>("OPEN");
  const [search, setSearch] = React.useState("");
  const [conversations, setConversations] = React.useState<SaSupportConversation[]>([]);
  const [totalUnread, setTotalUnread] = React.useState(0);
  const [listLoading, setListLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<SaSupportConversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageShape[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [typingByConv, setTypingByConv] = React.useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = React.useState<MobileView>("list");
  const [showJump, setShowJump] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const typingStopRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeConversation =
    conversations.find((c) => c.id === activeId) ?? (detail ? { ...detail } : null) ?? null;

  // ── List ────────────────────────────────────────────────────────────────
  const loadList = React.useCallback(
    async (silent = false) => {
      if (!silent) setListLoading(true);
      try {
        const payload = await fetchSaSupportConversations({ status: filter });
        setConversations(payload.conversations);
        setTotalUnread(payload.unread);
        setListError("");
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Could not load conversations.");
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [filter],
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
      const previousUnread =
        conversations.find((c) => c.id === id)?.unreadCount ?? 0;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...(fetched.conversation ?? c), unreadCount: 0 }
            : c,
        ),
      );
      if (previousUnread > 0) {
        setTotalUnread((n) => Math.max(0, n - previousUnread));
      }
      // Receipts: our GET marked the tenant's messages as read.
      setMessages((prev) =>
        prev.map((m) =>
          m.senderType === "TENANT" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
        ),
      );
    } catch {
      // keep list usable
    } finally {
      setDetailLoading(false);
    }
  }, [conversations]);

  // ── Realtime (super-admin client) ───────────────────────────────────────
  React.useEffect(() => {
    const client = getSuperAdminRealtimeClient();
    const unregister = client.registerListener("sa-support", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
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
          readAt: null,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
        };

        const isActive = convId === activeId;
        if (isActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          // We're looking at it — read it instantly.
          if (incoming.senderType === "TENANT") {
            setMessages((prev) =>
              prev.map((m) =>
                m.senderType === "TENANT" && !m.readAt
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
          return [
            {
              ...row,
              lastMessageAt: incoming.createdAt,
              lastMessagePreview: incoming.body,
              unreadCount:
                isActive || incoming.senderType === "SUPER_ADMIN"
                  ? row.unreadCount
                  : row.unreadCount + 1,
            },
            ...prev.filter((c) => c.id !== convId),
          ].sort(byLatest);
        });
        if (!isActive && incoming.senderType === "TENANT") {
          setTotalUnread((n) => n + 1);
        }
      },
      onSupportRead: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const convId = String(data.conversationId ?? "");
        if (convId !== activeId) return;
        if (String(data.readerType ?? "") === "TENANT") {
          // Tenant read our replies — flip our sent ticks to ✓✓.
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
      client.disconnect();
      for (const timer of Object.values(typingStopRef.current)) {
        clearTimeout(timer);
      }
      typingStopRef.current = {};
    };
  }, [activeId]);

  // REST fallback polling while the socket is down.
  React.useEffect(() => {
    if (connectionState === "connected") return;
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
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [connectionState, activeId, loadList]);

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
    async (text: string) => {
      if (!activeId || sending) return;
      const body = text.trim();
      if (!body) return;
      setSending(true);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}`;
      const optimistic: ChatMessageShape = {
        id: tempId,
        conversationId: activeId,
        senderType: "SUPER_ADMIN",
        senderUserId: "platform",
        senderName: "Kiosk Team",
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const saved = await sendSaSupportMessage(activeId, body);
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
              c.id === activeId ? { ...c, lastMessageAt: saved.createdAt, lastMessagePreview: saved.body } : c,
            )
            .sort(byLatest),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [activeId, sending],
  );

  const retry = (message: ChatMessageShape) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    void send(message.body);
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
  const visible = conversations.filter((c) => {
    if (normalizedSearch) {
      const haystack = [c.businessName, c.subject, c.createdByName].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const listPane = (
    <div className="flex min-h-0 w-full flex-col md:w-80 md:shrink-0 md:border-r md:border-border/60">
      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants…"
            className="h-9 w-full rounded-lg border border-border/70 bg-muted/40 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/20"
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
        </div>
        {totalUnread > 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
            unread across tenants
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
              {search ? "No tenants match your search." : "No conversations here yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
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
                      "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors",
                      isActive ? "bg-primary/8" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={conversation.businessName ?? "Tenant"}
                        seed={conversation.businessId}
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
                        <p
                          className={cn(
                            "truncate text-sm",
                            isResolved ? "text-muted-foreground" : "font-semibold text-foreground",
                          )}
                        >
                          {conversation.businessName ?? "Tenant"}
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
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:rounded-l-none"
      aria-label={`Support chat with ${activeConversation.businessName ?? "tenant"}`}
    >
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/60 px-3 py-3 backdrop-blur sm:px-4">
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
          name={activeConversation.businessName ?? "Tenant"}
          seed={activeConversation.businessId}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {activeConversation.businessName ?? "Tenant"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {theirTyping ? "typing…" : resolved ? "Resolved" : "Open conversation"}
          </p>
        </div>
        <LiveStatusPill state={connectionState} />
        <ResolvedBanner resolved={resolved} onReopen={toggleStatus} busy={statusBusy} />
      </header>

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
        onSend={(text) => void send(text)}
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
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:flex-row">
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

/** Merge server-fresh messages into local state, preserving optimistic rows. */
function mergeByTimestamp(local: ChatMessageShape[], server: ChatMessageShape[]): ChatMessageShape[] {
  const serverIds = new Set(server.map((m) => m.id));
  const localsKept = local.filter((m) => m.pending === true || m.failed === true || !serverIds.has(m.id));
  const merged = [...localsKept, ...server].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const seen = new Set<string>();
  return merged.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

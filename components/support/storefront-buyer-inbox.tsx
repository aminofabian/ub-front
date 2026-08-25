"use client";

import * as React from "react";
import { ArrowDown, Inbox, RotateCw, Search, ShoppingBag } from "lucide-react";

import {
  type ChatMessageShape,
  Avatar,
  Composer,
  DayDivider,
  LiveStatusPill,
  MessageBubble,
  TypingBubble,
  chatDayLabel,
  listTime,
  mergeByTimestamp,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import { getRealtimeClient, type RealtimeConnectionState, type RealtimeFrame } from "@/lib/realtime";
import {
  type StorefrontBuyerConversation,
  fetchStorefrontBuyerConversation,
  fetchStorefrontBuyerConversations,
  markStorefrontBuyerConversationRead,
  sendStorefrontBuyerReply,
} from "@/lib/support-api";
import { setSupportConversationFocused } from "@/lib/support-focus";
import { unlockSupportAudio } from "@/lib/support-sound";
import { cn } from "@/lib/utils";

type LocalMessage = ChatMessageShape;
type Filter = "OPEN" | "ALL";
type MobileView = "list" | "chat";

function toLocalMessage(message: {
  id: string;
  conversationId: string;
  senderType: string;
  senderUserId: string;
  senderName: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}): LocalMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType as LocalMessage["senderType"],
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

const TYPING_STOP_MS = 4000;

/**
 * Storefront buyer chats for one tenant — anonymous shoppers who started a
 * conversation on the public storefront get answered here, live.
 */
export function StorefrontBuyerInbox() {
  const [filter, setFilter] = React.useState<Filter>("OPEN");
  const [search, setSearch] = React.useState("");
  const [conversations, setConversations] = React.useState<StorefrontBuyerConversation[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<LocalMessage[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<RealtimeConnectionState>("disconnected");
  const [typingByConv, setTypingByConv] = React.useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = React.useState<MobileView>("list");
  const [showJump, setShowJump] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const typingStopRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Mark the open buyer thread focused so shell toasts/unread skip while viewing.
  React.useEffect(() => {
    if (!activeId) return;
    setSupportConversationFocused(activeId, true);
    return () => setSupportConversationFocused(activeId, false);
  }, [activeId]);

  const loadList = React.useCallback(
    async (silent = false) => {
      if (!silent) setListLoading(true);
      try {
        const payload = await fetchStorefrontBuyerConversations({ status: filter });
        setConversations(payload.conversations);
        setListError("");
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Could not load buyer chats.");
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [filter],
  );

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  const openConversation = React.useCallback(async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setDetailLoading(true);
    try {
      const fetched = await fetchStorefrontBuyerConversation(id); // marks read server-side
      for (const message of fetched.messages ?? []) {
        seenIdsRef.current.add(message.id);
      }
      setMessages((fetched.messages ?? []).map(toLocalMessage));
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
      setMessages((prev) =>
        prev.map((m) => (m.senderType === "GUEST" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)),
      );
    } catch {
      // keep the list usable
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Realtime (tenant client, channel "support") ─────────────────────────
  React.useEffect(() => {
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const client = getRealtimeClient();
    const unregister = client.registerListener("tenant-storefront-support", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const messageId = String(data.messageId ?? "");
        const convId = String(data.conversationId ?? "");
        const conversationType = String(data.conversationType ?? "TENANT");
        if (!messageId || !convId || conversationType !== "STOREFRONT") return;
        if (seenIdsRef.current.has(messageId)) return;
        seenIdsRef.current.add(messageId);

        const incoming: LocalMessage = {
          id: messageId,
          conversationId: convId,
          senderType: String(data.senderType ?? "GUEST") as LocalMessage["senderType"],
          senderUserId: String(data.senderUserId ?? ""),
          senderName: String(data.senderName ?? "") || null,
          body: String(data.body ?? ""),
          readAt: null,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
        };

        if (convId === activeId) {
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          if (incoming.senderType === "GUEST") {
            setMessages((prev) =>
              prev.map((m) => (m.senderType === "GUEST" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)),
            );
            void markStorefrontBuyerConversationRead(convId).catch(() => {});
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
                convId === activeId || incoming.senderType === "TENANT"
                  ? row.unreadCount
                  : row.unreadCount + 1,
            },
            ...prev.filter((c) => c.id !== convId),
          ].sort((a, b) =>
            new Date(b.lastMessageAt ?? b.updatedAt).getTime() -
            new Date(a.lastMessageAt ?? a.updatedAt).getTime(),
          );
        });
      },
      onSupportRead: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.conversationId ?? "") !== activeId) return;
        if (String(data.readerType ?? "") === "GUEST") {
          // The buyer read our reply — flip our ticks to ✓✓.
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
        if (data.fromAdmin === true) return; // ignore our own staff typing
        setTypingByConv((prev) => ({ ...prev, [convId]: data.typing === true }));
        if (typingStopRef.current[convId]) clearTimeout(typingStopRef.current[convId]);
        if (data.typing === true) {
          typingStopRef.current[convId] = setTimeout(() => {
            setTypingByConv((prev) => ({ ...prev, [convId]: false }));
          }, TYPING_STOP_MS);
        }
      },
      onConnectionStateChange: (state) => setConnectionState(state),
    });

    const connectTimer = window.setTimeout(() => {
      client.connect().catch(() => {});
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      unregister();
      for (const timer of Object.values(typingStopRef.current)) clearTimeout(timer);
      typingStopRef.current = {};
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [activeId]);

  // 5s background sync keeps the list fresh even when the socket is down.
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(true);
      if (activeId) {
        fetchStorefrontBuyerConversation(activeId)
          .then((fetched) =>
            setMessages((prev) => mergeByTimestamp(prev, (fetched.messages ?? []).map(toLocalMessage))),
          )
          .catch(() => {});
      }
    }, 5000);
    const onVisible = () => {
      if (!document.hidden) void loadList(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, loadList]);

  const theirTyping = typingByConv[activeId ?? ""] === true;

  // ── Scroll ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, theirTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
    if (nearBottom) setShowJump(false);
  };

  // ── Send ────────────────────────────────────────────────────────────────
  const send = React.useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || !activeId || sending) return;
      setSending(true);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tmp-${Date.now()}`;
      const optimistic: LocalMessage = {
        id: tempId,
        conversationId: activeId,
        senderType: "TENANT",
        senderUserId: "me",
        senderName: null,
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setDraft("");
      try {
        const saved = await sendStorefrontBuyerReply(activeId, body);
        seenIdsRef.current.add(saved.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? toLocalMessage(saved) : m));
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, lastMessageAt: saved.createdAt, lastMessagePreview: body, status: "OPEN" }
              : c,
          ),
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

  const normalizedSearch = search.trim().toLowerCase();
  const visible = conversations.filter((c) => {
    if (c.status === "RESOLVED" && filter === "OPEN") return false;
    if (normalizedSearch) {
      const haystack = [c.guestName, c.businessName, c.lastMessagePreview]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const listPane = (
    <div className="flex min-h-0 w-full flex-col md:w-72 md:shrink-0 md:border-r md:border-border/60">
      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyers…"
            className="h-9 w-full rounded-lg border border-border/70 bg-muted/40 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="mt-2 flex items-center gap-1">
          {(
            [
              { key: "OPEN", label: "Open" },
              { key: "ALL", label: "All" },
            ] as { key: Filter; label: string }[]
          ).map((f) => {
            const count = f.key === "ALL" ? conversations.length : conversations.filter((c) => c.status === "OPEN").length;
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
                <span className="text-[10px] text-muted-foreground/60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {listLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading buyer chats…
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
            <ShoppingBag className="size-6 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {search ? "No buyers match your search." : "No buyer chats here yet."}
            </p>
            <p className="max-w-52 text-xs text-muted-foreground/70">
              Shoppers on your storefront can start a chat with the floating support button.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {visible.map((conversation) => {
              const isActive = conversation.id === activeId;
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
                      <Avatar name={conversation.guestName ?? "Buyer"} seed={conversation.guestId ?? conversation.id} className="size-10" />
                      {unread > 0 ? (
                        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="flex min-w-0 items-baseline gap-1.5">
                          <span className={cn("truncate text-sm", conversation.status === "RESOLVED" ? "text-muted-foreground" : "font-semibold text-foreground")}>
                            {conversation.guestName ?? "Storefront buyer"}
                          </span>
                          {conversation.guestPhone ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground/70">
                              · {conversation.guestPhone}
                            </span>
                          ) : null}
                          <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                            Storefront
                          </span>
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {listTime(conversation.lastMessageAt ?? conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {conversation.lastMessagePreview ?? <span className="italic">No messages yet</span>}
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
      aria-label={`Chat with ${activeConversation.guestName ?? "buyer"}`}
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
          <ArrowDown className="size-5 rotate-90" />
        </Button>
        <Avatar name={activeConversation.guestName ?? "Buyer"} seed={activeConversation.guestId ?? activeConversation.id} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate">{activeConversation.guestName ?? "Storefront buyer"}</span>
            {activeConversation.guestPhone ? (
              <span className="shrink-0 text-[10px] font-normal text-muted-foreground/70">
                · {activeConversation.guestPhone}
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {theirTyping ? "typing…" : "Storefront chat"}
          </p>
        </div>
        <div className="hidden sm:block">
          <LiveStatusPill state={connectionState} />
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-muted/20">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-3 py-4 sm:px-5">
          {detailLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-foreground">Nothing here yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Say hi — the buyer will see it live on the storefront.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const mine = message.senderType === "TENANT";
                const prev = messages[index - 1];
                const newDay = !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                const showAvatar = !mine && (index === 0 || (prev?.senderType ?? "") === "TENANT");
                return (
                  <React.Fragment key={message.id}>
                    {newDay && index > 0 ? <DayDivider iso={message.createdAt} /> : null}
                    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
                      <MessageBubble message={message} mine={mine} showAvatar={showAvatar} />
                    </div>
                  </React.Fragment>
                );
              })}
              {theirTyping ? <TypingBubble label="Buyer is typing" /> : null}
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
            className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-md"
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="border-t border-border/60 p-3">
        <Composer value={draft} onChange={setDraft} onSend={(text) => void send(text)} disabled={sending} sending={sending} />
      </div>
    </section>
  ) : (
    <div className="hidden min-h-0 flex-1 md:flex">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Inbox className="size-6 text-muted-foreground/40" aria-hidden />
        <p className="mt-2 text-sm font-medium text-foreground">Select a buyer chat</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Answer shoppers who started a chat on your storefront.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:flex-row">
      <div className={cn("min-h-0 flex-1 md:flex", mobileView === "chat" && "hidden")}>{listPane}</div>
      <div className={cn("min-h-0 flex-1", mobileView === "list" && "hidden md:block")}>{chatPane}</div>
    </div>
  );
}

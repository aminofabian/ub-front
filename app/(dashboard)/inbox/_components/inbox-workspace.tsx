"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Banknote,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  Mic,
  Send,
  Sparkles,
  StickyNote,
  Tag,
  UserCheck,
  UserX,
  Video,
  Zap,
} from "lucide-react";

import {
  addCrmNote,
  assignCrmConversation,
  draftCrmAiReply,
  fetchCrmConversation,
  fetchCrmConversations,
  fetchCrmInboxStatus,
  fetchCrmNotes,
  fetchCrmQuickReplies,
  requestCrmPayment,
  sendCrmMessage,
  setCrmContactTags,
  type CrmConversationDetail,
  type CrmConversationRow,
  type CrmMessageRow,
  type CrmInboxStatus,
  type CrmNoteRow,
  type CrmQuickReplyRow,
} from "@/lib/crm";
import { MessageBody } from "@/components/conversations/message-body";
import { ConversationListSkeleton } from "@/components/conversations/conversation-row";
import {
  Avatar,
  ChatThreadSkeleton,
  DayDivider,
  chatDayLabel,
} from "@/components/support/support-chat-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { hasPermission, Permission } from "@/lib/permissions";
import { getSessionTokens } from "@/lib/auth";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type StatusFilter = "open" | "pending" | "closed" | "all";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(ms).toLocaleDateString();
}

function CrmMediaLabel({
  message,
  mine,
}: {
  message: CrmMessageRow;
  mine: boolean;
}) {
  const type = (message.type ?? "text").toLowerCase();
  const iconClass = "size-3.5";
  const labelClass = cn(
    "mb-1 flex items-center gap-1.5 text-[11px] font-medium",
    mine ? "text-primary-foreground/75" : "text-muted-foreground",
  );
  switch (type) {
    case "image":
      return (
        <span className={labelClass}>
          <ImageIcon className={iconClass} aria-hidden /> Photo
        </span>
      );
    case "audio":
      return (
        <span className={labelClass}>
          <Mic className={iconClass} aria-hidden /> Voice note
        </span>
      );
    case "video":
      return (
        <span className={labelClass}>
          <Video className={iconClass} aria-hidden /> Video
        </span>
      );
    case "document":
      return (
        <span className={labelClass}>
          <FileText className={iconClass} aria-hidden />
          {message.body?.trim() || "Document"}
        </span>
      );
    case "sticker":
      return (
        <span className={labelClass}>
          <ImageIcon className={iconClass} aria-hidden /> Sticker
        </span>
      );
    case "location":
      return (
        <span className={labelClass}>
          <MapPin className={iconClass} aria-hidden /> Location shared
        </span>
      );
    default:
      return null;
  }
}

function CrmMessageContent({
  message,
  mine,
}: {
  message: CrmMessageRow;
  mine: boolean;
}) {
  const type = (message.type ?? "text").toLowerCase();
  const mediaLabel =
    type !== "text" &&
    ["image", "audio", "video", "document", "sticker", "location"].includes(type);
  const showBody =
    Boolean(message.body?.trim()) &&
    (type === "text" || type === "image" || !mediaLabel);

  return (
    <>
      {mediaLabel ? <CrmMediaLabel message={message} mine={mine} /> : null}
      {showBody ? <MessageBody text={message.body ?? ""} /> : null}
      {!mediaLabel && !showBody ? (
        <p
          className={cn(
            "text-[12px] italic",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          Unsupported message
        </p>
      ) : null}
    </>
  );
}

export function InboxWorkspace() {
  const { me } = useDashboard();
  const couldDeepLink = useSearchParams();
  // Deep link from an order (`/inbox?phone=2547…`): open that customer's thread.
  const phoneParam = (couldDeepLink.get("phone") ?? "").trim();
  const canSend = hasPermission(me?.permissions, Permission.CrmInboxSend);
  const canManage = hasPermission(me?.permissions, Permission.CrmInboxManage);

  const [filter, setFilter] = useState<StatusFilter>(phoneParam ? "all" : "open");
  const [rows, setRows] = useState<CrmConversationRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState<CrmInboxStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState<CrmNoteRow[]>([]);
  const [quickReplies, setQuickReplies] = useState<CrmQuickReplyRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // Phone-only: show the list OR the thread, never both (the lg grid shows both).
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const listFilterRef = useRef(filter);
  listFilterRef.current = filter;

  const openConversation = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView("detail");
    stickToBottomRef.current = true;
  }, []);

  const loadList = useCallback(
    async (soft = false) => {
      if (!soft) setListLoading(true);
      try {
        const res = await fetchCrmConversations({
          status: filter === "all" ? undefined : filter,
          page: 0,
          size: 40,
        });
        setRows(res.items);
        setTotal(res.total);
        setPage(0);
        setListError(null);
      } catch (err) {
        if (!soft) {
          setListError(err instanceof Error ? err.message : "Could not load conversations");
        }
      } finally {
        if (!soft) setListLoading(false);
      }
    },
    [filter],
  );

  const loadMore = useCallback(async () => {
    if (listLoading || loadingMore) return;
    const requestFilter = filter;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchCrmConversations({
        status: requestFilter === "all" ? undefined : requestFilter,
        page: nextPage,
        size: 40,
      });
      if (listFilterRef.current !== requestFilter) return;
      setRows((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      // The API layer toasts; keep the rows already loaded.
    } finally {
      setLoadingMore(false);
    }
  }, [filter, page, listLoading, loadingMore]);

  const loadDetail = useCallback(async (id: string, soft = false) => {
    if (!soft) setDetailLoading(true);
    try {
      const [nextDetail, nextNotes] = await Promise.all([
        fetchCrmConversation(id),
        fetchCrmNotes(id).catch(() => [] as CrmNoteRow[]),
      ]);
      setDetail(nextDetail);
      setNotes(nextNotes);
      // Opening a thread marks it read server-side; clear the row badge now so
      // it does not look stuck until the next list refresh.
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, unreadCount: 0 } : row,
        ),
      );
      setTagDraft((nextDetail.conversation.contactTags ?? []).join(", "));
    } catch {
      if (!soft) setDetail(null);
    } finally {
      if (!soft) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Auto-select the conversation for a deep-linked phone once the list loads.
  useEffect(() => {
    if (!phoneParam || selectedId || rows.length === 0) return;
    const needle = phoneParam.replace(/\D/g, "").slice(-9);
    if (!needle) return;
    const match = rows.find((row) =>
      (row.contactPhone ?? "").replace(/\D/g, "").endsWith(needle),
    );
    if (match) openConversation(match.id);
  }, [phoneParam, rows, selectedId, openConversation]);

  useEffect(() => {
    let alive = true;
    void fetchCrmInboxStatus()
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void fetchCrmQuickReplies()
      .then(setQuickReplies)
      .catch(() => setQuickReplies([]));
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
      setNotes([]);
      setTagDraft("");
    }
    setPayNotice(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const el = threadScrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [detail?.messages, selectedId]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft]);

  // Live refresh on crm.* frames (mapped to onNotification in lib/realtime).
  useEffect(() => {
    if (!getSessionTokens()) return;
    const client = getRealtimeClient();
    const unregister = client.registerListener("crm-inbox", {
      channels: ["notifications"],
      onNotification: (frame) => {
        if (!frame.type.startsWith("crm.")) return;
        void loadList(true);
        const convId =
          typeof frame.data?.conversationId === "string" ? frame.data.conversationId : null;
        if (convId && convId === selectedRef.current) {
          void loadDetail(convId, true);
        }
      },
    });
    client.connect().catch(() => {});
    return unregister;
  }, [loadList, loadDetail]);

  const onSend = useCallback(async () => {
    const id = selectedId;
    const body = draft.trim();
    if (!id || !body || sending) return;
    setSending(true);
    try {
      await sendCrmMessage(id, body);
      setDraft("");
      await Promise.all([loadDetail(id, true), loadList(true)]);
    } catch {
      // api layer toasts
    } finally {
      setSending(false);
    }
  }, [selectedId, draft, sending, loadDetail, loadList]);

  const onAssign = useCallback(
    async (id: string, userId: string | null) => {
      if (!canManage) return;
      try {
        await assignCrmConversation(id, userId);
        await Promise.all([loadList(true), loadDetail(id, true)]);
      } catch {
        // api layer toasts
      }
    },
    [canManage, loadList, loadDetail],
  );

  const onAddNote = useCallback(async () => {
    const id = selectedId;
    const body = noteDraft.trim();
    if (!id || !body || !canManage) return;
    try {
      const created = await addCrmNote(id, body);
      setNotes((prev) => [...prev, created]);
      setNoteDraft("");
    } catch {
      // api layer toasts
    }
  }, [selectedId, noteDraft, canManage]);

  const onSaveTags = useCallback(async () => {
    const id = selectedId;
    if (!id || !canManage) return;
    const tags = tagDraft
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    try {
      await setCrmContactTags(id, tags);
      await Promise.all([loadDetail(id, true), loadList(true)]);
    } catch {
      // api layer toasts
    }
  }, [selectedId, tagDraft, canManage, loadDetail, loadList]);

  const onRequestPayment = useCallback(async () => {
    const id = selectedId;
    const amount = Number(payAmount);
    if (!id || !Number.isFinite(amount) || amount <= 0) {
      setPayNotice("Enter a valid amount.");
      return;
    }
    try {
      const res = await requestCrmPayment(id, amount);
      setPayNotice(
        res.accepted
          ? "Prompt sent — waiting for the customer to pay."
          : res.detail || "Could not send the prompt.",
      );
    } catch {
      setPayNotice("Could not send the prompt.");
    }
  }, [selectedId, payAmount]);

  const onAiDraft = useCallback(async () => {
    const id = selectedId;
    if (!id || aiBusy) return;
    setAiBusy(true);
    try {
      const res = await draftCrmAiReply(id);
      if (res.draft) {
        setDraft(res.draft);
      }
    } catch {
      // api layer toasts (e.g. SokoMind disabled)
    } finally {
      setAiBusy(false);
    }
  }, [selectedId, aiBusy]);

  const conversation = detail?.conversation ?? null;
  const contactTags = conversation?.contactTags ?? [];

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[440px] flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-[320px_1fr]">
      {/* List */}
      <aside
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card",
          mobileView === "detail" && "hidden lg:flex",
        )}
      >
        <div className="border-b border-border/60 p-2.5">
          <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-7 flex-1 rounded-full text-[11.5px] font-medium transition-all",
                  filter === f.key
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="support-chat-scroll flex-1 overflow-y-auto overscroll-contain">
          {listLoading ? (
            <ConversationListSkeleton />
          ) : listError ? (
            <p className="p-3 text-[13px] text-red-600">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-[13px] text-muted-foreground">
              {status && !status.hasActiveNumber
                ? "No WhatsApp number is connected to this shop yet. Add it under Business → Configuration → WhatsApp."
                : status && status.hasActiveNumber && !status.inboundEnabled
                  ? `Incoming messages are paused for ${status.whatsappNumber ?? "your number"}. Contact support to enable them.`
                  : "No conversations yet."}
            </p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openConversation(row.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                  row.id === selectedId
                    ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/10"
                    : "hover:bg-muted/45",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {row.contactName || row.contactPhone || "Unknown"}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatWhen(row.lastMessageAt)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] text-muted-foreground/85">
                    {row.lastMessageDirection === "outbound" ? "You: " : ""}
                    {row.lastMessagePreview || row.contactPhone || "No messages yet"}
                  </span>
                  {row.unreadCount > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {row.unreadCount > 9 ? "9+" : row.unreadCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          )}
          {!listLoading && !listError && rows.length < total ? (
            <div className="border-t p-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="w-full rounded-full border border-border/60 px-3 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load older (${rows.length} of ${total})`}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card",
          mobileView === "list" && "hidden lg:flex",
        )}
      >
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-[13px] text-muted-foreground">
            Select a conversation.
          </div>
        ) : (
          <>
            <header className="support-chat-header flex items-center gap-2.5 border-b border-[var(--conversation-rule)] px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                aria-label="Back to conversations"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              >
                <ChevronLeft className="size-5" />
              </button>
              <Avatar
                name={conversation?.contactName || conversation?.contactPhone || "Contact"}
                seed={selectedId ?? "crm"}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] support-ink">
                  {conversation?.contactName || conversation?.contactPhone || "Conversation"}
                </p>
                <p className="truncate text-[11.5px] support-muted">
                  {conversation?.contactPhone ?? "WhatsApp"}
                  {conversation?.assignedUserId ? " · Assigned" : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAssign(selectedId, me?.id ?? null)}
                    title="Assign to me"
                    aria-label="Assign this conversation to me"
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <UserCheck className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssign(selectedId, null)}
                    title="Unassign"
                    aria-label="Unassign this conversation"
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              ) : null}
            </header>

            {contactTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 border-b border-[var(--conversation-rule)] px-3 py-2">
                {contactTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--conversation-rule)] px-2 py-0.5 text-[10.5px] support-muted"
                  >
                    <Tag className="size-3" /> {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div
              ref={threadScrollRef}
              onScroll={() => {
                const el = threadScrollRef.current;
                if (!el) return;
                stickToBottomRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="support-chat-scroll flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4"
            >
              {detailLoading && !detail ? (
                <ChatThreadSkeleton />
              ) : (detail?.messages ?? []).length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                    <Inbox className="size-5" aria-hidden />
                  </span>
                  <p className="text-[15px] font-semibold support-ink">Nothing here yet</p>
                  <p className="mt-1 max-w-xs text-[13px] support-muted">
                    Say hi and the customer will see it on WhatsApp.
                  </p>
                </div>
              ) : (
                (detail?.messages ?? []).map((m, index) => {
                  const prev = detail?.messages[index - 1];
                  const newDay =
                    !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(m.createdAt);
                  const mine = m.direction === "outbound";
                  return (
                    <Fragment key={m.id}>
                      {newDay && index > 0 ? <DayDivider iso={m.createdAt} /> : null}
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl border px-3.5 py-2 text-[13.5px] leading-relaxed",
                          mine
                            ? "ml-auto border-transparent bg-[var(--conversation-accent)] text-[var(--conversation-accent-ink)]"
                            : "border-[var(--conversation-rule)] bg-[var(--conversation-panel)] text-[var(--conversation-ink)]",
                        )}
                      >
                        <CrmMessageContent message={m} mine={mine} />
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px] tabular-nums",
                            mine
                              ? "text-primary-foreground/65"
                              : "text-muted-foreground",
                          )}
                        >
                          {m.status ?? ""} {formatWhen(m.createdAt)}
                        </p>
                      </div>
                    </Fragment>
                  );
                })
              )}
            </div>


            {canSend ? (
              <div className="border-t border-[var(--conversation-rule)] p-2.5 pb-3 lg:pb-2.5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onAiDraft()}
                    disabled={aiBusy}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--conversation-rule)] px-3 text-[11.5px] transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {aiBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Draft with AI
                  </button>
                  <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
                  <input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="Amount (KES)"
                    className="h-8 w-28 rounded-full border border-[var(--conversation-rule)] bg-transparent px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => void onRequestPayment()}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--conversation-rule)] px-3 text-[11.5px] transition-colors hover:bg-muted"
                  >
                    <Banknote className="size-3.5" /> Request M-Pesa
                  </button>
                  {payNotice ? (
                    <span className="text-[11px] text-muted-foreground">{payNotice}</span>
                  ) : null}
                </div>

                {quickReplies.length > 0 ? (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {quickReplies.slice(0, 6).map((qr) => (
                      <button
                        key={qr.id}
                        type="button"
                        onClick={() => setDraft((prev) => (prev ? `${prev} ${qr.body}` : qr.body))}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--conversation-rule)] px-2 py-1 text-[10.5px] text-muted-foreground transition-colors hover:bg-muted"
                        title={qr.body}
                      >
                        <Zap className="size-3" /> {qr.shortcut}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-end gap-2 rounded-2xl border border-[var(--conversation-rule)] support-panel p-1.5">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                    rows={1}
                    placeholder="Write a reply…"
                    className="max-h-36 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={() => void onSend()}
                    aria-label="Send reply"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--conversation-accent)] text-[var(--conversation-accent-ink)] transition-transform active:scale-[0.96] disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {canManage ? (
              <div className="border-t p-2">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Tag className="size-3" /> Tags
                </p>
                <div className="mb-2 flex items-end gap-2">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onSaveTags();
                      }
                    }}
                    placeholder="Comma-separated, e.g. vip, wholesale"
                    className="h-8 flex-1 rounded-full border border-[var(--conversation-rule)] bg-transparent px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => void onSaveTags()}
                    className="h-8 rounded-full border border-[var(--conversation-rule)] px-3 text-[11.5px] transition-colors hover:bg-muted"
                  >
                    Save
                  </button>
                </div>

                <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <StickyNote className="size-3" /> Internal notes
                </p>
                {notes.length > 0 ? (
                  <ul className="mb-1 space-y-1">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-xl border border-amber-200/70 bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-950">
                        {n.body}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex items-end gap-2">
                  <input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onAddNote();
                      }
                    }}
                    placeholder="Add a note (not sent to the customer)…"
                    className="h-8 flex-1 rounded-full border border-[var(--conversation-rule)] bg-transparent px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    disabled={!noteDraft.trim()}
                    onClick={() => void onAddNote()}
                    className="h-8 rounded-full border border-[var(--conversation-rule)] px-3 text-[11.5px] transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

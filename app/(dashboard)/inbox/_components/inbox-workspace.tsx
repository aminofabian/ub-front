"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banknote,
  Loader2,
  Send,
  Sparkles,
  StickyNote,
  Tag,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";

import {
  addCrmNote,
  assignCrmConversation,
  draftCrmAiReply,
  fetchCrmConversation,
  fetchCrmConversations,
  fetchCrmNotes,
  fetchCrmQuickReplies,
  requestCrmPayment,
  sendCrmMessage,
  setCrmContactTags,
  type CrmConversationDetail,
  type CrmConversationRow,
  type CrmNoteRow,
  type CrmQuickReplyRow,
} from "@/lib/crm";
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

export function InboxWorkspace() {
  const { me } = useDashboard();
  const canSend = hasPermission(me?.permissions, Permission.CrmInboxSend);
  const canManage = hasPermission(me?.permissions, Permission.CrmInboxManage);

  const [filter, setFilter] = useState<StatusFilter>("open");
  const [rows, setRows] = useState<CrmConversationRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
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

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  const loadList = useCallback(
    async (soft = false) => {
      if (!soft) setListLoading(true);
      try {
        const res = await fetchCrmConversations({
          status: filter === "all" ? undefined : filter,
          size: 40,
        });
        setRows(res.items);
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

  const loadDetail = useCallback(async (id: string, soft = false) => {
    if (!soft) setDetailLoading(true);
    try {
      const [nextDetail, nextNotes] = await Promise.all([
        fetchCrmConversation(id),
        fetchCrmNotes(id).catch(() => [] as CrmNoteRow[]),
      ]);
      setDetail(nextDetail);
      setNotes(nextNotes);
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
    <div className="grid min-h-[60vh] grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <aside className="flex flex-col rounded-none border bg-white">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-none border px-2 py-1 text-[12px]",
                filter === f.key ? "bg-[var(--pos-primary,#0f766e)] text-white" : "bg-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </div>
          ) : listError ? (
            <p className="p-3 text-[13px] text-red-600">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-[13px] text-muted-foreground">No conversations yet.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left",
                  row.id === selectedId
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                    : "hover:bg-neutral-50",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {row.contactName || row.contactPhone || "Unknown"}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatWhen(row.lastMessageAt)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {row.contactPhone ?? ""}
                  </span>
                  {row.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-none bg-[var(--pos-primary,#0f766e)] px-1.5 text-[11px] text-white">
                      {row.unreadCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex min-h-[60vh] flex-col rounded-none border bg-white">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-[13px] text-muted-foreground">
            Select a conversation.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">
                  {conversation?.contactName || conversation?.contactPhone || "Conversation"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {conversation?.contactPhone ?? ""}
                  {conversation?.assignedUserId ? " · assigned" : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onAssign(selectedId, me?.id ?? null)}
                    className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[12px]"
                  >
                    <UserCheck className="size-3.5" /> Assign to me
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssign(selectedId, null)}
                    className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[12px]"
                  >
                    <UserX className="size-3.5" /> Unassign
                  </button>
                </div>
              ) : null}
            </header>

            {contactTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 border-b px-3 py-1.5">
                {contactTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-none border px-1.5 text-[11px]"
                  >
                    <Tag className="size-3" /> {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {detailLoading && !detail ? (
                <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
                </div>
              ) : (
                (detail?.messages ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[75%] rounded-none border px-3 py-1.5 text-[13px]",
                      m.direction === "outbound"
                        ? "ml-auto bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]"
                        : "bg-neutral-50",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body ?? ""}</p>
                    <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
                      {m.status ?? ""} {formatWhen(m.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {canSend ? (
              <div className="border-t p-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onAiDraft()}
                    disabled={aiBusy}
                    className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[12px] disabled:opacity-50"
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
                    className="w-28 rounded-none border px-2 py-1 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => void onRequestPayment()}
                    className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[12px]"
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
                        className="inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[11px]"
                        title={qr.body}
                      >
                        <Zap className="size-3" /> {qr.shortcut}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                    rows={2}
                    placeholder="Write a reply…"
                    className="flex-1 resize-none rounded-none border px-2 py-1.5 text-[13px]"
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={() => void onSend()}
                    className="inline-flex items-center gap-1 rounded-none border bg-[var(--pos-primary,#0f766e)] px-3 py-2 text-[13px] text-white disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send
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
                    className="flex-1 rounded-none border px-2 py-1.5 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => void onSaveTags()}
                    className="rounded-none border px-2 py-1.5 text-[12px]"
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
                      <li key={n.id} className="rounded-none border bg-amber-50 px-2 py-1 text-[12px]">
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
                    className="flex-1 rounded-none border px-2 py-1.5 text-[12px]"
                  />
                  <button
                    type="button"
                    disabled={!noteDraft.trim()}
                    onClick={() => void onAddNote()}
                    className="rounded-none border px-2 py-1.5 text-[12px] disabled:opacity-50"
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

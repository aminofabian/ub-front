"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { ServingWorklist, shopTicketLabel } from "@/components/serving/serving-worklist";
import {
  SERVING_COL_RULE,
  SERVING_HAIRLINE,
  SERVING_INK,
  SERVING_PAPER_COL,
  SERVING_SHARP_BTN,
  SERVING_THEATRE,
} from "@/components/serving/serving-ui";
import {
  type ChatMessageShape,
  Composer,
  DayDivider,
  MessageBubble,
  chatDayLabel,
  getMessageCluster,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import {
  type SupportMessage,
  completeTenantServingPoint,
  createTenantServingTicket,
  fetchTenantServingTicket,
  fetchTenantServingTickets,
  replyTenantServingTicket,
} from "@/lib/support-api";
import type { ServingTicketDetail, ServingTicketSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function toChatMessage(message: SupportMessage): ChatMessageShape {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    messageKind: message.messageKind ?? "TEXT",
    orderCard: null,
    welcomeCard: null,
    attachment: message.attachment ?? null,
    replyTo: message.replyTo ?? null,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

export function TenantServingTickets() {
  const [tickets, setTickets] = React.useState<ServingTicketSummary[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ServingTicketDetail | null>(null);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);
  const [creating, setCreating] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState("");
  const [newBody, setNewBody] = React.useState("");
  // Phone-only: show the ticket list OR the selected ticket, never both (the md grid shows both).
  const [mobileView, setMobileView] = React.useState<"list" | "detail">("list");

  const reloadList = React.useCallback(async () => {
    const payload = await fetchTenantServingTickets();
    setTickets(payload.tickets);
  }, []);

  React.useEffect(() => {
    void reloadList().catch((err) => setError(err instanceof Error ? err.message : "Could not load tickets"));
  }, [reloadList]);

  const loadDetail = React.useCallback(async (id: string) => {
    const next = await fetchTenantServingTicket(id);
    setDetail(next);
  }, []);

  React.useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    void loadDetail(activeId).catch((err) => setError(err instanceof Error ? err.message : "Could not load ticket"));
  }, [activeId, loadDetail]);

  const messages = React.useMemo(
    () => (detail?.messages ?? []).map(toChatMessage),
    [detail?.messages],
  );

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const sendMessage = async (body: string) => {
    const trimmed = body.trim();
    if (!activeId || !trimmed || sendingMessage) return;
    setSendingMessage(true);
    setError("");
    try {
      await replyTenantServingTicket(activeId, trimmed);
      setDraft("");
      await loadDetail(activeId);
    } catch (err) {
      // The composer clears on submit; keep the text so a failed send does not
      // make the user retype it.
      setDraft(trimmed);
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSendingMessage(false);
    }
  };

  const openTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createTenantServingTicket({
        subject: newSubject.trim(),
        body: newBody.trim() || undefined,
      });
      setNewSubject("");
      setNewBody("");
      setCreating(false);
      await reloadList();
      setActiveId(created.id);
      setMobileView("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open ticket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        SERVING_THEATRE,
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "flex min-h-0 flex-1 flex-col border-b md:border-b-0 md:border-r",
          SERVING_COL_RULE,
          SERVING_PAPER_COL,
          mobileView === "detail" && "hidden md:flex",
        )}
      >
        <div className={cn("border-b p-3", SERVING_COL_RULE)}>
          <p className={cn("mb-2 text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
            Numbered with Kiosk
          </p>
          <Button
            type="button"
            size="sm"
            className={cn(SERVING_SHARP_BTN, "w-full min-h-11 md:min-h-0")}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Cancel" : "New ticket"}
          </Button>
        </div>
        {creating ? (
          <form onSubmit={openTicket} className={cn("space-y-2 border-b bg-white p-3", SERVING_COL_RULE)}>
            <input
              className={dashboardInputClass()}
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject"
              required
            />
            <textarea
              className={dashboardTextareaClass()}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What do you need Kiosk to look at?"
            />
            <Button
              type="submit"
              size="sm"
              className={cn(SERVING_SHARP_BTN, "min-h-11 md:min-h-0")}
              disabled={busy || !newSubject.trim()}
            >
              Open ticket
            </Button>
          </form>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ol className="space-y-0.5 p-1.5">
            {tickets.map((ticket) => {
              const done = ticket.doneCount ?? 0;
              const total = ticket.pointCount ?? 0;
              return (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(ticket.id);
                      setMobileView("detail");
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                      activeId === ticket.id
                        ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/10"
                        : "hover:bg-muted/45",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold tabular-nums",
                        ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                          ? cn(SERVING_HAIRLINE, "text-muted-foreground")
                          : "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
                      )}
                    >
                      {shopTicketLabel(ticket)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13px] font-semibold tracking-[-0.015em] text-foreground">
                        {ticket.subject}
                      </span>
                      <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
                        {total > 0 ? `${done}/${total} points` : ticket.status.toLowerCase()}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {tickets.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>No numbered tickets yet.</p>
          ) : null}
        </div>
      </aside>
      <section
        className={cn(
          "support-chat-theme support-chat-theme--platform flex min-h-0 flex-1 flex-col support-surface",
          mobileView === "list" && "hidden md:flex",
        )}
      >
        <button
          type="button"
          onClick={() => setMobileView("list")}
          aria-label="Back to tickets"
          className={cn(
            "inline-flex min-h-11 items-center gap-1 border-b px-3 text-[13px] md:hidden",
            SERVING_COL_RULE,
          )}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Tickets
        </button>
        {error ? <p className="px-3 pt-3 text-sm text-destructive">{error}</p> : null}
        {!detail ? (
          <p className={cn(dashboardHintClass(), "m-auto max-w-[18rem] px-6 text-center")}>
            Pick a number. Kiosk breaks each ask into points you can tick when they are done.
          </p>
        ) : (
          <>
            <div className={cn("border-b", SERVING_COL_RULE)}>
              <ServingWorklist
                className="border-0"
                ticket={detail.ticket}
                points={detail.points ?? []}
                variant="tenant"
                busy={busy}
                onToggle={async (point) => {
                  if (point.status === "DONE") return;
                  setBusy(true);
                  try {
                    await completeTenantServingPoint(detail.ticket.id, point.id);
                    await Promise.all([loadDetail(detail.ticket.id), reloadList()]);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not mark done");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </div>
            <div
              ref={scrollRef}
              onScroll={onScroll}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Ticket messages"
              className="support-chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-3"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <p className="text-[15px] font-semibold text-foreground">No messages yet</p>
                  <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                    Write to Kiosk below — replies appear here.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const mine = message.senderType === "TENANT";
                  const prev = messages[index - 1];
                  const newDay =
                    !prev ||
                    chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                  const cluster = getMessageCluster(
                    messages,
                    index,
                    (m) => m.senderType === "TENANT",
                  );
                  return (
                    <React.Fragment key={message.id}>
                      {newDay ? <DayDivider iso={message.createdAt} /> : null}
                      <div className={cluster.gapClass}>
                        <MessageBubble
                          message={message}
                          mine={mine}
                          showAvatar={cluster.showAvatar}
                          clusterPosition={cluster.clusterPosition}
                        />
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
            <div className={cn("shrink-0 border-t", SERVING_COL_RULE)}>
              <Composer
                value={draft}
                onChange={setDraft}
                onSend={(payload) => void sendMessage(payload.body)}
                disabled={!activeId || detail.ticket.status === "CLOSED"}
                disabledHint="This ticket is closed"
                sending={sendingMessage}
                attachmentsEnabled={false}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

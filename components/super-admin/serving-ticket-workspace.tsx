"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Ticket } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { ServingWorklist } from "@/components/serving/serving-worklist";
import {
  SERVING_COL_RULE,
  SERVING_HAIRLINE,
  SERVING_INK,
  SERVING_MUTED,
  SERVING_PAPER_COL,
  SERVING_SHARP_BTN,
  SERVING_THEATRE,
  ServingStatusChip,
  ticketWho,
} from "@/components/serving/serving-ui";
import {
  Composer,
  DayDivider,
  MessageBubble,
  chatDayLabel,
  getMessageCluster,
  type ChatMessageShape,
} from "@/components/support/support-chat-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  addSaServingPoint,
  assignSaServingTicket,
  completeSaServingPoint,
  fetchSaServingAssignees,
  fetchSaServingTicket,
  noteSaServingTicket,
  organizeSaServingTicket,
  patchSaServingTicket,
  replySaServingTicket,
  reopenSaServingPoint,
  saCanManageStaff,
  setSaServingTicketStatus,
  type SaDeskRole,
  type ServingTicketCategory,
  type ServingTicketDetail,
  type ServingTicketPriority,
  type ServingTicketStatus,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function toBubble(message: ServingTicketDetail["messages"][number]): ChatMessageShape {
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

export function ServingTicketWorkspace({
  ticketId,
  deskRole,
}: {
  ticketId: string;
  deskRole?: SaDeskRole | string | null;
}) {
  const canAssignAny = saCanManageStaff(deskRole);
  const [detail, setDetail] = React.useState<ServingTicketDetail | null>(null);
  const [assignees, setAssignees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = React.useState("");
  const [reply, setReply] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [organizeSource, setOrganizeSource] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setError("");
    try {
      const [payload, assigneePayload] = await Promise.all([
        fetchSaServingTicket(ticketId),
        fetchSaServingAssignees().catch(() => ({ assignees: [] as Array<{ id: string; name: string }> })),
      ]);
      setDetail(payload);
      setAssignees(assigneePayload.assignees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket");
    }
  }, [ticketId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const ticket = detail?.ticket;
  const messages = (detail?.messages ?? []).map(toBubble);

  const send = async (payload: { body: string }) => {
    setBusy(true);
    try {
      await replySaServingTicket(ticketId, payload.body);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await noteSaServingTicket(ticketId, note.trim());
      setNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setBusy(false);
    }
  };

  if (!ticket && !error) {
    return <DashboardLoading label="Loading ticket…" />;
  }

  const statuses = (
    ["OPEN", "WAITING", "RESOLVED", ...(canAssignAny ? (["CLOSED"] as const) : [])]
  ) as ServingTicketStatus[];

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "grocery-market-paper gap-1.5")}>
      <DashboardPageHero
        icon={Ticket}
        title={ticket ? ticket.displayNumber : "Ticket"}
        description={
          ticket
            ? `${ticket.subject} · ${ticket.type === "SHOPPER" ? "Shopper" : "Shop"} · ${ticketWho(ticket)}`
            : "Could not load this ticket."
        }
      >
        {ticket ? <ServingStatusChip ticket={ticket} /> : null}
        <Button asChild variant="outline" size="sm" className={SERVING_SHARP_BTN}>
          <Link href={APP_ROUTES.superAdminServing}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Desk
          </Link>
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {ticket ? (
        <>
          <ServingWorklist
            ticket={ticket}
            points={detail?.points ?? []}
            variant="staff"
            source={organizeSource ?? (detail?.points ?? []).find((p) => p.source === "AI")?.source}
            busy={busy}
            onOrganize={() => {
              setBusy(true);
              void organizeSaServingTicket(ticket.id)
                .then((result) => {
                  setOrganizeSource(result.source);
                  setDetail(result.ticket);
                })
                .catch((err) => setError(err instanceof Error ? err.message : "Could not organize"))
                .finally(() => setBusy(false));
            }}
            onToggle={(point) => {
              setBusy(true);
              const run =
                point.status === "DONE"
                  ? reopenSaServingPoint(ticket.id, point.id)
                  : completeSaServingPoint(ticket.id, point.id);
              void run
                .then(() => reload())
                .catch((err) => setError(err instanceof Error ? err.message : "Could not update point"))
                .finally(() => setBusy(false));
            }}
            onAdd={async (title, pointDetail) => {
              setBusy(true);
              try {
                await addSaServingPoint(ticket.id, { title, detail: pointDetail || undefined });
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add point");
              } finally {
                setBusy(false);
              }
            }}
          />

          <div
            className={cn(
              SERVING_THEATRE,
              "grid min-h-[32rem] lg:h-[min(72dvh,46rem)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]",
            )}
          >
            <section className={cn("flex min-h-[28rem] flex-col border-b lg:min-h-0 lg:border-b-0 lg:border-r", SERVING_COL_RULE, SERVING_PAPER_COL)}>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                {messages.length === 0 ? (
                  <p className={cn(dashboardHintClass(), "py-10 text-center")}>No public messages yet.</p>
                ) : (
                  messages.map((message, index) => {
                    const mine = message.senderType === "SUPER_ADMIN";
                    const prev = messages[index - 1];
                    const newDay = !prev || chatDayLabel(prev.createdAt) !== chatDayLabel(message.createdAt);
                    const cluster = getMessageCluster(messages, index, (m) => m.senderType === "SUPER_ADMIN");
                    return (
                      <React.Fragment key={message.id}>
                        {newDay ? <DayDivider iso={message.createdAt} /> : null}
                        <div className={cn("flex", mine ? "justify-end" : "justify-start", cluster.gapClass)}>
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
              <div className={cn("border-t bg-white p-3", SERVING_COL_RULE)}>
                <Composer
                  value={reply}
                  onChange={setReply}
                  onSend={async (payload) => {
                    await send({ body: payload.body });
                    setReply("");
                  }}
                  disabled={busy || ticket.status === "CLOSED"}
                  sending={busy}
                  attachmentsEnabled={false}
                />
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-y-auto bg-white">
              <div className={cn("space-y-3 border-b px-3 py-3", SERVING_COL_RULE)}>
                <label className="block space-y-1">
                  <span className={dashboardLabelClass()}>Assignment</span>
                  <select
                    className={dashboardSelectClass()}
                    value={ticket.assignedTo ?? ""}
                    onChange={(e) => {
                      void assignSaServingTicket(ticket.id, e.target.value || null)
                        .then(() => reload())
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not assign"));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {canAssignAny ? null : (
                    <span className={dashboardHintClass()}>
                      You can claim this ticket or hand it to a teammate.
                    </span>
                  )}
                </label>

                <div>
                  <p className={dashboardLabelClass()}>Customer</p>
                  <dl className="mt-1.5 space-y-1.5">
                    <div>
                      <dt className={cn("text-[12px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
                        {ticket.type === "SHOPPER" ? "Shopper" : "Shop"}
                      </dt>
                      <dd className={cn(dashboardHintClass())}>
                        {ticket.businessName || ticket.shopperName || ticket.requesterName || "—"}
                        {ticket.shopperPhone ? ` · ${ticket.shopperPhone}` : ""}
                        {ticket.requesterPhone && ticket.requesterPhone !== ticket.shopperPhone
                          ? ` · ${ticket.requesterPhone}`
                          : ""}
                      </dd>
                    </div>
                    {ticket.requesterEmail ? (
                      <div>
                        <dt className={cn("text-[12px] font-semibold tracking-[-0.02em]", SERVING_INK)}>Email</dt>
                        <dd className={dashboardHintClass()}>{ticket.requesterEmail}</dd>
                      </div>
                    ) : null}
                    {ticket.orderId ? (
                      <div>
                        <dt className={cn("text-[12px] font-semibold tracking-[-0.02em]", SERVING_INK)}>Order</dt>
                        <dd className={cn(dashboardHintClass(), "font-mono")}>{ticket.orderId}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <label className="block space-y-1">
                  <span className={dashboardLabelClass()}>Category</span>
                  <select
                    className={dashboardSelectClass()}
                    value={ticket.category}
                    onChange={(e) => {
                      void patchSaServingTicket(ticket.id, { category: e.target.value as ServingTicketCategory })
                        .then(() => reload())
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not update"));
                    }}
                  >
                    <option value="BILLING">Billing</option>
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="BUG">Product bug</option>
                    <option value="DOMAIN">Domain</option>
                    <option value="MARKETPLACE">Marketplace / order</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className={dashboardLabelClass()}>Priority</span>
                  <select
                    className={dashboardSelectClass()}
                    value={ticket.priority}
                    onChange={(e) => {
                      void patchSaServingTicket(ticket.id, { priority: e.target.value as ServingTicketPriority })
                        .then(() => reload())
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not update"));
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>

                <div>
                  <p className={dashboardLabelClass()}>Status</p>
                  <div className={cn("mt-1.5 flex flex-wrap gap-0.5 border bg-white p-0.5", SERVING_HAIRLINE)}>
                    {statuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          void setSaServingTicketStatus(ticket.id, status).then(() => reload());
                        }}
                        className={cn(
                          "h-7 flex-1 px-2 text-[10px] font-semibold transition-colors",
                          ticket.status === status
                            ? "bg-[var(--pos-primary,#0f766e)] text-white"
                            : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
                        )}
                      >
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={cn("space-y-2 border-b px-3 py-3", SERVING_COL_RULE)}>
                <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
                  Internal notes
                </p>
                {(detail?.notes ?? []).length === 0 ? (
                  <p className={dashboardHintClass()}>No staff notes yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(detail?.notes ?? []).map((item) => (
                      <li
                        key={item.id}
                        className={cn("border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] px-2.5 py-2 text-[13px]", SERVING_HAIRLINE)}
                      >
                        <p>{item.body}</p>
                        <p className={cn(dashboardHintClass(), "mt-1")}>
                          {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={addNote} className="space-y-2">
                  <textarea
                    className={dashboardTextareaClass()}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Staff-only note"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className={SERVING_SHARP_BTN}
                    disabled={busy || !note.trim()}
                  >
                    Add note
                  </Button>
                </form>
              </div>

              <div className="px-3 py-3">
                <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>History</p>
                <ul className={cn("mt-2 space-y-1.5", SERVING_MUTED)}>
                  {(detail?.events ?? []).map((event) => (
                    <li key={event.id} className="text-[11px] leading-snug">
                      {event.actorName || "System"} · {event.kind.toLowerCase()}
                      {event.payload ? ` - ${event.payload}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}

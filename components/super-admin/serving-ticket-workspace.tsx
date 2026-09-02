"use client";

import Link from "next/link";
import * as React from "react";

import { ServingWorklist } from "@/components/serving/serving-worklist";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
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
    return <p className="text-sm text-muted-foreground">Loading ticket…</p>;
  }

  return (
    <div className="space-y-5">
      <SuperAdminPageHeader
        title={ticket ? `${ticket.displayNumber} · ${ticket.subject}` : "Ticket"}
        description={
          ticket
            ? `${ticket.type === "SHOPPER" ? "Shopper" : "Shop"} · ${ticket.businessName || ticket.shopperName || ticket.requesterName || "—"}`
            : undefined
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={APP_ROUTES.superAdminServing}>Back to desk</Link>
          </Button>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ticket ? (
        <div className="space-y-4">
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
              const run = point.status === "DONE"
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public messages yet.</p>
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
            <div className="border-t p-3">
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
          <aside className="space-y-3">
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</p>
              <select
                className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
                <p className="mt-1.5 text-[11px] text-muted-foreground">You can claim this ticket or hand it to a teammate.</p>
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">
                    {ticket.type === "SHOPPER" ? "Shopper" : "Shop"}
                  </dt>
                  <dd>
                    {ticket.businessName || ticket.shopperName || ticket.requesterName || "—"}
                    {ticket.shopperPhone ? ` · ${ticket.shopperPhone}` : ""}
                    {ticket.requesterPhone && ticket.requesterPhone !== ticket.shopperPhone
                      ? ` · ${ticket.requesterPhone}`
                      : ""}
                  </dd>
                </div>
                {ticket.requesterEmail ? (
                  <div>
                    <dt className="font-medium text-foreground">Email</dt>
                    <dd>{ticket.requesterEmail}</dd>
                  </div>
                ) : null}
                {ticket.orderId ? (
                  <div>
                    <dt className="font-medium text-foreground">Order</dt>
                    <dd className="font-mono">{ticket.orderId}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <select
                className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
              <select
                className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["OPEN", "WAITING", "RESOLVED", ...(canAssignAny ? (["CLOSED"] as const) : [])] as ServingTicketStatus[]).map(
                  (status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={ticket.status === status ? "default" : "outline"}
                    onClick={() => {
                      void setSaServingTicketStatus(ticket.id, status).then(() => reload());
                    }}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </Button>
                  ),
                )}
              </div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</p>
              <ul className="mt-2 space-y-2">
                {(detail?.notes ?? []).map((item) => (
                  <li key={item.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <p>{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
              <form onSubmit={addNote} className="mt-3 space-y-2">
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Staff-only note"
                />
                <Button type="submit" size="sm" disabled={busy || !note.trim()}>
                  Add note
                </Button>
              </form>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {(detail?.events ?? []).map((event) => (
                  <li key={event.id}>
                    {event.actorName || "System"} · {event.kind.toLowerCase()}
                    {event.payload ? ` — ${event.payload}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
        </div>
      ) : null}
    </div>
  );
}

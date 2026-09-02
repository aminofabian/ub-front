"use client";

import * as React from "react";

import { ServingWorklist, shopTicketLabel } from "@/components/serving/serving-worklist";
import { Button } from "@/components/ui/button";
import {
  completeTenantServingPoint,
  createTenantServingTicket,
  fetchTenantServingTicket,
  fetchTenantServingTickets,
  replyTenantServingTicket,
} from "@/lib/support-api";
import type { ServingTicketDetail, ServingTicketSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export function TenantServingTickets() {
  const [tickets, setTickets] = React.useState<ServingTicketSummary[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ServingTicketDetail | null>(null);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState("");
  const [newBody, setNewBody] = React.useState("");

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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setBusy(true);
    try {
      await replyTenantServingTicket(activeId, draft.trim());
      setDraft("");
      await loadDetail(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open ticket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[520px] overflow-hidden rounded-2xl border md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b md:border-b-0 md:border-r">
        <div className="border-b p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Numbered with Palmart
          </p>
          <Button type="button" size="sm" className="w-full" onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New ticket"}
          </Button>
        </div>
        {creating ? (
          <form onSubmit={openTicket} className="space-y-2 border-b p-3">
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject"
              required
            />
            <textarea
              className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What do you need Palmart to look at?"
            />
            <Button type="submit" size="sm" disabled={busy || !newSubject.trim()}>
              Open ticket
            </Button>
          </form>
        ) : null}
        <ol className="divide-y">
          {tickets.map((ticket) => {
            const done = ticket.doneCount ?? 0;
            const total = ticket.pointCount ?? 0;
            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(ticket.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-3 text-left",
                    activeId === ticket.id ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 shrink-0 font-mono text-lg font-semibold tabular-nums leading-none",
                      ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                        ? "text-muted-foreground"
                        : "text-primary",
                    )}
                  >
                    {shopTicketLabel(ticket)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm text-foreground">{ticket.subject}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {total > 0 ? `${done}/${total} points` : ticket.status.toLowerCase()}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {tickets.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">No numbered tickets yet.</p>
        ) : null}
      </aside>
      <section className="flex min-h-0 flex-col">
        {error ? <p className="px-4 pt-3 text-sm text-destructive">{error}</p> : null}
        {!detail ? (
          <p className="m-auto px-6 text-sm text-muted-foreground">
            Pick a number. Palmart breaks each ask into points you can tick when they are done.
          </p>
        ) : (
          <>
            <div className="border-b p-3">
              <ServingWorklist
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
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {(detail.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    message.senderType === "TENANT" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="text-[11px] opacity-70">{message.senderName}</p>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t p-3">
              <input
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply to Palmart…"
              />
              <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

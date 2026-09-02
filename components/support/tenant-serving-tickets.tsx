"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
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

  React.useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    void fetchTenantServingTicket(activeId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load ticket"));
  }, [activeId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setBusy(true);
    try {
      await replyTenantServingTicket(activeId, draft.trim());
      setDraft("");
      const next = await fetchTenantServingTicket(activeId);
      setDetail(next);
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
    <div className="grid min-h-[440px] overflow-hidden rounded-2xl border md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b md:border-b-0 md:border-r">
        <div className="border-b p-3">
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
        <ul className="divide-y">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => setActiveId(ticket.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left text-sm",
                  activeId === ticket.id ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <span className="font-mono text-[11px] font-semibold text-primary">{ticket.displayNumber}</span>
                <span className="line-clamp-2 text-foreground">{ticket.subject}</span>
                <span className="text-[11px] text-muted-foreground">{ticket.status}</span>
              </button>
            </li>
          ))}
        </ul>
        {tickets.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">No Palmart tickets yet.</p>
        ) : null}
      </aside>
      <section className="flex min-h-0 flex-col">
        {error ? <p className="px-4 pt-3 text-sm text-destructive">{error}</p> : null}
        {!detail ? (
          <p className="m-auto px-6 text-sm text-muted-foreground">Pick a ticket to read the thread with Palmart.</p>
        ) : (
          <>
            <header className="border-b px-4 py-3">
              <p className="font-mono text-xs font-semibold text-primary">{detail.ticket.displayNumber}</p>
              <p className="text-sm font-medium">{detail.ticket.subject}</p>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {detail.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    message.senderType === "TENANT" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="text-[11px] opacity-70">{message.senderName}</p>
                  <p>{message.body}</p>
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

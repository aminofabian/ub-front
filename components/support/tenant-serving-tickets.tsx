"use client";

import * as React from "react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { ServingWorklist, shopTicketLabel } from "@/components/serving/serving-worklist";
import {
  SERVING_COL_RULE,
  SERVING_DIVIDE,
  SERVING_HAIRLINE,
  SERVING_INK,
  SERVING_PAPER_COL,
  SERVING_SHARP_BTN,
  SERVING_THEATRE,
} from "@/components/serving/serving-ui";
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
    <div className={cn(SERVING_THEATRE, "grid min-h-[520px] md:grid-cols-[220px_minmax(0,1fr)]")}>
      <aside className={cn("border-b md:border-b-0 md:border-r", SERVING_COL_RULE, SERVING_PAPER_COL)}>
        <div className={cn("border-b p-3", SERVING_COL_RULE)}>
          <p className={cn("mb-2 text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
            Numbered with Palmart
          </p>
          <Button type="button" size="sm" className={cn(SERVING_SHARP_BTN, "w-full")} onClick={() => setCreating((v) => !v)}>
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
              placeholder="What do you need Palmart to look at?"
            />
            <Button type="submit" size="sm" className={SERVING_SHARP_BTN} disabled={busy || !newSubject.trim()}>
              Open ticket
            </Button>
          </form>
        ) : null}
        <ol className={cn("divide-y", SERVING_DIVIDE)}>
          {tickets.map((ticket) => {
            const done = ticket.doneCount ?? 0;
            const total = ticket.pointCount ?? 0;
            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(ticket.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
                    activeId === ticket.id
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                      : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center border text-[10px] font-bold tabular-nums",
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
      </aside>
      <section className="flex min-h-0 flex-col bg-white">
        {error ? <p className="px-3 pt-3 text-sm text-destructive">{error}</p> : null}
        {!detail ? (
          <p className={cn(dashboardHintClass(), "m-auto max-w-[18rem] px-6 text-center")}>
            Pick a number. Palmart breaks each ask into points you can tick when they are done.
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
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {(detail.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] px-3 py-2 text-sm",
                    message.senderType === "TENANT"
                      ? "ml-auto bg-[var(--pos-primary,#0f766e)] text-white"
                      : cn("border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-foreground", SERVING_HAIRLINE),
                  )}
                >
                  <p className="text-[11px] opacity-70">{message.senderName}</p>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className={cn("flex gap-2 border-t p-3", SERVING_COL_RULE)}>
              <input
                className={cn(dashboardInputClass(), "flex-1")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply to Palmart…"
              />
              <Button type="submit" size="sm" className={SERVING_SHARP_BTN} disabled={busy || !draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

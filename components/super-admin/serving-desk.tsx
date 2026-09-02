"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Columns3, Inbox, Plus, Ticket } from "lucide-react";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/lib/config";
import {
  assignSaServingTicket,
  claimSaServingTicket,
  createSaServingTicket,
  fetchSaServingAssignees,
  fetchSaServingBoard,
  fetchSaServingShops,
  fetchSaServingTickets,
  saCanManageStaff,
  type SaDeskRole,
  type ServingBoard,
  type ServingTicketCategory,
  type ServingTicketPriority,
  type ServingTicketSummary,
  type ServingTicketType,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const STALE_UNASSIGNED_MS = 15 * 60 * 1000;

function isStaleUnassigned(ticket: ServingTicketSummary) {
  if (ticket.assignedTo) return false;
  const created = Date.parse(ticket.createdAt);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > STALE_UNASSIGNED_MS;
}

function statusClass(status: string) {
  if (status === "NEW") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (status === "OPEN") return "bg-sky-500/15 text-sky-800 dark:text-sky-300";
  if (status === "WAITING") return "bg-violet-500/15 text-violet-800 dark:text-violet-300";
  if (status === "RESOLVED" || status === "CLOSED") {
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  }
  return "bg-muted text-muted-foreground";
}

function TicketCard({
  ticket,
  onAssign,
  onClaim,
  assignees,
}: {
  ticket: ServingTicketSummary;
  onAssign?: (ticketId: string, assigneeId: string | null) => void;
  onClaim?: (ticketId: string) => void;
  assignees?: Array<{ id: string; name: string }>;
}) {
  const stale = isStaleUnassigned(ticket);
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm",
        stale ? "border-amber-500/70 ring-1 ring-amber-500/30" : "border-border/70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={APP_ROUTES.superAdminServingTicket(ticket.id)}
          className="min-w-0 font-mono text-xs font-semibold text-primary hover:underline"
        >
          {ticket.displayNumber}
        </Link>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", statusClass(ticket.status))}>
          {stale ? "Waiting 15m+" : ticket.status}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground">{ticket.subject}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {ticket.type === "SHOPPER" ? ticket.shopperName || "Shopper" : ticket.businessName || ticket.requesterName || "Shop"}
      </p>
      {onAssign && assignees ? (
        <select
          className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={ticket.assignedTo ?? ""}
          onChange={(e) => onAssign(ticket.id, e.target.value || null)}
        >
          <option value="">Unassigned</option>
          {assignees.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}
      {!ticket.assignedTo && onClaim ? (
        <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={() => onClaim(ticket.id)}>
          Claim
        </Button>
      ) : null}
    </div>
  );
}

export function ServingDesk({ deskRole }: { deskRole?: SaDeskRole | string | null }) {
  const router = useRouter();
  const canStaff = saCanManageStaff(deskRole);
  const [view, setView] = React.useState<"queue" | "board">("board");
  const [tickets, setTickets] = React.useState<ServingTicketSummary[]>([]);
  const [board, setBoard] = React.useState<ServingBoard | null>(null);
  const [assignees, setAssignees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [shops, setShops] = React.useState<Array<{ id: string; name: string }>>([]);
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [shopId, setShopId] = React.useState("");
  const [q, setQ] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [createType, setCreateType] = React.useState<ServingTicketType>("TENANT");
  const [businessId, setBusinessId] = React.useState("");
  const [shopperName, setShopperName] = React.useState("");
  const [shopperPhone, setShopperPhone] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [category, setCategory] = React.useState<ServingTicketCategory>("OTHER");
  const [priority, setPriority] = React.useState<ServingTicketPriority>("NORMAL");
  const [body, setBody] = React.useState("");

  const reload = React.useCallback(async () => {
    setError("");
    try {
      const [queue, boardPayload, shopPayload, assigneePayload] = await Promise.all([
        fetchSaServingTickets({
          status: status || undefined,
          type: type || undefined,
          assignee: assignee || undefined,
          businessId: shopId || undefined,
          q: q.trim() || undefined,
        }),
        fetchSaServingBoard(),
        fetchSaServingShops().catch(() => ({ shops: [] })),
        fetchSaServingAssignees().catch(() => ({ assignees: [] as Array<{ id: string; name: string }> })),
      ]);
      setTickets(queue.tickets);
      setBoard(boardPayload);
      setShops(shopPayload.shops);
      setAssignees(assigneePayload.assignees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load serving desk");
    }
  }, [status, type, assignee, shopId, q]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const onAssign = async (ticketId: string, assigneeId: string | null) => {
    try {
      await assignSaServingTicket(ticketId, assigneeId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign");
    }
  };

  const onClaim = async (ticketId: string) => {
    try {
      await claimSaServingTicket(ticketId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim");
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await createSaServingTicket({
        type: createType,
        subject: subject.trim(),
        category,
        priority,
        businessId: createType === "TENANT" ? businessId || undefined : undefined,
        shopperName: createType === "SHOPPER" ? shopperName.trim() || undefined : undefined,
        shopperPhone: createType === "SHOPPER" ? shopperPhone.trim() || undefined : undefined,
        orderId: createType === "SHOPPER" ? orderId.trim() || undefined : undefined,
        body: body.trim() || undefined,
      });
      setCreating(false);
      setSubject("");
      setBody("");
      setShopperName("");
      setShopperPhone("");
      setOrderId("");
      setCategory("OTHER");
      setPriority("NORMAL");
      router.push(APP_ROUTES.superAdminServingTicket(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ticket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SuperAdminPageHeader
        title="Serving"
        description="Every customer issue has a number and an owner. Unassigned work sits in the queue until a lead assigns it — or an agent claims it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canStaff ? (
              <Button asChild variant="outline" size="sm">
                <Link href={APP_ROUTES.superAdminServingStaff}>Staff roster</Link>
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus className="size-4" />
              New ticket
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {creating ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold">Open a ticket</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={createType}
              onChange={(e) => setCreateType(e.target.value as ServingTicketType)}
            >
              <option value="TENANT">Shop / tenant</option>
              <option value="SHOPPER">Shopper</option>
            </select>
            {createType === "TENANT" ? (
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                required
              >
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                placeholder="Shopper name"
              />
            )}
            {createType === "SHOPPER" ? (
              <>
                <Input
                  value={shopperPhone}
                  onChange={(e) => setShopperPhone(e.target.value)}
                  placeholder="Shopper phone"
                />
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Order id (if you have it)"
                />
              </>
            ) : null}
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServingTicketCategory)}
            >
              <option value="BILLING">Billing</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="BUG">Product bug</option>
              <option value="DOMAIN">Domain</option>
              <option value="MARKETPLACE">Marketplace / order</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ServingTicketPriority)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <Input
              className="sm:col-span-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
            />
            <textarea
              className="min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="First note (optional)"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || !subject.trim()}>
              Create
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setView("board")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium",
              view === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Columns3 className="size-3.5" />
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("queue")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium",
              view === "queue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Inbox className="size-3.5" />
            Queue
          </button>
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="WAITING">Waiting</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Shops & shoppers</option>
          <option value="TENANT">Shops</option>
          <option value="SHOPPER">Shoppers</option>
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Assigned to me</option>
          {assignees.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select
          className="h-8 max-w-[180px] rounded-md border border-input bg-background px-2 text-xs"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
        >
          <option value="">All shops</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
        <Input
          className="h-8 max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search K-number or subject"
        />
      </div>

      {view === "queue" ? (
        <div className="overflow-hidden rounded-2xl border">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Ticket className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No tickets match</p>
              <p className="mt-1 text-sm text-muted-foreground">New chats and Talk to Us forms land here automatically.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-4 py-3",
                    isStaleUnassigned(ticket) && "bg-amber-500/5",
                  )}
                >
                  <Link
                    href={APP_ROUTES.superAdminServingTicket(ticket.id)}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {ticket.displayNumber}
                  </Link>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", statusClass(ticket.status))}>
                    {isStaleUnassigned(ticket) ? "Waiting 15m+" : ticket.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{ticket.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {ticket.assignedToName || "Unassigned"}
                  </span>
                  {!ticket.assignedTo ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void onClaim(ticket.id)}>
                      Claim
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          <section className="min-h-[280px] rounded-2xl border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unassigned ({board?.unassigned.length ?? 0})
            </p>
            <div className="space-y-2">
              {(board?.unassigned ?? []).map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onAssign={onAssign}
                  onClaim={onClaim}
                  assignees={assignees}
                />
              ))}
            </div>
          </section>
          <section className="min-h-[280px] rounded-2xl border bg-muted/20 p-3 lg:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(board?.agents ?? []).map((agent) => (
                <div key={agent.id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {agent.openCount} open · {agent.waitingCount} waiting
                    </p>
                  </div>
                  {agent.tickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onAssign={onAssign}
                      assignees={assignees}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
          <section className="min-h-[280px] space-y-3">
            <div className="rounded-2xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Waiting ({board?.waiting.length ?? 0})
              </p>
              <div className="space-y-2">
                {(board?.waiting ?? []).slice(0, 8).map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently resolved</p>
              <div className="space-y-2">
                {(board?.resolved ?? []).slice(0, 6).map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

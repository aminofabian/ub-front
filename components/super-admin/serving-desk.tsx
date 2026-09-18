"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Columns3, Inbox, Plus, Ticket, UsersRound } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import {
  SERVING_COL_RULE,
  SERVING_DIVIDE,
  SERVING_HAIRLINE,
  SERVING_INK,
  SERVING_PAPER_COL,
  SERVING_SHARP_BTN,
  SERVING_THEATRE,
  ServingColumn,
  ServingEmptyHint,
  ServingStatusChip,
  ServingTicketRow,
  isStaleUnassigned,
  ticketLabel,
  ticketWho,
} from "@/components/serving/serving-ui";
import { Button } from "@/components/ui/button";
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
  type ServingTicketType,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export function ServingDesk({ deskRole }: { deskRole?: SaDeskRole | string | null }) {
  const router = useRouter();
  const canStaff = saCanManageStaff(deskRole);
  const [view, setView] = React.useState<"queue" | "board">("board");
  const [tickets, setTickets] = React.useState<ServingBoard["unassigned"]>([]);
  const [board, setBoard] = React.useState<ServingBoard | null>(null);
  const [assignees, setAssignees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [shops, setShops] = React.useState<Array<{ id: string; name: string }>>([]);
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [shopId, setShopId] = React.useState("");
  const [q, setQ] = React.useState("");
  const [error, setError] = React.useState("");
  const [ready, setReady] = React.useState(false);
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
    } finally {
      setReady(true);
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

  if (!ready) {
    return <DashboardLoading label="Loading serving desk…" />;
  }

  const unassigned = board?.unassigned ?? [];
  const waiting = board?.waiting ?? [];
  const resolved = board?.resolved ?? [];
  const agents = board?.agents ?? [];

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "grocery-market-paper gap-1.5")}>
      <DashboardPageHero
        icon={Ticket}
        title="Serving"
        description="Unassigned work waits here until a lead assigns it, or an agent claims it."
      >
        {canStaff ? (
          <Button asChild variant="outline" size="sm" className={SERVING_SHARP_BTN}>
            <Link href={APP_ROUTES.superAdminServingStaff}>
              <UsersRound className="size-3.5" aria-hidden />
              Staff
            </Link>
          </Button>
        ) : null}
        <Button
          size="sm"
          className={SERVING_SHARP_BTN}
          onClick={() => setCreating((v) => !v)}
        >
          <Plus className="size-3.5" aria-hidden />
          {creating ? "Cancel" : "New ticket"}
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {creating ? (
        <form onSubmit={onCreate} className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3")}>
          <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
            Open a ticket
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className={dashboardSelectClass()}
              value={createType}
              onChange={(e) => setCreateType(e.target.value as ServingTicketType)}
            >
              <option value="TENANT">Shop / tenant</option>
              <option value="SHOPPER">Shopper</option>
            </select>
            {createType === "TENANT" ? (
              <select
                className={dashboardSelectClass()}
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
              <input
                className={dashboardInputClass()}
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                placeholder="Shopper name"
              />
            )}
            {createType === "SHOPPER" ? (
              <>
                <input
                  className={dashboardInputClass()}
                  value={shopperPhone}
                  onChange={(e) => setShopperPhone(e.target.value)}
                  placeholder="Shopper phone"
                />
                <input
                  className={dashboardInputClass()}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Order id (if you have it)"
                />
              </>
            ) : null}
            <select
              className={dashboardSelectClass()}
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
              className={dashboardSelectClass()}
              value={priority}
              onChange={(e) => setPriority(e.target.value as ServingTicketPriority)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <input
              className={cn(dashboardInputClass(), "sm:col-span-2")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
            />
            <textarea
              className={cn(dashboardTextareaClass(), "sm:col-span-2")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="First note (optional)"
            />
          </div>
          <div className="flex gap-1.5">
            <Button type="submit" size="sm" className={SERVING_SHARP_BTN} disabled={busy || !subject.trim()}>
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-none"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          SERVING_HAIRLINE,
        )}
      >
        <div
          className={cn("flex gap-0.5 border bg-white p-0.5", SERVING_HAIRLINE)}
          role="group"
          aria-label="Desk view"
        >
          {(
            [
              { id: "board" as const, label: "Board", icon: Columns3 },
              { id: "queue" as const, label: "Queue", icon: Inbox },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 px-2 text-[10px] font-semibold transition-colors",
                  active
                    ? "bg-[var(--pos-primary,#0f766e)] text-white"
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
        <select
          className={cn(dashboardSelectClass(), "h-7 w-[8.5rem] text-[11px]")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="WAITING">Waiting</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          className={cn(dashboardSelectClass(), "h-7 w-[9.5rem] text-[11px]")}
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Ticket type"
        >
          <option value="">Shops & shoppers</option>
          <option value="TENANT">Shops</option>
          <option value="SHOPPER">Shoppers</option>
        </select>
        <select
          className={cn(dashboardSelectClass(), "h-7 w-[9.5rem] text-[11px]")}
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Assignee"
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
          className={cn(dashboardSelectClass(), "h-7 max-w-[11rem] text-[11px]")}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          aria-label="Shop"
        >
          <option value="">All shops</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
        <input
          className={cn(dashboardInputClass(), "h-7 max-w-xs flex-1 text-[12px]")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search K-number or subject"
          aria-label="Search tickets"
        />
      </div>

      {view === "queue" ? (
        <div className={DASHBOARD_TABLE_SURFACE}>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Ticket className="mb-3 size-7 text-muted-foreground/50" aria-hidden />
              <p className={cn("text-[14px] font-semibold", SERVING_INK)}>No tickets match</p>
              <p className={cn(dashboardHintClass(), "mt-1 max-w-[18rem]")}>
                New chats and Talk to Us forms land here automatically.
              </p>
            </div>
          ) : (
            <ul className={cn("divide-y", SERVING_DIVIDE)}>
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-3 py-2.5",
                    isStaleUnassigned(ticket) && "bg-[color-mix(in_srgb,#b45309_6%,white)]",
                  )}
                >
                  <Link
                    href={APP_ROUTES.superAdminServingTicket(ticket.id)}
                    className="font-mono text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] hover:underline"
                  >
                    {ticketLabel(ticket)}
                  </Link>
                  <ServingStatusChip ticket={ticket} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{ticket.subject}</span>
                  {(ticket.pointCount ?? 0) > 0 ? (
                    <span className={cn(dashboardHintClass(), "tabular-nums")}>
                      {ticket.doneCount ?? 0}/{ticket.pointCount}
                    </span>
                  ) : null}
                  <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
                    {ticket.assignedToName || "Unassigned"}
                  </span>
                  <span className={cn(dashboardHintClass(), "hidden md:inline")}>{ticketWho(ticket)}</span>
                  {!ticket.assignedTo ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(SERVING_SHARP_BTN, "h-7 text-[11px]")}
                      onClick={() => void onClaim(ticket.id)}
                    >
                      Claim
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div
            className={cn(
              SERVING_THEATRE,
              "hidden h-[min(80dvh,52rem)] lg:grid",
              "lg:grid-cols-[minmax(16rem,18.5rem)_minmax(0,1fr)_minmax(16rem,18.5rem)]",
            )}
          >
            <div className={cn("flex h-full min-h-0 flex-col border-r", SERVING_COL_RULE, SERVING_PAPER_COL)}>
              <ServingColumn title="Unassigned" count={unassigned.length} paper className="h-full">
                {unassigned.length === 0 ? (
                  <ServingEmptyHint>Queue is clear.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {unassigned.map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow
                          ticket={ticket}
                          onAssign={onAssign}
                          onClaim={onClaim}
                          assignees={assignees}
                          compact
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
            </div>
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
              <p
                className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
                aria-hidden
              >
                The desk
              </p>
              <ServingColumn title="Staff" className="h-full bg-transparent">
                {agents.length === 0 ? (
                  <ServingEmptyHint>No agents on the roster yet.</ServingEmptyHint>
                ) : (
                  <div className="grid min-h-full gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="min-h-0 bg-white/80">
                        <div className={cn("flex items-baseline justify-between gap-2 border-b px-2.5 py-2", SERVING_COL_RULE)}>
                          <p className="truncate text-[12.5px] font-semibold tracking-[-0.015em]">{agent.name}</p>
                          <p className={cn(dashboardHintClass(), "shrink-0 tabular-nums")}>
                            {agent.openCount} open
                          </p>
                        </div>
                        {agent.tickets.length === 0 ? (
                          <p className={cn(dashboardHintClass(), "px-2.5 py-4")}>Nothing open.</p>
                        ) : (
                          <ul className={cn("divide-y", SERVING_DIVIDE)}>
                            {agent.tickets.map((ticket) => (
                              <li key={ticket.id}>
                                <ServingTicketRow
                                  ticket={ticket}
                                  onAssign={onAssign}
                                  assignees={assignees}
                                  compact
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ServingColumn>
            </div>
            <div className={cn("flex h-full min-h-0 flex-col border-l bg-white", SERVING_COL_RULE)}>
              <ServingColumn title="Waiting" count={waiting.length} className="min-h-0 flex-1">
                {waiting.length === 0 ? (
                  <ServingEmptyHint>Nobody is waiting.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {waiting.slice(0, 8).map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow ticket={ticket} compact />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
              <ServingColumn
                title="Recently resolved"
                count={resolved.length}
                className={cn("min-h-0 flex-1 border-t", SERVING_COL_RULE)}
              >
                {resolved.length === 0 ? (
                  <ServingEmptyHint>Nothing resolved yet.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {resolved.slice(0, 6).map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow ticket={ticket} compact />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-1.5 lg:hidden">
            <div className={cn(SERVING_THEATRE, "bg-white")}>
              <ServingColumn title="Unassigned" count={unassigned.length}>
                {unassigned.length === 0 ? (
                  <ServingEmptyHint>Queue is clear.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {unassigned.map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow
                          ticket={ticket}
                          onAssign={onAssign}
                          onClaim={onClaim}
                          assignees={assignees}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
            </div>
            <div className={cn("overflow-hidden border bg-white", SERVING_HAIRLINE)}>
              <ServingColumn title="Staff">
                {agents.length === 0 ? (
                  <ServingEmptyHint>No agents on the roster yet.</ServingEmptyHint>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.id} className={cn("border-b last:border-b-0", SERVING_COL_RULE)}>
                      <div className="flex items-baseline justify-between gap-2 px-3 py-2">
                        <p className="text-[13px] font-semibold">{agent.name}</p>
                        <p className={cn(dashboardHintClass(), "tabular-nums")}>
                          {agent.openCount} open
                        </p>
                      </div>
                      {agent.tickets.length === 0 ? (
                        <p className={cn(dashboardHintClass(), "px-3 pb-3")}>Nothing open.</p>
                      ) : (
                        <ul className={cn("divide-y", SERVING_DIVIDE)}>
                          {agent.tickets.map((ticket) => (
                            <li key={ticket.id}>
                              <ServingTicketRow
                                ticket={ticket}
                                onAssign={onAssign}
                                assignees={assignees}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </ServingColumn>
            </div>
            <div className={cn("overflow-hidden border bg-white", SERVING_HAIRLINE)}>
              <ServingColumn title="Waiting" count={waiting.length}>
                {waiting.length === 0 ? (
                  <ServingEmptyHint>Nobody is waiting.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {waiting.slice(0, 8).map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow ticket={ticket} />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
            </div>
            <div className={cn("overflow-hidden border bg-white", SERVING_HAIRLINE)}>
              <ServingColumn title="Recently resolved" count={resolved.length}>
                {resolved.length === 0 ? (
                  <ServingEmptyHint>Nothing resolved yet.</ServingEmptyHint>
                ) : (
                  <ul className={cn("divide-y", SERVING_DIVIDE)}>
                    {resolved.slice(0, 6).map((ticket) => (
                      <li key={ticket.id}>
                        <ServingTicketRow ticket={ticket} />
                      </li>
                    ))}
                  </ul>
                )}
              </ServingColumn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

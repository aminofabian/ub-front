"use client";

import * as React from "react";
import { Check, ListOrdered, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ServingTicketPoint, ServingTicketSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export function shopTicketLabel(ticket: Pick<ServingTicketSummary, "shopSeq" | "displayNumber">): string {
  return ticket.shopSeq != null && ticket.shopSeq > 0 ? String(ticket.shopSeq) : ticket.displayNumber;
}

export function ServingWorklist({
  ticket,
  points,
  variant,
  source,
  busy,
  onToggle,
  onOrganize,
  onAdd,
}: {
  ticket: ServingTicketSummary;
  points: ServingTicketPoint[];
  variant: "staff" | "tenant";
  source?: string | null;
  busy?: boolean;
  onToggle?: (point: ServingTicketPoint) => void;
  onOrganize?: () => void;
  onAdd?: (title: string, detail: string) => Promise<void> | void;
}) {
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const done = ticket.doneCount ?? points.filter((p) => p.status === "DONE").length;
  const total = ticket.pointCount ?? points.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const shopNo = shopTicketLabel(ticket);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdd || !title.trim()) return;
    await onAdd(title.trim(), detail.trim());
    setTitle("");
    setDetail("");
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border",
        variant === "tenant" ? "bg-card" : "bg-card",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {variant === "tenant" ? "Your numbered list" : "Shop-facing list"}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            Ticket {shopNo}
            {ticket.displayNumber && ticket.shopSeq ? (
              <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                {ticket.displayNumber}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total === 0
              ? variant === "tenant"
                ? "Palmart will break this into numbered points you can tick off."
                : "Organize the thread into 1, 2, 3… the shop can complete."
              : `${done} of ${total} done`}
            {source === "AI" ? " · Split with SokoMind" : source === "HEURISTIC" ? " · Split from the thread" : ""}
          </p>
        </div>
        {onOrganize ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onOrganize}>
            <Sparkles className="size-3.5" />
            {busy ? "Reading…" : total > 0 ? "Re-run AI" : "Organize with AI"}
          </Button>
        ) : null}
      </header>

      {total > 0 ? (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {points.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <ListOrdered className="mb-2 size-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {variant === "tenant"
              ? "Nothing to tick yet. Palmart will number the asks from your chat."
              : "No points yet. Organize the messages, or add one by hand."}
          </p>
        </div>
      ) : (
        <ol className="divide-y">
          {points.map((point) => {
            const complete = point.status === "DONE";
            const canToggle = Boolean(onToggle) && (variant === "staff" || !complete);
            return (
              <li key={point.id}>
                <div
                  className={cn(
                    "flex gap-3 px-4 py-3",
                    complete && "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 w-7 shrink-0 font-mono text-lg font-semibold tabular-nums leading-none",
                      complete ? "text-muted-foreground/70" : "text-primary",
                    )}
                  >
                    {point.seq}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        complete && "text-muted-foreground line-through decoration-muted-foreground/60",
                      )}
                    >
                      {point.title}
                    </p>
                    {point.detail && point.detail !== point.title ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{point.detail}</p>
                    ) : null}
                    {complete ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Done
                        {point.completedByName ? ` · ${point.completedByName}` : ""}
                        {point.completedByKind === "TENANT" ? " (shop)" : ""}
                      </p>
                    ) : null}
                  </div>
                  {onToggle ? (
                    <button
                      type="button"
                      disabled={busy || !canToggle}
                      onClick={() => onToggle(point)}
                      aria-label={complete ? `Reopen point ${point.seq}` : `Mark point ${point.seq} done`}
                      className={cn(
                        "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                        complete
                          ? "border-emerald-500/40 bg-emerald-500 text-white"
                          : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary",
                        "outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {onAdd ? (
        <form onSubmit={(e) => void add(e)} className="space-y-2 border-t px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Add a point</p>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="4. Next thing for the shop"
          />
          <textarea
            className="min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Optional detail"
          />
          <Button type="submit" size="sm" variant="outline" disabled={busy || !title.trim()}>
            Add to list
          </Button>
        </form>
      ) : null}
    </section>
  );
}

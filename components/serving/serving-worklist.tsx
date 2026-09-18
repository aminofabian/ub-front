"use client";

import * as React from "react";
import { Check, ListOrdered, Sparkles } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import {
  SERVING_COL_RULE,
  SERVING_DIVIDE,
  SERVING_HAIRLINE,
  SERVING_INK,
  SERVING_MUTED,
  SERVING_SHARP_BTN,
  SERVING_TEAL,
} from "@/components/serving/serving-ui";
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
  className,
}: {
  ticket: ServingTicketSummary;
  points: ServingTicketPoint[];
  variant: "staff" | "tenant";
  source?: string | null;
  busy?: boolean;
  onToggle?: (point: ServingTicketPoint) => void;
  onOrganize?: () => void;
  onAdd?: (title: string, detail: string) => Promise<void> | void;
  className?: string;
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
    <section className={cn("overflow-hidden border bg-white", SERVING_HAIRLINE, className)}>
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b px-3 py-2.5",
          SERVING_COL_RULE,
        )}
      >
        <div className="min-w-0">
          <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
            Ticket {shopNo}
            {ticket.displayNumber && ticket.shopSeq ? (
              <span className={cn("ml-2 font-mono text-[11px] font-normal", SERVING_MUTED)}>
                {ticket.displayNumber}
              </span>
            ) : null}
          </p>
          <p className={cn(dashboardHintClass(), "mt-0.5")}>
            {total === 0
              ? variant === "tenant"
                ? "Palmart will break this into numbered points you can tick off."
                : "Organize the thread into 1, 2, 3 the shop can complete."
              : `${done} of ${total} done`}
            {source === "AI"
              ? " · Split with SokoMind"
              : source === "HEURISTIC"
                ? " · Split from the thread"
                : ""}
          </p>
        </div>
        {onOrganize ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={SERVING_SHARP_BTN}
            disabled={busy}
            onClick={onOrganize}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {busy ? "Reading…" : total > 0 ? "Re-run AI" : "Organize with AI"}
          </Button>
        ) : null}
      </header>

      {total > 0 ? (
        <div className="h-0.5 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          <div
            className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {points.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <ListOrdered className={cn("mb-2 size-7", SERVING_MUTED)} aria-hidden />
          <p className={cn(dashboardHintClass(), "max-w-[18rem]")}>
            {variant === "tenant"
              ? "Nothing to tick yet. Palmart will number the asks from your chat."
              : "No points yet. Organize the messages, or add one by hand."}
          </p>
        </div>
      ) : (
        <ol className={cn("divide-y", SERVING_DIVIDE)}>
          {points.map((point) => {
            const complete = point.status === "DONE";
            const canToggle = Boolean(onToggle) && (variant === "staff" || !complete);
            return (
              <li key={point.id}>
                <div
                  className={cn(
                    "flex gap-3 px-3 py-2.5",
                    complete && "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 w-6 shrink-0 font-mono text-[15px] font-semibold tabular-nums leading-none",
                      complete ? SERVING_MUTED : SERVING_TEAL,
                    )}
                  >
                    {point.seq}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-medium leading-snug tracking-[-0.015em]",
                        complete && "text-muted-foreground line-through decoration-muted-foreground/60",
                      )}
                    >
                      {point.title}
                    </p>
                    {point.detail && point.detail !== point.title ? (
                      <p className={cn(dashboardHintClass(), "mt-1 leading-relaxed")}>{point.detail}</p>
                    ) : null}
                    {complete ? (
                      <p className={cn(dashboardHintClass(), "mt-1")}>
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
                        "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center border transition-colors",
                        complete
                          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                          : cn(SERVING_HAIRLINE, "bg-white text-muted-foreground hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]"),
                        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35 disabled:opacity-50",
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
        <form onSubmit={(e) => void add(e)} className={cn("space-y-2 border-t px-3 py-2.5", SERVING_COL_RULE)}>
          <p className={cn("text-[11px] font-semibold tracking-[-0.02em]", SERVING_MUTED)}>Add a point</p>
          <input
            className={dashboardInputClass()}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="4. Next thing for the shop"
          />
          <textarea
            className={dashboardTextareaClass()}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Optional detail"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className={SERVING_SHARP_BTN}
            disabled={busy || !title.trim()}
          >
            Add to list
          </Button>
        </form>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

import { dashboardHintClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { ServingTicketSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export const SERVING_HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
export const SERVING_DIVIDE =
  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]";
export const SERVING_INK = "text-[var(--order-ink,#15231f)]";
export const SERVING_MUTED =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
export const SERVING_TEAL = "text-[var(--pos-primary,#0f766e)]";
export const SERVING_THEATRE = cn(
  "overflow-hidden border",
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
);
export const SERVING_PAPER_COL =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";
export const SERVING_COL_RULE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
export const SERVING_SHARP_BTN = "h-8 gap-1.5 rounded-none shadow-none";

export const STALE_UNASSIGNED_MS = 15 * 60 * 1000;

export function isStaleUnassigned(ticket: ServingTicketSummary) {
  if (ticket.assignedTo) return false;
  const created = Date.parse(ticket.createdAt);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > STALE_UNASSIGNED_MS;
}

export function ticketWho(ticket: ServingTicketSummary) {
  return ticket.type === "SHOPPER"
    ? ticket.shopperName || "Shopper"
    : ticket.businessName || ticket.requesterName || "Shop";
}

export function ticketMark(ticket: ServingTicketSummary) {
  if (ticket.shopSeq != null && ticket.shopSeq > 0) return String(ticket.shopSeq);
  const digits = ticket.displayNumber.replace(/\D/g, "");
  return digits.slice(-2) || ticket.subject.slice(0, 1).toUpperCase() || "T";
}

export function ticketLabel(ticket: ServingTicketSummary) {
  if (ticket.shopSeq) {
    return `#${ticket.shopSeq}`;
  }
  return ticket.displayNumber;
}

export function ServingStatusChip({
  ticket,
}: {
  ticket: ServingTicketSummary;
}) {
  const stale = isStaleUnassigned(ticket);
  const status = ticket.status;
  const label = stale ? "15m+" : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        stale || status === "NEW"
          ? "border-amber-800/35 bg-[color-mix(in_srgb,#b45309_8%,white)] text-amber-900"
          : status === "OPEN"
            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--pos-primary,#0f766e)]"
            : status === "WAITING"
              ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] text-[var(--order-ink,#15231f)]"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function ServingColumn({
  title,
  count,
  children,
  className,
  paper = false,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
  paper?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        paper ? SERVING_PAPER_COL : "bg-white",
        className,
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-baseline justify-between gap-2 border-b px-2.5 py-2 sm:px-3",
          SERVING_COL_RULE,
        )}
      >
        <h2 className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>
          {title}
        </h2>
        {count != null ? (
          <span className={cn(dashboardHintClass(), "tabular-nums")}>{count}</span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </section>
  );
}

export function ServingEmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>{children}</p>
  );
}

export function ServingTicketRow({
  ticket,
  onAssign,
  onClaim,
  assignees,
  compact = false,
}: {
  ticket: ServingTicketSummary;
  onAssign?: (ticketId: string, assigneeId: string | null) => void;
  onClaim?: (ticketId: string) => void;
  assignees?: Array<{ id: string; name: string }>;
  compact?: boolean;
}) {
  const stale = isStaleUnassigned(ticket);
  const href = APP_ROUTES.superAdminServingTicket(ticket.id);
  return (
    <div
      className={cn(
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        stale && "bg-[color-mix(in_srgb,#b45309_6%,white)]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Link
          href={href}
          className={cn(
            "grid size-7 shrink-0 place-items-center border text-[10px] font-bold tabular-nums",
            stale
              ? "border-amber-800/40 text-amber-900"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
          )}
        >
          {ticketMark(ticket)}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="min-w-0">
              <p className={cn("font-mono text-[10px]", SERVING_TEAL)}>
                {ticketLabel(ticket)}
                {ticket.shopSeq ? (
                  <span className={cn("ml-1 font-normal", SERVING_MUTED)}>
                    {ticket.displayNumber}
                  </span>
                ) : null}
              </p>
              <p
                className={cn(
                  "mt-0.5 line-clamp-2 font-semibold tracking-[-0.015em] text-foreground",
                  compact ? "text-[12.5px]" : "text-[13px]",
                )}
              >
                {ticket.subject}
              </p>
            </Link>
            <ServingStatusChip ticket={ticket} />
          </div>
          <p className={cn(dashboardHintClass(), "mt-0.5 truncate")}>{ticketWho(ticket)}</p>
          {(ticket.pointCount ?? 0) > 0 ? (
            <p className={cn(dashboardHintClass(), "mt-0.5 tabular-nums")}>
              {ticket.doneCount ?? 0}/{ticket.pointCount} points
            </p>
          ) : null}
          {onAssign && assignees ? (
            <select
              aria-label={`Assign ${ticketLabel(ticket)}`}
              className={cn(dashboardSelectClass(), "mt-1.5 h-7 text-[11px]")}
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(SERVING_SHARP_BTN, "mt-1.5 h-7 w-full text-[11px]")}
              onClick={() => onClaim(ticket.id)}
            >
              Claim
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

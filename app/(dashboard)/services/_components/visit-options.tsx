"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";

import { dashboardHintClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import {
  serviceApiMessage,
  setServiceTicketLineOptions,
  type ServiceRecord,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import {
  MAX_CHOSEN_OPTIONS,
  minutesInWords,
  missingOptionGroup,
  optionsExtra,
  stillOffered,
  toggleOption,
  type ServiceOptionGroup,
} from "@/lib/service-options";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");

type Line = ServiceTicketRecord["lines"][number];

const CHOICE =
  "inline-flex min-h-11 items-center gap-2 rounded-[2px] border px-3 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] disabled:opacity-50";
const CHOICE_OFF = "border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-ink)] hover:border-[var(--op-ink)]";
const CHOICE_ON = "border-[var(--op-ink)] bg-[var(--op-ink)] text-white";

function groupsOf(services: readonly ServiceRecord[], serviceId: string): ServiceOptionGroup[] {
  return services.find((s) => s.id === serviceId)?.options ?? [];
}

/** Lines of a visit whose service lets the customer choose something. */
export function linesWithOptions(ticket: ServiceTicketRecord, services: readonly ServiceRecord[]): Line[] {
  return ticket.lines.filter((line) => groupsOf(services, line.serviceId).length > 0);
}

/** "Hair length for Braids" when a visit cannot be paid yet; null when nothing is missing. */
export function visitMissingOption(ticket: ServiceTicketRecord, services: readonly ServiceRecord[]): string | null {
  for (const line of ticket.lines) {
    const missing = missingOptionGroup(
      groupsOf(services, line.serviceId),
      (line.options ?? []).map((o) => o.optionId),
    );
    if (missing) return `${missing} for ${line.name}`;
  }
  return null;
}

/** Whether a visit has anything to choose, and whether a must-choose option is still missing. */
export type VisitOptionState = "none" | "missing" | "chosen" | "open";

export function visitOptionState(ticket: ServiceTicketRecord, services: readonly ServiceRecord[]): VisitOptionState {
  const lines = linesWithOptions(ticket, services);
  if (lines.length === 0) return "none";
  if (visitMissingOption(ticket, services)) return "missing";
  return lines.some((l) => (l.options ?? []).length > 0) ? "chosen" : "open";
}

/** The services of a visit with what was chosen on each: "Braids (Long, Extra packs), Cut". */
export function visitLinesInWords(ticket: ServiceTicketRecord): string {
  return ticket.lines.map((l) => ((l.options ?? []).length > 0 ? `${l.name} (${chosenInWords(l)})` : l.name)).join(", ");
}

/** What was chosen on a line, in a few words: "Long, Extra packs". */
export function chosenInWords(line: Line): string {
  return (line.options ?? []).map((o) => o.name).join(", ");
}

/**
 * Opens the choices for a visit. Shown only when one of its services has options; it is the
 * primary colour while something that must be chosen is still missing.
 */
export function VisitOptionsButton({
  ticket,
  services,
  lineId,
  disabled,
  size = "sm",
  className,
  onChanged,
}: {
  ticket: ServiceTicketRecord;
  services: readonly ServiceRecord[];
  /** Only this service of the visit; every service with options when left out. */
  lineId?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  onChanged: (ticket: ServiceTicketRecord) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const lines = linesWithOptions(ticket, services).filter((l) => !lineId || l.id === lineId);
  if (lines.length === 0) return null;
  const missing = lines.some(
    (line) =>
      missingOptionGroup(
        groupsOf(services, line.serviceId),
        (line.options ?? []).map((o) => o.optionId),
      ) != null,
  );
  const chosen = lines.some((line) => (line.options ?? []).length > 0);
  return (
    <>
      <Button
        variant={missing ? "default" : "outline"}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {missing ? "Choose options" : chosen ? "Change options" : "Options"}
      </Button>
      {open ? (
        <VisitOptionsDialog
          ticket={ticket}
          services={services}
          lineId={lineId}
          onClose={() => setOpen(false)}
          onSaved={async (saved) => {
            setOpen(false);
            await onChanged(saved);
          }}
        />
      ) : null}
    </>
  );
}

export function VisitOptionsDialog({
  ticket,
  services,
  lineId,
  onClose,
  onSaved,
}: {
  ticket: ServiceTicketRecord;
  services: readonly ServiceRecord[];
  lineId?: string;
  onClose: () => void;
  onSaved: (ticket: ServiceTicketRecord) => void | Promise<void>;
}) {
  const lines = linesWithOptions(ticket, services).filter((l) => !lineId || l.id === lineId);
  const [chosen, setChosen] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      lines.map((line) => [
        line.id,
        stillOffered(
          groupsOf(services, line.serviceId),
          (line.options ?? []).map((o) => o.optionId),
        ),
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Set when one service was saved and a later one failed: closing must still refresh the visit.
  const partlySaved = useRef<ServiceTicketRecord | null>(null);
  const close = () => (partlySaved.current ? void onSaved(partlySaved.current) : onClose());

  const view = lines.map((line) => {
    const groups = groupsOf(services, line.serviceId);
    const ids = chosen[line.id] ?? [];
    const before = line.options ?? [];
    // A price agreed at the till is kept; a listed price is the service's own, as the server will use.
    const service = services.find((s) => s.id === line.serviceId);
    const basePrice =
      service && !service.priceIsVariable
        ? service.price
        : line.unitPrice - before.reduce((sum, o) => sum + o.priceDelta, 0);
    const baseMinutes = (line.plannedMinutes ?? 0) - before.reduce((sum, o) => sum + o.extraMinutes, 0);
    const extra = optionsExtra(groups, ids);
    const was = before.map((o) => o.optionId);
    return {
      line,
      groups,
      ids,
      price: basePrice + extra.price,
      minutes: baseMinutes + extra.minutes,
      changed: was.length !== ids.length || ids.some((id) => !was.includes(id)),
    };
  });
  const total = view.reduce((sum, v) => sum + v.price, 0);

  async function save() {
    const tooMany = view.find((v) => v.ids.length > MAX_CHOSEN_OPTIONS);
    if (tooMany) return setError(`Choose at most ${MAX_CHOSEN_OPTIONS} options for ${tooMany.line.name}`);
    setError(null);
    setSaving(true);
    let latest = ticket;
    try {
      for (const v of view) {
        if (v.changed) {
          latest = await setServiceTicketLineOptions(ticket.id, v.line.id, v.ids);
          partlySaved.current = latest;
        }
      }
      await onSaved(latest);
    } catch (err) {
      setError(serviceApiMessage(err, "Could not save the choice. Check your connection and try again."));
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? close() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What did they choose?</DialogTitle>
          <DialogDescription>
            {ticket.bookingName ? `${ticket.bookingName} · ` : ""}Slip #{ticket.ticketNumber}. The price and the time
            follow the choice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {view.map(({ line, groups, ids, price, minutes }) => (
            <section key={line.id} className="grid gap-2.5" aria-label={line.name}>
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--op-rule)] pb-1">
                <h3 className="text-base font-semibold">{line.name}</h3>
                <p className="shrink-0 text-sm">
                  <span className="font-mono font-semibold tabular-nums">{kes(price)}</span>
                  {minutes > 0 ? <span className="text-[var(--op-muted)]"> · about {minutesInWords(minutes)}</span> : null}
                </p>
              </div>
              {groups.map((group) => {
                const none = !group.options.some((o) => ids.includes(o.id));
                return (
                  <div key={group.id} className="grid gap-1.5" role="group" aria-label={group.name}>
                    <p className={dashboardLabelClass()}>
                      {group.name}
                      <span className="font-normal normal-case tracking-normal text-[var(--op-muted)]">
                        {group.required && none ? " · choose one" : group.multiple ? " · any" : ""}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.options.map((option) => {
                        const on = ids.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={on}
                            disabled={saving}
                            className={cn(CHOICE, on ? CHOICE_ON : CHOICE_OFF)}
                            onClick={() => {
                              setError(null);
                              setChosen((prev) => ({ ...prev, [line.id]: toggleOption(groups, ids, option.id) }));
                            }}
                          >
                            <span>{option.name}</span>
                            {option.priceDelta > 0 ? (
                              <span className={cn("font-mono text-[13px] tabular-nums", on ? "text-white/80" : "text-[var(--op-muted)]")}>
                                +{kes(option.priceDelta)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {view.length > 1 ? (
            <p className="flex justify-between border-t border-[var(--op-rule)] pt-2 text-sm font-semibold">
              <span>These services</span>
              <span className="font-mono tabular-nums">{kes(total)}</span>
            </p>
          ) : null}
          {ticket.stage === "BOOKED" ? (
            <p className={dashboardHintClass()}>
              A longer choice makes the booking longer. It is refused if it would run into the next booking.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={close}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Check, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  createHelperRole,
  deleteHelperRole,
  equalSharePercent,
  fetchCommissionPlans,
  fetchHelperRoles,
  fetchPayModel,
  helperRolePay,
  setServiceLineHelpers,
  updateHelperRole,
  type CommissionPlanRecord,
  type HelperRole,
  type ServiceLineHelperInput,
  type ServicePerformerRecord,
  type ServiceRecord,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { leadEarnsAlone, serviceLinePayout, type CommissionRule, type HelperCut } from "@/lib/service-line-payout";
import { cn } from "@/lib/utils";

const MAX_HELPERS = 5;
const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");
const digits = (text: string) => text.replace(/[^0-9]/g, "");
const decimal = (text: string) => text.replace(/[^0-9.]/g, "");

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

const roleLabel = (role: Pick<HelperRole, "payKind" | "payValue">) =>
  role.payKind === "AMOUNT" ? kes(role.payValue) : `${role.payValue}%`;

const SLIP =
  "max-h-[min(92dvh,40rem)] w-[calc(100vw-1.5rem)] max-w-[28rem] gap-0 overflow-hidden p-0 [scrollbar-color:rgba(18,26,22,0.28)_transparent] [scrollbar-width:thin]";

/** What a helper on a role or a typed amount gets. `pool` is what the lead earns, when it can be seen. */
function cashOf(row: Row, pool: number | null): number | null {
  if (row.pay === "role" && row.role) {
    return row.role.payKind === "AMOUNT" || pool != null ? helperRolePay(row.role, pool ?? 0) : null;
  }
  if (row.pay === "amount") return Number(row.amount) || 0;
  return null;
}

function percentLabel(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

function nameOf(id: string, people: ServicePerformerRecord[]): string {
  return people.find((person) => person.staffProfileId === id)?.displayName ?? "";
}

/**
 * How one helper is paid: by a role the owner set beforehand, by an amount typed here, or by
 * their own plan on a share of the service.
 */
type Row = {
  key: number;
  staffProfileId: string;
  pay: "role" | "amount" | "plan";
  role?: HelperRole;
  /** Whole shillings, as typed. An amount already agreed for them stays as it is. */
  amount: string;
  /** Percent of the service, as typed; unused while plan shares are split equally. */
  share: string;
};

/**
 * Who else worked on one service of a ticket, and what each gets: an after-shave at 50
 * shillings, a groomer at a quarter of the barber's part. Helpers are paid out of what the person
 * leading earns, so the shop's part never changes. The usual ones are a tap, because the owner
 * set them beforehand.
 */
export function HelpersDialog({
  ticket,
  performers,
  services = [],
  canSetPay,
  canManageRoles,
  onClose,
  onDone,
}: {
  ticket: ServiceTicketRecord;
  performers: ServicePerformerRecord[];
  /** The catalogue, so a service's own commission can be used in the split. */
  services?: ServiceRecord[];
  /** May type what a helper is paid. Everyone else uses the roles, or leaves it to the plan. */
  canSetPay: boolean;
  /** May say what the usual helpers are paid. */
  canManageRoles: boolean;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const nextKey = useRef(0);
  const rowsOf = (id: string): Row[] =>
    (ticket.lines.find((l) => l.id === id)?.helpers ?? []).map((h) => ({
      key: nextKey.current++,
      staffProfileId: h.staffProfileId,
      pay: h.amount != null ? "amount" : "plan",
      amount: h.amount != null ? String(Math.round(h.amount)) : "",
      share: String(h.sharePercent),
    }));

  const [lineId, setLineId] = useState(ticket.lines[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>(() => rowsOf(lineId));
  const [equal, setEqual] = useState(true);
  const [roles, setRoles] = useState<HelperRole[]>([]);
  const [plans, setPlans] = useState<CommissionPlanRecord[] | null>(null);
  // Whether the shop takes a service's product cost off before commission.
  const [afterProductCost, setAfterProductCost] = useState(false);
  const [editingRoles, setEditingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchHelperRoles().then((found) => {
      if (live) setRoles(found);
    });
    void fetchPayModel().then((model) => {
      if (live) setAfterProductCost(model === "NET_OF_PRODUCT");
    });
    void fetchCommissionPlans()
      .then((found) => {
        if (live) setPlans(found);
      })
      .catch(() => {
        if (live) setPlans([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const line = ticket.lines.find((l) => l.id === lineId) ?? null;
  const price = line?.lineTotal ?? 0;
  const leadId = line?.performerStaffProfileId ?? ticket.staffProfileId;
  const leadName =
    line?.performerName ?? performers.find((p) => p.staffProfileId === leadId)?.displayName ?? ticket.staffName ?? "The person serving";
  const others = performers.filter((p) => p.staffProfileId !== leadId);
  const picked = new Set(rows.map((r) => r.staffProfileId).filter(Boolean));
  const full = rows.length >= MAX_HELPERS || rows.length >= others.length;

  const leadFirst = leadName.split(/\s+/)[0] || leadName;
  const leadAmount = line?.performerAmount ?? null;
  const leadRule = serviceRule(services, line?.serviceId) ?? planRule(plans, leadId ?? "");
  // What the lead earns on this service alone: what the helpers are paid out of. Null when this
  // person may not see commission plans.
  const productCost = afterProductCost ? services.find((s) => s.id === line?.serviceId)?.productCost ?? 0 : 0;
  const pool = leadEarnsAlone({ price, leadAmount, rule: leadRule, productCost });
  const set = rows.reduce((sum, row) => sum + (cashOf(row, pool) ?? 0), 0);
  const planRows = rows.filter((r) => r.pay === "plan");
  // Only helpers paid by their own plan share the price with the lead.
  const each = equalSharePercent(planRows.length);

  function change(key: number, patch: Partial<Row>) {
    setError(null);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function add(role?: HelperRole) {
    setError(null);
    // With one person left to name, it can only be them.
    const free = others.filter((p) => !picked.has(p.staffProfileId));
    setRows((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        staffProfileId: free.length === 1 ? free[0]!.staffProfileId : "",
        // Someone without a role: a set amount where the person at the till may decide one.
        pay: role ? "role" : canSetPay ? "amount" : "plan",
        role,
        amount: "",
        share: String(each || 50),
      },
    ]);
  }

  async function save() {
    if (!line) return;
    const seen = new Set<string>();
    const helpers: ServiceLineHelperInput[] = [];
    for (const row of rows) {
      if (!row.staffProfileId) return setError("Choose who each helper was, or remove the empty row");
      if (seen.has(row.staffProfileId)) return setError("Each person can only be named once");
      seen.add(row.staffProfileId);
      if (row.pay === "role" && row.role) {
        helpers.push({ staffProfileId: row.staffProfileId, roleId: row.role.id });
      } else if (row.pay === "amount") {
        if (row.amount === "") return setError("Type what each helper gets, in shillings");
        helpers.push({ staffProfileId: row.staffProfileId, amount: Number(row.amount) });
      } else if (equal) {
        helpers.push({ staffProfileId: row.staffProfileId });
      } else {
        const percent = Number(row.share);
        if (!(percent >= 1)) return setError("Each share must be at least 1%");
        helpers.push({ staffProfileId: row.staffProfileId, sharePercent: percent });
      }
    }
    if (leadAmount == null && pool != null && pool > 0 && set > pool) {
      return setError(`The helpers would get ${kes(set)}, more than the ${kes(pool)} ${leadFirst} earns on ${line.name}`);
    }
    setError(null);
    setSaving(true);
    try {
      await setServiceLineHelpers(ticket.id, line.id, helpers);
      await onDone();
    } catch (err) {
      setError(message(err, "Could not save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className={SLIP}>
        <DialogHeader className="border-b border-[var(--op-rule)] px-5 pb-3 pt-4">
          <DialogTitle>Who else worked on it</DialogTitle>
          <DialogDescription>
            {leadName} led{line ? ` ${line.name}, ${kes(price)}` : ""}. Add who helped and what each gets.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:rgba(18,26,22,0.28)_transparent] [scrollbar-width:thin]">
          {ticket.lines.length > 1 ? (
            <label className="mb-4 grid gap-1">
              <span className={dashboardLabelClass()}>Which service</span>
              <select
                className={dashboardSelectClass(false, "h-11")}
                value={lineId}
                onChange={(e) => {
                  setLineId(e.target.value);
                  setRows(rowsOf(e.target.value));
                  setEqual(true);
                  setError(null);
                }}
              >
                {ticket.lines.map((serviceLine) => (
                  <option key={serviceLine.id} value={serviceLine.id}>
                    {serviceLine.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {rows.length === 0 ? (
            <p className="text-[14px] text-[var(--op-ink)]">Nobody else yet. {leadName} did it alone.</p>
          ) : (
            <ul>
              {rows.map((row, index) => (
                <HelperRow
                  key={row.key}
                  row={row}
                  index={index}
                  others={others}
                  picked={picked}
                  canSetPay={canSetPay}
                  pool={pool}
                  leadFirst={leadFirst}
                  each={each}
                  equal={equal}
                  onChange={(patch) => change(row.key, patch)}
                  onRemove={() => {
                    setError(null);
                    setRows((prev) => prev.filter((item) => item.key !== row.key));
                  }}
                />
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-2">
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <Button
                    key={role.id}
                    type="button"
                    variant="outline"
                    className="h-11 rounded-[2px] px-3 shadow-none"
                    disabled={full}
                    onClick={() => add(role)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {role.name}
                    <span className="font-mono tabular-nums text-[var(--op-muted)]">
                      {rolePayLabel(role, pool, leadFirst)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              disabled={full}
              onClick={() => add()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[14px] font-medium text-[var(--op-ink)] hover:bg-[var(--op-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
              {roles.length > 0 ? "Someone else" : "Add someone who helped"}
            </button>
            {full ? (
              <p className={dashboardHintClass()}>
                {rows.length >= MAX_HELPERS ? "Five people is the most on one service." : "Everyone else is already on it."}
              </p>
            ) : null}
            {roles.length === 0 && !canManageRoles ? (
              <p className={dashboardHintClass()}>
                The owner can set the usual helpers and their pay, such as an after-shave at Ksh 50, so each is one tap here.
              </p>
            ) : null}
            {planRows.length > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--op-ink)]">
                <input type="checkbox" className="sr-only" checked={equal} onChange={(e) => setEqual(e.target.checked)} />
                <MarkBox on={equal} />
                Give each person the same share
              </label>
            ) : null}
          </div>

          {canManageRoles ? (
            editingRoles ? (
              <HelperRolesEditor roles={roles} onChange={setRoles} onClose={() => setEditingRoles(false)} />
            ) : (
              <button
                type="button"
                className="mt-4 text-[13px] text-[var(--op-accent)] underline decoration-[var(--op-rule)] underline-offset-2"
                onClick={() => setEditingRoles(true)}
              >
                {roles.length > 0 ? "Change the usual helpers and their pay" : "Set the usual helpers and their pay"}
              </button>
            )
          ) : null}
        </div>
        {rows.length > 0 && line ? (
          <PaySplit
            serviceName={line.name}
            price={price}
            leadId={leadId}
            leadName={leadName}
            leadAmount={line.performerAmount ?? null}
            pool={pool}
            productCost={productCost}
            rows={rows}
            others={others}
            equal={equal}
            plans={plans}
            serviceRule={serviceRule(services, line.serviceId)}
          />
        ) : null}
        {error ? (
          <p role="alert" className="border-t border-[var(--op-rule)] px-5 py-2 text-[13px] text-[var(--op-highlight)]">
            {error}
          </p>
        ) : null}
        <DialogFooter className="flex-row justify-end gap-2 border-t border-[var(--op-rule)] bg-[var(--op-surface)] px-5 py-3">
          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3 shadow-none sm:h-10" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="h-11 rounded-[2px] px-3.5 shadow-none sm:h-10" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[2px] border",
        on
          ? "border-[var(--op-accent)] bg-[var(--op-accent)] text-[var(--op-surface)]"
          : "border-[color-mix(in_srgb,var(--op-ink)_32%,transparent)] bg-[var(--op-surface)]",
      )}
    >
      {on ? <Check className="size-3" strokeWidth={2.75} /> : null}
    </span>
  );
}

function PayChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-11 rounded-[2px] border text-[14px] font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
        pressed
          ? "border-[var(--op-accent)] bg-[var(--op-accent-soft)] text-[var(--op-accent)]"
          : "border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-ink)] hover:bg-[var(--op-bg)]",
      )}
    >
      {children}
    </button>
  );
}

function MoneyField({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2.5 focus-within:border-[var(--op-accent)]">
      <span className="font-mono text-[13px] text-[var(--op-muted)]">Ksh</span>
      <input
        className="h-full min-w-0 flex-1 bg-transparent text-right font-mono text-[16px] tabular-nums text-[var(--op-ink)] outline-none"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
      />
    </label>
  );
}

function PercentField({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2.5 focus-within:border-[var(--op-accent)]">
      <input
        className="h-full min-w-0 flex-1 bg-transparent text-right font-mono text-[16px] tabular-nums text-[var(--op-ink)] outline-none"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(decimal(e.target.value))}
      />
      <span className="font-mono text-[13px] text-[var(--op-muted)]">%</span>
    </label>
  );
}

function HelperRow({
  row,
  index,
  others,
  picked,
  canSetPay,
  pool,
  leadFirst,
  each,
  equal,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  others: ServicePerformerRecord[];
  picked: Set<string>;
  canSetPay: boolean;
  pool: number | null;
  leadFirst: string;
  each: number;
  equal: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const who = nameOf(row.staffProfileId, others);
  return (
    <li className="border-b border-[var(--op-rule)] py-3 first:pt-0">
      <div className="flex items-center gap-2">
        <select
          className={dashboardSelectClass(false, "h-11")}
          aria-label={row.role ? `Who did ${row.role.name}` : `Helper ${index + 1}`}
          value={row.staffProfileId}
          onChange={(e) => onChange({ staffProfileId: e.target.value })}
        >
          <option value="">Who helped?</option>
          {others.map((person) => (
            <option
              key={person.staffProfileId}
              value={person.staffProfileId}
              disabled={person.staffProfileId !== row.staffProfileId && picked.has(person.staffProfileId)}
            >
              {person.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={who ? `Remove ${who}` : `Remove helper ${index + 1}`}
          onClick={onRemove}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)] text-[var(--op-muted)] hover:bg-[var(--op-bg)] hover:text-[var(--op-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <HelperPay row={row} index={index} canSetPay={canSetPay} pool={pool} leadFirst={leadFirst} each={each} equal={equal} onChange={onChange} />
    </li>
  );
}

function HelperPay({
  row,
  index,
  canSetPay,
  pool,
  leadFirst,
  each,
  equal,
  onChange,
}: {
  row: Row;
  index: number;
  canSetPay: boolean;
  pool: number | null;
  leadFirst: string;
  each: number;
  equal: boolean;
  onChange: (patch: Partial<Row>) => void;
}) {
  if (row.pay === "role" && row.role) {
    return (
      <p className="mt-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] text-[var(--op-muted)]">{row.role.name}</span>
        <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--op-ink)]">{rolePayLabel(row.role, pool, leadFirst)}</span>
      </p>
    );
  }
  if (!canSetPay && row.pay === "amount") {
    return <p className="mt-2 text-right font-mono text-[15px] font-semibold tabular-nums">{kes(Number(row.amount) || 0)}</p>;
  }
  if (!canSetPay) return <PlanReadout row={row} index={index} each={each} equal={equal} onChange={onChange} />;
  const shillings = row.pay === "amount";
  return (
    <div className="mt-2 grid gap-2">
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={`How helper ${index + 1} is paid`}>
        <PayChip pressed={shillings} onClick={() => onChange({ pay: "amount" })}>
          Shillings
        </PayChip>
        <PayChip pressed={!shillings} onClick={() => onChange({ pay: "plan" })}>
          A share
        </PayChip>
      </div>
      {shillings ? (
        <MoneyField value={row.amount} label={`What helper ${index + 1} gets, in shillings`} onChange={(amount) => onChange({ amount })} />
      ) : (
        <ShareField row={row} index={index} each={each} equal={equal} onChange={onChange} />
      )}
    </div>
  );
}

function ShareField({
  row,
  index,
  each,
  equal,
  onChange,
}: {
  row: Row;
  index: number;
  each: number;
  equal: boolean;
  onChange: (patch: Partial<Row>) => void;
}) {
  if (equal) {
    return (
      <p className="flex min-h-11 items-center justify-between gap-3 rounded-[2px] bg-[var(--op-bg)] px-2.5 py-2">
        <span className="text-[13px] leading-snug text-[var(--op-muted)]">Equal share</span>
        <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--op-ink)]">{percentLabel(each)}</span>
      </p>
    );
  }
  return (
    <PercentField value={row.share} label={`Share for helper ${index + 1}, percent`} onChange={(share) => onChange({ share })} />
  );
}

function PlanReadout({
  row,
  index,
  each,
  equal,
  onChange,
}: {
  row: Row;
  index: number;
  each: number;
  equal: boolean;
  onChange: (patch: Partial<Row>) => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-[13px] text-[var(--op-muted)]">By their plan</span>
      {equal ? (
        <span className="font-mono text-[15px] font-semibold tabular-nums">{percentLabel(each)}</span>
      ) : (
        <PercentField value={row.share} label={`Share for helper ${index + 1}, percent`} onChange={(share) => onChange({ share })} />
      )}
    </div>
  );
}

/** "Ksh 50", or "25% of Mike's part" with the shillings when what Mike earns can be seen. */
function rolePayLabel(role: HelperRole, pool: number | null, leadFirst: string): string {
  if (role.payKind === "AMOUNT") return kes(role.payValue);
  const share = `${role.payValue}% of ${leadFirst}'s part`;
  return pool != null ? `${share} · ${kes(helperRolePay(role, pool))}` : share;
}

function serviceRule(catalog: ServiceRecord[], serviceId: string | undefined): CommissionRule {
  const offering = catalog.find((service) => service.id === serviceId);
  if (!offering?.commissionType || offering.commissionValue == null) return null;
  return { type: offering.commissionType, rate: offering.commissionValue };
}

/** `planCount` is how many helpers are paid by their own plan: only they share the price. */
function helperCut(row: Row, pool: number | null, planCount: number, equalShares: boolean): HelperCut | null {
  if (!row.staffProfileId) return null;
  if (row.pay === "role" && row.role) {
    const amount = cashOf(row, pool);
    return amount == null ? null : { staffProfileId: row.staffProfileId, amount, sharePercent: 1 };
  }
  if (row.pay === "amount") {
    if (row.amount === "") return null;
    return { staffProfileId: row.staffProfileId, amount: Number(row.amount) || 0, sharePercent: 1 };
  }
  const sharePercent = equalShares ? equalSharePercent(planCount) : Number(row.share) || 0;
  return { staffProfileId: row.staffProfileId, amount: null, sharePercent };
}

function PaySplit({
  serviceName,
  price,
  leadId,
  leadName,
  leadAmount,
  pool,
  productCost,
  rows,
  others,
  equal,
  plans,
  serviceRule: offeringRule,
}: {
  /** Taken off before commission, where the shop pays commission after product cost; else 0. */
  productCost: number;
  serviceName: string;
  price: number;
  leadId: string | null;
  leadName: string;
  leadAmount: number | null;
  /** What the lead earns on the service alone; null when it cannot be seen. */
  pool: number | null;
  rows: Row[];
  others: ServicePerformerRecord[];
  equal: boolean;
  plans: CommissionPlanRecord[] | null;
  serviceRule: CommissionRule;
}) {
  const named = rows.filter((row) => row.staffProfileId);
  const planCount = rows.filter((row) => row.pay === "plan").length;
  const ready = Boolean(leadId) && named.length === rows.length && named.every((row) => helperCut(row, pool, planCount, equal));
  const payout =
    ready && leadId && (plans !== null || offeringRule)
      ? serviceLinePayout({
          price,
          leadId,
          leadAmount,
          helpers: named.map((row) => helperCut(row, pool, planCount, equal)!),
          productCost,
          ruleFor: (staffProfileId) => offeringRule ?? planRule(plans, staffProfileId),
        })
      : null;
  const shop = payout?.shop;

  return (
    <div className="border-t border-[var(--op-rule)] bg-[var(--op-bg)] px-5 py-3" aria-live="polite">
      <SplitLine label={serviceName} value={kes(price)} muted />
      {productCost > 0 ? <SplitLine label="Product cost, kept by the shop" value={kes(productCost)} muted /> : null}
      <SplitLine label={`${leadName} gets`} value={takeLabel(payout?.takes.find((row) => row.staffProfileId === leadId)?.amount, plans)} />
      {rows.map((row) => {
        const who = nameOf(row.staffProfileId, others);
        const amount = payout?.takes.find((item) => item.staffProfileId === row.staffProfileId)?.amount;
        return (
          <SplitLine
            key={row.key}
            label={`${who || "Choose who"} gets`}
            value={rowValue(row, amount, plans, pool)}
            muted={!who || (row.pay === "amount" && row.amount === "")}
          />
        );
      })}
      <SplitLine
        label="The shop keeps"
        value={shop == null ? (plans === null ? "…" : "After their pay") : shop < 0 ? "Nothing" : kes(shop)}
        strong
        warn={shop != null && shop < 0}
      />
      {rows.some((row) => row.pay !== "plan") ? (
        <p className="mt-1.5 text-[12px] leading-snug text-[var(--op-muted)]">
          Helpers are paid out of {leadName.split(/\s+/)[0]}&apos;s commission. The shop&apos;s part stays the same.
        </p>
      ) : null}
    </div>
  );
}

function planRule(plans: CommissionPlanRecord[] | null, staffProfileId: string): CommissionRule {
  const plan = plans?.find((row) => row.staffProfileId === staffProfileId);
  if (!plan?.type || plan.rate == null) return null;
  return { type: plan.type, rate: plan.rate };
}

function takeLabel(amount: number | null | undefined, plans: CommissionPlanRecord[] | null): string {
  if (amount != null) return kes(amount);
  return plans === null ? "…" : "Usual commission";
}

function rowValue(row: Row, amount: number | null | undefined, plans: CommissionPlanRecord[] | null, pool: number | null): string {
  if (!row.staffProfileId) return "Choose who";
  if (row.pay === "amount" && row.amount === "") return "Set an amount";
  if (amount != null) return kes(amount);
  if (row.pay === "role" && row.role) {
    const cash = cashOf(row, pool);
    return cash != null ? kes(cash) : `${row.role.payValue}% of the lead's part`;
  }
  if (row.pay === "amount") return kes(Number(row.amount) || 0);
  return takeLabel(amount, plans);
}

function SplitLine({
  label,
  value,
  muted,
  strong,
  warn,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <p
      className={cn(
        "flex items-baseline justify-between gap-3",
        strong && "mt-1.5 border-t border-[var(--op-rule)] pt-1.5 text-[14px] font-medium",
        !strong && "text-[13px]",
        warn ? "text-[var(--op-highlight)]" : muted ? "text-[var(--op-muted)]" : "text-[var(--op-ink)]",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn("shrink-0 font-mono tabular-nums", strong && "text-[15px] font-semibold")}>{value}</span>
    </p>
  );
}

type Draft = { name: string; payKind: HelperRole["payKind"]; value: string };

const draftOf = (role?: HelperRole): Draft =>
  role ? { name: role.name, payKind: role.payKind, value: String(role.payValue) } : { name: "", payKind: "AMOUNT", value: "" };

/** The shop's usual helpers and what each is paid: set once, then a tap at the till. */
function HelperRolesEditor({
  roles,
  onChange,
  onClose,
}: {
  roles: HelperRole[];
  onChange: (roles: HelperRole[]) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function save(id: string | null, draft: Draft): Promise<boolean> {
    const name = draft.name.trim();
    const payValue = Number(draft.value);
    if (!name) return fail("Give the helper a name, such as After shave");
    if (draft.payKind === "PERCENT" && !(payValue >= 1 && payValue <= 99)) return fail("A share is between 1% and 99%");
    if (draft.payKind === "AMOUNT" && !(payValue >= 1 && Number.isInteger(payValue))) return fail("Give the amount in whole shillings");
    setError(null);
    setBusy(id ?? "new");
    try {
      const body = { name, payKind: draft.payKind, payValue };
      if (id) {
        const saved = await updateHelperRole(id, body);
        onChange(roles.map((r) => (r.id === id ? saved : r)));
      } else {
        onChange([...roles, await createHelperRole(body)]);
      }
      return true;
    } catch (err) {
      return fail(message(err, "Could not save. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    setBusy(id);
    try {
      await deleteHelperRole(id);
      onChange(roles.filter((r) => r.id !== id));
    } catch (err) {
      fail(message(err, "Could not remove it. Try again."));
    } finally {
      setBusy(null);
    }
  }

  function fail(text: string): false {
    setError(text);
    return false;
  }

  return (
    <section className="mt-4 grid gap-2 border-t border-[var(--op-rule)] pt-3" aria-label="The usual helpers">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-medium text-[var(--op-ink)]">The usual helpers</h3>
        <button type="button" className="text-[13px] text-[var(--op-accent)] underline decoration-[var(--op-rule)] underline-offset-2" onClick={onClose}>
          Done
        </button>
      </div>
      <p className={dashboardHintClass()}>
        A set amount, or a percentage of what the person leading earns on the service. Either way it comes out of their
        commission, not the shop&apos;s part. Changing one does not change tickets already saved.
      </p>
      <ul className="grid gap-1.5">
        {roles.map((role) => (
          <RoleRow
            key={role.id}
            role={role}
            busy={busy === role.id}
            onSave={(draft) => save(role.id, draft)}
            onRemove={() => void remove(role.id)}
          />
        ))}
        <RoleRow key={`new-${roles.length}`} busy={busy === "new"} onSave={(draft) => save(null, draft)} />
      </ul>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--op-highlight)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function RoleRow({
  role,
  busy,
  onSave,
  onRemove,
}: {
  role?: HelperRole;
  busy: boolean;
  onSave: (draft: Draft) => Promise<boolean>;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(role));
  const saved = draftOf(role);
  const dirty = draft.name !== saved.name || draft.payKind !== saved.payKind || draft.value !== saved.value;
  const what = role ? role.name : "a new helper";

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto] items-center gap-1.5">
      <input
        className={dashboardInputClass(false)}
        aria-label={role ? `Name of ${role.name}` : "Name of a new helper"}
        placeholder={role ? undefined : "After shave"}
        maxLength={60}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <select
        className={dashboardSelectClass()}
        aria-label={`How ${what} is paid`}
        value={draft.payKind}
        onChange={(e) => setDraft({ ...draft, payKind: e.target.value as Draft["payKind"], value: "" })}
      >
        <option value="AMOUNT">Ksh</option>
        <option value="PERCENT">%</option>
      </select>
      <input
        className={dashboardInputClass(false, "text-right font-mono")}
        inputMode={draft.payKind === "AMOUNT" ? "numeric" : "decimal"}
        aria-label={draft.payKind === "AMOUNT" ? `Shillings for ${what}` : `Percent for ${what}`}
        placeholder={draft.payKind === "AMOUNT" ? "50" : "20"}
        value={draft.value}
        onChange={(e) => setDraft({ ...draft, value: draft.payKind === "AMOUNT" ? digits(e.target.value) : decimal(e.target.value) })}
      />
      {dirty || !role ? (
        <Button
          size="sm"
          variant={role ? "default" : "outline"}
          className={cn(!role && !dirty && "opacity-60")}
          disabled={busy || !dirty}
          onClick={() => void onSave(draft)}
        >
          {role ? "Save" : "Add"}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={busy} aria-label={`Remove ${role.name} (${roleLabel(role)})`} onClick={onRemove}>
          Remove
        </Button>
      )}
    </li>
  );
}

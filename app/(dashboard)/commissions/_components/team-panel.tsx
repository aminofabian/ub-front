"use client";

import { useState } from "react";

import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  addTeamMember,
  looksLikeKenyanMobile,
  previewCommission,
  sendTeamSignIn,
  setCommissionPlan,
  signInSentSentence,
  type CommissionPlanRecord,
  type CommissionType,
  type SentSignIn,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { commissionPlanDraftError } from "./commission-summary";
import styles from "./team-roster.module.css";

const FIELD = "h-11 rounded-[2px] shadow-none sm:h-8";
const EMAIL = /^\S+@\S+\.\S+$/;

/** The people who serve customers, how each one earns, and who can sign in to see their own. */
export function TeamPanel({
  plans,
  canManagePlans,
  canAddStaff,
  onChanged,
}: {
  plans: CommissionPlanRecord[];
  canManagePlans: boolean;
  canAddStaff: boolean;
  onChanged: () => Promise<void> | void;
}) {
  // The sign-in just sent, shown once: its PIN is not kept anywhere the owner can read it again.
  const [sent, setSent] = useState<SentSignIn | null>(null);
  const current = plans.filter((p) => p.current);

  return (
    <section id="team" className={cn(DASHBOARD_TABLE_SURFACE, "scroll-mt-4")} aria-label="Team and commission">
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 className="text-[13px] font-semibold tracking-[-0.02em]">Team and how they earn</h2>
        <p className={cn("mt-0.5", dashboardHintClass())}>
          A change applies to sales from now on. What was already earned stays as it was.
        </p>
      </div>
      {current.length === 0 ? (
        <p className={cn("px-3 py-3", dashboardHintClass())}>
          No one on the team yet. Add the first person below; a name is enough to start.
        </p>
      ) : (
        <ul>
          {current.map((plan) => (
            <PlanRow key={plan.staffProfileId} plan={plan} canEdit={canManagePlans} onChanged={onChanged} />
          ))}
        </ul>
      )}
      {sent ? <SignInSent sent={sent} onClose={() => setSent(null)} /> : null}
      {canAddStaff ? (
        <div className="grid gap-4 border-t border-[var(--op-rule)] px-3 py-3 lg:grid-cols-2 min-[1440px]:grid-cols-1">
          <AddMemberForm
            onAdded={async (result) => {
              setSent(result);
              await onChanged();
            }}
          />
          {current.length > 0 ? (
            <SignIns
              people={current}
              onSent={async (result) => {
                setSent(result);
                await onChanged();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function failure(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 409) return "That email is already used by someone else here";
    if (err.status === 403) return "Only someone who manages users can give a sign-in";
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

/** The PIN that was just made and where it went. Shown until closed, then gone for good. */
function SignInSent({ sent, onClose }: { sent: SentSignIn; onClose: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-[var(--op-accent)] bg-[var(--op-accent-soft)] px-3 py-2.5"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--op-ink)]">
          {sent.displayName} can sign in. PIN{" "}
          <span className="font-mono text-[15px] tabular-nums tracking-[0.12em]">{sent.pin}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-[var(--op-ink)]">{signInSentSentence(sent)}</p>
        <p className={cn("mt-0.5", dashboardHintClass())}>
          They sign in with {sent.email} and this PIN. It is shown this once; you can always send a new one.
        </p>
      </div>
      <Button size="sm" variant="outline" className={cn(FIELD, "shrink-0")} onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

/** Adds someone by name; with an email, also makes their sign-in and sends it to them. */
function AddMemberForm({ onAdded }: { onAdded: (sent: SentSignIn | null) => Promise<void> | void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const wantsSignIn = email.trim() !== "";

  async function add() {
    const who = name.trim();
    if (!who) return setError("Enter their name first");
    if (wantsSignIn && !EMAIL.test(email.trim())) return setError("That email does not look right");
    if (phone.trim() && !looksLikeKenyanMobile(phone)) return setError("That mobile number does not look right. Try 0712 345 678.");
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const member = await addTeamMember(phone.trim() ? { displayName: who, phone: phone.trim() } : { displayName: who });
      let sent: SentSignIn | null = null;
      if (wantsSignIn) {
        try {
          sent = await sendTeamSignIn(member.staffProfileId, { email: email.trim(), phone: phone.trim() || undefined });
        } catch (err) {
          setNote(`${who} is on the team, but the sign-in was not set up: ${failure(err, "try again from the list")}.`);
        }
      } else {
        setNote(`${who} is on the team. Set how they earn in the list above.`);
      }
      setName("");
      setPhone("");
      setEmail("");
      await onAdded(sent);
    } catch (err) {
      setError(err instanceof ApiRequestError && err.status === 409 ? `${who} is already on the team` : "Could not add them. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id="team-add"
      className="scroll-mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <p className="text-[13px] font-semibold text-[var(--op-ink)]">Add someone to the team</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 min-[1440px]:grid-cols-1">
        <label className="grid gap-0.5">
          <span className={dashboardLabelClass()}>Name</span>
          <input
            className={dashboardInputClass(false, FIELD)}
            value={name}
            maxLength={255}
            placeholder="Brian"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="grid gap-0.5">
          <span className={dashboardLabelClass()}>Mobile number (optional)</span>
          <input
            className={dashboardInputClass(false, cn(FIELD, "font-mono"))}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            maxLength={20}
            placeholder="0712 345 678"
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^0-9+ -]/g, ""));
              setError(null);
            }}
          />
        </label>
        <label className="grid gap-0.5">
          <span className={dashboardLabelClass()}>Email (to let them sign in)</span>
          <input
            className={dashboardInputClass(false, FIELD)}
            type="email"
            autoComplete="off"
            value={email}
            maxLength={191}
            placeholder="brian@example.com"
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </label>
      </div>
      <p className={cn("mt-1.5", dashboardHintClass())}>
        {wantsSignIn
          ? "We make their PIN and send it to their email, and by text if you gave a number. No PIN for you to think up."
          : "A name is enough. Add an email and they can sign in on their own phone and see only their own earnings."}
      </p>
      <Button type="submit" size="sm" className={cn(FIELD, "mt-2")} disabled={busy}>
        {busy ? "Adding…" : wantsSignIn ? "Add and send their sign-in" : "Add to team"}
      </Button>
      {note ? (
        <p role="status" className="mt-1.5 text-[13px] text-[var(--op-ink)]">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-[var(--op-highlight)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Who can sign in, and one button to send a sign-in (or a fresh PIN) to anyone. */
function SignIns({
  people,
  onSent,
}: {
  people: CommissionPlanRecord[];
  onSent: (sent: SentSignIn) => Promise<void> | void;
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(person: CommissionPlanRecord) {
    const first = !person.canSignIn;
    if (first && !EMAIL.test(email.trim())) return setError("Enter their email. It is what they sign in with.");
    if (first && phone.trim() && !looksLikeKenyanMobile(phone)) return setError("That mobile number does not look right. Try 0712 345 678.");
    setError(null);
    setBusy(person.staffProfileId);
    try {
      const sent = await sendTeamSignIn(
        person.staffProfileId,
        first ? { email: email.trim(), phone: phone.trim() || undefined } : {},
      );
      setOpenFor(null);
      setEmail("");
      setPhone("");
      await onSent(sent);
    } catch (err) {
      setOpenFor(person.staffProfileId);
      setError(failure(err, "Could not send it. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div id="team-sign-ins" className="scroll-mt-4">
      <p className="text-[13px] font-semibold text-[var(--op-ink)]">Who can sign in</p>
      <p className={cn("mt-0.5", dashboardHintClass())}>
        Someone who signs in sees their own bookings and earnings on their phone, nobody else&apos;s.
      </p>
      <ul className="mt-1.5">
        {people.map((person) => {
          const open = openFor === person.staffProfileId;
          return (
            <li key={person.staffProfileId} className="border-t border-[var(--op-rule-soft)] py-1.5 first:border-t-0">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-[var(--op-ink)]">{person.displayName}</span>
                  <span className={cn("block text-[12px]", person.canSignIn ? "text-[var(--op-accent)]" : "text-[var(--op-muted)]")}>
                    {person.canSignIn ? "Can sign in" : "No sign-in yet"}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={person.canSignIn ? "ghost" : "outline"}
                  className={cn(FIELD, "shrink-0")}
                  disabled={busy === person.staffProfileId}
                  aria-expanded={person.canSignIn ? undefined : open}
                  onClick={() => {
                    setError(null);
                    if (person.canSignIn) return void send(person);
                    setOpenFor(open ? null : person.staffProfileId);
                    setEmail("");
                    setPhone("");
                  }}
                >
                  {busy === person.staffProfileId ? "Sending…" : person.canSignIn ? "Send a new PIN" : open ? "Cancel" : "Send a sign-in"}
                </Button>
              </div>
              {open && !person.canSignIn ? (
                <form
                  className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send(person);
                  }}
                >
                  <label className="grid gap-0.5">
                    <span className={dashboardLabelClass()}>Their email</span>
                    <input
                      className={dashboardInputClass(false, FIELD)}
                      type="email"
                      autoComplete="off"
                      value={email}
                      maxLength={191}
                      placeholder="brian@example.com"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                  <label className="grid gap-0.5">
                    <span className={dashboardLabelClass()}>Mobile number (optional)</span>
                    <input
                      className={dashboardInputClass(false, cn(FIELD, "font-mono"))}
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      value={phone}
                      maxLength={20}
                      placeholder="0712 345 678"
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/[^0-9+ -]/g, ""));
                        setError(null);
                      }}
                    />
                  </label>
                  <Button type="submit" size="sm" className={FIELD} disabled={busy === person.staffProfileId}>
                    Make and send
                  </Button>
                </form>
              ) : null}
              {open && error ? (
                <p role="alert" className="mt-1 text-[13px] text-[var(--op-highlight)]">
                  {error}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={cn("mt-1.5", dashboardHintClass())}>
        A new PIN replaces the old one and signs them out everywhere. The text uses your SMS balance.
      </p>
    </div>
  );
}

function PlanRow({
  plan,
  canEdit,
  onChanged,
}: {
  plan: CommissionPlanRecord;
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [type, setType] = useState<CommissionType | "">(plan.type ?? "");
  const [rate, setRate] = useState(plan.rate != null ? String(plan.rate) : "");
  const [productRate, setProductRate] = useState(plan.productRate != null ? String(plan.productRate) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    type !== (plan.type ?? "") ||
    rate !== (plan.rate != null ? String(plan.rate) : "") ||
    productRate !== (plan.productRate != null ? String(plan.productRate) : "");
  const rateNumber = rate.trim() === "" ? null : Number(rate);
  const example = type !== "" && rateNumber != null && Number.isFinite(rateNumber) ? previewCommission(300, type, rateNumber) : null;

  async function save() {
    const draftError = commissionPlanDraftError(type, rate, productRate);
    if (draftError) return setError(draftError);
    const productNumber = productRate.trim() === "" ? null : Number(productRate);
    setError(null);
    setSaving(true);
    try {
      await setCommissionPlan(plan.staffProfileId, {
        type: type === "" ? null : type,
        rate: type === "" ? null : rateNumber,
        productRate: productNumber,
      });
      await onChanged();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className={cn(styles.row, "border-b border-[var(--op-rule-soft)] px-3 py-2 last:border-b-0")}>
      <span className="truncate text-[13px] font-medium" title={plan.displayName}>
        {plan.displayName}
      </span>
      <select
        className={dashboardSelectClass(!canEdit, cn(FIELD, "w-full min-w-0"))}
        disabled={!canEdit}
        value={type}
        aria-label={`How ${plan.displayName} earns on services`}
        onChange={(e) => setType(e.target.value as CommissionType | "")}
      >
        <option value="">No commission</option>
        <option value="PERCENT">Percent of each service</option>
        <option value="FIXED">Fixed amount per service</option>
      </select>
      {type !== "" ? (
        <input
          className={dashboardInputClass(!canEdit, cn(FIELD, "font-mono", styles.rate))}
          disabled={!canEdit}
          inputMode="decimal"
          value={rate}
          placeholder={type === "PERCENT" ? "40" : "100"}
          aria-label={type === "PERCENT" ? "Percent" : "Shillings per service"}
          onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      ) : (
        <span className={styles.slot} aria-hidden />
      )}
      <label className="flex items-center gap-1.5 text-[12px] text-[var(--op-muted)]">
        <span>On products</span>
        <input
          className={dashboardInputClass(!canEdit, cn(FIELD, "w-14 font-mono"))}
          disabled={!canEdit}
          inputMode="decimal"
          value={productRate}
          placeholder="0"
          aria-label="Percent on products"
          onChange={(e) => setProductRate(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        <span>%</span>
      </label>
      {canEdit && dirty ? (
        <Button size="sm" className={cn(FIELD, "w-fit")} disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      ) : (
        <span className={styles.slot} aria-hidden />
      )}
      {example != null && example > 0 ? (
        <p className={cn(styles.note, dashboardHintClass())}>
          On a {formatMoney(300, "KES")} service they earn {formatMoney(example, "KES")} and the shop keeps{" "}
          {formatMoney(300 - example, "KES")}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={cn(styles.note, "text-[13px] text-[var(--op-highlight)]")}>
          {error}
        </p>
      ) : null}
    </li>
  );
}

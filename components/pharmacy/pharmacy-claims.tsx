"use client";

import { ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  RX_INK,
  RX_META,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
  formatDate,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  createClaim,
  fetchClaims,
  fetchSchemes,
  saveScheme,
  setClaimStatus,
  type ClaimStatus,
  type PharmacyScheme,
  type SchemeClaim,
} from "@/lib/pharmacy-api";
import { printClaimSheet } from "@/lib/pharmacy-labels";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ClaimStatus, string> = {
  OPEN: "Not sent yet",
  SUBMITTED: "Sent to scheme",
  PAID: "Paid",
  PART_PAID: "Part paid",
  REJECTED: "Rejected",
};

function statusTone(s: ClaimStatus): "good" | "live" | "quiet" | "warn" {
  if (s === "PAID") return "good";
  if (s === "REJECTED") return "warn";
  return s === "OPEN" ? "quiet" : "live";
}

/** A quiet action beside a row's main one. */
const LINK =
  "inline-flex h-11 items-center text-[13.5px] font-medium text-[var(--op-accent,#1d4b3b)] underline-offset-4 hover:underline sm:h-9";

function money(n: number): string {
  return Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Medical-scheme claims kept by hand: which scheme owes what for which dispensing record, and
 * where each claim stands. Kiosk sends nothing to a scheme and moves no money.
 */
export function PharmacyClaims({ canManage }: { canManage: boolean }) {
  const { business } = useDashboard();
  const [schemes, setSchemes] = useState<PharmacyScheme[] | null>(null);
  const [claims, setClaims] = useState<SchemeClaim[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingScheme, setAddingScheme] = useState(false);
  const [act, setAct] = useState<{ id: string; kind: "PAID" | "REJECTED" } | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([fetchSchemes(), fetchClaims()])
      .then(([s, c]) => {
        if (!alive) return;
        setSchemes(s);
        setClaims(c);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load claims.")));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const run = async (work: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    try {
      await work();
      setError("");
      setAct(null);
      setValue("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const addScheme = () => {
    if (!name.trim()) {
      setError("Enter the scheme's name.");
      return;
    }
    void run(async () => {
      await saveScheme(null, { name: name.trim(), contact: contact.trim() || null });
      setName("");
      setContact("");
      setAddingScheme(false);
      toast.success("Scheme added");
    }, "Could not add the scheme.");
  };

  const confirmAct = (c: SchemeClaim) => {
    if (!act) return;
    if (act.kind === "PAID") {
      const paid = Number(value);
      if (!Number.isFinite(paid) || paid <= 0) {
        setError("Enter the total the scheme has paid so far.");
        return;
      }
      void run(() => setClaimStatus(c.id, { status: "PAID", amountPaid: paid }), "Could not update the claim.");
    } else {
      if (!value.trim()) {
        setError("Say why the scheme rejected it.");
        return;
      }
      void run(() => setClaimStatus(c.id, { status: "REJECTED", note: value.trim() }), "Could not update the claim.");
    }
  };

  return (
    <>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Panel
        title="Schemes"
        description="The schemes you claim from. At the till, link the customer named after the scheme and put its share of the sale on credit; the patient pays the rest."
        aside={
          canManage && !addingScheme ? (
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAddingScheme(true)}>
              Add scheme
            </Button>
          ) : null
        }
        flush
      >
        {canManage && addingScheme ? (
          <form
            className={cn("flex flex-wrap items-end gap-3 border-b px-4 py-3", RX_RULE)}
            onSubmit={(e) => {
              e.preventDefault();
              addScheme();
            }}
          >
            <Field label="Scheme name" className="min-w-[12rem] flex-1">
              <input className={RX_INPUT} value={name} maxLength={191} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Contact (optional)" className="min-w-[12rem] flex-1">
              <input className={RX_INPUT} value={contact} maxLength={255} onChange={(e) => setContact(e.target.value)} />
            </Field>
            <Button type="submit" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
              Save scheme
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setAddingScheme(false)}>
              Cancel
            </Button>
          </form>
        ) : null}
        {schemes != null && schemes.length === 0 ? (
          <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>No schemes yet.</p>
        ) : null}
        {schemes != null && schemes.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className={cn("border-b", RX_RULE)}>
                <th className={RX_TH}>Scheme</th>
                <th className={cn(RX_TH, "text-right")}>Claims open</th>
                <th className={cn(RX_TH, "text-right")}>Claims not paid (KES)</th>
                <th className={cn(RX_TH, "text-right")}>On its tab (KES)</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map((s) => (
                <tr key={s.id} className={RX_ROW}>
                  <td className={RX_TD}>
                    <span className={cn("font-medium", RX_INK)}>{s.name}</span>
                    {!s.active ? (
                      <span className="ml-2">
                        <Chip tone="quiet">Not in use</Chip>
                      </span>
                    ) : null}
                    {s.contact ? <span className={cn("block text-[12.5px]", RX_MUTED)}>{s.contact}</span> : null}
                  </td>
                  <td className={cn(RX_TD, "text-right tabular-nums")}>{s.openClaims}</td>
                  <td className={cn(RX_TD, "text-right font-semibold tabular-nums", RX_INK)}>{money(s.outstanding)}</td>
                  <td className={cn(RX_TD, "text-right tabular-nums")}>{s.tabBalance != null ? money(s.tabBalance) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>

      <Panel
        title="Claims"
        description="Add a claim from the dispensing log, under a record's details. Opening this list is noted in the activity log because it names patients."
        flush
      >
        {claims == null && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
        {claims != null && claims.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No claims yet"
            body="When a scheme covers part of a prescription, open the sale in the dispensing log and add the claim there."
          />
        ) : null}
        {claims != null && claims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>Date</th>
                  <th className={RX_TH}>Scheme and member</th>
                  <th className={RX_TH}>Patient and medicines</th>
                  <th className={cn(RX_TH, "text-right")}>Claimed</th>
                  <th className={cn(RX_TH, "text-right")}>Paid</th>
                  <th className={RX_TH}>Status</th>
                  <th className={cn(RX_TH, "text-right")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const settled = c.status === "PAID" || c.status === "REJECTED";
                  const acting = act?.id === c.id;
                  return (
                    <tr key={c.id} className={RX_ROW}>
                      <td className={cn(RX_TD, RX_META)}>
                        {formatDate(c.createdAt)}
                        {!settled ? <span className="block text-[12.5px]">{c.ageDays} days old</span> : null}
                      </td>
                      <td className={RX_TD}>
                        <span className={cn("font-medium", RX_INK)}>{c.schemeName ?? "Scheme"}</span>
                        <span className={cn("block whitespace-nowrap font-mono text-[12.5px]", RX_MUTED)}>{c.memberNo}</span>
                        {c.authorisationCode ? (
                          <span className={cn("block whitespace-nowrap text-[12.5px]", RX_MUTED)}>
                            Authorisation <span className="font-mono">{c.authorisationCode}</span>
                          </span>
                        ) : null}
                      </td>
                      <td className={RX_TD}>
                        {c.patientName ?? "Name not recorded"}
                        <span className={cn("block text-[12.5px]", RX_MUTED)}>
                          {c.receiptNo != null ? `#${c.receiptNo} · ` : ""}
                          {c.medicines}
                        </span>
                      </td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{money(c.amountClaimed)}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{c.amountPaid > 0 ? money(c.amountPaid) : ""}</td>
                      <td className={RX_TD}>
                        <Chip tone={statusTone(c.status)}>{STATUS_LABEL[c.status]}</Chip>
                        {c.statusNote ? <span className={cn("block text-[12.5px]", RX_MUTED)}>{c.statusNote}</span> : null}
                      </td>
                      <td className={cn(RX_TD, "text-right")}>
                        {!canManage ? null : acting ? (
                          <span className="inline-flex flex-wrap items-center justify-end gap-2">
                            <input
                              className={cn(RX_INPUT, "w-40")}
                              aria-label={act.kind === "PAID" ? "Total paid so far" : "Why it was rejected"}
                              placeholder={act.kind === "PAID" ? "Total paid so far" : "Why it was rejected"}
                              inputMode={act.kind === "PAID" ? "decimal" : "text"}
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                            />
                            <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => confirmAct(c)}>
                              Save
                            </Button>
                            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setAct(null)}>
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-4 whitespace-nowrap">
                            {!settled ? (
                              <button type="button" className={LINK} onClick={() => { setAct({ id: c.id, kind: "REJECTED" }); setValue(""); }}>
                                Rejected
                              </button>
                            ) : null}
                            <button type="button" className={LINK} onClick={() => printClaimSheet(c, business?.name?.trim() || "Pharmacy")}>
                              Print
                            </button>
                            {c.status === "OPEN" ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 min-w-[9.5rem] rounded-[2px] px-3.5 sm:h-9"
                                disabled={busy}
                                onClick={() => void run(() => setClaimStatus(c.id, { status: "SUBMITTED" }), "Could not update the claim.")}
                              >
                                Mark as sent
                              </Button>
                            ) : c.status !== "PAID" ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 min-w-[9.5rem] rounded-[2px] px-3.5 sm:h-9"
                                onClick={() => { setAct({ id: c.id, kind: "PAID" }); setValue(""); }}
                              >
                                Record payment
                              </Button>
                            ) : (
                              <span className="min-w-[9.5rem]" />
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </>
  );
}

/** A small form under a dispensing record: put part of the sale on a medical scheme. */
export function SchemeClaimForm({ recordId }: { recordId: string }) {
  const [open, setOpen] = useState(false);
  const [schemes, setSchemes] = useState<PharmacyScheme[] | null>(null);
  const [schemeId, setSchemeId] = useState("");
  const [memberNo, setMemberNo] = useState("");
  const [auth, setAuth] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || schemes != null) return;
    let alive = true;
    fetchSchemes()
      .then((list) => alive && setSchemes(list.filter((s) => s.active)))
      .catch((err) => alive && setError(errorText(err, "Could not load schemes.")));
    return () => {
      alive = false;
    };
  }, [open, schemes]);

  if (done) {
    return <p className={cn("basis-full text-sm", RX_MUTED)}>Claim added. It is under Records, Scheme claims.</p>;
  }
  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setOpen(true)}>
        Add a scheme claim
      </Button>
    );
  }

  const submit = async () => {
    const claimed = Number(amount);
    if (!schemeId || !memberNo.trim() || !Number.isFinite(claimed) || claimed <= 0) {
      setError("Choose the scheme, and enter the member number and the amount the scheme covers.");
      return;
    }
    setBusy(true);
    try {
      await createClaim({
        schemeId,
        recordId,
        memberNo: memberNo.trim(),
        authorisationCode: auth.trim() || undefined,
        amountClaimed: claimed,
      });
      setDone(true);
    } catch (err) {
      setError(errorText(err, "Could not add the claim."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="grid basis-full gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label="Scheme">
        <select className={RX_INPUT} value={schemeId} onChange={(e) => setSchemeId(e.target.value)}>
          <option value="">Choose</option>
          {(schemes ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Member number">
        <input className={RX_INPUT} value={memberNo} maxLength={64} autoComplete="off" onChange={(e) => setMemberNo(e.target.value)} />
      </Field>
      <Field label="Authorisation code">
        <input className={RX_INPUT} value={auth} maxLength={64} autoComplete="off" onChange={(e) => setAuth(e.target.value)} />
      </Field>
      <Field label="Scheme covers (KES)">
        <input className={RX_INPUT} value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
          Save claim
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {schemes != null && schemes.length === 0 ? (
        <p className={cn("text-sm sm:col-span-2 lg:col-span-5", RX_MUTED)}>
          No schemes yet. Someone who manages claims adds them under Pharmacy, Claims.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">
          {error}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useState } from "react";
import { Pencil, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  addCustomerPhone,
  patchCustomer,
  setPrimaryCustomerPhone,
  type CustomerRecord,
} from "@/lib/api";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { cn } from "@/lib/utils";

type Props = {
  customer: CustomerRecord;
  canEdit: boolean;
  onUpdated: (next: CustomerRecord) => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

export function CustomerEditCard({
  customer,
  canEdit,
  onUpdated,
  onFeedback,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [newPhone, setNewPhone] = useState("");

  const resetForm = () => {
    setName(customer.name);
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
    setNewPhone("");
  };

  const onSave = async () => {
    if (!name.trim()) {
      onFeedback("error", "Name is required.");
      return;
    }
    setBusy(true);
    try {
      const next = await patchCustomer(customer.id, {
        name: name.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        version: customer.version,
        creditAccountVersion: customer.credit.version,
      });
      onUpdated(next);
      setEditing(false);
      onFeedback("success", "Customer updated.");
    } catch (e) {
      onFeedback(
        "error",
        e instanceof Error ? e.message : "Could not save customer.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onAddPhone = async () => {
    const phone = newPhone.trim();
    if (!phone) {
      onFeedback("error", "Enter a phone number.");
      return;
    }
    setBusy(true);
    try {
      const next = await addCustomerPhone(customer.id, {
        phone,
        primary: customer.phones.length === 0,
      });
      onUpdated(next);
      setNewPhone("");
      onFeedback("success", "Phone added.");
    } catch (e) {
      onFeedback(
        "error",
        e instanceof Error ? e.message : "Could not add phone.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onSetPrimary = async (phoneId: string) => {
    setBusy(true);
    try {
      const next = await setPrimaryCustomerPhone(customer.id, phoneId);
      onUpdated(next);
      onFeedback("success", "Primary phone updated.");
    } catch (e) {
      onFeedback(
        "error",
        e instanceof Error ? e.message : "Could not set primary phone.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground">
            {customer.origin === "mpesa_inferred"
              ? "Inferred from M-Pesa · edit name and add a real phone"
              : "Contact details and internal notes"}
          </p>
        </div>
        {canEdit && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              resetForm();
              setEditing(true);
            }}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {editing ? (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </span>
              <input
                className={cn(dashboardInputClass(), "h-11 w-full")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </span>
              <input
                className={cn(dashboardInputClass(), "h-11 w-full")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="Optional"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </span>
              <textarea
                className={cn(dashboardInputClass(), "min-h-[88px] w-full resize-y py-2.5")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                placeholder="Internal notes (staff only)"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={busy}
                onClick={() => void onSave()}
              >
                {busy ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                disabled={busy}
                onClick={() => {
                  resetForm();
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 font-medium">{customer.email?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Primary phone</dt>
              <dd className="mt-0.5 font-medium">
                {customerPrimaryPhone(customer.phones) || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                {customer.notes?.trim() || "—"}
              </dd>
            </div>
          </dl>
        )}

        <div className="space-y-2 border-t border-border/50 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Phone numbers
          </p>
          {customer.phones.length > 0 ? (
            <ul className="space-y-1.5">
              {customer.phones.map((phone) => (
                <li
                  key={phone.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2 text-sm"
                >
                  <span>
                    {phone.phone}
                    {phone.primary ? (
                      <span className="ml-2 text-[11px] font-semibold uppercase text-emerald-700">
                        Primary
                      </span>
                    ) : null}
                  </span>
                  {canEdit && !phone.primary ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-xs"
                      disabled={busy}
                      onClick={() => void onSetPrimary(phone.id)}
                    >
                      <Star className="mr-1 size-3.5" />
                      Make primary
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No phone numbers yet.</p>
          )}
          {canEdit ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={cn(dashboardInputClass(), "h-11 min-w-0 flex-1")}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="2547… or 07…"
                disabled={busy}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl px-4"
                disabled={busy || !newPhone.trim()}
                onClick={() => void onAddPhone()}
              >
                <Plus className="mr-1.5 size-4" />
                Add phone
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { Building2, PencilLine, UserPlus } from "lucide-react";

import type { SupplierContactRecord, SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { supCard } from "./supplier-ui-tokens";

export function SupplierEditColumn({
  detail,
  contacts,
  canWrite,
  onEditProfile,
  onAddContact,
}: {
  detail: SupplierRecord | null;
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  onEditProfile?: () => void;
  onAddContact?: () => void;
}) {
  if (!detail) {
    return (
      <div
        className={cn(
          supCard,
          "flex min-h-[14rem] flex-col items-center justify-center border-dashed bg-muted/10 p-8 text-center",
        )}
      >
        <Building2 className="mb-3 size-10 text-muted-foreground/35" aria-hidden />
        <p className="max-w-xs text-sm font-medium text-foreground">No supplier selected</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Choose a vendor from the directory, or use{" "}
          <span className="font-medium text-foreground">New supplier</span> to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={cn(supCard, "p-4 sm:p-5")}>
        <div className="flex items-start justify-between gap-4 border-b border-border/45 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Overview</p>
            <h3 className="mt-1.5 text-lg font-semibold leading-tight tracking-tight text-foreground">
              {detail.name}
            </h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono text-sm text-foreground">{detail.code?.trim() || "—"}</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="capitalize">{detail.supplierType}</span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold capitalize tracking-wide",
              detail.status === "active"
                ? "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-200"
                : detail.status === "blocked"
                  ? "bg-destructive/12 text-destructive ring-1 ring-destructive/20"
                  : "bg-muted text-muted-foreground ring-1 ring-border/60",
            )}
          >
            {detail.status}
          </span>
        </div>

        {(() => {
          const p = contacts.find((c) => c.primaryContact);
          if (!p) {
            return null;
          }
          const hasAny = Boolean(p.name?.trim() || p.roleLabel?.trim() || p.email?.trim() || p.phone?.trim());
          if (!hasAny) {
            return null;
          }
          return (
            <div className="mt-4 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Primary contact</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {p.name?.trim() ? <span className="font-medium text-foreground">{p.name.trim()}</span> : null}
                {p.roleLabel?.trim() ? <span> · {p.roleLabel.trim()}</span> : null}
                {p.email?.trim() ? (
                  <>
                    {" · "}
                    <a
                      href={`mailto:${p.email.trim()}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {p.email.trim()}
                    </a>
                  </>
                ) : null}
                {p.phone?.trim() ? (
                  <>
                    {" · "}
                    <a
                      href={`tel:${p.phone.trim().replace(/\s+/g, "")}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {p.phone.trim()}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          );
        })()}

        <dl className="mt-4 grid gap-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="shrink-0 font-medium">System ID</dt>
            <dd className="font-mono text-[11px] text-foreground">{detail.id}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <SupplierCommercialSection s={detail} />
        </div>

        <div className="mt-5 border-t border-border/45 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Internal notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {detail.notes?.trim() ? detail.notes : <span className="text-muted-foreground">None on file.</span>}
          </p>
        </div>

        {canWrite && onEditProfile && onAddContact ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/45 pt-4">
            <Button type="button" className="h-9 gap-2 shadow-sm" onClick={onEditProfile}>
              <PencilLine className="size-3.5" aria-hidden />
              Edit profile
            </Button>
            <Button type="button" variant="outline" className="h-9 gap-2" onClick={onAddContact}>
              <UserPlus className="size-3.5" aria-hidden />
              Add contact
            </Button>
          </div>
        ) : null}
      </div>

      <div className={cn(supCard, "p-4 sm:p-5")}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/45 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Contacts</h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Ordering and accounts-receivable touchpoints for this supplier.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </span>
        </div>
        {contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No contacts on file yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border/50 bg-muted/15 px-3.5 py-3 transition-colors hover:bg-muted/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.name?.trim() || "Unnamed contact"}</p>
                    {c.roleLabel?.trim() ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.roleLabel.trim()}</p>
                    ) : null}
                  </div>
                  {c.primaryContact ? (
                    <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                      Primary
                    </span>
                  ) : null}
                </div>
                <div className="mt-2.5 flex flex-col gap-1 text-xs">
                  {c.email?.trim() ? (
                    <a
                      href={`mailto:${c.email.trim()}`}
                      className="w-fit max-w-full truncate font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.email.trim()}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No email</span>
                  )}
                  {c.phone?.trim() ? (
                    <a
                      href={`tel:${c.phone.trim().replace(/\s+/g, "")}`}
                      className="w-fit font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.phone.trim()}
                    </a>
                  ) : null}
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">{c.id}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SupplierCommercialSection({ s }: { s: SupplierRecord }) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "VAT / tax ID", value: s.vatPin?.trim() || "—" },
    { label: "Tax exempt", value: s.taxExempt ? "Yes" : "No" },
    {
      label: "Credit terms",
      value: s.creditTermsDays != null ? `${s.creditTermsDays} days` : "—",
    },
    {
      label: "Credit limit",
      value: s.creditLimit != null && Number.isFinite(s.creditLimit) ? String(s.creditLimit) : "—",
    },
    { label: "Rating", value: s.rating != null ? String(s.rating) : "—" },
    { label: "Preferred payment", value: s.paymentMethodPreferred?.trim() || "—" },
    {
      label: "Payment details",
      value: s.paymentDetails?.trim() ? (
        <span className="whitespace-pre-wrap text-sm leading-relaxed">{s.paymentDetails}</span>
      ) : (
        "—"
      ),
    },
    { label: "Record version", value: String(s.version) },
    { label: "Created", value: formatShortDate(s.createdAt) },
    { label: "Last updated", value: formatShortDate(s.updatedAt) },
  ];
  return (
    <div className={cn(supCard, "border-border/40 bg-muted/10 p-4")}>
      <h3 className="text-sm font-semibold text-foreground">Commercial &amp; payments</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Snapshot from the supplier record. Edit fields in{" "}
        <span className="font-medium text-foreground">Edit profile</span>. Rating and audit timestamps are read-only.
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

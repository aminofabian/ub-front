"use client";

import { Mail, Phone, UserRound } from "lucide-react";

import type { CreateSupplierContactPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

import { HAIRLINE, supFieldLabel, supInput } from "./supplier-ui-tokens";

const ROLE_CHIPS = ["Sales", "Accounts", "Driver", "Owner", "Rep"] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Contact entry that feels like filling a business card — live preview,
 * role chips, and clear reach channels.
 */
export function SupplierContactForm({
  draft,
  onChange,
  className,
}: {
  draft: CreateSupplierContactPayload;
  onChange: (partial: Partial<CreateSupplierContactPayload>) => void;
  className?: string;
}) {
  const name = draft.name?.trim() ?? "";
  const role = draft.roleLabel?.trim() ?? "";
  const phone = draft.phone?.trim() ?? "";
  const email = draft.email?.trim() ?? "";
  const hasPreview = Boolean(name || phone || email || role);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        aria-live="polite"
        className={cn(
          "flex items-center gap-3 rounded-[2px] border px-3 py-3 transition-colors duration-200",
          HAIRLINE,
          hasPreview
            ? "bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_5%,var(--op-surface,#FCFAF5))]"
            : "bg-[var(--op-panel,#EFEBE2)]",
        )}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[2px] text-[13px] font-semibold tracking-[-0.02em]",
            hasPreview
              ? "bg-[var(--op-accent,#1D4B3B)] text-[var(--op-surface,#FCFAF5)]"
              : "border border-[var(--op-rule,rgba(18,26,22,0.10))] bg-[var(--op-surface,#FCFAF5)] text-[var(--op-muted,#556159)]",
          )}
          aria-hidden
        >
          {hasPreview ? initials(name || "Contact") : <UserRound className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[1.25rem] font-normal leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]"
            style={{
              fontFamily:
                'var(--font-cormorant), Georgia, "Times New Roman", serif',
            }}
          >
            {name || "New contact"}
          </p>
          <p className="mt-1 truncate text-[11px] text-[var(--op-muted,#556159)]">
            {role || "Role optional"}
            {phone ? ` · ${phone}` : ""}
            {!phone && email ? ` · ${email}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={supFieldLabel}>Full name</span>
          <input
            className={cn(supInput, "h-11 rounded-[2px] sm:h-9")}
            placeholder="e.g. Jane Wanjiru"
            value={draft.name ?? ""}
            onChange={(e) => onChange({ name: e.target.value })}
            autoComplete="name"
            aria-label="Contact name"
          />
        </label>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={supFieldLabel}>Role</span>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_CHIPS.map((chip) => {
              const active =
                (draft.roleLabel ?? "").trim().toLowerCase() ===
                chip.toLowerCase();
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      roleLabel: active ? "" : chip,
                    })
                  }
                  className={cn(
                    "inline-flex h-8 items-center rounded-[2px] border px-2.5 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
                    active
                      ? "border-[var(--op-accent,#1D4B3B)] bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_10%,white)] text-[var(--op-accent,#1D4B3B)]"
                      : "border-[var(--op-rule,rgba(18,26,22,0.10))] bg-[var(--op-surface,#FCFAF5)] text-[var(--op-muted,#556159)] hover:text-[var(--op-ink,#121A16)]",
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <input
            className={cn(supInput, "h-11 rounded-[2px] sm:h-9")}
            placeholder="Or type a custom title"
            value={draft.roleLabel ?? ""}
            onChange={(e) => onChange({ roleLabel: e.target.value })}
            aria-label="Role or title"
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={cn(supFieldLabel, "inline-flex items-center gap-1")}>
            <Phone className="size-3 opacity-60" aria-hidden />
            Phone
          </span>
          <input
            className={cn(supInput, "h-11 rounded-[2px] tabular-nums sm:h-9")}
            placeholder="07XX XXX XXX"
            value={draft.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            inputMode="tel"
            autoComplete="tel"
            aria-label="Phone"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={cn(supFieldLabel, "inline-flex items-center gap-1")}>
            <Mail className="size-3 opacity-60" aria-hidden />
            Email
          </span>
          <input
            className={cn(supInput, "h-11 rounded-[2px] sm:h-9")}
            placeholder="name@company.com"
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            aria-label="Email"
          />
        </label>
      </div>

      <p className="text-[11px] leading-snug text-[var(--op-muted,#556159)]">
        Include at least a phone or email so the shop can reach them.
      </p>
    </div>
  );
}

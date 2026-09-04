import { cn } from "@/lib/utils";

/** Brand-driven tokens — set `--mail-brand*` on a parent via {@link resolveShopMailBrand}. */
export const MAIL_SHELL = cn(
  "relative mx-auto w-full max-w-[92rem] px-3 pb-8 pt-3 sm:px-5 sm:pt-4 lg:px-6",
  "lg:h-[calc(100dvh-6.5rem)] lg:min-h-[36rem] lg:overflow-hidden lg:pb-4",
);

export const MAIL_PANEL = cn(
  "overflow-hidden rounded-2xl border border-border/70 bg-card",
  "shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
);

export const MAIL_INSET = cn(
  "rounded-xl border border-border/50 bg-muted/20",
);

export const MAIL_PILL_ACTIVE = cn(
  "bg-[var(--mail-soft,#F9F6F0)] text-[var(--mail-brand,#8B6F3A)]",
  "ring-1 ring-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_18%,transparent)] shadow-sm",
);

export const MAIL_PILL_IDLE = cn(
  "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
);

export const MAIL_FIELD = cn(
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-muted-foreground/65",
  "hover:border-foreground/15",
  "focus-visible:border-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_55%,transparent)]",
  "focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_22%,transparent)]",
);

export const MAIL_PRIMARY_BTN = cn(
  "rounded-xl bg-[var(--mail-brand,#8B6F3A)] text-[var(--mail-on-brand,#FFFDF8)]",
  "hover:brightness-[0.94] focus-visible:ring-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_35%,transparent)]",
);

export const MAIL_CHIP = cn(
  "rounded-md border border-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_22%,transparent)]",
  "bg-[color-mix(in_srgb,var(--mail-soft,#F9F6F0)_80%,transparent)]",
  "px-2 py-1 font-mono text-[10px] text-[var(--mail-brand,#8B6F3A)]",
  "transition-colors hover:border-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_40%,transparent)]",
  "hover:bg-[var(--mail-soft,#F9F6F0)]",
);

export function mailStatusTone(status: string): string {
  switch (status.toUpperCase()) {
    case "DRAFT":
      return "bg-amber-500/10 text-amber-900 ring-amber-500/20";
    case "RUNNING":
      return "bg-sky-500/10 text-sky-900 ring-sky-500/20";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-500/20";
    case "FAILED":
      return "bg-red-500/10 text-red-900 ring-red-500/20";
    case "PENDING":
      return "bg-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_12%,transparent)] text-[var(--mail-brand,#8B6F3A)] ring-[color-mix(in_srgb,var(--mail-brand,#8B6F3A)_22%,transparent)]";
    case "SENT":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-500/20";
    case "SKIPPED":
      return "bg-muted text-muted-foreground ring-border/60";
    default:
      return "bg-muted text-muted-foreground ring-border/60";
  }
}

export function mailSkipLabel(reason: string | null | undefined): string {
  switch (reason) {
    case "missing_email":
      return "Missing email";
    case "invalid_email":
      return "Invalid email";
    case "synthetic_email":
      return "Placeholder email";
    case "soft_deleted":
      return "Soft-deleted";
    case "anonymised":
      return "Anonymised";
    default:
      return reason ?? "Excluded";
  }
}

export function formatMailHtml(raw: string): string {
  try {
    const compacted = raw.replace(/>\s+</g, "><").trim();
    let indent = 0;
    return compacted
      .replace(/></g, ">\n<")
      .split("\n")
      .map((line) => {
        if (line.match(/^<\//)) indent = Math.max(indent - 1, 0);
        const out = `${"  ".repeat(indent)}${line}`;
        if (line.match(/^<[^!/][^>]*[^/]>$/) && !line.includes("</")) indent += 1;
        return out;
      })
      .join("\n");
  } catch {
    return raw;
  }
}

export const MAIL_VARIABLES = [
  { tag: "name", label: "Name" },
  { tag: "firstName", label: "First name" },
  { tag: "email", label: "Email" },
  { tag: "phone", label: "Phone" },
  { tag: "shop", label: "Shop" },
  { tag: "shopUrl", label: "Shop URL" },
  { tag: "loyaltyPoints", label: "Points" },
  { tag: "walletBalance", label: "Wallet" },
  { tag: "tabBalance", label: "Tab" },
] as const;

export const MAIL_FILTER_FIELDS: Array<{
  field: string;
  label: string;
  ops: Array<{ value: string; label: string }>;
  valueKind: "text" | "bool" | "enum" | "date" | "number" | "none";
  enumValues?: Array<{ value: string; label: string }>;
}> = [
  {
    field: "customer_status",
    label: "Customer status",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "active", label: "Active" },
      { value: "soft_deleted", label: "Soft-deleted" },
      { value: "anonymised", label: "Anonymised" },
    ],
  },
  {
    field: "origin",
    label: "Origin",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "staff", label: "Staff-created" },
      { value: "mpesa_inferred", label: "M-Pesa inferred" },
      { value: "self_verified", label: "Self-verified" },
    ],
  },
  {
    field: "has_email",
    label: "Has email",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "true", label: "Has email" },
      { value: "false", label: "No email" },
    ],
  },
  {
    field: "phone_verification",
    label: "Phone verification",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "verified", label: "Verified" },
      { value: "not_verified", label: "Not verified" },
    ],
  },
  {
    field: "credit_status",
    label: "Credit status",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "clear", label: "Clear" },
      { value: "on_tab", label: "On tab" },
      { value: "suspended", label: "Suspended" },
    ],
  },
  {
    field: "created_date",
    label: "Created date",
    ops: [
      { value: "before", label: "Before" },
      { value: "after", label: "After" },
      { value: "between", label: "Between" },
      { value: "last_x_days", label: "Last X days" },
    ],
    valueKind: "date",
  },
  {
    field: "first_purchase",
    label: "First purchase",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "completed", label: "Completed" },
      { value: "not_completed", label: "Not completed" },
    ],
  },
  {
    field: "last_purchase_date",
    label: "Last purchase",
    ops: [
      { value: "before", label: "Before" },
      { value: "after", label: "After" },
      { value: "between", label: "Between" },
      { value: "last_x_days", label: "Last X days" },
      { value: "never", label: "Never" },
    ],
    valueKind: "date",
  },
  {
    field: "total_purchase_amount",
    label: "Total spend",
    ops: [
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "between", label: "Between" },
    ],
    valueKind: "number",
  },
  {
    field: "number_of_purchases",
    label: "Purchases",
    ops: [
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "between", label: "Between" },
      { value: "eq", label: "Equal to" },
    ],
    valueKind: "number",
  },
  {
    field: "tab_balance",
    label: "Tab owed",
    ops: [
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "between", label: "Between" },
    ],
    valueKind: "number",
  },
  {
    field: "wallet_balance",
    label: "Wallet",
    ops: [
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "between", label: "Between" },
    ],
    valueKind: "number",
  },
  {
    field: "loyalty_points",
    label: "Loyalty points",
    ops: [
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "between", label: "Between" },
      { value: "eq", label: "Equal to" },
    ],
    valueKind: "number",
  },
  {
    field: "marketing_eligibility",
    label: "Marketing",
    ops: [{ value: "eq", label: "Is" }],
    valueKind: "enum",
    enumValues: [
      { value: "eligible", label: "Eligible" },
      { value: "not_eligible", label: "Not eligible" },
    ],
  },
];

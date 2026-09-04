import { cn } from "@/lib/utils";

/** Warm CRM accent — shared with customer-crm-ui */
export const MAIL_ACCENT = "#8B6F3A";

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
  "bg-[#F9F6F0] text-[#8B6F3A] ring-1 ring-[#8B6F3A]/14 shadow-sm",
);

export const MAIL_PILL_IDLE = cn(
  "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
);

export const MAIL_FIELD = cn(
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-muted-foreground/65",
  "hover:border-foreground/15",
  "focus-visible:border-[#8B6F3A]/55 focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-[#8B6F3A]/20",
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

export const DEFAULT_MAIL_HTML = `<!DOCTYPE html>
<html>
<body style="margin:0;font-family:Georgia,'Times New Roman',serif;background:#f3efe6;color:#1c1917;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#fffdf8;border-radius:16px;padding:32px;border:1px solid #e8e0d0;">
          <tr><td style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8B6F3A;">{{shop}}</td></tr>
          <tr><td style="padding-top:10px;font-size:26px;font-weight:700;letter-spacing:-0.02em;">Hi {{firstName}},</td></tr>
          <tr><td style="padding-top:14px;font-size:15px;line-height:1.55;color:#44403c;">
            A note from the counter. You have {{loyaltyPoints}} loyalty points waiting.
          </td></tr>
          <tr><td style="padding-top:24px;">
            <a href="{{shopUrl}}" style="display:inline-block;background:#8B6F3A;color:#fffdf8;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">Open the shop</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

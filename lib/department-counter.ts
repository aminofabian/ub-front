/**
 * Display copy for the clerk / department counter (formerly "Grocery").
 * Public path is `/clerk`. Role key stays `grocery_clerk` for compatibility.
 */
export const DEPARTMENT_COUNTER = {
  /** Short nav / shell / business-hub label */
  shortLabel: "Clerk",
  /** Full workspace title */
  title: "Clerk counter",
  /** Bottom-nav / aria */
  navLabel: "Clerk navigation",
  /** Role display name (DB may still say Grocery Clerk until migrated) */
  roleLabel: "Department Head",
  roleKey: "grocery_clerk",
  /** Forward CTA on the counter cart */
  forwardCta: "Forward to cashier",
  forwardHint: "Pays at cashier",
} as const;

export function isDepartmentHeadRole(roleKey?: string | null): boolean {
  return roleKey?.trim().toLowerCase() === DEPARTMENT_COUNTER.roleKey;
}

/** Encode department + optional customer name into invoice notes for cashier. */
export function buildDepartmentInvoiceNotes(opts: {
  departmentLabel?: string | null;
  customerName?: string | null;
}): string | undefined {
  const dept = opts.departmentLabel?.trim() || "";
  const name = opts.customerName?.trim() || "";
  if (!dept && !name) return undefined;
  if (dept && name) return `${dept} · Customer: ${name}`;
  if (name) return `Customer: ${name}`;
  return dept;
}

export function parseDepartmentInvoiceNotes(notes?: string | null): {
  departmentLabel: string | null;
  customerName: string | null;
} {
  const raw = notes?.trim() || "";
  if (!raw) return { departmentLabel: null, customerName: null };

  const customerMatch = raw.match(/(?:^|·)\s*Customer:\s*(.+?)\s*$/i);
  const customerName = customerMatch?.[1]?.trim() || null;
  let departmentLabel: string | null = null;
  if (customerMatch) {
    const before = raw.slice(0, customerMatch.index).replace(/·\s*$/, "").trim();
    departmentLabel = before || null;
  } else {
    departmentLabel = raw;
  }
  return { departmentLabel, customerName };
}

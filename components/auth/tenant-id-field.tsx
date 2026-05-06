type TenantIdFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /**
   * When true and `value` is non-empty, the input is placed in a closed `<details>` so the UUID
   * is not visible by default (UX + casual shoulder-surfing). Empty values stay fully visible
   * so users on localhost can paste or fix tenant context.
   */
  collapsibleWhenFilled?: boolean;
};

export function TenantIdField({
  id = "tenant-id",
  value,
  onChange,
  required = true,
  collapsibleWhenFilled = true,
}: TenantIdFieldProps) {
  const filled = value.trim().length > 0;

  const hint = (
    <span className="mt-1 block text-xs font-normal text-muted-foreground">
      {filled ? (
        <>
          Change this only if you are signing in to a different business. Passwords and sessions are
          what protect the account; the tenant ID is an identifier, not a password.
        </>
      ) : (
        <>
          On your shop hostname we look up the tenant automatically; on bare localhost use{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">?url=</code> with your shop
          URL or paste the UUID. Stored for this tab only (session).
        </>
      )}
    </span>
  );

  const field = (
    <label className="block text-sm font-medium" htmlFor={id}>
      Business / tenant ID
      <input
        id={id}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        type="text"
        autoComplete="off"
        placeholder="UUID (or use NEXT_PUBLIC_TENANT_ID)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
      {hint}
    </label>
  );

  if (!collapsibleWhenFilled || !filled) {
    return field;
  }

  return (
    <details className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
      <summary className="cursor-pointer select-none text-sm font-medium text-foreground outline-none marker:text-muted-foreground">
        Business context (expand to view or change)
      </summary>
      <div className="mt-3 pb-1">{field}</div>
    </details>
  );
}

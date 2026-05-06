type TenantIdFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function TenantIdField({
  id = "tenant-id",
  value,
  onChange,
  required = true,
}: TenantIdFieldProps) {
  return (
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
      <span className="mt-1 block text-xs font-normal text-muted-foreground">
        On your shop hostname we look up the UUID automatically; on bare localhost use{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">/login?url=</code> with your shop
        URL or paste the UUID. Stored for this tab only (session).
      </span>
    </label>
  );
}

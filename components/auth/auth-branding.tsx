import { getApiBaseUrl } from "@/lib/config";

export function AuthBranding() {
  const apiHint =
    getApiBaseUrl().length > 0
      ? getApiBaseUrl()
      : "same-origin (/api → BACKEND_ORIGIN)";
  return (
    <header className="mb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">UB Admin</p>
      <p className="mt-2 text-xs text-muted-foreground">
        API{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem] font-mono">{apiHint}</code>
      </p>
    </header>
  );
}

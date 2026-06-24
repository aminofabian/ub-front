import { AlertTriangle } from "lucide-react";

export function ShopUnavailable({
  title,
  host,
  reason,
}: {
  title: string;
  host: string;
  reason: string;
}) {
  return (
    <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-900/10 dark:text-amber-100">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                <p className="text-xs uppercase tracking-wide text-amber-800/80 dark:text-amber-200/70">
                  {host}
                </p>
              </div>
              <p className="text-sm leading-relaxed">{reason}</p>
              <details className="text-xs text-amber-900/80 dark:text-amber-100/70">
                <summary className="cursor-pointer font-medium">What to check</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    A row in <code>domains</code> with <code>active=true</code> and{" "}
                    <code>domain={"<your-host>"}</code> pointing at your business.
                  </li>
                  <li>
                    The business has a non-blank <code>slug</code> and{" "}
                    <code>tenant_status=ACTIVE</code>.
                  </li>
                  <li>
                    Storefront settings have <code>enabled=true</code> and{" "}
                    <code>catalogBranchId</code> set to an <em>active</em> branch.
                  </li>
                  <li>
                    The deployment can reach the API. <code>BACKEND_ORIGIN</code> must be set as
                    a server-only env on the Next.js host (not <code>NEXT_PUBLIC_*</code>).
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

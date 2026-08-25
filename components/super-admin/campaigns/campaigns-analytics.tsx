"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { SaEmailCampaignDetail } from "@/lib/super-admin-api";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CampaignsAnalytics({ detail }: { detail: SaEmailCampaignDetail }) {
  const sent = detail.recipientsSent;
  const delivered = Math.max(0, sent - detail.recipientsFailed);
  const opened = Math.round(delivered * 0.48);
  const clicked = Math.round(delivered * 0.128);
  const completed = Math.round(clicked * 0.15);

  return (
    <div className="mx-auto max-w-[860px] space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.status} · {formatWhen(detail.completedAt || detail.createdAt)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Sent", sent.toLocaleString(), ""],
          ["Delivered", delivered.toLocaleString(), ""],
          ["Opened", opened.toLocaleString(), "Modeled"],
          ["Clicked", clicked.toLocaleString(), "Modeled"],
          ["Completed setup", completed.toLocaleString(), "Modeled outcome"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-white px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-base font-semibold tabular-nums">{value}</p>
            {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-sm font-semibold">Funnel</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {[
            ["Sent", sent],
            ["Delivered", delivered],
            ["Opened", opened],
            ["Clicked", clicked],
            ["Completed setup", completed],
          ].map(([label, n]) => (
            <li key={String(label)} className="flex items-center gap-3">
              <span className="w-36 text-muted-foreground">{label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full bg-emerald-700"
                  style={{ width: `${Math.min(100, sent ? (Number(n) / sent) * 100 : 0)}%` }}
                />
              </span>
              <span className="w-14 text-right tabular-nums">{Number(n).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Campaign impact</h2>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-border/70 px-3 py-2">
            +{completed} completed stores
          </li>
          <li className="rounded-lg border border-border/70 px-3 py-2">
            +{Math.round(completed * 0.65)} storefronts published
          </li>
          <li className="rounded-lg border border-border/70 px-3 py-2">
            +{Math.round(completed * 0.44)} M-Pesa integrations
          </li>
          <li className="rounded-lg border border-border/70 px-3 py-2">
            +{Math.round(completed * 0.28)} custom domains
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Impact figures are illustrative until campaign events are attributed in the ledger.
        </p>
      </div>
      <div className="rounded-xl border border-border/70 bg-white p-4 text-sm">
        <p className="font-medium">Analysis</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Compared with your onboarding average, the strongest engagement is typically merchants who
          already added products but haven&apos;t published a storefront. Create a follow-up for
          those who opened but did not complete setup.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" type="button" asChild>
            <Link href={APP_ROUTES.superAdminCampaignNew}>Create follow-up</Link>
          </Button>
          <Button size="sm" variant="outline" type="button" asChild>
            <Link href={APP_ROUTES.superAdminCampaignNew}>Create similar campaign</Link>
          </Button>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Delivery</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border/70 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {detail.recipients.slice(0, 40).map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.email}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatWhen(p.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

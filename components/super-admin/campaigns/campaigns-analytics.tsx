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
  const failed = detail.recipientsFailed;
  const skipped = detail.recipientsSkipped;
  const targeted = detail.recipientsTargeted;

  return (
    <div className="mx-auto max-w-[860px] space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.status} · {formatWhen(detail.completedAt || detail.createdAt)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Targeted", targeted.toLocaleString()],
          ["Sent", sent.toLocaleString()],
          ["Failed", failed.toLocaleString()],
          ["Skipped", skipped.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-white px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-base font-semibold tabular-nums">{value}</p>
          </div>
        ))}
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
              {detail.recipients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No recipient rows on this campaign.
                  </td>
                </tr>
              ) : (
                detail.recipients.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">{p.email}</td>
                    <td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatWhen(p.sentAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" asChild>
          <Link href={APP_ROUTES.superAdminCampaignNew}>Create follow-up</Link>
        </Button>
      </div>
    </div>
  );
}

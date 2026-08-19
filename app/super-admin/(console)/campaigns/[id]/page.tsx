"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSaEmailCampaign,
  previewSavedSaEmailCampaign,
  type SaEmailCampaignDetail,
  type SaEmailPreview,
} from "@/lib/super-admin-api";

export default function SuperAdminCampaignDetailPage() {
  const params = useParams();
  const idRaw = params.id;
  const id =
    typeof idRaw === "string" ? idRaw : Array.isArray(idRaw) ? idRaw[0] : "";
  const [row, setRow] = useState<SaEmailCampaignDetail | null>(null);
  const [preview, setPreview] = useState<SaEmailPreview | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const campaign = await fetchSaEmailCampaign(id);
      setRow(campaign);
      const sample = campaign.recipients.find((person) => person.status === "SENT")
        ?? campaign.recipients[0];
      if (sample) {
        setPreview(await previewSavedSaEmailCampaign(id, sample.userId).catch(() => null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load campaign.");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!id) {
    return <AuthAlert variant="error">Missing campaign id.</AuthAlert>;
  }

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={row?.name || "Campaign"}
        description={row ? row.subject : "Delivery log for this send."}
        actions={
          <Button variant="outline" size="sm" type="button" asChild>
            <Link href={APP_ROUTES.superAdminCampaigns}>All campaigns</Link>
          </Button>
        }
      />
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {row ? (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{row.segmentKey.replaceAll("_", " ")}</Badge>
            <Badge>{row.status}</Badge>
            <span className="text-muted-foreground">
              {row.recipientsSent} sent · {row.recipientsFailed} failed · {row.recipientsSkipped} skipped
            </span>
          </div>
          {row.bodyMarkdown ? (
            <SaSection title="Body">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {row.bodyMarkdown}
              </pre>
            </SaSection>
          ) : null}
          {preview ? (
            <SaSection
              title="Rendered sample"
              description={`${preview.email} · continue URL is a preview placeholder for INVITED tokens`}
            >
              <div className="overflow-hidden rounded-xl border border-border/60 bg-[#F4F5F4]">
                <iframe title="Email preview" className="h-[520px] w-full" srcDoc={preview.html} />
              </div>
            </SaSection>
          ) : null}
          <SaSection title="Delivery" padded={false}>
            <ul className="divide-y divide-border/60 lg:hidden">
              {row.recipients.map((person) => (
                <li key={person.id} className="px-4 py-3 sm:px-5">
                  <p className="font-medium">{person.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={person.status === "SENT" ? "success" : person.status === "FAILED" ? "destructive" : "secondary"}>
                      {person.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{person.continueKind}</span>
                  </div>
                  {person.error ? (
                    <p className="mt-1 text-xs text-muted-foreground">{person.error}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {person.sentAt ? new Date(person.sentAt).toLocaleString() : "—"}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Continue</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Error</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {row.recipients.map((person) => (
                    <tr key={person.id}>
                      <td className="px-4 py-3 font-medium">{person.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{person.continueKind}</td>
                      <td className="px-4 py-3">
                        <Badge variant={person.status === "SENT" ? "success" : person.status === "FAILED" ? "destructive" : "secondary"}>
                          {person.status}
                        </Badge>
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground">
                        {person.error || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">
                        {person.sentAt ? new Date(person.sentAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SaSection>
        </>
      ) : null}
    </div>
  );
}

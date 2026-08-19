"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_ROUTES } from "@/lib/config";
import {
  createSaEmailCampaign,
  fetchSaEmailRecipients,
  previewSaEmailCampaign,
  sendSaEmailCampaign,
  type SaEmailPreview,
  type SaEmailRecipientRow,
} from "@/lib/super-admin-api";

const STUCK_SUBJECT = "Finish setting up {{businessName}} on Kiosk";
const STUCK_BODY = `Hi {{name}},

Thanks for signing up {{businessName}} on Kiosk. We found a snag in setup after email confirmation — that's on us.

Tap the button below to continue. You should land in your business hub without signing in again.

If the button does not work, open:
{{continueUrl}}

— Kiosk`;

const SEGMENTS: { key: string; label: string }[] = [
  { key: "stuck_signup", label: "Stuck signups" },
  { key: "unverified_owners", label: "Unverified owners" },
  { key: "selected_tenants", label: "Selected tenants" },
  { key: "selected_users", label: "Selected people" },
];

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function ComposerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const segment = searchParams.get("segment")?.trim() || "stuck_signup";
  const businessIds = useMemo(
    () => parseCsvParam(searchParams.get("businessIds")),
    [searchParams],
  );
  const userIds = useMemo(
    () => parseCsvParam(searchParams.get("userIds")),
    [searchParams],
  );

  const [name, setName] = useState(
    segment === "stuck_signup" ? "Stuck signups" : "Merchant email",
  );
  const [subject, setSubject] = useState(STUCK_SUBJECT);
  const [bodyMarkdown, setBodyMarkdown] = useState(STUCK_BODY);
  const [ctaLabel, setCtaLabel] = useState("Continue setup");
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<SaEmailRecipientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState<SaEmailPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const sendable = recipients.filter((r) => !r.skipReason).length;
  const skipped = recipients.filter((r) => r.skipReason).length;
  const visibleRecipients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return recipients;
    return recipients.filter(
      (row) =>
        row.email.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        row.businessName.toLowerCase().includes(needle) ||
        row.slug.toLowerCase().includes(needle),
    );
  }, [recipients, query]);

  const setSegment = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("segment", next);
    router.replace(`${APP_ROUTES.superAdminCampaignNew}?${params.toString()}`);
    if (next === "stuck_signup" && (name === "Merchant email" || name === "Stuck signups")) {
      setName("Stuck signups");
    }
  };

  const reloadAudience = useCallback(async () => {
    setLoadError("");
    try {
      const result = await fetchSaEmailRecipients({
        segment,
        businessIds,
        userIds,
      });
      setRecipients(result.rows);
      setTotal(result.total);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load recipients.");
    }
  }, [segment, businessIds, userIds]);

  useEffect(() => {
    void reloadAudience();
  }, [reloadAudience]);

  const payload = {
    name: name.trim() || "Untitled campaign",
    segmentKey: segment,
    businessIds: businessIds.length ? businessIds : undefined,
    userIds: userIds.length ? userIds : undefined,
    subject: subject.trim(),
    bodyMarkdown,
    ctaLabel: ctaLabel.trim() || "Continue setup",
  };

  const onPreview = async () => {
    setBusy(true);
    setLoadError("");
    try {
      setPreview(await previewSaEmailCampaign(payload));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Preview failed.";
      setLoadError(message);
      showThemedErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  const performSend = async () => {
    setBusy(true);
    setLoadError("");
    try {
      const draft = await createSaEmailCampaign(payload);
      const sent = await sendSaEmailCampaign(draft.id);
      showThemedSuccessToast(
        `Sent ${sent.recipientsSent} · failed ${sent.recipientsFailed} · skipped ${sent.recipientsSkipped}`,
      );
      router.push(`${APP_ROUTES.superAdminCampaigns}/${sent.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Send failed.";
      setLoadError(message);
      showThemedErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  const onSend = () => {
    showThemedConfirmToast({
      id: "send-platform-email-campaign",
      title: `Send to ${sendable} ${sendable === 1 ? "person" : "people"}?`,
      description:
        skipped > 0
          ? `${skipped} will be skipped (missing or synthetic email). From name is Kiosk.`
          : "From display name is Kiosk. This campaign cannot be run twice.",
      confirmLabel: "Send now",
      confirmVariant: "default",
      onConfirm: () => void performSend(),
    });
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Compose email"
        description="Markdown-lite body (paragraphs, **bold**, links). Continue links are filled per recipient: verify for INVITED, /business otherwise."
        actions={
          <Button variant="outline" size="sm" type="button" asChild>
            <Link href={APP_ROUTES.superAdminCampaigns}>History</Link>
          </Button>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <SaSection
        title="Audience"
        description={
          <>
            <span className="font-medium text-foreground tabular-nums">{total}</span> in this list
            {skipped > 0 ? ` · ${skipped} skipped` : ""}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {SEGMENTS.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={segment === option.key ? "default" : "outline"}
              onClick={() => setSegment(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 max-w-sm">
          <Label htmlFor="sa-campaign-filter" className="sr-only">
            Filter this list
          </Label>
          <Input
            id="sa-campaign-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this list"
          />
        </div>
        {visibleRecipients.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-muted-foreground">No recipients in this audience.</p>
        ) : (
          <>
            <ul className="mt-4 max-h-56 divide-y divide-border/60 overflow-auto lg:hidden">
              {visibleRecipients.map((row) => (
                <li key={row.userId} className="py-3">
                  <p className="font-medium">{row.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{row.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.businessName}
                    {row.slug ? ` · ${row.slug}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.skipReason ? (
                      <Badge variant="secondary">{row.skipReason.replaceAll("_", " ")}</Badge>
                    ) : (
                      <Badge variant="outline">{row.userStatus}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{row.continueKind}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden max-h-56 overflow-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-y border-border/60 bg-card text-muted-foreground">
                  <tr>
                    <th className="px-1 py-2 font-medium">Email</th>
                    <th className="px-1 py-2 font-medium">Shop</th>
                    <th className="px-1 py-2 font-medium">Status</th>
                    <th className="px-1 py-2 font-medium">Continue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {visibleRecipients.map((row) => (
                    <tr key={row.userId}>
                      <td className="px-1 py-2">
                        <div className="font-medium">{row.email || "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.name}</div>
                      </td>
                      <td className="px-1 py-2 text-muted-foreground">
                        {row.businessName}
                        <span className="block text-xs">{row.slug}</span>
                      </td>
                      <td className="px-1 py-2">
                        {row.skipReason ? (
                          <Badge variant="secondary">{row.skipReason.replaceAll("_", " ")}</Badge>
                        ) : (
                          <Badge variant="outline">{row.userStatus}</Badge>
                        )}
                      </td>
                      <td className="px-1 py-2 text-muted-foreground">{row.continueKind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SaSection>

      <SaSection
        title="Message"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy || sendable === 0} onClick={() => void onPreview()}>
              Preview
            </Button>
            <Button type="button" disabled={busy || sendable === 0} onClick={onSend}>
              {busy ? "Working…" : `Send to ${sendable}`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-campaign-name">Campaign name</Label>
              <Input id="sa-campaign-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-campaign-cta">Button label</Label>
              <Input id="sa-campaign-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-campaign-subject">Subject</Label>
            <Input id="sa-campaign-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-campaign-body">Body</Label>
            <Textarea
              id="sa-campaign-body"
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              rows={12}
              className="font-mono text-[13px] leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Merge tags: {"{{name}}"} {"{{email}}"} {"{{businessName}}"} {"{{shopUrl}}"} {"{{continueUrl}}"}
            </p>
          </div>
        </div>
      </SaSection>

      {preview ? (
        <SaSection
          title="Preview"
          description={`Sample for ${preview.email}. Continue URL in preview uses a placeholder token for INVITED users.`}
        >
          {preview.unknownTags.length > 0 ? (
            <AuthAlert variant="error">Unknown tags: {preview.unknownTags.join(", ")}</AuthAlert>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-[#F4F5F4]">
            <iframe
              title="Email preview"
              className="h-[640px] w-full bg-[#F4F5F4]"
              srcDoc={preview.html}
            />
          </div>
        </SaSection>
      ) : null}
    </div>
  );
}

export default function SuperAdminCampaignComposePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading composer…</p>}>
      <ComposerInner />
    </Suspense>
  );
}

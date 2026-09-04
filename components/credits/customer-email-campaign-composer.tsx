"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import {
  DEFAULT_MAIL_HTML,
  MAIL_FIELD,
  MAIL_FILTER_FIELDS,
  MAIL_INSET,
  MAIL_PANEL,
  MAIL_PILL_ACTIVE,
  MAIL_PILL_IDLE,
  MAIL_SHELL,
  MAIL_VARIABLES,
  formatMailHtml,
  mailSkipLabel,
} from "@/components/credits/customer-email-campaign-ui";
import { customerInitials } from "@/components/credits/customer-crm-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createCustomerEmailCampaign,
  fetchCustomerById,
  fetchCustomers,
  previewCustomerEmail,
  previewCustomerEmailAudience,
  sendCustomerEmailCampaign,
  updateCustomerEmailCampaign,
  type CustomerEmailAudienceFilter,
  type CustomerEmailAudiencePreview,
  type CustomerEmailCampaignDetail,
  type CustomerEmailFilterCondition,
  type CustomerEmailPreview,
  type CustomerEmailRecipientMethod,
  type CustomerRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type SelectedCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

const METHODS: Array<{
  id: CustomerEmailRecipientMethod;
  label: string;
  hint: string;
}> = [
  { id: "specific", label: "Specific", hint: "Pick people" },
  { id: "filtered", label: "Filtered", hint: "Build a list" },
  { id: "all_eligible", label: "Everyone", hint: "All eligible" },
];

export function CustomerEmailCampaignComposer({
  initialCampaign,
}: {
  initialCampaign?: CustomerEmailCampaignDetail | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [subject, setSubject] = useState(initialCampaign?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(
    initialCampaign?.bodyHtml ?? DEFAULT_MAIL_HTML,
  );
  const [method, setMethod] = useState<CustomerEmailRecipientMethod>(
    (initialCampaign?.recipientMethod as CustomerEmailRecipientMethod) ??
      "specific",
  );
  const [selected, setSelected] = useState<SelectedCustomer[]>([]);
  const [matchMode, setMatchMode] = useState<"ALL" | "ANY">(
    (initialCampaign?.filter?.matchMode as "ALL" | "ANY") ?? "ALL",
  );
  const [conditions, setConditions] = useState<CustomerEmailFilterCondition[]>(
    initialCampaign?.filter?.conditions?.length
      ? initialCampaign.filter.conditions
      : [{ field: "has_email", op: "eq", value: "true" }],
  );
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [audience, setAudience] = useState<CustomerEmailAudiencePreview | null>(
    null,
  );
  const [preview, setPreview] = useState<CustomerEmailPreview | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaign?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewPulse, setPreviewPulse] = useState(false);

  const filterPayload: CustomerEmailAudienceFilter = useMemo(
    () => ({ matchMode, conditions }),
    [matchMode, conditions],
  );

  const hydrateFromIds = useEffectEvent(async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return;
    const rows: SelectedCustomer[] = [];
    for (const id of unique.slice(0, 500)) {
      try {
        const c = await fetchCustomerById(id);
        rows.push({
          id: c.id,
          name: c.name,
          email: c.email ?? null,
          phone:
            c.phones?.find((p) => p.primary)?.phone ??
            c.phones?.[0]?.phone ??
            null,
        });
      } catch {
        /* skip */
      }
    }
    setSelected(rows);
    if (rows.length > 0) setMethod("specific");
  });

  useEffect(() => {
    const raw = searchParams.get("customerIds");
    if (!raw || initialCampaign) return;
    void hydrateFromIds(raw.split(",").map((s) => s.trim()));
  }, [searchParams, initialCampaign]);

  useEffect(() => {
    if (!initialCampaign?.recipients?.length) return;
    if (initialCampaign.recipientMethod !== "specific") return;
    setSelected(
      initialCampaign.recipients.map((r) => ({
        id: r.customerId,
        name: r.customerName ?? "Customer",
        email: r.email || null,
        phone: null,
      })),
    );
  }, [initialCampaign]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      void fetchCustomers(q, { flexible: true, size: 20 })
        .then((rows) => {
          if (!cancelled) setHits(rows);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const refreshAudience = useCallback(async () => {
    setError(null);
    try {
      const body =
        method === "specific"
          ? {
              recipientMethod: method,
              customerIds: selected.map((s) => s.id),
            }
          : method === "filtered"
            ? { recipientMethod: method, filter: filterPayload }
            : { recipientMethod: method };
      const next = await previewCustomerEmailAudience(body);
      setAudience(next);
      return next;
    } catch (err) {
      setAudience(null);
      setError(
        err instanceof Error ? err.message : "Could not preview audience",
      );
      return null;
    }
  }, [method, selected, filterPayload]);

  useEffect(() => {
    startTransition(() => {
      void refreshAudience();
    });
  }, [refreshAudience]);

  const insertVariable = (tag: string) => {
    const token = `{{${tag}}}`;
    const el = editorRef.current;
    if (!el) {
      setBodyHtml((prev) => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart ?? bodyHtml.length;
    const end = el.selectionEnd ?? start;
    const next = `${bodyHtml.slice(0, start)}${token}${bodyHtml.slice(end)}`;
    setBodyHtml(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const addCustomer = (row: CustomerRecord) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === row.id)) return prev;
      return [
        ...prev,
        {
          id: row.id,
          name: row.name,
          email: row.email ?? null,
          phone:
            row.phones?.find((p) => p.primary)?.phone ??
            row.phones?.[0]?.phone ??
            null,
        },
      ];
    });
  };

  const blockingError = useMemo(() => {
    if (!name.trim()) return "Give this send an internal name";
    if (!subject.trim()) return "Add a subject line";
    if (!bodyHtml.trim()) return "HTML content is required";
    if ((audience?.finalRecipients ?? 0) < 1) {
      return "Need at least one eligible recipient";
    }
    return null;
  }, [name, subject, bodyHtml, audience]);

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const body =
        method === "specific"
          ? {
              subject,
              bodyHtml,
              recipientMethod: method,
              customerIds: selected.map((s) => s.id),
            }
          : method === "filtered"
            ? {
                subject,
                bodyHtml,
                recipientMethod: method,
                filter: filterPayload,
              }
            : { subject, bodyHtml, recipientMethod: method };
      const next = await previewCustomerEmail(body);
      setPreview(next);
      setPreviewPulse(true);
      window.setTimeout(() => setPreviewPulse(false), 420);
      if (next.unknownVariables.length > 0) {
        setError(
          `Unsupported variables: ${next.unknownVariables.map((v) => `{{${v}}}`).join(", ")}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (blockingError) {
      setError(blockingError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml,
        recipientMethod: method,
        customerIds:
          method === "specific" ? selected.map((s) => s.id) : undefined,
        filter: method === "filtered" ? filterPayload : undefined,
      };
      const saved = campaignId
        ? await updateCustomerEmailCampaign(campaignId, payload)
        : await createCustomerEmailCampaign(payload);
      setCampaignId(saved.id);
      setStatus("Draft saved");
      if (!campaignId) {
        router.replace(APP_ROUTES.customerEmailCampaign(saved.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setBusy(false);
    }
  };

  const openReview = async () => {
    if (blockingError) {
      setError(blockingError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runPreview();
      const counts = await refreshAudience();
      if (!counts || counts.finalRecipients < 1) {
        setError("Need at least one eligible recipient");
        return;
      }
      setConfirmPhrase("");
      setReviewOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const confirmSend = async () => {
    if (method === "all_eligible" && confirmPhrase.trim() !== "SEND") {
      setError("Type SEND to confirm");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml,
        recipientMethod: method,
        customerIds:
          method === "specific" ? selected.map((s) => s.id) : undefined,
        filter: method === "filtered" ? filterPayload : undefined,
      };
      const draft = campaignId
        ? await updateCustomerEmailCampaign(campaignId, payload)
        : await createCustomerEmailCampaign(payload);
      setCampaignId(draft.id);
      const sent = await sendCustomerEmailCampaign(draft.id, {
        confirmPhrase: method === "all_eligible" ? "SEND" : undefined,
      });
      setReviewOpen(false);
      setStatus(
        `Sent ${sent.recipientsSent} · skipped ${sent.recipientsSkipped} · failed ${sent.recipientsFailed}`,
      );
      router.push(APP_ROUTES.customerEmailCampaign(sent.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={MAIL_SHELL}>
      <div
        className={cn(
          "flex min-h-0 flex-col gap-3",
          "lg:h-full lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card lg:shadow-sm lg:ring-1 lg:ring-black/[0.02]",
        )}
      >
        {/* Top bar */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,#8B6F3A_6%,transparent)_0%,transparent_100%)] px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
              <Link href={APP_ROUTES.customerEmailCampaigns} aria-label="Back">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {name.trim() || "New email"}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {subject.trim() || "Compose for customers in this shop"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={busy}
              onClick={() => void saveDraft()}
            >
              Save draft
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#8B6F3A] text-[#FFFDF8] hover:bg-[#7a6133]"
              disabled={busy || Boolean(blockingError)}
              onClick={() => void openReview()}
            >
              <Send className="mr-1.5 size-3.5" />
              Review & send
            </Button>
          </div>
        </header>

        {(error || status) && (
          <div className="shrink-0 px-3 pt-2 sm:px-5">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-900 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
              >
                {error}
              </div>
            ) : null}
            {status && !error ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                {status}
              </div>
            ) : null}
          </div>
        )}

        {/* Studio grid */}
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-0 lg:overflow-hidden lg:divide-x lg:divide-border/60">
          {/* Compose column */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-0 pb-4 lg:gap-0 lg:px-0 lg:pb-0">
            <div className="space-y-5 p-3 sm:p-5 lg:overflow-y-auto">
              {/* Details */}
              <section className="space-y-3">
                <SectionLabel>Message</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Internal name" htmlFor="mail-name">
                    <input
                      id="mail-name"
                      className={MAIL_FIELD}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Weekend restock offer"
                    />
                  </Field>
                  <Field label="Subject" htmlFor="mail-subject">
                    <input
                      id="mail-subject"
                      className={MAIL_FIELD}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Your weekend reward is waiting"
                    />
                  </Field>
                </div>
              </section>

              {/* Recipients */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <SectionLabel>Who receives it</SectionLabel>
                  <AudienceMeter audience={audience} pending={pending} />
                </div>

                <div
                  role="tablist"
                  aria-label="Recipient method"
                  className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:w-auto"
                >
                  {METHODS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={method === tab.id}
                      onClick={() => setMethod(tab.id)}
                      className={cn(
                        "min-w-[6.5rem] flex-1 rounded-lg px-3 py-2 text-left transition-colors duration-150 sm:flex-none",
                        method === tab.id ? MAIL_PILL_ACTIVE : MAIL_PILL_IDLE,
                      )}
                    >
                      <span className="block text-xs font-semibold">
                        {tab.label}
                      </span>
                      <span className="block text-[10px] opacity-70">
                        {tab.hint}
                      </span>
                    </button>
                  ))}
                </div>

                {method === "specific" ? (
                  <SpecificPicker
                    query={query}
                    onQuery={setQuery}
                    hits={hits}
                    searching={searching}
                    selected={selected}
                    onAdd={addCustomer}
                    onRemove={(id) =>
                      setSelected((prev) => prev.filter((p) => p.id !== id))
                    }
                    onClear={() => setSelected([])}
                  />
                ) : null}

                {method === "filtered" ? (
                  <FilterBuilder
                    matchMode={matchMode}
                    onMatchMode={setMatchMode}
                    conditions={conditions}
                    onConditions={setConditions}
                  />
                ) : null}

                {method === "all_eligible" ? (
                  <div className={cn(MAIL_INSET, "px-3.5 py-3 text-sm text-muted-foreground")}>
                    Every active customer with a usable email. Final send asks
                    you to type <span className="font-semibold text-foreground">SEND</span>.
                  </div>
                ) : null}

                {audience && audience.excludedSample.length > 0 ? (
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950">
                    <p className="font-medium">
                      {audience.automaticallyExcluded.toLocaleString()} automatically
                      excluded
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-amber-900/80">
                      {audience.excludedSample.slice(0, 4).map((row) => (
                        <li key={row.customerId}>
                          {row.name} — {mailSkipLabel(row.skipReason)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              {/* Editor */}
              <section
                className={cn(
                  "space-y-3",
                  fullscreen &&
                    "fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-2xl",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>HTML</SectionLabel>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => setBodyHtml((v) => formatMailHtml(v))}
                    >
                      Format
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => setFullscreen((v) => !v)}
                    >
                      {fullscreen ? (
                        <Minimize2 className="mr-1 size-3.5" />
                      ) : (
                        <Maximize2 className="mr-1 size-3.5" />
                      )}
                      {fullscreen ? "Exit" : "Expand"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {MAIL_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      title={v.label}
                      className="rounded-md border border-border/70 bg-[#F9F6F0]/80 px-2 py-1 font-mono text-[10px] text-[#6b5530] transition-colors hover:border-[#8B6F3A]/35 hover:bg-[#F9F6F0]"
                      onClick={() => insertVariable(v.tag)}
                    >
                      {`{{${v.tag}}}`}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  spellCheck={false}
                  className={cn(
                    "w-full flex-1 rounded-xl border border-border/70 bg-[#1a1714] p-3.5 font-mono text-[12px] leading-5 text-[#f5f0e8]",
                    "outline-none selection:bg-[#8B6F3A]/40",
                    "focus-visible:ring-2 focus-visible:ring-[#8B6F3A]/35",
                    fullscreen ? "min-h-0" : "min-h-[220px]",
                  )}
                />
              </section>
            </div>
          </div>

          {/* Preview column */}
          <aside className="flex min-h-0 flex-col lg:overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
              <p className="text-xs font-semibold tracking-tight text-foreground">
                Preview
              </p>
              <div className="flex items-center gap-1">
                <DeviceToggle device={device} onDevice={setDevice} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs"
                  disabled={busy}
                  onClick={() => void runPreview()}
                >
                  <RefreshCw
                    className={cn("mr-1 size-3.5", busy && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "relative flex min-h-[22rem] flex-1 items-start justify-center overflow-auto",
                "bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,#8B6F3A_10%,transparent)_0%,transparent_55%),linear-gradient(165deg,#f7f3eb_0%,#efe8dc_48%,#e8dfd0_100%)]",
                "p-4 sm:p-6",
              )}
            >
              <div
                className={cn(
                  "w-full transition-[transform,opacity,filter] duration-300 ease-out",
                  device === "mobile" ? "max-w-[375px]" : "max-w-[640px]",
                  previewPulse &&
                    "motion-safe:scale-[0.985] motion-safe:opacity-90",
                )}
              >
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl border border-[#d9cfc0] bg-white shadow-[0_18px_40px_-18px_rgba(60,40,10,0.45)]",
                    device === "mobile" && "rounded-[1.35rem]",
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-[#efe8dc] bg-[#FFFDF8] px-3 py-2">
                    <span className="size-2 rounded-full bg-[#e8d9c4]" />
                    <span className="size-2 rounded-full bg-[#e8d9c4]" />
                    <span className="size-2 rounded-full bg-[#e8d9c4]" />
                    <span className="ml-2 truncate text-[10px] text-[#8a7a62]">
                      {preview?.sampleEmail || "sample@customer"}
                    </span>
                  </div>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={
                      preview?.html ??
                      `<div style="font-family:system-ui,sans-serif;color:#78716c;padding:48px 28px;text-align:center;font-size:14px;line-height:1.5">
                        Refresh preview to render with customer sample data.
                      </div>`
                    }
                    className="min-h-[420px] w-full bg-white"
                  />
                </div>
                {preview ? (
                  <p className="mt-3 text-center text-[11px] text-[#7a6a52]">
                    Sample: {preview.sampleCustomerName}
                    {preview.unknownVariables.length > 0
                      ? ` · ${preview.unknownVariables.length} unknown tag(s)`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border/50 bg-card/80 px-3 py-3 sm:px-4">
              <p className="text-[11px] text-muted-foreground">
                {blockingError ??
                  `${audience?.finalRecipients.toLocaleString() ?? 0} will get this email`}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {reviewOpen ? (
        <ReviewSheet
          name={name}
          subject={subject}
          method={method}
          audience={audience}
          confirmPhrase={confirmPhrase}
          onConfirmPhrase={setConfirmPhrase}
          busy={busy}
          onBack={() => setReviewOpen(false)}
          onSend={() => void confirmSend()}
        />
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h2>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function AudienceMeter({
  audience,
  pending,
}: {
  audience: CustomerEmailAudiencePreview | null;
  pending: boolean;
}) {
  if (!audience && !pending) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {audience ? (
        <>
          <span>{audience.matched.toLocaleString()} matched</span>
          <span className="text-border">·</span>
          <span>{audience.automaticallyExcluded.toLocaleString()} out</span>
          <span className="text-border">·</span>
          <span className="font-semibold text-[#8B6F3A]">
            {audience.finalRecipients.toLocaleString()} final
          </span>
        </>
      ) : (
        <span>Counting…</span>
      )}
    </div>
  );
}

function DeviceToggle({
  device,
  onDevice,
}: {
  device: "desktop" | "mobile";
  onDevice: (d: "desktop" | "mobile") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
      {(
        [
          { id: "desktop" as const, Icon: Monitor },
          { id: "mobile" as const, Icon: Smartphone },
        ] as const
      ).map(({ id, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={id}
          onClick={() => onDevice(id)}
          className={cn(
            "rounded-md p-1.5 transition-colors duration-150",
            device === id ? MAIL_PILL_ACTIVE : MAIL_PILL_IDLE,
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

function SpecificPicker({
  query,
  onQuery,
  hits,
  searching,
  selected,
  onAdd,
  onRemove,
  onClear,
}: {
  query: string;
  onQuery: (v: string) => void;
  hits: CustomerRecord[];
  searching: boolean;
  selected: SelectedCustomer[];
  onAdd: (row: CustomerRecord) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          className={MAIL_FIELD}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, phone, or email"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
        ) : null}
        {hits.length > 0 ? (
          <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-border/70 bg-card shadow-lg ring-1 ring-black/[0.03]">
            {hits.map((hit) => {
              const picked = selected.some((s) => s.id === hit.id);
              return (
                <button
                  key={hit.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onAdd(hit)}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F9F6F0] text-[10px] font-semibold text-[#8B6F3A]">
                    {customerInitials(hit.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hit.email || "No email"}
                    </span>
                  </span>
                  {picked ? (
                    <Check className="size-4 shrink-0 text-[#8B6F3A]" />
                  ) : (
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{selected.length} selected</span>
        {selected.length > 0 ? (
          <button
            type="button"
            className="text-[#8B6F3A] underline-offset-2 hover:underline"
            onClick={onClear}
          >
            Clear all
          </button>
        ) : null}
      </div>

      {selected.length > 0 && selected.length <= 10 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-[#F9F6F0]/70 py-1 pl-1 pr-2 text-xs"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-[#8B6F3A]/15 text-[9px] font-semibold text-[#8B6F3A]">
                {customerInitials(s.name)}
              </span>
              <span className="truncate">{s.name}</span>
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                className="rounded-full p-0.5 hover:bg-black/5"
                onClick={() => onRemove(s.id)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selected.length > 10 ? (
        <div className={cn(MAIL_PANEL, "max-h-48 overflow-auto")}>
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/50 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {selected.map((s) => (
                <tr key={s.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.email || "No email"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-700"
                      onClick={() => onRemove(s.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function FilterBuilder({
  matchMode,
  onMatchMode,
  conditions,
  onConditions,
}: {
  matchMode: "ALL" | "ANY";
  onMatchMode: (m: "ALL" | "ANY") => void;
  conditions: CustomerEmailFilterCondition[];
  onConditions: (
    next:
      | CustomerEmailFilterCondition[]
      | ((
          prev: CustomerEmailFilterCondition[],
        ) => CustomerEmailFilterCondition[]),
  ) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(
          [
            { id: "ALL" as const, label: "Match all (AND)" },
            { id: "ANY" as const, label: "Match any (OR)" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onMatchMode(opt.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 transition-colors duration-150",
              matchMode === opt.id ? MAIL_PILL_ACTIVE : MAIL_PILL_IDLE,
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => {
          const meta =
            MAIL_FILTER_FIELDS.find((f) => f.field === condition.field) ??
            MAIL_FILTER_FIELDS[0]!;
          return (
            <div
              key={`${condition.field}-${index}`}
              className={cn(
                MAIL_INSET,
                "grid gap-2 p-2.5 sm:grid-cols-[1.15fr_0.9fr_1.2fr_auto]",
              )}
            >
              <select
                className={MAIL_FIELD}
                value={condition.field}
                onChange={(e) => {
                  const nextField = e.target.value;
                  const nextMeta =
                    MAIL_FILTER_FIELDS.find((f) => f.field === nextField) ??
                    MAIL_FILTER_FIELDS[0]!;
                  onConditions((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? {
                            field: nextField,
                            op: nextMeta.ops[0]?.value ?? "eq",
                            value: nextMeta.enumValues?.[0]?.value ?? "",
                            valueTo: "",
                            days: null,
                          }
                        : row,
                    ),
                  );
                }}
              >
                {MAIL_FILTER_FIELDS.map((f) => (
                  <option key={f.field} value={f.field}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                className={MAIL_FIELD}
                value={condition.op}
                onChange={(e) =>
                  onConditions((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, op: e.target.value } : row,
                    ),
                  )
                }
              >
                {meta.ops.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {condition.op === "never" ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  No purchases on record
                </div>
              ) : condition.op === "last_x_days" ? (
                <input
                  type="number"
                  min={1}
                  className={MAIL_FIELD}
                  value={condition.days ?? condition.value ?? ""}
                  onChange={(e) =>
                    onConditions((prev) =>
                      prev.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              days: Number(e.target.value) || null,
                              value: e.target.value,
                            }
                          : row,
                      ),
                    )
                  }
                  placeholder="Days"
                />
              ) : meta.valueKind === "enum" ? (
                <select
                  className={MAIL_FIELD}
                  value={condition.value ?? ""}
                  onChange={(e) =>
                    onConditions((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, value: e.target.value } : row,
                      ),
                    )
                  }
                >
                  {meta.enumValues?.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              ) : condition.op === "between" ? (
                <div className="flex gap-2">
                  <input
                    type={meta.valueKind === "date" ? "date" : "number"}
                    className={MAIL_FIELD}
                    value={condition.value ?? ""}
                    onChange={(e) =>
                      onConditions((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, value: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <input
                    type={meta.valueKind === "date" ? "date" : "number"}
                    className={MAIL_FIELD}
                    value={condition.valueTo ?? ""}
                    onChange={(e) =>
                      onConditions((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, valueTo: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </div>
              ) : (
                <input
                  type={
                    meta.valueKind === "date"
                      ? "date"
                      : meta.valueKind === "number"
                        ? "number"
                        : "text"
                  }
                  className={MAIL_FIELD}
                  value={condition.value ?? ""}
                  onChange={(e) =>
                    onConditions((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, value: e.target.value } : row,
                      ),
                    )
                  }
                />
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9"
                onClick={() =>
                  onConditions((prev) => prev.filter((_, i) => i !== index))
                }
                disabled={conditions.length <= 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={() =>
          onConditions((prev) => [
            ...prev,
            { field: "origin", op: "eq", value: "staff" },
          ])
        }
      >
        <Plus className="mr-1 size-3.5" />
        Add condition
      </Button>
    </div>
  );
}

function ReviewSheet({
  name,
  subject,
  method,
  audience,
  confirmPhrase,
  onConfirmPhrase,
  busy,
  onBack,
  onSend,
}: {
  name: string;
  subject: string;
  method: CustomerEmailRecipientMethod;
  audience: CustomerEmailAudiencePreview | null;
  confirmPhrase: string;
  onConfirmPhrase: (v: string) => void;
  busy: boolean;
  onBack: () => void;
  onSend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className={cn(
          "w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 sm:motion-safe:zoom-in-95",
        )}
      >
        <div className="border-b border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,#8B6F3A_8%,transparent),transparent)] px-5 py-4">
          <h3 id="review-title" className="text-base font-semibold tracking-tight">
            Ready to send?
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Double-check the audience before this leaves the shop.
          </p>
        </div>
        <dl className="space-y-2.5 px-5 py-4 text-sm">
          <Row label="Name" value={name} />
          <Row label="Subject" value={subject} />
          <Row
            label="Audience"
            value={method.replace("_", " ")}
            capitalize
          />
          <Row
            label="Matched"
            value={(audience?.matched ?? 0).toLocaleString()}
          />
          <Row
            label="Excluded"
            value={(audience?.automaticallyExcluded ?? 0).toLocaleString()}
          />
          <div className="flex items-baseline justify-between gap-3 border-t border-border/50 pt-2.5">
            <dt className="text-muted-foreground">Final recipients</dt>
            <dd className="text-lg font-semibold tabular-nums text-[#8B6F3A]">
              {(audience?.finalRecipients ?? 0).toLocaleString()}
            </dd>
          </div>
        </dl>
        {method === "all_eligible" ? (
          <div className="space-y-1.5 px-5 pb-2">
            <Label htmlFor="confirm-send" className="text-xs">
              Type SEND to confirm everyone
            </Label>
            <input
              id="confirm-send"
              className={MAIL_FIELD}
              value={confirmPhrase}
              onChange={(e) => onConfirmPhrase(e.target.value)}
              placeholder="SEND"
              autoComplete="off"
              autoFocus
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={onBack}
          >
            Back to edit
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#8B6F3A] text-[#FFFDF8] hover:bg-[#7a6133]"
            disabled={
              busy ||
              (method === "all_eligible" && confirmPhrase.trim() !== "SEND")
            }
            onClick={onSend}
          >
            {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Send email
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-w-[60%] text-right font-medium",
          capitalize && "capitalize",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

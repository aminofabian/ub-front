"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send, Users } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  bulkSendStaffSms,
  fetchStaffSmsTemplates,
  previewStaffSms,
  sendStaffSms,
  type PayrollRunRow,
  type StaffSmsTemplate,
} from "@/lib/api";

type Scope = "one" | "pending" | "all";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PayrollRunRow[];
  targetUserId?: string | null;
  targetName?: string;
  onSent?: (message: string) => void;
};

export function StaffSmsDrawer({
  open,
  onOpenChange,
  rows,
  targetUserId,
  targetName,
  onSent,
}: Props) {
  const [templates, setTemplates] = useState<StaffSmsTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateKey, setTemplateKey] = useState("complete_profile");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<Scope>("one");
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewPhone, setPreviewPhone] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.key === templateKey);

  const recipients = useMemo(() => {
    if (scope === "one" && targetUserId) {
      return rows.filter((r) => r.userId === targetUserId);
    }
    if (scope === "pending") {
      return rows.filter(
        (r) =>
          !r.alreadyPaid &&
          r.employmentStatus !== "on_leave" &&
          Number(r.baseSalary) > 0,
      );
    }
    return rows.filter((r) => r.employmentStatus !== "terminated");
  }, [rows, scope, targetUserId]);

  useEffect(() => {
    if (!open) return;
    setLoadingTemplates(true);
    void fetchStaffSmsTemplates()
      .then((data) => {
        setTemplates(data);
        const tpl = data.find((t) => t.key === "complete_profile") ?? data[0];
        if (tpl) setBody(tpl.defaultBody);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
    setScope(targetUserId ? "one" : "pending");
    setTemplateKey("complete_profile");
    setBody("");
    setPreviewPhone(null);
  }, [open, targetUserId]);

  const loadPreview = useCallback(async () => {
    const userId = recipients[0]?.userId ?? targetUserId;
    if (!userId) return;
    setPreviewing(true);
    try {
      const preview = await previewStaffSms(userId, {
        templateKey,
        bodyOverride: body.trim() || undefined,
      });
      setBody(preview.renderedBody);
      setPreviewPhone(preview.phoneAvailable ? preview.phone : null);
    } finally {
      setPreviewing(false);
    }
  }, [recipients, targetUserId, templateKey, body]);

  useEffect(() => {
    if (!open || recipients.length === 0) return;
    const timer = window.setTimeout(() => void loadPreview(), 300);
    return () => window.clearTimeout(timer);
  }, [open, templateKey, body, recipients.length, loadPreview]);

  async function handleSend() {
    setSending(true);
    try {
      if (scope === "one") {
        const userId = recipients[0]?.userId ?? targetUserId;
        if (!userId) return;
        const result = await sendStaffSms(userId, {
          templateKey,
          bodyOverride: body.trim() || undefined,
        });
        onSent?.(
          result.sent
            ? `SMS sent to ${result.staffName}.`
            : `SMS queued for ${result.staffName} (${result.providerStatus}).`,
        );
      } else {
        const result = await bulkSendStaffSms({
          userIds: recipients.map((r) => r.userId),
          templateKey,
          bodyOverride: body.trim() || undefined,
        });
        onSent?.(
          `SMS sent to ${result.sent} staff` +
            (result.skipped > 0 ? ` · ${result.skipped} skipped` : "") +
            ".",
        );
      }
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  const title =
    scope === "one"
      ? `Message ${targetName ?? recipients[0]?.displayName ?? "staff"}`
      : "Message staff";

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Optional SMS — edit the text before sending. Uses your shop SMS settings."
      contextLabel="Payroll"
      icon={<MessageSquare className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={sending || recipients.length === 0 || !body.trim()}
            onClick={() => void handleSend()}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <>
                <Send className="mr-1.5 size-4" aria-hidden />
                Send to {recipients.length}
              </>
            )}
          </Button>
        </div>
      }
    >
      {!targetUserId ? (
        <div className="mb-4 flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
          {(
            [
              ["pending", "Pending pay", Users],
              ["all", "All staff", Users],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium",
                scope === key
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setScope(key)}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <FormDrawerFields
        legend="Template"
        hint="Pick a starting message — placeholders like {name} and {missing} fill in automatically."
      >
        {loadingTemplates ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading templates…
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.key}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  templateKey === template.key
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-muted/20 hover:bg-muted/35",
                )}
                onClick={() => {
                  setTemplateKey(template.key);
                  setBody(template.defaultBody);
                }}
              >
                <span className="block font-medium">{template.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Message <span className="font-normal">(editable)</span>
          <textarea
            className="min-h-[120px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
            {previewPhone ? ` · preview phone ${previewPhone}` : ""}
          </span>
          <span>{body.length}/480</span>
        </div>

        {selectedTemplate ? (
          <p className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Placeholders: {selectedTemplate.placeholders.join(", ")}
          </p>
        ) : null}

        {previewing ? (
          <p className="text-xs text-muted-foreground">Refreshing preview…</p>
        ) : null}
      </FormDrawerFields>
    </FormDrawer>
  );
}

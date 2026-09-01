"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { SmsCreditsDepletedBanner } from "@/components/messaging/sms-credits-header";
import { Button } from "@/components/ui/button";
import { bulkSendCustomerSms } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[];
  recipientLabel: string;
  onSent?: (message: string, kind?: "success" | "error") => void;
};

const DEFAULT_BODY = "Hi {name}, ";

export function CustomerBulkSmsDrawer({
  open,
  onOpenChange,
  customerIds,
  recipientLabel,
  onSent,
}: Props) {
  const [body, setBody] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const result = await bulkSendCustomerSms({
        customerIds,
        body: body.trim(),
      });
      const kind =
        result.sent > 0 && result.failures.length === 0 ? "success" : "error";
      const summary =
        result.failures.length > 0
          ? `Sent ${result.sent}, skipped ${result.skipped}. ${result.failures[0]?.reason ?? ""}`
          : `Sent ${result.sent} message${result.sent === 1 ? "" : "s"}.`;
      onSent?.(summary, kind);
      if (kind === "success") onOpenChange(false);
    } catch (e) {
      onSent?.(
        e instanceof Error ? e.message : "Could not send messages.",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Message customers"
      description={`SMS to ${recipientLabel}`}
    >
      <FormDrawerFields>
        <SmsCreditsDepletedBanner />
        <p className="text-sm text-muted-foreground">
          Use <code className="rounded bg-muted px-1">{"{name}"}</code> and{" "}
          <code className="rounded bg-muted px-1">{"{shop}"}</code> to personalize.
          Only customers with a usable phone number are included.
        </p>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Message</span>
          <textarea
            className="min-h-[140px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sending}
          />
        </label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          {customerIds.length} recipient{customerIds.length === 1 ? "" : "s"} selected
        </div>
        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={sending || customerIds.length === 0 || !body.trim()}
          onClick={() => void onSend()}
        >
          {sending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          {sending ? "Sending…" : "Send SMS"}
        </Button>
      </FormDrawerFields>
    </FormDrawer>
  );
}

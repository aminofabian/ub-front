"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { dashboardTextareaClass } from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { SmsCreditsDepletedBanner } from "@/components/messaging/sms-credits-header";
import { Button } from "@/components/ui/button";
import { bulkSendCustomerSms } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

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
  // This drawer does not check marketing consent, so it is for service messages only
  // (docs/scopes/SMS_HUB_SCOPE.md §6). Offers go through SMS campaigns, which do.
  const [serviceOnly, setServiceOnly] = useState(false);

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
      title="Send a service message"
      description={`SMS to ${recipientLabel}`}
    >
      <FormDrawerFields>
        <SmsCreditsDepletedBanner />
        <p className="text-sm">
          For news a customer needs, such as an order that is ready, a change
          to opening hours or a balance on their tab. To send an offer or
          promotion, use{" "}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href={APP_ROUTES.customerSms}
          >
            SMS campaigns
          </Link>
          , which only text customers who agreed to offers.
        </p>
        <p className="text-sm text-muted-foreground">
          Use <code className="rounded bg-muted px-1">{"{name}"}</code> and{" "}
          <code className="rounded bg-muted px-1">{"{shop}"}</code> to
          personalize. Only customers with a usable phone number are included.
        </p>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Message</span>
          <textarea
            className={cn(dashboardTextareaClass(sending), "min-h-[140px]")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sending}
          />
        </label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          {customerIds.length} recipient{customerIds.length === 1 ? "" : "s"}{" "}
          selected
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={serviceOnly}
            disabled={sending}
            onChange={(e) => setServiceOnly(e.target.checked)}
          />
          <span>This is a service message, not an offer or promotion.</span>
        </label>
        <Button
          type="button"
          className="w-full rounded-none"
          disabled={
            sending ||
            customerIds.length === 0 ||
            !body.trim() ||
            !serviceOnly
          }
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

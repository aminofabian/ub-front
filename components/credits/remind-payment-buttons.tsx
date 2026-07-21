"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  remindCustomerPayment,
  type CreditSaleReminderTestResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Channel = "auto" | "whatsapp" | "sms";

type RemindPaymentButtonsProps = {
  customerId: string;
  disabled?: boolean;
  onResult: (result: {
    ok: boolean;
    text: string;
    detail?: CreditSaleReminderTestResult;
  }) => void;
};

function outcomeMessage(
  channel: Channel,
  res: CreditSaleReminderTestResult,
): { ok: boolean; text: string } {
  const via =
    res.channel === "whatsapp"
      ? "WhatsApp"
      : res.channel === "sms"
        ? "SMS"
        : res.channel || "message";
  if (res.outcome === "sent" || res.outcome === "stub") {
    return {
      ok: true,
      text:
        channel === "auto"
          ? `Reminder sent via ${via}.`
          : `Reminder sent via ${via}.`,
    };
  }
  if (res.outcome === "skipped") {
    return {
      ok: false,
      text: res.detail?.trim() || "Reminder skipped — check messaging setup.",
    };
  }
  return {
    ok: false,
    text: res.detail?.trim() || `Could not send ${via} reminder.`,
  };
}

export function RemindPaymentButtons({
  customerId,
  disabled,
  onResult,
}: RemindPaymentButtonsProps) {
  const [busy, setBusy] = useState<Channel | null>(null);

  const send = async (channel: Channel) => {
    if (busy || disabled) return;
    setBusy(channel);
    try {
      const res = await remindCustomerPayment(customerId, channel);
      const msg = outcomeMessage(channel, res);
      onResult({ ok: msg.ok, text: msg.text, detail: res });
    } catch (e) {
      onResult({
        ok: false,
        text: e instanceof Error ? e.message : "Could not send reminder.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2"
        disabled={disabled || busy != null}
        title="Remind via WhatsApp, falling back to SMS"
        onClick={() => void send("auto")}
      >
        {busy === "auto" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Send className="size-3.5" aria-hidden />
        )}
        Remind
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "h-8 px-2 text-muted-foreground",
          "hover:text-emerald-700 dark:hover:text-emerald-300",
        )}
        disabled={disabled || busy != null}
        title="WhatsApp only"
        aria-label="Remind via WhatsApp"
        onClick={() => void send("whatsapp")}
      >
        {busy === "whatsapp" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <span className="text-[11px] font-semibold tracking-tight">WA</span>
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "h-8 px-2 text-muted-foreground",
          "hover:text-sky-700 dark:hover:text-sky-300",
        )}
        disabled={disabled || busy != null}
        title="SMS only"
        aria-label="Remind via SMS"
        onClick={() => void send("sms")}
      >
        {busy === "sms" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <MessageSquare className="size-3.5" aria-hidden />
        )}
      </Button>
    </div>
  );
}

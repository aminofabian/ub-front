"use client";

import { MessageCircle } from "lucide-react";

import { CreditSaleReminderSettings } from "@/components/credits/credit-sale-reminder-settings";
import { SmsTestPanel } from "@/components/credits/sms-test-panel";
import { WhatsAppTestPanel } from "@/components/credits/whatsapp-test-panel";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
};

export function CustomerMessagingDrawer({ open, onOpenChange, canEdit }: Props) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      width="wide"
      contextLabel="Customers"
      title="Messaging"
      description="Reminders, templates, and test sends for customer outreach."
      icon={
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MessageCircle className="size-5" />
        </span>
      }
    >
      <FormDrawerFields>
        <CreditSaleReminderSettings canEdit={canEdit} />
        <WhatsAppTestPanel canSend={canEdit} />
        <SmsTestPanel canSend={canEdit} />
      </FormDrawerFields>
    </FormDrawer>
  );
}

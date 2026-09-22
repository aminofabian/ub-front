import { PLATFORM_DOMAIN } from "@/lib/config";

const EMAIL_ASSET = (path: string) =>
  `https://${PLATFORM_DOMAIN}/email/${path}`;

export const CREDITS_PAY_LINK_EMAIL_SUBJECT =
  "New: customers clear their tab on their phone — you get a text when they pay";

export const CREDITS_PAY_LINK_EMAIL_PREVIEW =
  "Sale on credit → pay link → balance updates → you’re notified by SMS.";

export const CREDITS_PAY_LINK_CTA = "Open On tab";

/**
 * Feature guide: automated credit collection via customer pay link + owner SMS.
 */
export const CREDITS_PAY_LINK_EMAIL_BODY = `Hi {{name}},

**Credits on Kiosk just got quieter — in a good way.**

When someone at {{businessName}} takes items **on credit**, they can get a **pay link** on WhatsApp or SMS.

They tap the link, pay (M-Pesa), and two things happen automatically:

1. **Their tab balance updates** — no chasing, no manual “mark paid” guesswork.
2. **You get a text** that they paid — so you know the money landed without refreshing the board.

No chasing receipts at closing. No “did you pay?” WhatsApps at 10pm.

---

**How the loop works**

**1. Sell on tab as usual**

Ring the sale. Put the balance on the customer’s tab.
Kiosk already knows who owes what.

![Step 1 — Sale goes on the customer’s tab](${EMAIL_ASSET("credits-step-1-tab.svg")})

**2. Customer gets a pay link**

Right after the sale (or when you tap **Remind**), they receive WhatsApp or SMS with a link to their balance.

![Step 2 — Pay link on their phone](${EMAIL_ASSET("credits-step-2-link.svg")})

**3. They tap, pay, done**

They open the link, pay what they owe.
The tab clears or reduces the moment payment confirms.

![Step 3 — Customer pays on the link](${EMAIL_ASSET("credits-step-3-pay.svg")})

**4. You’re notified by text**

You get an SMS that they paid — credit status is already updated on On tab.

![Step 4 — You get an SMS when they pay](${EMAIL_ASSET("credits-step-4-notify.svg")})

---

**Why shops use this**

• Customers pay when it’s convenient — not only when they’re back in the shop
• Your **On tab** board stays true without end-of-day detective work
• Reminders keep soft pressure going; you stay out of the awkward follow-up
• Same catalog, same till — nothing new for cashiers to learn

Open **On tab** on Kiosk to see open balances, send a remind, or review payments.

If you want a live walkthrough for {{businessName}}, just reply to this email.
`;

export function creditsPayLinkChatBody(opts?: {
  firstName?: string | null;
  continueUrl?: string | null;
}): string {
  const name = opts?.firstName?.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hi ${name},` : "Hi,";
  const link =
    opts?.continueUrl?.trim() || `https://${PLATFORM_DOMAIN}/credits`;
  return `${hello} on Kiosk, credit sales can send customers a pay link. They pay on their phone → tab updates → you get an SMS. Try it from On tab: ${link}`;
}

export const CREDITS_PAY_LINK_SMS_BODY = creditsPayLinkChatBody();

export const CREDITS_PAY_LINK_CANNED = {
  id: "credits-pay-link",
  label: "Credits pay link",
  hint: "On-tab sale → pay link → auto balance + owner SMS",
} as const;

import { PLATFORM_DOMAIN } from "@/lib/config";

/** Absolute URLs so email clients can load walkthrough art. */
const EMAIL_ASSET = (path: string) =>
  `https://${PLATFORM_DOMAIN}/email/${path}`;

export const MPESA_PAYMENT_METHOD_GUIDE_URL =
  `https://${PLATFORM_DOMAIN}/help/merchants/getting-started/get-the-most-from-kiosk`;

export const MPESA_PAYMENT_METHOD_EMAIL_SUBJECT =
  "New: customers pay you in one tap — add your till in 2 minutes";

export const MPESA_PAYMENT_METHOD_EMAIL_PREVIEW =
  "Till, paybill, or bank. Money goes straight to you. No Kiosk fee.";

export const MPESA_PAYMENT_METHOD_CTA = "Add where customers pay";

/**
 * Feature announcement + walkthrough for shops that have not set a
 * till / paybill / bank yet. Markdown images render in platform campaign mail.
 */
export const MPESA_PAYMENT_METHOD_EMAIL_BODY = `Hi {{name}},

**Something new for {{businessName}}.**

We just made M-Pesa on Kiosk almost boringly simple.

You no longer need API keys, Head Office paperwork, or a developer.
Add your **till number**, **paybill**, or **bank account** — and that’s it.

When a customer pays, their phone gets the PIN prompt.
The money goes **straight to your till, paybill, or bank** — instantly.
**Kiosk does not take a cut.**

---

**How it works (about 2 minutes)**

**1. Open Payment method on Business**

On your morning board you’ll see **Payment method**.
Tap **Add method**.

![Step 1 — Payment method card on Business](${EMAIL_ASSET("mpesa-step-1-hub.svg")})

**2. Choose where customers should pay you**

Pick what you already use every day:

• **Till number** — Lipa Na M-Pesa Buy Goods
• **Paybill** — business number + account
• **Bank account** — Equity, KCB, NCBA, and more

![Step 2 — Choose till, paybill, or bank](${EMAIL_ASSET("mpesa-step-2-pick.svg")})

**3. Enter the number and test with KES 1**

Type your till / paybill / bank details.
We’ll send a **KES 1** prompt to your phone so you can confirm money arrives where you expect.

![Step 3 — Enter details and test with KES 1](${EMAIL_ASSET("mpesa-step-3-test.svg")})

**4. You’re done — sell**

Next sale at the till or online shop: customer confirms on their phone, money lands with you.

![Step 4 — Customer pays, money arrives with you](${EMAIL_ASSET("mpesa-step-4-done.svg")})

---

**Why shops love this**

• One setup for counter **and** online checkout
• No Safaricom API keys on your side
• **No Kiosk charges** on the payment — money is yours
• Change the destination anytime from Business

If anything feels unclear, reply to this email — we’ll walk you through it live.

Ready when you are.
`;

/** Short SMS / WhatsApp body (keep tight for mobile). */
export function mpesaPaymentMethodChatBody(opts?: {
  firstName?: string | null;
  continueUrl?: string | null;
}): string {
  const name = opts?.firstName?.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hi ${name},` : "Hi,";
  const link = opts?.continueUrl?.trim() || `https://${PLATFORM_DOMAIN}/business`;
  return `${hello} new on Kiosk: add your till, paybill or bank in 2 minutes. Customers get a PIN prompt and money goes straight to you — instantly. No Kiosk fee. Set it up: ${link}`;
}

export const MPESA_PAYMENT_METHOD_SMS_BODY = mpesaPaymentMethodChatBody();

export const MPESA_PAYMENT_METHOD_CANNED = {
  id: "mpesa-payment-method",
  label: "M-Pesa payment method",
  hint: "Till / paybill / bank — no API keys, no Kiosk fee",
} as const;

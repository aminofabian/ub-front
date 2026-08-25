import type { BlogArticle } from "./types";

export const KOPOKOPO_PILLAR_SLUG = "kopokopo-pos-integration";

export const KOPOKOPO_SPOKE_SLUGS = [
  "kiosk-kopokopo-integration",
  "how-to-connect-kopokopo-to-your-pos",
  "kopokopo-buy-goods-vs-till-vs-paybill",
  "setting-up-kopokopo-stk-push-on-pos",
  "kopokopo-webhooks-explained",
  "why-mpesa-payments-arent-syncing-with-sales",
  "end-of-day-reconciliation-manual-vs-automated",
  "reduce-payment-disputes-at-the-till",
  "kopokopo-vs-daraja-api",
  "best-pos-systems-kenya-with-kopokopo",
  "kopokopo-fees-and-retailer-margins",
  "kopokopo-for-butcheries-and-weighed-goods",
  "kopokopo-for-minimarts-high-volume",
  "is-kopokopo-safe-security-and-settlement",
  "kopokopo-support-and-troubleshooting",
] as const;

const PILLAR_ARTICLE: BlogArticle = {
  slug: KOPOKOPO_PILLAR_SLUG,
  title: "Kopo Kopo Integration for POS Systems: The Complete Guide",
  description:
    "How Kopo Kopo connects to a POS — Buy Goods tills, STK Push, and signed webhooks that match every M-Pesa payment to a sale automatically. The complete guide for Kenyan retailers.",
  category: "Payments",
  publishedAt: "2026-08-25",
  updatedAt: "2026-08-25",
  tags: ["Kopo Kopo", "M-Pesa", "Payments", "Kenya", "POS", "STK Push"],
  keywords: [
    "Kopo Kopo POS integration",
    "Kopo Kopo Buy Goods POS",
    "Kopo Kopo STK push Kenya",
    "accept Kopo Kopo payments",
    "POS with Kopo Kopo Kenya",
    "Kopo Kopo till number",
    "Kopo Kopo webhooks",
  ],
  author: "Kiosk",
  relatedSlugs: [
    ...KOPOKOPO_SPOKE_SLUGS,
    "why-m-pesa-integration-matters",
    "top-10-pos-systems-kenya-2026",
    "set-up-a-pos-in-30-minutes",
  ],
  faqs: [
    {
      question: "What is Kopo Kopo and how is it different from a till number?",
      answer:
        "Kopo Kopo is a Kenyan payment company that sits on top of M-Pesa and gives businesses one way to accept it. A plain till number only receives money; Kopo Kopo adds STK Push, Buy Goods (till) confirmations, webhooks, transaction data, and Send Money payouts — the pieces a POS needs to close sales automatically.",
    },
    {
      question: "How do I connect Kopo Kopo to my POS?",
      answer:
        "You connect your Kopo Kopo account to the POS with API credentials, then point it at your till or paybill. The POS registers a webhook so Kopo Kopo can send it payment confirmations, and you test with a small payment before going live. Most turnkey POS systems — Kiosk.ke included — handle the connection in their payment settings.",
    },
    {
      question: "Can customers still pay my Buy Goods till if the POS uses STK Push?",
      answer:
        "Yes. A good POS supports both: STK Push starts the prompt from the till, and customers who prefer paying the till number directly still get their sale matched automatically — Kopo Kopo confirms the payment by amount and paying number, and the till closes the sale.",
    },
    {
      question: "Why aren't my M-Pesa payments syncing with my sales records?",
      answer:
        "Usually because there is no real integration — the till and the M-Pesa account are two separate ledgers joined by hand. With a connected POS, every payment arrives as a signed webhook and matches itself to the open sale. Misconfigured credentials or an unregistered webhook URL cause the same symptom.",
    },
    {
      question: "Is Kopo Kopo safe?",
      answer:
        "Kopo Kopo is a long-established Kenyan payment provider working with Safaricom's systems, and money settles to your own M-Pesa business account — Kopo Kopo does not hold your takings. Confirmations reach your till as signed webhooks, so a payment can't be claimed without Kopo Kopo having confirmed it.",
    },
    {
      question: "What does Kopo Kopo cost a retailer?",
      answer:
        "Kopo Kopo charges per-transaction fees for its payment products, which vary by channel (Buy Goods, Paybill, STK Push). Whether you or the customer carries the cost depends on your setup. A POS that integrates Kopo Kopo natively doesn't add its own per-payment module fees on top.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "At the counter, the customer's phone beeps, they type a PIN, and the money leaves their M-Pesa. That's the easy part. The hard part is your side: knowing the payment actually landed, tying it to the right sale, and having the whole day's M-Pesa add up at close — without someone squinting at phone messages at midnight.",
    },
    {
      type: "paragraph",
      text: "This guide is about that second half: Kopo Kopo integration for POS systems. We'll cover what Kopo Kopo actually is, how a connected till turns an M-Pesa payment into a completed sale automatically, and what to look for in a POS that does it properly. If you run a shop in Kenya and want Buy Goods, Till, or STK Push payments to stop being a bookkeeping chore, this is the guide for you.",
    },
    {
      type: "callout",
      tone: "info",
      text: "This is the pillar guide for the Kopo Kopo series — every article on connecting Kopo Kopo, choosing payment methods, reconciliation, fees, and security links back here. Read the sections that match your shop, then follow the links to go deeper.",
    },
    {
      type: "heading",
      text: "1. What Is Kopo Kopo — and Why It Matters for Retailers",
    },
    {
      type: "paragraph",
      text: "Kopo Kopo is a Kenyan payment company that sits on top of M-Pesa (and other mobile money) and gives businesses a single way to accept it and move it. To a customer it's invisible — they're paying M-Pesa either way. To a retailer it's the difference between a till number that only receives money and a payment channel your systems can actually use.",
    },
    {
      type: "paragraph",
      text: "A plain Till Number does one thing: money arrives. Kopo Kopo turns that into a set of tools:",
    },
    {
      type: "list",
      items: [
        "STK Push — your till sends the payment prompt to the customer's phone; they confirm the amount and enter their PIN.",
        "Buy Goods (Till) — customers pay your till number directly, and Kopo Kopo confirms the payment the moment it happens.",
        "Paybill — for larger or business-to-business payments under a paybill account.",
        "Webhooks and transaction data — every payment arrives as a machine-readable notification, so software can act on it instantly.",
        "Send Money — pay suppliers or staff out of the same integration.",
      ],
    },
    {
      type: "paragraph",
      text: "Why it matters: in Kenya, mobile money is how customers pay. Kopo Kopo is how that payment becomes data your till can act on — the ingredient that lets a POS close a sale, print a receipt, and drop stock without a human checking a phone.",
    },
    {
      type: "heading",
      text: "2. How Kopo Kopo Integration Works with a POS",
    },
    {
      type: "paragraph",
      text: "At a plain-English level, the integration is four steps:",
    },
    {
      type: "list",
      items: [
        "You have a Kopo Kopo account with a till or paybill — the destination your customers pay into.",
        "Your POS connects to it with API credentials — the same idea as signing in, but for software. This is the 'integration.'",
        "When a customer pays, Kopo Kopo sends a signed webhook — a payment notification your till can trust, because it's verified and can't be faked by a customer or a staff member.",
        "The till matches the notification to the open sale — by amount, and where available the paying number — and closes it: the receipt prints, stock drops, and the payment lands in the shift record.",
      ],
    },
    {
      type: "image",
      src: "/blog/kopokopo-webhook-flow.svg",
      alt: "The Kopo Kopo flow: the customer pays by STK push or Buy Goods till, Kopo Kopo confirms with a signed webhook, and the till matches the payment to the sale",
      caption:
        "Payment in, signed confirmation out — the till closes the sale the moment Kopo Kopo confirms.",
    },
    {
      type: "paragraph",
      text: "There are two ways the payment itself happens at the counter, and a good POS supports both:",
    },
    {
      type: "table",
      headers: ["", "STK Push (till starts it)", "Buy Goods till (customer starts it)"],
      rows: [
        [
          "Who starts it",
          "The cashier taps M-Pesa on the till",
          "The customer pays your till number directly",
        ],
        [
          "What the customer sees",
          "A prompt on their phone: amount + Enter PIN",
          "The normal M-Pesa 'Buy Goods' flow on their phone",
        ],
        [
          "What confirms the sale",
          "Confirmation from Kopo Kopo to the till",
          "A signed webhook, matched by amount and paying number",
        ],
        [
          "Best for",
          "Fast one-tap checkout at the counter",
          "Shops whose customers already pay the till directly",
        ],
      ],
    },
    {
      type: "paragraph",
      text: "Either way, the till finds out from Kopo Kopo itself — not from a staff member checking an SMS — and that's the whole point. The confirmation is automated, immediate, and unforgeable.",
    },
    {
      type: "heading",
      text: "3. Manual Reconciliation vs. an Integrated POS",
    },
    {
      type: "paragraph",
      text: "Without an integration, your till and your M-Pesa are two separate ledgers. Sales live in the POS; payments live in a string of messages on someone's phone. At close, the two are joined by hand — a staff member scrolls the messages, matches each payment to a sale, and hopes nothing was missed.",
    },
    {
      type: "paragraph",
      text: "Put a number on that. Fifty M-Pesa sales a day — nothing for a busy mini-mart — at even thirty seconds each to check and match is twenty-five minutes of your most senior person's time every single night. A mismatch means a call to a customer, a disputed payment, or a quiet write-off. And the harder the day, the later the close, the worse the matching gets.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "Every M-Pesa payment that can't be matched to a sale is money you can't trust — either it never really landed, or it landed and no till record says so. That's how shortages and disputes start.",
    },
    {
      type: "image",
      src: "/blog/kopokopo-manual-vs-integrated.svg",
      alt: "Manual reconciliation on the left — staff checking M-Pesa messages and matching by hand at close; integrated on the right — the till matches every payment to a sale automatically",
      caption:
        "One close is a ritual; the other is a report. The integrated till does the matching, not your staff.",
    },
    {
      type: "paragraph",
      text: "With an integrated POS there's nothing to match. The webhook closes the sale the moment the customer's PIN is in, and the shift report adds up automatically — cash here, M-Pesa there, matching what actually hit your business account.",
    },
    {
      type: "heading",
      text: "4. What an Integrated Till Actually Gets You",
    },
    {
      type: "paragraph",
      text: "Integration isn't a technology feature — it's a set of concrete, daily outcomes:",
    },
    {
      type: "list",
      items: [
        "Faster checkout — no typing a till number into a phone and no asking the customer to 'confirm with M-Pesa.' One tap, one PIN.",
        "Fewer disputes — a customer insists they paid; the till has the confirmation, with the amount, the time, and the paying number.",
        "Accurate daily till reports — M-Pesa totals come from confirmed payments, not from memory.",
        "Less short-changing and fraud — a payment only closes a sale when Kopo Kopo confirms it; nobody can claim a payment that never happened.",
        "Staff accountability — every sale is tied to a real payment, so a shift either balances or shows exactly where it didn't.",
      ],
    },
    {
      type: "heading",
      text: "5. What to Look for in a POS with Kopo Kopo Support",
    },
    {
      type: "paragraph",
      text: "Not all 'Kopo Kopo support' is equal. A POS that just lets you type a till number for display on a receipt is not integrated. Here's the checklist:",
    },
    {
      type: "list",
      items: [
        "Native STK Push — the till sends the payment prompt itself; it doesn't redirect you to a separate app or payment screen.",
        "Buy Goods till matching — customers who pay your till directly still get their sale matched automatically, by amount and paying number.",
        "Signed webhooks under the hood — confirmations come from Kopo Kopo and are verified, so they can't be faked.",
        "Payments and sales in one record — M-Pesa, cash, and split payments live in the same sale and the same shift report.",
        "No per-payment plugin fees — the integration is part of the POS, not a paid add-on module with its own subscription.",
        "Payouts, if you pay suppliers — Send Money from the same system means one place to see money in and money out.",
      ],
    },
    {
      type: "paragraph",
      text: "Kiosk.ke checks those boxes. Its till runs Kopo Kopo for M-Pesa — STK Push from the counter and Buy Goods till matching — with every payment auto-matched to the sale in real time, and Kopo Kopo Send Money built in for paying suppliers. It's included from the free plan: 300 products, one cashier, and M-Pesa working from your first ring.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "A till number receives money; an integrated till understands it. Kopo Kopo brings the payment data, and a POS with Kopo Kopo built in does the rest — the sale closes itself, the shift balances itself, and your staff stop being a reconciliation department.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "How to Connect Kopo Kopo to Your POS System",
          href: "/blog/how-to-connect-kopokopo-to-your-pos",
          blurb: "The step-by-step setup — credentials, webhook, and a test payment.",
        },
        {
          label: "Kopo Kopo Buy Goods vs. Till Number vs. Paybill",
          href: "/blog/kopokopo-buy-goods-vs-till-vs-paybill",
          blurb: "Which payment channel belongs in your shop's till setup.",
        },
        {
          label: "Kopo Kopo API Webhooks Explained for Non-Developers",
          href: "/blog/kopokopo-webhooks-explained",
          blurb: "How payment confirmations reach your till — in plain English.",
        },
        {
          label: "End-of-Day Reconciliation: Manual vs. Automated",
          href: "/blog/end-of-day-reconciliation-manual-vs-automated",
          blurb: "What your close looks like when the till does the matching.",
        },
        {
          label: "Kopo Kopo vs. the Direct Safaricom Daraja API",
          href: "/blog/kopokopo-vs-daraja-api",
          blurb: "Raw Safaricom API versus a payment aggregator — which fits a POS.",
        },
        {
          label: "Best POS Systems in Kenya with Kopo Kopo Integration",
          href: "/blog/best-pos-systems-kenya-with-kopokopo",
          blurb: "Ranked on how deep the Kopo Kopo integration actually goes.",
        },
        {
          label: "Is Kopo Kopo Safe? Security and Settlement Explained",
          href: "/blog/is-kopokopo-safe-security-and-settlement",
          blurb: "Where your money sits and why confirmations can't be faked.",
        },
      ],
    },
  ],
};

const KIOSK_KOPOKOPO_ARTICLE: BlogArticle = {
  slug: "kiosk-kopokopo-integration",
  title: "Kiosk.ke's Kopo Kopo Integration: Why It's the Best for Kenyan Shops",
  description:
    "How Kiosk.ke connects Kopo Kopo to your till — native STK Push, Buy Goods till matching, signed webhooks, and supplier Send Money — and why that makes it the best Kopo Kopo integration in Kenya.",
  category: "Payments",
  publishedAt: "2026-08-25",
  updatedAt: "2026-08-25",
  tags: ["Kiosk.ke", "Kopo Kopo", "M-Pesa", "POS", "Integration", "Kenya"],
  keywords: [
    "Kiosk Kopo Kopo integration",
    "best Kopo Kopo POS integration Kenya",
    "Kiosk M-Pesa STK push",
    "Kopo Kopo till webhooks",
    "Kiosk supplier Send Money",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "kopokopo-pos-integration",
    "how-to-connect-kopokopo-to-your-pos",
    "kopokopo-webhooks-explained",
    "best-pos-systems-kenya-with-kopokopo",
    "why-mpesa-payments-arent-syncing-with-sales",
    "end-of-day-reconciliation-manual-vs-automated",
    "is-kopokopo-safe-security-and-settlement",
    "kopokopo-vs-daraja-api",
    "pos-with-mpesa-kenya",
    "top-10-pos-systems-kenya-2026",
  ],
  faqs: [
    {
      question: "Does Kiosk.ke support Kopo Kopo?",
      answer:
        "Yes — natively. Kiosk.ke connects to Kopo Kopo for M-Pesa STK Push at the till, Buy Goods till matching, and supplier Send Money payouts, all from one gateway under Payments → Accept payments. It's included from the free plan.",
    },
    {
      question: "How do I connect Kopo Kopo to Kiosk.ke?",
      answer:
        "Payments → Accept payments → Add method → KopoKopo. Paste your Client ID, Secret, and API Key, choose sandbox or production, then: Test connection → Activate → Subscribe till webhooks. Most shops are live in about ten minutes.",
    },
    {
      question: "Will Kopo Kopo payments match my sales automatically?",
      answer:
        "Yes. Every payment arrives as a signed webhook and is matched to the open sale by amount and paying number. The sale closes itself — receipt, stock, and shift record — with no manual entries.",
    },
    {
      question: "Can my customers keep paying my Buy Goods till number?",
      answer:
        "Absolutely. The till listens for Buy Goods payments while the cashier keeps working, and the sale completes automatically when Kopo Kopo confirms a payment for the total. STK Push stays available for customers who prefer the prompt.",
    },
    {
      question: "Does Kiosk.ke hold my Kopo Kopo money?",
      answer:
        "No. Payments settle to your own Kopo Kopo account, and you withdraw to your bank from Kopo Kopo's dashboard. Kiosk matches payments to sales; it never holds your takings.",
    },
    {
      question: "Can I pay suppliers with Kopo Kopo inside Kiosk.ke?",
      answer:
        "Yes — Kopo Kopo Send Money is built into supplier payouts. Mark the supplier's payout method, settle the invoice, and the ledger updates when Kopo Kopo confirms. Auto-pay schedules are available too.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Walk into a shop running Kiosk.ke and watch M-Pesa happen. The cashier rings the sale, taps M-Pesa, and the customer's phone lights up with a prompt. Seconds later the receipt prints, the stock drops, and the money is already reconciled. That's Kopo Kopo doing the heavy lifting — and it's the deepest Kopo Kopo integration you'll find on a Kenyan POS.",
    },
    {
      type: "paragraph",
      text: "This guide is the Kiosk deep-dive in the Kopo Kopo series: how Kiosk.ke connects to Kopo Kopo, what the till actually does with a payment, how supplier payouts run on the same rails, and why the whole thing is built the way it is.",
    },
    {
      type: "callout",
      tone: "info",
      text: "New to Kopo Kopo? The complete guide to Kopo Kopo POS integration covers what it is, how any POS connects to it, and what to look for — then come back here to see how Kiosk does it.",
    },
    {
      type: "heading",
      text: "1. The Setup: Ten Minutes, Three Steps",
    },
    {
      type: "paragraph",
      text: "On Kiosk, Kopo Kopo is a payment method, not a project. From Payments → Accept payments → Add method, choose KopoKopo and paste the credentials from your Kopo Kopo account — Client ID, Secret, and API Key — then pick sandbox or production.",
    },
    {
      type: "paragraph",
      text: "Three steps stand between you and live payments:",
    },
    {
      type: "list",
      items: [
        "Test connection — Kiosk calls Kopo Kopo with your credentials and confirms they work.",
        "Activate — the gateway goes live for STK Push and till matching.",
        "Subscribe till webhooks — Kiosk registers your till numbers with Kopo Kopo so till payments land in the POS automatically.",
      ],
    },
    {
      type: "image",
      src: "/blog/kiosk-kopokopo-gateway.svg",
      alt: "The Kiosk payment gateway settings screen: KopoKopo active and default, with the manage panel showing the three-step setup path and settlement details",
      caption:
        "Test, activate, subscribe till webhooks — the whole Kopo Kopo setup fits on one screen.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "No plugin, no developer, no payment-module subscription. Kopo Kopo is part of the till, and it's included from the free plan — 300 products, one cashier, M-Pesa working from your first ring.",
    },
    {
      type: "heading",
      text: "2. Two Ways to Take M-Pesa, One Till Record",
    },
    {
      type: "paragraph",
      text: "At the counter, Kiosk gives cashiers two ways to take M-Pesa — and both finish the same way: the sale closes itself.",
    },
    {
      type: "paragraph",
      text: "STK Push: the cashier taps M-Pesa, enters the customer's number, and the till sends the prompt. The customer confirms the amount and enters their PIN, and the sale completes — receipt printed, stock dropped, payment in the shift record. Amounts are kept in whole shillings so the sale matches Kopo Kopo's charge exactly.",
    },
    {
      type: "paragraph",
      text: "Buy Goods till: customers who'd rather pay the till number directly keep doing exactly that. The till listens — the cashier can keep adding items — and when Kopo Kopo's webhook confirms a payment for this total, the sale completes automatically. The till shows 'Listening for till payment…' while it waits.",
    },
    {
      type: "image",
      src: "/blog/kiosk-kopokopo-till.svg",
      alt: "The Kiosk till in M-Pesa mode: STK Push to the customer's phone, or the till listening for a Buy Goods payment — either way the sale completes itself",
      caption:
        "STK Push or Buy Goods till — the till listens, Kopo Kopo confirms, and the sale closes itself.",
    },
    {
      type: "paragraph",
      text: "Either way, the payment lands in the same sale record as cash. No separate payment log, no 'which message was that?' at close.",
    },
    {
      type: "heading",
      text: "3. Webhooks That Close the Sale Themselves",
    },
    {
      type: "paragraph",
      text: "The reason this works without a single manual entry is the webhook. When a customer pays, Kopo Kopo sends a payment notification to Kiosk — signed, so it can't be faked by a customer or a staff member — and the till verifies it before acting.",
    },
    {
      type: "paragraph",
      text: "Then it matches: the confirmation is tied to an open sale by amount, and by the paying number where Kopo Kopo provides it. Match found — the sale closes. No match — the payment waits in a visible state until a cashier resolves it. Nothing silently disappears.",
    },
    {
      type: "paragraph",
      text: "At close, the payoff is visible — the shift report totals itself from confirmed payments, and the M-Pesa column agrees with your business account.",
    },
    {
      type: "image",
      src: "/blog/kiosk-kopokopo-shift.svg",
      alt: "The Kiosk end-of-day shift report: cash and M-Pesa totals from confirmed Kopo Kopo payments, reconciled with zero manual entries",
      caption:
        "Close looks like this: totals from confirmed payments, zero manual entries, and a shift that balances itself.",
    },
    {
      type: "paragraph",
      text: "Kopo Kopo also tells Kiosk who paid — first name, last name, and a masked number — so the till can recognise repeat customers without a manual lookup, including customers buying on credit.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Disputes die fast when the confirmation lives on the sale: the amount, the time, and the paying number are right there on the sale's record. 'I paid' becomes 'here's the payment, matched to your sale.'",
    },
    {
      type: "heading",
      text: "4. Supplier Payouts on the Same Rails",
    },
    {
      type: "paragraph",
      text: "The integration isn't one-way. Paying suppliers runs through Kopo Kopo Send Money from the same gateway: mark a supplier's payout method as 'M-Pesa via KopoKopo Send Money' on their profile, and Kiosk sends the payout when you settle an invoice.",
    },
    {
      type: "paragraph",
      text: "The ledger updates when Kopo Kopo confirms — not when you type it in — so money out is as trustworthy as money in. You can even set auto-pay times so standing supplier payments run on schedule without anyone at the till.",
    },
    {
      type: "heading",
      text: "5. Your Money Stays Yours",
    },
    {
      type: "paragraph",
      text: "Kiosk never holds your money. Payments settle to your Kopo Kopo account, and you withdraw to your bank from Kopo Kopo's dashboard — the same account you already use. Kiosk's job is the matching, not the holding.",
    },
    {
      type: "paragraph",
      text: "Sandbox and production are both supported, so you can test the whole loop before a single real shilling moves.",
    },
    {
      type: "heading",
      text: "6. Why This Is the Best Kopo Kopo Integration",
    },
    {
      type: "paragraph",
      text: "Plenty of POS systems will tell you they 'support Kopo Kopo.' Most mean they let you display a till number on a receipt. Here's what integrated actually looks like:",
    },
    {
      type: "table",
      headers: ["What the till does", "Kiosk.ke + Kopo Kopo", "A bolt-on 'support'"],
      rows: [
        ["STK Push from the till", "✓ Built in — one tap", "Usually redirects to a separate app"],
        ["Buy Goods till matching", "✓ Auto-matches by amount + number", "✗ Manual matching at close"],
        ["Signed webhook verification", "✓ Verified before the sale closes", "✗ Often no webhooks at all"],
        ["Cash + M-Pesa in one sale record", "✓ One record, split payments included", "✗ Two ledgers to reconcile"],
        ["Supplier Send Money payouts", "✓ Same gateway, auto-confirmed", "✗ Not available"],
        ["Per-payment module fees", "None — included in the plan", "Often a paid add-on"],
      ],
    },
    {
      type: "paragraph",
      text: "That last row is the tell. When payments are the product, the POS charges you a module fee and calls it integration. Kiosk built Kopo Kopo in because M-Pesa is how Kenyan customers pay — the counter should be faster, not sold an add-on.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Kopo Kopo is how Kenya pays; Kiosk is where Kenya sells. Together they mean one tap, one PIN, one record — and a shop that closes in minutes instead of an hour. That's what the best Kopo Kopo integration looks like: you almost stop noticing it's there.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "Kopo Kopo Integration for POS Systems: The Complete Guide",
          href: "/blog/kopokopo-pos-integration",
          blurb: "The pillar guide — what Kopo Kopo is and how any POS connects to it.",
        },
        {
          label: "How to Connect Kopo Kopo to Your POS System",
          href: "/blog/how-to-connect-kopokopo-to-your-pos",
          blurb: "The step-by-step setup — credentials, webhook, and a test payment.",
        },
        {
          label: "Kopo Kopo API Webhooks Explained for Non-Developers",
          href: "/blog/kopokopo-webhooks-explained",
          blurb: "How signed payment confirmations reach the till — in plain English.",
        },
        {
          label: "End-of-Day Reconciliation: Manual vs. Automated",
          href: "/blog/end-of-day-reconciliation-manual-vs-automated",
          blurb: "What your close looks like when the till does the matching.",
        },
        {
          label: "Best POS Systems in Kenya with Kopo Kopo Integration",
          href: "/blog/best-pos-systems-kenya-with-kopokopo",
          blurb: "How other systems compare to the deep integration above.",
        },
        {
          label: "Is Kopo Kopo Safe? Security and Settlement Explained",
          href: "/blog/is-kopokopo-safe-security-and-settlement",
          blurb: "Where your money sits and why confirmations can't be faked.",
        },
      ],
    },
  ],
};

/**
 * Planned spokes for the Kopo Kopo cluster. Each is listed on the hub with a
 * "Coming soon" badge and is replaced by a full article of the same slug as it
 * ships — all cross-links keep working.
 */
function comingSoon(opts: {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  keywords?: string[];
  relatedSlugs: string[];
  teaser: string;
}): BlogArticle {
  return {
    slug: opts.slug,
    title: opts.title,
    description: opts.description,
    category: opts.category,
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: opts.tags,
    keywords: opts.keywords,
    author: "Kiosk",
    relatedSlugs: opts.relatedSlugs,
    listedOnly: true,
    body: [
      {
        type: "paragraph",
        text: opts.teaser,
      },
      {
        type: "paragraph",
        text: "This guide is in the works and will land here soon. While it's being written, the complete guide to Kopo Kopo POS integration covers what Kopo Kopo is, how it connects to a till, and what to look for in a POS.",
      },
      {
        type: "links",
        items: [
          {
            label: "Kopo Kopo Integration for POS Systems: The Complete Guide",
            href: `/blog/${KOPOKOPO_PILLAR_SLUG}`,
            blurb: "The pillar guide for this series.",
          },
        ],
      },
    ],
  };
}

const PILLAR_SLUG = KOPOKOPO_PILLAR_SLUG;

const SPOKE_ARTICLES: BlogArticle[] = [
  comingSoon({
    slug: "how-to-connect-kopokopo-to-your-pos",
    title: "How to Connect Kopo Kopo to Your POS System (Step-by-Step)",
    description:
      "Step by step: connect your Kopo Kopo account to your POS — till or paybill, API credentials, webhook URL, and a test payment before you go live.",
    category: "Getting started",
    tags: ["Kopo Kopo", "Setup", "POS", "M-Pesa", "Kenya"],
    keywords: [
      "connect Kopo Kopo to POS",
      "Kopo Kopo POS setup",
      "Kopo Kopo API credentials",
    ],
    relatedSlugs: [
      PILLAR_SLUG,
      "kiosk-kopokopo-integration",
      "setting-up-kopokopo-stk-push-on-pos",
      "kopokopo-buy-goods-vs-till-vs-paybill",
      "kopokopo-webhooks-explained",
    ],
    teaser:
      "Connecting Kopo Kopo to your POS is a one-time setup: a Kopo Kopo account with a till or paybill, API credentials entered into the till, a webhook URL registered, and one test payment to prove the loop.",
  }),
  comingSoon({
    slug: "kopokopo-buy-goods-vs-till-vs-paybill",
    title: "Kopo Kopo Buy Goods vs. Till Number vs. Paybill: Which One for Your Shop?",
    description:
      "Buy Goods (till), Paybill, and STK Push all move money through M-Pesa — but they behave differently at the counter. Which one belongs in your shop's till setup?",
    category: "Payments",
    tags: ["Kopo Kopo", "M-Pesa", "Buy Goods", "Paybill", "Kenya"],
    keywords: [
      "Kopo Kopo Buy Goods",
      "till number vs paybill",
      "M-Pesa Buy Goods till",
    ],
    relatedSlugs: [
      PILLAR_SLUG,
      "setting-up-kopokopo-stk-push-on-pos",
      "how-to-connect-kopokopo-to-your-pos",
    ],
    teaser:
      "Buy Goods tills, Paybill accounts, and STK Push are different ways into the same M-Pesa rails — and they suit different shops. This guide helps you pick the channel (or mix) your counter should run.",
  }),
  comingSoon({
    slug: "setting-up-kopokopo-stk-push-on-pos",
    title: "Setting Up STK Push Checkout on Your POS",
    description:
      "How STK Push checkout works at a Kenyan till — the customer gets the prompt on their phone, confirms the amount, and the sale closes itself. Setup, testing, and what can go wrong.",
    category: "Getting started",
    tags: ["Kopo Kopo", "STK Push", "POS", "M-Pesa", "Kenya"],
    keywords: ["STK Push POS", "Kopo Kopo STK setup", "M-Pesa STK at the till"],
    relatedSlugs: [
      PILLAR_SLUG,
      "how-to-connect-kopokopo-to-your-pos",
      "kopokopo-buy-goods-vs-till-vs-paybill",
    ],
    teaser:
      "STK Push is the fastest way to take M-Pesa at the counter: the till sends the prompt, the customer confirms, and the sale auto-completes. This guide walks through enabling it and testing it safely.",
  }),
  comingSoon({
    slug: "kopokopo-webhooks-explained",
    title: "Kopo Kopo API Webhooks Explained for Non-Developers",
    description:
      "Webhooks are how your till finds out a payment happened — in plain English. What a signed payment notification is, why it beats checking messages, and what it means for your shop.",
    category: "Payments",
    tags: ["Kopo Kopo", "Webhooks", "API", "Payments", "Kenya"],
    keywords: ["Kopo Kopo webhooks", "payment webhook explained", "POS webhook"],
    relatedSlugs: [
      PILLAR_SLUG,
      "how-to-connect-kopokopo-to-your-pos",
      "why-mpesa-payments-arent-syncing-with-sales",
    ],
    teaser:
      "A webhook is a phone call between systems: the moment a customer pays, Kopo Kopo calls your till and tells it. No developers required to understand it — this guide explains the whole idea over the counter.",
  }),
  comingSoon({
    slug: "why-mpesa-payments-arent-syncing-with-sales",
    title: "Why Your M-Pesa Payments Aren't Syncing with Your Sales Records",
    description:
      "M-Pesa payments that never appear in your sales reports are usually one of five fixable problems — and the fix is almost always a real integration, not more manual checking.",
    category: "Payments",
    tags: ["M-Pesa", "Reconciliation", "POS", "Kenya", "Payments"],
    keywords: [
      "M-Pesa not syncing with sales",
      "payments missing from POS",
      "M-Pesa reconciliation problems",
    ],
    relatedSlugs: [
      PILLAR_SLUG,
      "end-of-day-reconciliation-manual-vs-automated",
      "kopokopo-webhooks-explained",
    ],
    teaser:
      "If M-Pesa payments keep missing from your sales reports, the cause is almost always structural — no integration, misconfigured credentials, or an unregistered webhook. This guide runs through the fixes.",
  }),
  comingSoon({
    slug: "end-of-day-reconciliation-manual-vs-automated",
    title: "End-of-Day Reconciliation: Manual M-Pesa Checking vs. Automated POS Matching",
    description:
      "The nightly ritual of matching M-Pesa messages to sales — and what your close looks like when the till does the matching instead.",
    category: "Operations",
    tags: ["Reconciliation", "M-Pesa", "POS", "Kenya", "Operations"],
    keywords: [
      "end of day reconciliation POS",
      "M-Pesa till reconciliation",
      "automated payment matching",
    ],
    relatedSlugs: [
      PILLAR_SLUG,
      "why-mpesa-payments-arent-syncing-with-sales",
      "reduce-payment-disputes-at-the-till",
    ],
    teaser:
      "The nightly close is where unintegrated payments come back to haunt you. This guide compares the manual ritual — messages, notebooks, midnight calls — with a till that totals itself.",
  }),
  comingSoon({
    slug: "reduce-payment-disputes-at-the-till",
    title: "How to Reduce Payment Disputes at the Till with Integrated Confirmations",
    description:
      "A customer insists they paid, your cashier says no — that's a dispute with no evidence. Integrated confirmations give both sides a record that settles it in seconds.",
    category: "Payments",
    tags: ["Disputes", "M-Pesa", "POS", "Kenya", "Payments"],
    keywords: ["payment disputes at till", "M-Pesa payment dispute", "POS dispute resolution"],
    relatedSlugs: [
      PILLAR_SLUG,
      "end-of-day-reconciliation-manual-vs-automated",
      "is-kopokopo-safe-security-and-settlement",
    ],
    teaser:
      "Most till disputes are 'I paid / you didn't' with no record either side can point to. Integrated confirmations put a timestamped, verified payment on the sale — and end the argument on the spot.",
  }),
  comingSoon({
    slug: "kopokopo-vs-daraja-api",
    title: "Kopo Kopo vs. the Direct Safaricom Daraja API: Which Should Your POS Use?",
    description:
      "Daraja gives you the raw Safaricom API. Kopo Kopo wraps it with support, webhooks, and multiple payment channels. What each means for your shop's till.",
    category: "Comparison",
    tags: ["Kopo Kopo", "Daraja", "Safaricom", "API", "Comparison"],
    keywords: ["Kopo Kopo vs Daraja", "Safaricom Daraja API POS", "M-Pesa API Kenya"],
    relatedSlugs: [
      PILLAR_SLUG,
      "why-m-pesa-integration-matters",
      "best-pos-systems-kenya-with-kopokopo",
    ],
    teaser:
      "Safaricom's Daraja API is the raw pipe; Kopo Kopo is a payment company built on it. For a shop, the practical question is which one powers your till — and who answers the phone when it breaks.",
  }),
  comingSoon({
    slug: "best-pos-systems-kenya-with-kopokopo",
    title: "Best POS Systems in Kenya with Kopo Kopo Integration",
    description:
      "POS systems in Kenya that work with Kopo Kopo — ranked on how deep the integration goes: native STK, till matching, webhooks, and settlement reports.",
    category: "Rankings",
    tags: ["Kopo Kopo", "POS Kenya", "M-Pesa", "Rankings", "Kenya"],
    keywords: [
      "POS with Kopo Kopo",
      "best POS Kenya Kopo Kopo",
      "Kopo Kopo compatible POS",
    ],
    relatedSlugs: [
      PILLAR_SLUG,
      "kiosk-kopokopo-integration",
      "top-10-pos-systems-kenya-2026",
      "kopokopo-vs-daraja-api",
    ],
    teaser:
      "Not every POS that mentions Kopo Kopo actually integrates it. This ranking scores Kenyan systems on how deep the connection goes — STK push, till matching, webhooks, and reports.",
  }),
  comingSoon({
    slug: "kopokopo-fees-and-retailer-margins",
    title: "Kopo Kopo Fees and How They Affect Your Margins as a Retailer",
    description:
      "What Kopo Kopo charges per transaction, who pays it, and how to keep mobile money costs from eating your margin.",
    category: "Guides",
    tags: ["Kopo Kopo", "Fees", "Margins", "M-Pesa", "Kenya"],
    keywords: ["Kopo Kopo fees", "M-Pesa transaction costs", "mobile money merchant fees"],
    relatedSlugs: [
      PILLAR_SLUG,
      "the-real-cost-of-free-software",
      "kopokopo-buy-goods-vs-till-vs-paybill",
    ],
    teaser:
      "Every mobile money channel carries a cost, and who carries it — you or the customer — changes your margin. This guide breaks down Kopo Kopo's fees and how to price around them.",
  }),
  comingSoon({
    slug: "kopokopo-for-butcheries-and-weighed-goods",
    title: "Kopo Kopo Integration for Butcheries and Weighed-Goods Retailers",
    description:
      "Weighed goods and mobile money at the same counter: how Kopo Kopo payments fit a butchery's flow — weigh, price, pay, and the sale matches itself.",
    category: "Guides",
    tags: ["Kopo Kopo", "Butchery", "Weighed goods", "POS", "Kenya"],
    keywords: ["Kopo Kopo butchery", "POS for butchery Kenya", "weighed goods payments"],
    relatedSlugs: [
      PILLAR_SLUG,
      "setting-up-kopokopo-stk-push-on-pos",
      "kopokopo-for-minimarts-high-volume",
    ],
    teaser:
      "At a butchery counter the price comes after the weigh, and the queue waits on both. This guide covers Kopo Kopo payments that keep weighed-goods sales fast — and matched to the right kilo price.",
  }),
  comingSoon({
    slug: "kopokopo-for-minimarts-high-volume",
    title: "Kopo Kopo for Mini-Marts: Handling High Transaction Volume at the Till",
    description:
      "Mini-mart traffic means a hundred small M-Pesa payments a day. How integrated Kopo Kopo keeps the queue moving and the close honest.",
    category: "Operations",
    tags: ["Kopo Kopo", "Mini-mart", "M-Pesa", "POS", "Kenya"],
    keywords: ["Kopo Kopo mini mart", "high volume M-Pesa till", "mini mart POS payments"],
    relatedSlugs: [
      PILLAR_SLUG,
      "end-of-day-reconciliation-manual-vs-automated",
      "reduce-payment-disputes-at-the-till",
    ],
    teaser:
      "A busy mini-mart can clear a hundred small M-Pesa payments a shift. This guide looks at keeping the queue moving, matching every payment, and closing without a late-night audit.",
  }),
  comingSoon({
    slug: "is-kopokopo-safe-security-and-settlement",
    title: "Is Kopo Kopo Safe? Security and Settlement Explained",
    description:
      "Where your money sits, who sees your credentials, and how signed webhooks keep payment confirmations from being faked. Kopo Kopo security for retailers.",
    category: "Guides",
    tags: ["Kopo Kopo", "Security", "Settlement", "M-Pesa", "Kenya"],
    keywords: ["is Kopo Kopo safe", "Kopo Kopo security", "Kopo Kopo settlement"],
    relatedSlugs: [
      PILLAR_SLUG,
      "kopokopo-webhooks-explained",
      "reduce-payment-disputes-at-the-till",
    ],
    teaser:
      "Where does your money sit between the customer's PIN and your bank? How are payment confirmations kept unforgeable? This guide answers both in plain language a shop owner can act on.",
  }),
  comingSoon({
    slug: "kopokopo-support-and-troubleshooting",
    title: "Kopo Kopo Customer Support and Troubleshooting for Retailers",
    description:
      "When a payment doesn't confirm or a payout stalls: who to call, what to have ready, and the quick fixes that solve most till problems.",
    category: "Guides",
    tags: ["Kopo Kopo", "Support", "Troubleshooting", "M-Pesa", "Kenya"],
    keywords: ["Kopo Kopo support", "Kopo Kopo customer care", "Kopo Kopo payment failed"],
    relatedSlugs: [
      PILLAR_SLUG,
      "why-mpesa-payments-arent-syncing-with-sales",
      "how-to-connect-kopokopo-to-your-pos",
    ],
    teaser:
      "When a payment doesn't confirm or a payout stalls, the fix is usually quick — and knowing what to have ready before you call support makes it quicker. This guide covers both.",
  }),
];

export const KOPOKOPO_ARTICLES: BlogArticle[] = [
  PILLAR_ARTICLE,
  KIOSK_KOPOKOPO_ARTICLE,
  ...SPOKE_ARTICLES,
];

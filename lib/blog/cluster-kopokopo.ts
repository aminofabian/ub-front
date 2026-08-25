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
  {
    slug: "how-to-connect-kopokopo-to-your-pos",
    title: "How to Connect Kopo Kopo to Your POS System (Step-by-Step)",
    description:
      "Step by step: connect your Kopo Kopo account to your POS — API credentials, environment, till numbers, webhook subscription, and a test payment before you go live.",
    category: "Getting started",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Kopo Kopo", "Setup", "POS", "M-Pesa", "Kenya"],
    keywords: [
      "connect Kopo Kopo to POS",
      "Kopo Kopo POS setup",
      "Kopo Kopo API credentials",
      "Kopo Kopo till webhooks setup",
      "how to add Kopo Kopo to Kiosk",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "kiosk-kopokopo-integration",
      "setting-up-kopokopo-stk-push-on-pos",
      "kopokopo-buy-goods-vs-till-vs-paybill",
      "kopokopo-webhooks-explained",
      "why-mpesa-payments-arent-syncing-with-sales",
    ],
    faqs: [
      {
        question: "How long does it take to connect Kopo Kopo to a POS?",
        answer:
          "On Kiosk, about ten minutes once you have your credentials: add the gateway, paste the keys, pick an environment, Test, Activate, and Subscribe till webhooks. Add a test payment and you're done in under fifteen.",
      },
      {
        question: "What do I need from Kopo Kopo before I start?",
        answer:
          "A Kopo Kopo account with a till (or paybill), and three API values from the Applications page in your Kopo Kopo dashboard: Client ID, Client Secret, and API Key. Note that the Client ID is the application key — not the API Key.",
      },
      {
        question: "What is the difference between Sandbox and Production?",
        answer:
          "Sandbox is Kopo Kopo's test environment — no real money moves. Production is live payments. They use different credential pairs, and each environment's keys come from that environment's Applications page. A production till won't authenticate with sandbox keys.",
      },
      {
        question: "What does 'Subscribe till webhooks' actually do?",
        answer:
          "It registers your till numbers with Kopo Kopo and points a callback URL at your POS, so the moment a customer pays your till, Kopo Kopo sends a signed payment notification and the sale completes automatically. Without it, till payments don't sync — even if STK Push works.",
      },
      {
        question: "I have a Manual 'Mpesa Till' — is that the same as Kopo Kopo?",
        answer:
          "No. A manual till only prints your till number and paybill instructions on receipts; it does not receive payments or sync them. The KopoKopo gateway must be ACTIVE (Test → Activate → Subscribe till webhooks) for payments to match your sales.",
      },
      {
        question: "How do I know the connection actually worked?",
        answer:
          "Ring up a small sale — KES 10 is plenty — and pay it two ways: by STK Push to your own phone, and by paying your Buy Goods till directly. In both cases the sale should close itself, and the shift record should show the matched payment with no manual entry.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "The good news: connecting Kopo Kopo to your POS is a one-time setup, and on Kiosk it takes about ten minutes — most of that spent copying credentials. The not-so-good news: there's one step most people skip, and it's the step that makes till payments appear in your sales automatically. This guide walks through all six steps, including that one.",
      },
      {
        type: "paragraph",
        text: "This is the practical companion to the complete Kopo Kopo POS integration guide — the 'how, exactly.' Every step below is what you'd do on Kiosk.ke; the same shape — credentials, connect, test, activate, webhooks, test payment — applies to any POS that genuinely integrates Kopo Kopo.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Want the big picture first? The complete guide explains what Kopo Kopo is, how integration works under the hood, and what to look for in any POS. Come back here when you're ready to plug it in.",
      },
      {
        type: "heading",
        text: "What You Need Before You Start",
      },
      {
        type: "list",
        items: [
          "A Kopo Kopo account with a till (or paybill) — from app.kopokopo.com, or sandbox.kopokopo.com if you want to test first.",
          "Your API credentials: Client ID, Client Secret, and API Key — from the Applications page in your Kopo Kopo dashboard.",
          "A phone with M-Pesa for the test payment — ideally yours, so you control the PIN.",
          "About ten minutes, and the till number you want customers to pay.",
        ],
      },
      {
        type: "heading",
        text: "Step 1 — Get Your Kopo Kopo Credentials",
      },
      {
        type: "paragraph",
        text: "Sign in to your Kopo Kopo dashboard and open Applications. Copy three values: the Client ID (labeled an application key — it is not the API Key), the Client Secret, and the API Key.",
      },
      {
        type: "paragraph",
        text: "Kopo Kopo gives sandbox and production separate credential pairs. If you're testing, use the sandbox dashboard; when you're ready for real money, switch to production and grab that environment's keys. Don't mix them — a production till won't authenticate with sandbox keys.",
      },
      {
        type: "heading",
        text: "Step 2 — Add Kopo Kopo to Your POS",
      },
      {
        type: "paragraph",
        text: "On Kiosk: Payments → Accept payments → Add method → KopoKopo. Paste the three credentials, pick Sandbox or Production, enter your till number — the one customers pay for STK Push — and add any other tills under Webhook tills.",
      },
      {
        type: "paragraph",
        text: "The form is deliberately strict: the till number takes digits only and one number. Extra tills go in the comma-separated Webhook tills field, which is what Kiosk registers with Kopo Kopo so buy goods payments from any of those tills fire automatically.",
      },
      {
        type: "image",
        src: "/blog/kopokopo-connect-form.svg",
        alt: "The Kiosk 'Connect KopoKopo' form — environment, Client ID, Client Secret, API Key, till number, and webhook tills — with a map of where each value comes from in the Kopo Kopo dashboard",
        caption:
          "Connect KopoKopo: the form on the left, and where each value lives in your Kopo Kopo dashboard on the right.",
      },
      {
        type: "heading",
        text: "Step 3 — Test the Connection",
      },
      {
        type: "paragraph",
        text: "Kiosk calls Kopo Kopo with your credentials and confirms they work before anything goes live. Pass, and you get the go-ahead to activate. Fail, and the error points at the usual suspects: a wrong Client ID, a secret pasted with spaces, or sandbox keys on a production till.",
      },
      {
        type: "paragraph",
        text: "Most connection failures are copy-paste problems. Re-check the environment first — that's the number one cause.",
      },
      {
        type: "heading",
        text: "Step 4 — Activate",
      },
      {
        type: "paragraph",
        text: "Activation is the switch that turns the gateway on for real STK Push and till matching. On Kiosk it only appears after the test passes — the product won't let you activate a gateway that can't reach Kopo Kopo.",
      },
      {
        type: "heading",
        text: "Step 5 — Subscribe Your Till Webhooks (the Step People Skip)",
      },
      {
        type: "paragraph",
        text: "This is the step that makes Buy Goods till payments land in your POS automatically. Kiosk tells Kopo Kopo which tills to notify — by till number — and registers a callback URL that receives the signed payment confirmations.",
      },
      {
        type: "paragraph",
        text: "Skip this and STK Push still works, but customers who pay your till number directly won't sync — you're back to checking messages at close. The product even warns you: until the gateway is ACTIVE with webhooks subscribed, a manual 'Mpesa Till' row only prints instructions; it does not receive payments.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "If you ever see 'KopoKopo is not active yet' in Payments, this is the fix: open Manage on the KopoKopo row → Test → Activate → Subscribe till webhooks. That's the whole recipe.",
      },
      {
        type: "heading",
        text: "Step 6 — Run a Test Payment",
      },
      {
        type: "list",
        items: [
          "Ring up a small sale at the till — KES 10 is plenty.",
          "Pay it yourself with STK Push: M-Pesa → enter your number → confirm the prompt on your phone.",
          "Do it again the till way: pay your Buy Goods till directly and watch the sale complete when Kopo Kopo confirms.",
          "Check the sale record and the shift total — the payment should be there, matched, with no manual entry.",
        ],
      },
      {
        type: "paragraph",
        text: "When both paths close a sale by themselves, you're live. Ring one real customer through and watch it happen.",
      },
      {
        type: "heading",
        text: "After You're Live",
      },
      {
        type: "paragraph",
        text: "Money settles to your Kopo Kopo account, and you withdraw to your bank from Kopo Kopo's dashboard — the POS never holds it. If a payment ever doesn't appear, it's almost always one of three things: a till not subscribed to webhooks, an environment mismatch, or a payment to a different till. Each has a quick fix.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Ten minutes now saves an hour a night, forever. Credentials, connect, test, activate, webhooks, test payment — and from then on, every M-Pesa sale closes itself.",
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
            label: "Kiosk.ke's Kopo Kopo Integration",
            href: "/blog/kiosk-kopokopo-integration",
            blurb: "What the integration does once it's live — STK, till matching, Send Money.",
          },
          {
            label: "Kopo Kopo Buy Goods vs. Till Number vs. Paybill",
            href: "/blog/kopokopo-buy-goods-vs-till-vs-paybill",
            blurb: "Which payment channel belongs in your shop's till setup.",
          },
          {
            label: "Kopo Kopo API Webhooks Explained for Non-Developers",
            href: "/blog/kopokopo-webhooks-explained",
            blurb: "What a signed payment notification is, in plain English.",
          },
          {
            label: "Why Your M-Pesa Payments Aren't Syncing with Your Sales Records",
            href: "/blog/why-mpesa-payments-arent-syncing-with-sales",
            blurb: "The three common causes — and their quick fixes.",
          },
        ],
      },
    ],
  },
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
  {
    slug: "setting-up-kopokopo-stk-push-on-pos",
    title: "Setting Up STK Push Checkout on Your POS",
    description:
      "How STK Push checkout works at a Kenyan till — the customer gets the prompt on their phone, confirms the amount, and the sale closes itself. Setup, testing, and what can go wrong.",
    category: "Getting started",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Kopo Kopo", "STK Push", "POS", "M-Pesa", "Kenya"],
    keywords: [
      "STK Push POS",
      "Kopo Kopo STK setup",
      "M-Pesa STK at the till",
      "STK push checkout",
      "how STK push works at a till",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "how-to-connect-kopokopo-to-your-pos",
      "kopokopo-buy-goods-vs-till-vs-paybill",
      "kopokopo-webhooks-explained",
      "kiosk-kopokopo-integration",
    ],
    faqs: [
      {
        question: "What is STK Push at a POS?",
        answer:
          "The till sends the M-Pesa payment prompt straight to the customer's phone. They confirm the amount and enter their PIN, and the sale completes itself — receipt, stock, and shift record, with no further steps.",
      },
      {
        question: "Do customers need my till number for STK Push?",
        answer:
          "No. For STK they just confirm the prompt that lands on their phone. The till number is what they use in the other mode — paying the Buy Goods till directly while the till listens.",
      },
      {
        question: "How long does the customer have to enter their PIN?",
        answer:
          "STK prompts expire after a short window. If the customer takes too long, the till stays in the Waiting state and the cashier can send the prompt again.",
      },
      {
        question: "What happens if the prompt fails?",
        answer:
          "The till shows a failed state with a retry — usually a wrong number, a declined request, or an expired prompt. If it keeps failing, check that the gateway is ACTIVE and the environment matches where customers pay.",
      },
      {
        question: "Can a customer split a payment between cash and STK Push?",
        answer:
          "Yes — split payments are built in. Part cash, part M-Pesa on the same sale, one sale record with two payment lines, and the shift still balances itself.",
      },
      {
        question: "Is STK Push a separate setup from Kopo Kopo?",
        answer:
          "No. STK runs on the same KopoKopo gateway you connect for payments. Active gateway plus your till number, and STK Push is available at the till — no extra module or subscription.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "STK Push is the fastest way to take M-Pesa at a Kenyan counter: the till sends the payment prompt to the customer's phone, they confirm the amount and enter their PIN, and the sale closes itself. No typing till numbers into a phone, no 'confirm with M-Pesa' back and forth.",
      },
      {
        type: "paragraph",
        text: "This guide covers how STK checkout works, what the cashier sees at every step, and how to test it safely before a real queue relies on it.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Prerequisite: the KopoKopo gateway connected and ACTIVE, with your till number on the config. That's the step-by-step setup guide. Once it's live, STK Push is simply the M-Pesa option at checkout — there is no separate switch to find.",
      },
      {
        type: "heading",
        text: "1. Where STK Push Comes From",
      },
      {
        type: "paragraph",
        text: "STK Push runs on the same KopoKopo gateway you connected for payments — the same credentials, the same till number. At checkout, M-Pesa appears as a tender option marked 'Your till STK.' Tap it, enter the customer's number, send the prompt, and the sale completes on confirmation.",
      },
      {
        type: "heading",
        text: "2. The Flow, Step by Step",
      },
      {
        type: "list",
        items: [
          "Ring up the sale — the cart shows the total.",
          "Tap M-Pesa — the tender tile marked 'Your till STK.'",
          "Enter the customer's number — area code and number; the till checks it's a valid Kenyan mobile before sending.",
          "Send the prompt — the till shows Sending, then Waiting on the number.",
          "The customer confirms — amount and PIN on their phone; the till shows Confirmed and completes the sale: receipt, stock, shift record.",
        ],
      },
      {
        type: "image",
        src: "/blog/kopokopo-stk-states.svg",
        alt: "The four STK push states at the till — Ready with the phone number and send button, Sending, Waiting on the customer's number, and Confirmed with the amount and reference — beside the prompt on the customer's phone",
        caption:
          "Ready, sending, waiting, confirmed — the whole checkout in four states.",
      },
      {
        type: "heading",
        text: "3. What Each Till State Means",
      },
      {
        type: "paragraph",
        text: "The states are the whole story: Ready (enter the number, send the prompt), Sending (the prompt is on its way), Waiting (the customer has it — you can send again if needed), Confirmed (green, with the locked amount and a reference — completing the sale), and Failed (red, with a retry).",
      },
      {
        type: "callout",
        tone: "tip",
        text: "The amount shown at confirm is locked to the sale — kept in whole shillings so the till record and Kopo Kopo's charge are always identical. No rounding surprises at close.",
      },
      {
        type: "heading",
        text: "4. The Two M-Pesa Modes",
      },
      {
        type: "paragraph",
        text: "STK Push is the till-initiated mode. The other is the customer-initiated one: the customer pays the Buy Goods till number directly while the till listens — the cashier can keep adding items, and the sale completes when Kopo Kopo confirms. Both are built into the same M-Pesa tender.",
      },
      {
        type: "table",
        headers: ["", "STK Push", "Buy Goods till"],
        rows: [
          ["Who starts it", "The cashier, from the till", "The customer, on their phone"],
          ["Customer sees", "A prompt: amount + Enter PIN", "The normal M-Pesa Buy Goods flow"],
          ["Cashier does", "Enter number, send, wait for Confirmed", "Nothing — the till listens and completes"],
          ["Best for", "Fast checkout with the customer at the counter", "Customers who already pay the till directly"],
        ],
      },
      {
        type: "heading",
        text: "5. Testing Without Risk",
      },
      {
        type: "list",
        items: [
          "Ring up a KES 10 sale — a nominal item or a price override.",
          "Pay it with your own number — confirm the prompt on your own phone.",
          "Watch the till go Sending → Waiting → Confirmed, and the sale close itself.",
          "Check the shift record: KES 10 in M-Pesa, matched, no manual entry.",
        ],
      },
      {
        type: "paragraph",
        text: "If the test fails, it's almost always one of three things: the number format, the gateway not being ACTIVE, or the environment not matching where the money actually lands — the same checks as the connection guide.",
      },
      {
        type: "heading",
        text: "6. What Can Go Wrong (and the Fix)",
      },
      {
        type: "list",
        items: [
          "Wrong number — the till rejects it before sending.",
          "Prompt failed — retry; usually a declined or expired prompt.",
          "Customer takes too long — send again from the Waiting state.",
          "Till offline — STK needs a connection, and the send is blocked until it's back.",
          "Keeps failing — check gateway ACTIVE and the environment.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "STK Push is the fastest checkout in Kenya when it's native — and it's native when the till sends the prompt itself, with no redirects, no separate payment app, and no per-payment module fee.",
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
            blurb: "The pillar guide — STK Push in the context of the whole integration.",
          },
          {
            label: "How to Connect Kopo Kopo to Your POS System",
            href: "/blog/how-to-connect-kopokopo-to-your-pos",
            blurb: "Get the gateway ACTIVE first — then STK just works.",
          },
          {
            label: "Kopo Kopo Buy Goods vs. Till Number vs. Paybill",
            href: "/blog/kopokopo-buy-goods-vs-till-vs-paybill",
            blurb: "When STK, and when the till-direct mode, for your shop.",
          },
          {
            label: "Kopo Kopo API Webhooks Explained for Non-Developers",
            href: "/blog/kopokopo-webhooks-explained",
            blurb: "The signed confirmation that closes the sale — explained plainly.",
          },
          {
            label: "Kiosk.ke's Kopo Kopo Integration",
            href: "/blog/kiosk-kopokopo-integration",
            blurb: "The deep-dive on how Kiosk runs both M-Pesa modes.",
          },
        ],
      },
    ],
  },
  {
    slug: "kopokopo-webhooks-explained",
    title: "Kopo Kopo API Webhooks Explained for Non-Developers",
    description:
      "Webhooks are how your till finds out a payment happened — in plain English. What a signed payment notification is, why it beats checking messages, and what it means for your shop.",
    category: "Payments",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Kopo Kopo", "Webhooks", "API", "Payments", "Kenya"],
    keywords: [
      "Kopo Kopo webhooks explained",
      "payment webhook explained",
      "POS webhook",
      "Kopo Kopo signature verification",
      "callback URL payments",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "how-to-connect-kopokopo-to-your-pos",
      "why-mpesa-payments-arent-syncing-with-sales",
      "kiosk-kopokopo-integration",
      "end-of-day-reconciliation-manual-vs-automated",
    ],
    faqs: [
      {
        question: "What is a webhook in plain English?",
        answer:
          "An automated call from Kopo Kopo to your POS the moment a payment happens — with the amount, the till number, the paying number, and the time. No one checks anything; the system that knows about the money is the system that tells the till.",
      },
      {
        question: "Does a webhook close the right sale?",
        answer:
          "Yes. The till matches the notification to an open sale by amount, and by the paying number where Kopo Kopo provides it. If nothing matches, the payment stays visible until a cashier resolves it — it doesn't silently vanish.",
      },
      {
        question: "Can a webhook be faked?",
        answer:
          "No. Kopo Kopo signs every notification with a secret only it and your POS share (the X-KopoKopo-Signature). The till checks the signature before acting, so a customer or staff member can't forge a confirmation.",
      },
      {
        question: "Do I need a developer to set up webhooks?",
        answer:
          "On Kiosk, no. The 'Subscribe till webhooks' action registers your till numbers and the callback URL automatically. On a POS without this, you'd typically paste a callback URL into the Kopo Kopo dashboard — that's the manual version.",
      },
      {
        question: "What's the difference between a webhook and polling?",
        answer:
          "A webhook is Kopo Kopo calling the till the instant a payment happens. Polling is the till asking Kopo Kopo 'any payments yet?' over and over. Webhooks are instant and free to check; polling is slower and wastes effort on empty answers.",
      },
      {
        question: "Which Kopo Kopo webhooks matter for a shop?",
        answer:
          "Two: payment received (a customer paid a till — Kiosk uses it to complete sales, including the 'listening for till payment' flow) and send money (a payout was confirmed — Kiosk uses it to update supplier ledgers). One integration, money in and money out.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "A webhook is a phone call between systems. When a customer pays your till, Kopo Kopo doesn't wait for anyone to check anything — it calls your POS and says, 'KES 1,500 just landed on till 3502582, from a number ending in 123.' No developer required to understand that. This guide explains the whole idea over the counter.",
      },
      {
        type: "paragraph",
        text: "You'll come away knowing the two halves of any webhook — the event and the delivery — why the call carries a signature, what your till does with it, and what breaks when webhooks aren't set up.",
      },
      {
        type: "callout",
        tone: "info",
        text: "This is the plain-English version of the complete guide's technical section. If you've already read the pillar, think of this as the story behind the diagram.",
      },
      {
        type: "heading",
        text: "1. A Webhook Is Just a Phone Call",
      },
      {
        type: "paragraph",
        text: "Every webhook has two halves. The event: what happened — a payment arrived, with its amount and its details. The delivery: how your till finds out — Kopo Kopo dials a callback URL your POS registered when you subscribed till webhooks.",
      },
      {
        type: "list",
        items: [
          "Who calls — Kopo Kopo, the moment the money moves.",
          "Who picks up — your POS, at the callback URL wired up during setup.",
          "What's said — a payment event: amount, till number, paying number, time.",
          "How you know it's genuine — a signature on the call.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "In Kiosk you never see the URL. 'Subscribe till webhooks' registers the callback for each till automatically — the phone call is set up for you.",
      },
      {
        type: "heading",
        text: "2. The Signature Is What Makes It Trustworthy",
      },
      {
        type: "paragraph",
        text: "The key word is signed. Kopo Kopo signs every payment notification with a secret only it and your POS share — carried in the X-KopoKopo-Signature header. Before the till closes a sale on the strength of a call, it checks the signature. Wrong signature, ignored.",
      },
      {
        type: "paragraph",
        text: "Why that matters at the counter: the 'I paid' claim. A customer or a staff member cannot forge a confirmation. The only way a sale closes as paid is if Kopo Kopo itself confirmed the payment.",
      },
      {
        type: "image",
        src: "/blog/kopokopo-webhook-anatomy.svg",
        alt: "A webhook as a signed phone call: a payment event, Kopo Kopo calling the till with an X-KopoKopo-Signature, and the till verifying the signature before it matches and closes the sale",
        caption:
          "Event, signed call, action — the three parts of a webhook, and the signature that keeps it honest.",
      },
      {
        type: "heading",
        text: "3. What the Till Does with the Call",
      },
      {
        type: "list",
        items: [
          "Matches it to an open sale — by amount, and by the paying number where available.",
          "Closes the sale — receipt, stock drop, and a payment line in the shift record.",
          "Or holds it — no match yet means the payment stays visible until a cashier resolves it. Nothing vanishes.",
        ],
      },
      {
        type: "paragraph",
        text: "That's the whole magic: nobody checks anything, because the system that knows about the money is the system that tells the till.",
      },
      {
        type: "heading",
        text: "4. Two Calls Your Till Cares About",
      },
      {
        type: "paragraph",
        text: "In a shop, two Kopo Kopo webhooks matter, and both run through the same integration:",
      },
      {
        type: "list",
        items: [
          "Payment received — a customer paid a till (buy goods). Kiosk uses it to complete sales, including the 'listening for till payment' flow where the cashier keeps working while the customer pays.",
          "Send money — a payout was confirmed (Kopo Kopo Send Money). Kiosk uses it to update supplier ledgers the moment you pay an invoice.",
        ],
      },
      {
        type: "paragraph",
        text: "One integration, two directions — money in and money out — and both update your records automatically.",
      },
      {
        type: "heading",
        text: "5. Webhooks vs. Checking Messages",
      },
      {
        type: "table",
        headers: ["", "Webhook (integrated)", "Checking messages (manual)"],
        rows: [
          ["How the till learns", "Instantly — Kopo Kopo calls", "When someone scrolls to it"],
          ["Accuracy", "Exact amount, till, number, time", "As good as the reading and typing"],
          ["Signature check", "Yes — can't be faked", "None"],
          ["Close time", "Sale closes itself", "Close waits on the match"],
          ["What breaks", "A misconfigured callback or till", "Busy days, staff changes, deleted messages"],
        ],
      },
      {
        type: "heading",
        text: "6. Why This Matters at Close",
      },
      {
        type: "paragraph",
        text: "Because every payment arrived signed and matched at the moment it happened, the end-of-day report is a formality: the M-Pesa column comes from confirmed payments, and it agrees with your business account. Reconciliation doesn't disappear — it shrinks to the exceptions, and most days there are none.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "Webhooks only work if they're subscribed. An unsubscribed till is a till that pays in silence — the money arrives and your sales don't. That's the 'KopoKopo is not active yet' warning you'll see in Payments until the till webhooks are registered.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "A webhook is just Kopo Kopo calling your till the moment a payment happens — with a signature, so only real payments get through. No checking, no polling, no waiting. That one call is the difference between a till that reconciles itself and a till that needs a night shift.",
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
            blurb: "The pillar guide — how the whole integration fits together.",
          },
          {
            label: "How to Connect Kopo Kopo to Your POS System",
            href: "/blog/how-to-connect-kopokopo-to-your-pos",
            blurb: "The step-by-step setup, including subscribing till webhooks.",
          },
          {
            label: "End-of-Day Reconciliation: Manual vs. Automated",
            href: "/blog/end-of-day-reconciliation-manual-vs-automated",
            blurb: "What the close looks like when every payment already matched itself.",
          },
          {
            label: "Why Your M-Pesa Payments Aren't Syncing with Your Sales Records",
            href: "/blog/why-mpesa-payments-arent-syncing-with-sales",
            blurb: "The common causes — unsubscribed tills among them.",
          },
          {
            label: "Kiosk.ke's Kopo Kopo Integration",
            href: "/blog/kiosk-kopokopo-integration",
            blurb: "The deep-dive on how Kiosk uses payment and Send Money webhooks.",
          },
        ],
      },
    ],
  },
  {
    slug: "why-mpesa-payments-arent-syncing-with-sales",
    title: "Why Your M-Pesa Payments Aren't Syncing with Your Sales Records",
    description:
      "M-Pesa payments that never appear in your sales reports are usually one of five fixable problems — and the fix is almost always a real integration, not more manual checking.",
    category: "Payments",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["M-Pesa", "Reconciliation", "POS", "Kenya", "Payments"],
    keywords: [
      "M-Pesa not syncing with sales",
      "payments missing from POS",
      "M-Pesa reconciliation problems",
      "Kopo Kopo payments not appearing",
      "till webhooks not working",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "end-of-day-reconciliation-manual-vs-automated",
      "kopokopo-webhooks-explained",
      "how-to-connect-kopokopo-to-your-pos",
      "reduce-payment-disputes-at-the-till",
    ],
    faqs: [
      {
        question: "Why don't my M-Pesa payments show in my sales records?",
        answer:
          "Almost always one of five structural causes: no real gateway (a manual till only prints instructions), the gateway not ACTIVE, till webhooks not subscribed, the wrong environment, or the customer paying a different till. The fix in every case is a few minutes in Payments settings.",
      },
      {
        question: "What's the most common cause?",
        answer:
          "Either there was never a real integration — the 'Mpesa Till' row only prints instructions and doesn't receive payments — or the gateway is active but the till webhooks were never subscribed, so customer-initiated till payments arrive in silence.",
      },
      {
        question: "Do I need to match every payment by hand?",
        answer:
          "No — that's the symptom, not the solution. A connected till matches each payment as it happens: Kopo Kopo sends a signed confirmation, and the sale closes itself. Hand-matching is what you do when the integration is missing.",
      },
      {
        question: "How do I know which cause it is?",
        answer:
          "Run the five checks in order — gateway connected, gateway ACTIVE, webhooks subscribed, environment correct, right till. The first check that fails is your cause, and its fix is one step.",
      },
      {
        question: "What does a fixed till look like?",
        answer:
          "A test payment closes a sale by itself — receipt, stock, shift record — and the shift's M-Pesa total agrees with your business account, with zero manual entries.",
      },
      {
        question: "Will STK Push still work if webhooks aren't subscribed?",
        answer:
          "Possibly. STK Push (the till sends the prompt) can work without webhooks, but customer-initiated Buy Goods till payments won't sync until the till webhooks are subscribed. That's the exact split you'll notice first.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "The money arrived — customers paid, the account grew — but your sales records don't show it. At close, you're scrolling messages to find what the till missed. Before you blame the staff or the books, know this: when M-Pesa doesn't sync, it's almost never a people problem. It's one of five structural causes, and each one has a fix that takes minutes.",
      },
      {
        type: "callout",
        tone: "info",
        text: "This guide is the troubleshooting spoke in the Kopo Kopo series — it names the exact causes behind the 'why won't it sync' question. For how matching is supposed to work, the webhooks guide covers the machinery.",
      },
      {
        type: "heading",
        text: "1. Before Anything Else: Did the Payment Actually Happen?",
      },
      {
        type: "paragraph",
        text: "Ground truth first. STK prompts get declined and cancelled; a prompt that never completed is not a sync problem, it's a non-payment. Check the business account and, if needed, the customer's phone. If the money truly arrived, run the five checks below.",
      },
      {
        type: "heading",
        text: "2. The Five Causes",
      },
      {
        type: "paragraph",
        text: "In order, from most common to least:",
      },
      {
        type: "list",
        items: [
          "The gateway was never connected. A Manual 'Mpesa Till' row only prints your till and paybill numbers on receipts — it does not receive payment data. Symptom: payments never appear, and someone is doing all the matching by hand. Fix: connect KopoKopo under Payments → Accept payments.",
          "The gateway isn't ACTIVE. Symptom: the 'KopoKopo is not active yet' banner in Payments. Fix: Manage → Test connection → Activate.",
          "Till webhooks aren't subscribed. Symptom: STK Push works, but customers who pay the Buy Goods till directly never sync. Fix: Subscribe till webhooks on the ACTIVE KopoKopo row — that's what registers your tills and the callback.",
          "The environment is wrong. Symptom: sandbox keys on a production till, or everything tested in sandbox while customers pay the live till. Fix: use the environment where the money actually lands.",
          "The customer paid a different till. Symptom: money landed, no sale matches. Fix: add that till number to Webhook tills and subscribe again.",
        ],
      },
      {
        type: "image",
        src: "/blog/kopokopo-sync-causes.svg",
        alt: "Five checks in order for a missing payment — gateway connected, gateway ACTIVE, webhooks subscribed, right environment, right till — each with its symptom and fix",
        caption:
          "Run the checks in order; the first one that fails is the cause, and its fix is one step.",
      },
      {
        type: "heading",
        text: "3. What 'Fixed' Looks Like",
      },
      {
        type: "paragraph",
        text: "A connected till doesn't sync better — it syncs itself. Ring a KES 10 test sale, pay it two ways (STK Push to your own phone, then paying the Buy Goods till directly), and both should close a sale on their own. From then on, the shift report's M-Pesa column comes from confirmed payments and agrees with your business account.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "If your 'payment method' is a manual till that prints instructions, you are not integrated — you're doing the integration's job by hand every night. The fix is the gateway, not more checking.",
      },
      {
        type: "heading",
        text: "4. When It's Still Not Sync",
      },
      {
        type: "paragraph",
        text: "Once the five checks pass and a test payment closes a sale by itself, a 'missing' payment is almost always one of two things: the payment matched a different sale (a refund, or a customer paying twice), or the money never actually arrived. Both resolve faster now, because the till has a record either way.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "The pattern behind every fix: integration, not effort. The structural causes are structural because no amount of careful matching makes an unsubscribed webhook fire. Fix the structure once, and the nightly matching disappears with it.",
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
            blurb: "The pillar guide — how integration prevents these five causes.",
          },
          {
            label: "How to Connect Kopo Kopo to Your POS System",
            href: "/blog/how-to-connect-kopokopo-to-your-pos",
            blurb: "The step-by-step setup — the fix for most of the five causes.",
          },
          {
            label: "Kopo Kopo API Webhooks Explained for Non-Developers",
            href: "/blog/kopokopo-webhooks-explained",
            blurb: "What the signed confirmation is, and why subscribing matters.",
          },
          {
            label: "End-of-Day Reconciliation: Manual vs. Automated",
            href: "/blog/end-of-day-reconciliation-manual-vs-automated",
            blurb: "What the close looks like when payments match themselves.",
          },
          {
            label: "How to Reduce Payment Disputes at the Till",
            href: "/blog/reduce-payment-disputes-at-the-till",
            blurb: "When a 'missing' payment turns into a disagreement.",
          },
        ],
      },
    ],
  },
  {
    slug: "end-of-day-reconciliation-manual-vs-automated",
    title: "End-of-Day Reconciliation: Manual M-Pesa Checking vs. Automated POS Matching",
    description:
      "The nightly ritual of matching M-Pesa messages to sales — and what your close looks like when the till does the matching instead.",
    category: "Operations",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Reconciliation", "M-Pesa", "POS", "Kenya", "Operations"],
    keywords: [
      "end of day reconciliation POS",
      "M-Pesa till reconciliation",
      "automated payment matching",
      "payment reconciliation Kenya",
      "till close out",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "why-mpesa-payments-arent-syncing-with-sales",
      "reduce-payment-disputes-at-the-till",
      "kiosk-kopokopo-integration",
      "kopokopo-webhooks-explained",
    ],
    faqs: [
      {
        question: "What is end-of-day reconciliation?",
        answer:
          "Making two records agree: what the till says you sold and what actually arrived — cash in the drawer, M-Pesa in the account. For mobile money, that means matching every payment to a sale.",
      },
      {
        question: "How long does manual M-Pesa reconciliation take?",
        answer:
          "Roughly thirty seconds per payment. Fifty M-Pesa sales a day is twenty-five minutes of someone's time every night — about 125 hours a year, more than three full working weeks, spent scrolling a phone.",
      },
      {
        question: "What happens when a payment doesn't match a sale?",
        answer:
          "With an integrated till, it waits in a visible state until a cashier resolves it — the exception, not the routine. Done by hand, it becomes a call to a customer, a dispute, or a quiet write-off.",
      },
      {
        question: "Does an integrated POS do reconciliation for me?",
        answer:
          "It matches payments as they happen — a signed confirmation from Kopo Kopo closes the right sale — so the close becomes a report: cash, M-Pesa, and splits, already agreeing with your business account. Exceptions still need a human, but they're rare.",
      },
      {
        question: "Can I reconcile M-Pesa payments without an integrated POS?",
        answer:
          "Yes — by hand, which is exactly the ritual this guide compares: scroll the messages, match each amount to a sale, chase the mismatches. It works; it just costs time every single night and accuracy on the nights it matters most.",
      },
      {
        question: "What makes reconciliation go wrong?",
        answer:
          "Split payments counted twice, several tills mixed into one phone, deleted messages, staff changes that lose the unwritten 'system,' and payments that confirm to a till the records don't know. An integrated till removes every one of those failure modes.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Every shop has a close. Cashiers leave, the till stops, and somebody sits down with the day's money on one side and the day's record on the other, and makes them agree. When the payments are cash, this is quick. When half of them came through M-Pesa, it becomes a second job.",
      },
      {
        type: "paragraph",
        text: "Reconciliation is just making two records agree: what you sold versus what you received. This guide compares the two ways that happens at a Kenyan counter — the manual ritual and the automated close — and what each one actually costs you.",
      },
      {
        type: "callout",
        tone: "info",
        text: "This is the pain-point article in the Kopo Kopo series: it names the exact friction an integrated till removes. For the mechanics — what a signed webhook is and how matching works — the webhooks guide covers the machinery.",
      },
      {
        type: "heading",
        text: "1. What Reconciliation Actually Is",
      },
      {
        type: "paragraph",
        text: "Two ledgers, one story. The sales ledger: the till's record of what went out the door. The payment ledger: what actually arrived — cash in the drawer, M-Pesa in the messages. Reconciling means proving the two tell the same story.",
      },
      {
        type: "paragraph",
        text: "Cash is self-balancing — it's in the drawer, and the drawer either counts up or it doesn't. M-Pesa is the problem child: the money is in your business account, but the evidence of which sale it paid for lives in a string of SMS messages on someone's phone.",
      },
      {
        type: "heading",
        text: "2. The Manual Ritual, Step by Step",
      },
      {
        type: "list",
        items: [
          "Scroll the M-Pesa messages for the day and note every amount.",
          "Match each one to a sale on the till — same amount, and hope nothing is ambiguous.",
          "Chase the mismatches: a payment with no sale, a sale with no payment, two KES 500 payments and one sale for KES 500.",
          "Settle the ones you can; write off the ones you can't.",
        ],
      },
      {
        type: "paragraph",
        text: "Put a number on it. Fifty M-Pesa sales a day — nothing for a busy mini-mart — at thirty seconds each is twenty-five minutes of your most senior person's time, every single night. Across a year, that's over 125 hours: more than three full working weeks, spent scrolling a phone.",
      },
      {
        type: "image",
        src: "/blog/kopokopo-recon-time.svg",
        alt: "Manual close on the left — scrolling messages, matching by hand, closing at 9:47 PM, 25 minutes a night; integrated close on the right — payments matched as they happen, closing in four minutes",
        caption:
          "Same shop, same sales. One close is a ritual; the other is a report.",
      },
      {
        type: "heading",
        text: "3. Where Manual Reconciliation Breaks",
      },
      {
        type: "list",
        items: [
          "Busy days — the more payments, the slower and sloppier the match.",
          "Split payments — one sale, two payment lines; easy to count twice or not at all.",
          "Multiple tills — messages from three till numbers mixed into one phone.",
          "Staff changes — the person who knows the 'system' leaves, and the system was in their head.",
          "Silent failures — a payment that never confirms, or confirms to a till the records don't know.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Every unmatched payment is money you can't trust. Either it didn't arrive, or it arrived and your records say otherwise — and by morning, nobody remembers which.",
      },
      {
        type: "heading",
        text: "4. The Automated Close",
      },
      {
        type: "paragraph",
        text: "With an integrated till, matching happens at the moment of payment, not at midnight. Kopo Kopo's signed confirmation arrives, the till ties it to the open sale, and the close becomes a report:",
      },
      {
        type: "list",
        items: [
          "M-Pesa totals come from confirmed payments — matched, not remembered.",
          "Cash and M-Pesa live in the same shift record; split payments are one sale with two lines.",
          "Exceptions are visible: a payment that doesn't match waits in a state a cashier resolves — usually minutes, not hours.",
          "The close takes minutes: the drawer agrees with the cash total, and the M-Pesa column agrees with the business account.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Reconciliation doesn't disappear — it shrinks to the exceptions. And on most days, there are none.",
      },
      {
        type: "heading",
        text: "5. What Good Reconciliation Buys You",
      },
      {
        type: "list",
        items: [
          "Fewer disputes — a confirmed payment is tied to a sale, with the amount and the time.",
          "Less shrinkage — staff can't pocket 'unmatched' payments when every payment is already matched.",
          "Accurate reports — your daily, weekly, and tax numbers start from facts, not recall.",
          "A calm close — the last cashier leaves on time, and so does the owner.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Manual reconciliation is a tax on the unintegrated: 25 minutes a night, more on bad days, paid in your most senior person's time. An integrated till doesn't reconcile for you — it reconciles as you sell, and the close is just a formality. Same shop, same sales: one close is a ritual, the other is a report.",
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
            blurb: "The pillar guide — integration from till setup to auto-matching.",
          },
          {
            label: "Why Your M-Pesa Payments Aren't Syncing with Your Sales Records",
            href: "/blog/why-mpesa-payments-arent-syncing-with-sales",
            blurb: "When matching breaks — the causes and the fixes.",
          },
          {
            label: "How to Reduce Payment Disputes at the Till",
            href: "/blog/reduce-payment-disputes-at-the-till",
            blurb: "Confirmed payments settle the 'I paid / you didn't' argument.",
          },
          {
            label: "Kopo Kopo API Webhooks Explained for Non-Developers",
            href: "/blog/kopokopo-webhooks-explained",
            blurb: "The signed call that makes automated matching possible.",
          },
          {
            label: "Kiosk.ke's Kopo Kopo Integration",
            href: "/blog/kiosk-kopokopo-integration",
            blurb: "The deep-dive on how the close looks when payments are native.",
          },
        ],
      },
    ],
  },
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
  {
    slug: "is-kopokopo-safe-security-and-settlement",
    title: "Is Kopo Kopo Safe? Security and Settlement Explained",
    description:
      "Where your money sits, who sees your credentials, and how signed webhooks keep payment confirmations from being faked. Kopo Kopo security for retailers.",
    category: "Guides",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Kopo Kopo", "Security", "Settlement", "M-Pesa", "Kenya"],
    keywords: [
      "is Kopo Kopo safe",
      "Kopo Kopo security",
      "Kopo Kopo settlement",
      "Kopo Kopo money safe",
      "M-Pesa payment security Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      PILLAR_SLUG,
      "kopokopo-webhooks-explained",
      "reduce-payment-disputes-at-the-till",
      "kiosk-kopokopo-integration",
      "kopokopo-fees-and-retailer-margins",
    ],
    faqs: [
      {
        question: "Is Kopo Kopo safe for a shop to accept payments with?",
        answer:
          "Yes. Money settles to your own M-Pesa business account — it doesn't sit in a Kopo Kopo wallet or with your POS. Kopo Kopo provides the payment rails and confirmations, and you withdraw to your bank from your own dashboard.",
      },
      {
        question: "Where does the money go when a customer pays?",
        answer:
          "Straight into your till or paybill business account. Your POS matches the payment to a sale and reports it; it never holds the money, and neither does the aggregator.",
      },
      {
        question: "Can someone fake a payment confirmation?",
        answer:
          "No. Kopo Kopo signs every confirmation (the X-KopoKopo-Signature), and the till verifies the signature before closing a sale. A customer can't claim a payment that didn't happen, and staff can't record one.",
      },
      {
        question: "Who can access my Kopo Kopo credentials?",
        answer:
          "You and whoever you grant admin rights to. The POS stores the credentials encrypted and uses them only to connect; withdrawals happen from your dashboard, so dashboard access is the real key.",
      },
      {
        question: "Is my customers' data protected?",
        answer:
          "Yes. Paying numbers arrive masked — like +2547XXXXX123 — so the till can recognise a customer without handling their full number, and Kiosk uses that masked identity for repeat and credit customers.",
      },
      {
        question: "What if a payment is disputed?",
        answer:
          "The sale record holds the confirmation — amount, time, and paying number. That settles most 'I paid / you didn't' disputes on the spot, because the evidence is attached to the sale itself.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "'Is Kopo Kopo safe?' deserves a straight answer, not a brochure. The honest way to answer it is to follow the money: where it sits between the customer's PIN and your bank, who can touch it, and how payment confirmations are kept unforgeable. That's what this guide does.",
      },
      {
        type: "callout",
        tone: "info",
        text: "This is the trust article in the Kopo Kopo series. For the mechanics behind the security claims — signed webhooks, verification, matching — the webhooks guide has the plain-English version.",
      },
      {
        type: "heading",
        text: "1. Where Your Money Sits",
      },
      {
        type: "paragraph",
        text: "When a customer pays your till, the money moves through Safaricom's M-Pesa into your business account — the till or paybill registered to you. It does not sit in a Kopo Kopo wallet, and it does not sit with your POS. Kopo Kopo's role is the rails and the confirmations; settlement and withdrawal happen from your own Kopo Kopo dashboard, where you initiate the transfer to your bank.",
      },
      {
        type: "paragraph",
        text: "That's the first and biggest answer: the money is yours, in your account, from the moment it moves. No intermediary holds it overnight.",
      },
      {
        type: "image",
        src: "/blog/kopokopo-money-flow.svg",
        alt: "Where the money goes: customer's phone, through Safaricom M-Pesa, into your business account, out via the Kopo Kopo dashboard to your bank — with Kiosk matching and reporting but never holding funds",
        caption:
          "Your money lives in your business account — you withdraw it to your bank. That's the whole journey.",
      },
      {
        type: "heading",
        text: "2. Who Can Touch What",
      },
      {
        type: "paragraph",
        text: "Your Kopo Kopo credentials — Client ID, Client Secret, and API Key — are the keys. They connect your POS to your account, and they should live with the owner and whoever you grant admin rights to. Kiosk stores them encrypted and uses them only to connect; it never shows them back to staff at the till.",
      },
      {
        type: "paragraph",
        text: "Withdrawals are a separate layer: they happen from the Kopo Kopo dashboard, behind your login. So dashboard security — a strong password, and two-factor authentication if available — is the real lock on your money.",
      },
      {
        type: "heading",
        text: "3. Confirmations Can't Be Faked",
      },
      {
        type: "paragraph",
        text: "The security that matters at the counter is proof. Every payment confirmation Kopo Kopo sends is signed — the X-KopoKopo-Signature — and the till verifies the signature before it closes a sale. A customer cannot claim a payment that never happened, and a staff member cannot record one. The only way a sale closes as paid is if Kopo Kopo itself confirmed the money.",
      },
      {
        type: "paragraph",
        text: "Customer data gets the same care: paying numbers arrive masked, like +2547XXXXX123, so the till can recognise a customer without handling their full number — and Kiosk uses that masked identity for repeat and credit customers.",
      },
      {
        type: "heading",
        text: "4. The Rails Themselves",
      },
      {
        type: "paragraph",
        text: "Kopo Kopo is one of Kenya's longest-standing payment technology companies, built on Safaricom's mobile money infrastructure. It doesn't run its own parallel payment network — it makes the network Kenyan shops already use work harder for you. That means the security of every transaction starts with M-Pesa's own protections, and Kopo Kopo adds the automation layer on top.",
      },
      {
        type: "heading",
        text: "5. What You Should Still Do",
      },
      {
        type: "list",
        items: [
          "Keep the credentials with the owner — don't hand the Client Secret to every cashier.",
          "Use a strong password and two-factor authentication on the Kopo Kopo dashboard.",
          "Review the till list in your config — only the tills you actually use should be subscribed.",
          "Match the environment to where customers pay: production for live money, sandbox only for tests.",
          "Check the daily M-Pesa total against your business account — the shift report makes this a two-minute look.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "The security picture is layered, and every layer is yours: money in your business account, confirmations signed and verified, credentials encrypted, withdrawals only from your dashboard. The POS matches and reports — it never holds or moves your takings.",
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
            blurb: "The pillar guide — what Kopo Kopo is and how it connects to a POS.",
          },
          {
            label: "Kopo Kopo API Webhooks Explained for Non-Developers",
            href: "/blog/kopokopo-webhooks-explained",
            blurb: "How signed confirmations make fraud impossible at the till.",
          },
          {
            label: "How to Reduce Payment Disputes at the Till",
            href: "/blog/reduce-payment-disputes-at-the-till",
            blurb: "What the confirmation on a sale does for a disagreement.",
          },
          {
            label: "Kiosk.ke's Kopo Kopo Integration",
            href: "/blog/kiosk-kopokopo-integration",
            blurb: "How the deep integration handles money in and money out.",
          },
          {
            label: "Kopo Kopo Fees and How They Affect Your Margins",
            href: "/blog/kopokopo-fees-and-retailer-margins",
            blurb: "What the service costs — the other half of the trust question.",
          },
        ],
      },
    ],
  },
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

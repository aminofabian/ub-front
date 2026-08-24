import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const MPESA_INTEGRATION_ARTICLE: BlogArticle = {
  slug: "why-m-pesa-integration-matters",
  title: "Why M-Pesa Integration Matters (and What 'Native' Really Means)",
  description:
    "In Kenya, mobile money is how customers pay. What native M-Pesa at the till means — STK Push in one tap, auto-credited sales, and a shift that balances itself.",
  category: "Payments",
  publishedAt: "2026-07-21",
  updatedAt: "2026-08-24",
  tags: ["M-Pesa", "Payments", "Kenya", "STK Push", "POS"],
  keywords: [
    "M-Pesa POS Kenya",
    "STK Push at the till",
    "native M-Pesa integration",
    "M-Pesa reconciliation",
    "split payment cash M-Pesa",
    "M-Pesa settlement",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "set-up-a-pos-in-30-minutes",
    "what-hardware-do-you-actually-need",
    "top-10-pos-systems-kenya-2026",
    "why-kiosk-beats-odoo-for-kenyan-shops",
  ],
  faqs: [
    {
      question: "What does 'native' M-Pesa mean at a POS?",
      answer:
        "It means M-Pesa is built into the till itself: you ring the sale, tap M-Pesa, and an STK Push goes straight to the customer's phone. No plugin to install, no API keys to manage, no third-party payment module with its own bill.",
    },
    {
      question: "How does a customer pay with M-Pesa at the till?",
      answer:
        "The cashier rings up the sale and taps M-Pesa. The till sends an STK Push to the customer's phone, they confirm the amount and enter their PIN, and the sale auto-completes — the receipt prints and stock updates without any extra steps.",
    },
    {
      question: "Do I need a separate M-Pesa device or terminal?",
      answer:
        "No. The till runs on the same phone or tablet you use for everything else, and the customer confirms the payment on their own phone. No extra hardware, no extra float to manage.",
    },
    {
      question: "Can a customer split a payment between cash and M-Pesa?",
      answer:
        "Yes — split payments are built in. If a customer is short on cash but has M-Pesa, take part in cash and the rest by STK. It stays one sale with two payment lines, and the shift still balances itself.",
    },
    {
      question: "How do M-Pesa sales reconcile at the end of the day?",
      answer:
        "M-Pesa and cash land in the same till record, so the shift report totals both automatically — no notebook, no late-night matching of phone messages against the day's sales.",
    },
    {
      question: "Is M-Pesa included in the free plan?",
      answer:
        "Yes. Kiosk.ke starts free — 300 products and one cashier — with M-Pesa and a storefront included, so native mobile money works from your very first ring.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Walk into any Kenyan shop and watch what happens at the counter: the customer gets a message on their phone, types a PIN, and the sale is done. Mobile money isn't a payment option in Kenya — it's how customers pay. That one fact decides which POS systems work at a Kenyan counter and which ones just tolerate it.",
    },
    {
      type: "callout",
      tone: "info",
      text: "This guide is about the difference between a till where M-Pesa is native — built in, one tap, auto-credited — and one where payments are bolted on with plugins, credentials, and monthly fees. The gap decides how fast your queue moves and whether your shift balances itself at night.",
    },
    {
      type: "heading",
      text: "1. M-Pesa Is Not a Feature — It's the Till",
    },
    {
      type: "paragraph",
      text: "Software built in Nairobi knows something software built in Brussels or San Francisco often learns too late: roughly nine out of ten till transactions at a Kenyan counter involve mobile money. A POS that treats M-Pesa as an afterthought adds a step to every sale — and a step on every sale is a queue, a lost sale, or a nightly reconciliation headache.",
    },
    {
      type: "paragraph",
      text: "That's why the best POS rankings for Kenya score 'native M-Pesa' as a first-class criterion, not a nice-to-have. It's the difference between the till doing the payment for you and you doing the payment around the till.",
    },
    {
      type: "heading",
      text: "2. What Native STK Actually Looks Like",
    },
    {
      type: "paragraph",
      text: "STK Push — the payment prompt that lands on a customer's phone — is how mobile money works in person. Native integration means the till sends it, and the sale completes itself when the customer confirms:",
    },
    {
      type: "image",
      src: "/blog/mpesa-stk-flow.svg",
      alt: "The STK Push flow: the till rings up a sale and sends the prompt, the customer confirms the amount and enters their PIN, and the till auto-credits the sale",
      caption:
        "One tap at the till, a PIN on the customer's phone, and the sale is done — receipt printed, stock dropped, money in.",
    },
    {
      type: "list",
      items: [
        "Ring the sale — the cart shows the total, the cashier taps M-Pesa.",
        "STK Push is sent instantly to the customer's phone — no typing their number twice, no separate payment app.",
        "The customer confirms the amount and enters their PIN on their own phone.",
        "The till auto-credits on confirmation — receipt, stock update, and payment record in one motion.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "The whole flow takes about as long as handing over change — because there is no 'handing over' at all. The money moves, the sale closes, and the next customer steps up.",
    },
    {
      type: "heading",
      text: "3. The Other Way: Bolted-On Payments",
    },
    {
      type: "paragraph",
      text: "Some POS systems — especially global ones — accept M-Pesa only through a third-party payment module. That means installing a plugin, registering for gateway credentials, configuring sandbox keys, and testing. And it doesn't end at setup: the module usually carries a subscription, and every platform update risks breaking it.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "Every extra moving part between 'the customer wants to pay' and 'the money is in your account' is a place for a sale to die. If your POS needs a payment plugin, a consultant, or a weekend to accept M-Pesa, it isn't built for a Kenyan counter.",
    },
    {
      type: "heading",
      text: "4. A Real Shift, Auto-Reconciled",
    },
    {
      type: "paragraph",
      text: "Here's what a busy day actually looks like when payments are native: cash sales, M-Pesa sales, and split payments all land in the same till record. At close, the drawer totals itself — cash here, M-Pesa there, and they add up to the day's sales with nothing left to match by hand.",
    },
    {
      type: "image",
      src: "/blog/mpesa-counter-mix.svg",
      alt: "A mixed shift of cash and M-Pesa sales that reconciles itself at close: cash drawer, M-Pesa total, and the till total all agree without a notebook",
      caption:
        "Cash, M-Pesa, and split payments — one balanced shift, no late-night matching.",
    },
    {
      type: "list",
      items: [
        "Cash and M-Pesa live in the same sale record — no separate logs to merge.",
        "Split payments (part cash, part STK) are one sale with two lines, not two half-sales.",
        "The shift report totals everything; the M-Pesa float matches what hit your account.",
      ],
    },
    {
      type: "heading",
      text: "5. What to Look for in Any POS",
    },
    {
      type: "list",
      items: [
        "Native STK Push from the till — not a redirect to a separate payment screen.",
        "Auto-credit on confirmation — the sale closes itself when the customer enters their PIN.",
        "Split payments built in — cash plus M-Pesa on one sale.",
        "Settlement in your shift reports — M-Pesa reconciles like cash, not like a mystery.",
        "No per-payment module fees — native payments don't charge you a monthly plugin subscription.",
      ],
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "In Kenya, mobile money isn't a feature — it's the till. Native M-Pesa means one tap at your counter, a PIN on the customer's phone, and a sale that closes itself. Bolted-on payments mean plugins, keys, sandboxes, and bills. When your payment flow is native, your queue moves, your shift balances, and your stock stays honest.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "Till, storefront, M-Pesa, and eTIMS live the same afternoon.",
        },
        {
          label: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
          href: "/blog/why-kiosk-beats-odoo-for-kenyan-shops",
          blurb: "Native M-Pesa versus bolted-on payment modules, in detail.",
        },
        {
          label: "Top 10 POS Systems in Kenya (2026)",
          href: "/blog/top-10-pos-systems-kenya-2026",
          blurb: "Ranked on native M-Pesa, eTIMS readiness, and shop-floor fit.",
        },
        {
          label: "What Hardware Do You Actually Need?",
          href: "/blog/what-hardware-do-you-actually-need",
          blurb: "Phone, scanner, printer — the only kit a Kenyan counter needs.",
        },
        {
          label: "Choosing the Right POS: Kiosk.ke vs. Odoo",
          href: "/blog/choosing-the-right-pos-kiosk-vs-odoo",
          blurb: "The balanced guide to picking the platform that fits your business.",
        },
      ],
    },
  ],
};

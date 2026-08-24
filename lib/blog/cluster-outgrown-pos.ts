import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const OUTGROWN_POS_ARTICLE: BlogArticle = {
  slug: "5-signs-youve-outgrown-your-pos",
  title: "5 Signs You've Outgrown Your POS",
  description:
    "Stock mismatches, slow checkouts, and spreadsheet workarounds — the clear signals it's time to upgrade your point of sale.",
  category: "Guides",
  publishedAt: "2026-07-22",
  updatedAt: "2026-08-24",
  tags: ["POS", "Growth", "Retail", "Kenya"],
  keywords: [
    "outgrown POS",
    "signs you need a new POS",
    "POS too slow checkout",
    "POS stock mismatch",
    "spreadsheet workarounds",
    "upgrade point of sale",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "erp-vs-pos-do-you-need-the-full-suite",
    "why-kiosk-beats-odoo-for-kenyan-shops",
    "set-up-a-pos-in-30-minutes",
    "online-physical-one-inventory",
    "top-10-pos-systems-kenya-2026",
  ],
  faqs: [
    {
      question: "How do I know I've outgrown my POS?",
      answer:
        "The clearest signal is work the till was supposed to remove: nightly reconciliation, a spreadsheet next to the counter, stock that never matches, or a checkout that's slower than the customers it serves. When the tool adds work instead of removing it, you've outgrown it.",
    },
    {
      question: "Is it the POS or just a busy period?",
      answer:
        "One or two rough days is a busy week. Three or more of the signs persisting for weeks — wrong stock counts, payment workarounds, spreadsheet fixes — means the pattern is the tool, not the traffic.",
    },
    {
      question: "Do I need an ERP when my POS feels small?",
      answer:
        "Not usually. The step from an outgrown till is a better POS, not a company-wide ERP. The ERP conversation starts when you add warehouses, manufacturing, or an HR and finance team — see the ERP vs POS guide for the full test.",
    },
    {
      question: "Will upgrading lose my data?",
      answer:
        "It shouldn't. A POS worth switching to imports your real products, prices, and stock — and the habits you already have (ringing every sale, honest prices) are exactly the data a new system wants. The switch is an afternoon, not an IT project.",
    },
    {
      question: "What's the fastest win after upgrading?",
      answer:
        "Native M-Pesa and one shared inventory. Payments that auto-credit kill the nightly reconciliation, and one stock count across till and storefront kills the spreadsheet — the two biggest time sinks disappear in the first week.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "No one wakes up and decides their till is too small. It happens gradually — a stock count that never quite matches, a checkout that slows at the worst moment, a spreadsheet that quietly became the real system. These aren't signs your shop is failing. They're signs your shop has outgrown its tool. And that's a much easier problem to fix.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The telltale pattern: the till was bought to remove work, and the shop now does more work because of it. When the tool adds friction instead of removing it, you haven't failed the till — the till has failed you.",
    },
    {
      type: "heading",
      text: "The Five Signs",
    },
    {
      type: "image",
      src: "/blog/outgrown-signs.svg",
      alt: "Five red flags: stock counts that never match, checkout as the bottleneck, a spreadsheet next to the till, M-Pesa taking two apps, and a WhatsApp-album online shop",
      caption:
        "Each sign is the same sentence in disguise: the tool can't keep up with the shop.",
    },
    {
      type: "heading",
      text: "1. Stock Counts Never Match",
    },
    {
      type: "paragraph",
      text: "The till says twelve, the shelf says five, and the notebook says 'ask tomorrow'. When counting becomes a weekly ritual and every sale leaves a question mark, sales and stock have drifted into different worlds. The till should make stock self-evident — when it doesn't, it's not tracking anything you can trust.",
    },
    {
      type: "heading",
      text: "2. Checkout Is the Slowest Part of the Day",
    },
    {
      type: "paragraph",
      text: "The queue waits while the cashier types product names into a phone, one letter at a time. Scanning feels slower than it should, payments take a detour, and the till — which should be the fastest thing at the counter — is the bottleneck. A POS that adds work to every sale has lost its reason to exist.",
    },
    {
      type: "heading",
      text: "3. You Keep a Spreadsheet Next to the Till",
    },
    {
      type: "paragraph",
      text: "Every night, sales get copied into a second system 'to be safe'. Two lists, one truth — and the truth lives in whichever one was updated last. The spreadsheet isn't a backup; it's the shop telling you it doesn't trust the till with the numbers.",
    },
    {
      type: "heading",
      text: "4. M-Pesa Takes Two Apps and a Prayer",
    },
    {
      type: "paragraph",
      text: "Ring the sale here, switch to the M-Pesa app there, copy the amount, paste it somewhere, hope the records line up at close. In Kenya, mobile money is how customers pay — if the till doesn't send the STK push itself and auto-credit the sale, payments are bolted on instead of built in, and every sale carries extra steps.",
    },
    {
      type: "heading",
      text: "5. Your 'Online Shop' Is a WhatsApp Album",
    },
    {
      type: "paragraph",
      text: "Photos in a group chat, orders in replies, prices in the caption. It works — until it doesn't. There's no stock to check, no order to track, and no number that tells you what actually sold online. That's not a storefront; it's a thread with ambitions.",
    },
    {
      type: "heading",
      text: "The Upgrade: Same Shop, Different Evening",
    },
    {
      type: "paragraph",
      text: "Here's what fixing all five looks like in practice — the same shop, the same stock, a different way of closing the day:",
    },
    {
      type: "image",
      src: "/blog/outgrown-after.svg",
      alt: "Before and after: the outgrown till spends the evening reconciling spreadsheets, while the upgraded till closes the shift in minutes with self-balancing cash, M-Pesa, and one shared stock count",
      caption:
        "Same shop, same stock — the upgrade moves reconciliation from 11pm to 6pm, and it takes an afternoon to switch.",
    },
    {
      type: "list",
      items: [
        "Native M-Pesa — one tap sends the push; the sale auto-credits on the customer's PIN.",
        "One shared inventory — counter, web, and supplies write to the same number.",
        "A real storefront — orders land in the till record, not in a WhatsApp reply.",
        "A close that balances itself — cash, M-Pesa, and web orders in one report.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "The switch is an afternoon, not an IT project — and your habits travel. Real prices, real stock, and real sales from your current till are exactly the data a better one wants to import. You don't lose the history; you stop adding to the pain.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Wrong stock counts, a slow checkout, a spreadsheet next to the till, M-Pesa in two apps, and a WhatsApp-album storefront — any three of these means you've outgrown the tool, not the shop. The fix is a till that does the counting, sends the push, and shares one inventory. That upgrade pays for itself in the first quiet evening.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "ERP vs. POS: Do You Need the Full Suite?",
          href: "/blog/erp-vs-pos-do-you-need-the-full-suite",
          blurb: "When the fix is a better till — and when it's genuinely an ERP.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "The upgrade is an afternoon — here's the walkthrough.",
        },
        {
          label: "Online + Physical: One Inventory",
          href: "/blog/online-physical-one-inventory",
          blurb: "One stock count kills the spreadsheet and the ghost stock.",
        },
        {
          label: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
          href: "/blog/why-kiosk-beats-odoo-for-kenyan-shops",
          blurb: "Native M-Pesa and one inventory versus bolted-on everything.",
        },
        {
          label: "Top 10 POS Systems in Kenya (2026)",
          href: "/blog/top-10-pos-systems-kenya-2026",
          blurb: "The ranking that compares your upgrade options.",
        },
      ],
    },
  ],
};

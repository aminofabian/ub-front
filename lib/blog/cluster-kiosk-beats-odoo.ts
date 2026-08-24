import type { BlogArticle } from "./types";

/**
 * Opinionated follow-up to the balanced Kiosk.ke vs Odoo pillar.
 * Argues the case for Kiosk.ke for Kenyan micro/retail counters
 * while acknowledging Odoo's legitimate enterprise place.
 */
export const KIOSK_BEATS_ODOO_SLUG = "why-kiosk-beats-odoo-for-kenyan-shops";

export const KIOSK_BEATS_ODOO_ARTICLE: BlogArticle = {
  slug: KIOSK_BEATS_ODOO_SLUG,
  title: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
  description:
    "Odoo is a powerful ERP, but for a Kenyan shop, Kiosk.ke wins. Native M-Pesa, a live storefront, and one inventory — live in minutes, not months.",
  category: "Comparison",
  publishedAt: "2026-08-21",
  updatedAt: "2026-08-24",
  tags: ["Odoo", "Kiosk.ke", "POS Kenya", "M-Pesa", "Comparison"],
  keywords: [
    "Kiosk vs Odoo",
    "Odoo for small business Kenya",
    "Odoo POS M-Pesa",
    "Odoo vs turnkey POS",
    "Odoo implementation cost",
    "M-Pesa POS Kenya",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "erp-vs-pos-do-you-need-the-full-suite",
    "why-m-pesa-integration-matters",
    "set-up-a-pos-in-30-minutes",
    "the-real-cost-of-free-software",
    "what-hardware-do-you-actually-need",
    "online-physical-one-inventory",
    "5-signs-youve-outgrown-your-pos",
  ],
  faqs: [
    {
      question: "Is Odoo free?",
      answer:
        "Odoo Community is open-source, but hosting, modules, customisation, and support add up quickly. For a small shop the real cost is the weeks it takes to get live — weeks you could have been selling.",
    },
    {
      question: "Can Odoo accept M-Pesa?",
      answer:
        "Yes, but not out of the box. You need a third-party payment module, gateway credentials, and configuration work. Kiosk.ke has native M-Pesa STK Push built into the till from day one.",
    },
    {
      question: "Is Kiosk.ke better than Odoo?",
      answer:
        "For a Kenyan micro-merchant or single-shop retailer, usually yes: Kiosk.ke is live in minutes, with native mobile money and one shared inventory. Odoo genuinely wins for enterprises with manufacturing, HR, and multi-warehouse needs.",
    },
    {
      question: "When should I switch from Kiosk.ke to Odoo?",
      answer:
        "When you outgrow the counter — multiple warehouses, manufacturing, or a whole finance team. The good news: the stock and sales discipline you build with Kiosk.ke travels well into any bigger system.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Let's say the part the balanced reviews won't: if you run a Kenyan shop — a mini-mart, a kiosk, a stall that wants to become a store — Odoo is the wrong tool for your business today. Not because Odoo is bad. Because it's big, it's slow to start, and it charges you for power you won't use this year.",
    },
    {
      type: "callout",
      tone: "info",
      text: "Full disclosure: we built Kiosk.ke, so we're biased — and we'd rather you know that up front than find out later. Everything below is verifiable with a stopwatch: how fast you can start selling, how native the M-Pesa flow is, and how many stock counts you have to babysit.",
    },
    {
      type: "heading",
      text: "1. The Real Question: Where Is Your Business Today?",
    },
    {
      type: "paragraph",
      text: "The existing guide comparing the two platforms ends with the line that matters most: the right choice comes down to where your business is today, not where you hope it'll be in five years. This post is the argument for that line, in detail. If you're reading this with one or two shops, a phone, and a shelf of stock — the clock is already ticking.",
    },
    {
      type: "paragraph",
      text: "Here is what day one actually looks like on each platform:",
    },
    {
      type: "image",
      src: "/blog/kiosk-vs-odoo-day-one.svg",
      alt: "Day one side by side: Kiosk.ke live in 12 minutes with a first sale, Odoo still configuring in week three",
      caption:
        "Day one: Kiosk.ke gets you to a first sale before lunch. Odoo gets you to a configuration meeting.",
    },
    {
      type: "paragraph",
      text: "The gap isn't a small inconvenience. It's the difference between a tool that pays for itself by Friday and a project that's still on your to-do list next month — while competitors take your WhatsApp orders in the meantime.",
    },
    {
      type: "heading",
      text: "2. M-Pesa Is Not a Feature — It's the Till",
    },
    {
      type: "paragraph",
      text: "In Kenya, mobile money isn't an add-on your business might adopt someday. It's how customers pay. Roughly nine out of ten till transactions at a Kenyan counter involve mobile money, and every extra step between 'the customer wants to pay' and 'the money is in your account' costs you sales.",
    },
    {
      type: "paragraph",
      text: "Odoo — a Belgian ERP — does not ship with M-Pesa. To accept payments you install a community module, register for gateway credentials, configure sandbox keys, and pray the plugin keeps working after the next Odoo update. That's not a checkout flow; that's a second job.",
    },
    {
      type: "image",
      src: "/blog/kiosk-vs-odoo-mpesa.svg",
      alt: "Kiosk.ke till sends an M-Pesa STK Push with one tap, while Odoo requires a third-party payment module, credentials, and sandbox setup",
      caption:
        "One tap and the STK Push is on the customer's phone — versus an integration project before your first M-Pesa sale.",
    },
    {
      type: "list",
      items: [
        "Kiosk.ke: ring the sale, hit M-Pesa, STK Push is sent, the till auto-credits on confirmation. No plugin, no keys, no sandbox, no monthly payment-module fee.",
        "Odoo: install a module, configure credentials, test in sandbox, go live — and still pay for the module's subscription to keep it running.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "Payments are the most emotional moment in retail: the moment money moves. A native flow wins the sale; a bolted-on flow makes customers wait and wonder. For a Kenyan counter, native M-Pesa isn't a differentiator — it's the price of entry, and Odoo doesn't include it.",
    },
    {
      type: "heading",
      text: "3. One Inventory Beats Four Numbers",
    },
    {
      type: "paragraph",
      text: "The moment you sell in two places — at the counter and on your storefront — you have a reconciliation problem. The classic ERP answer is 'modules': a warehouse module, an eCommerce module, a POS module, a purchasing module. Each tracks its own number, and someone has to make sure they agree.",
    },
    {
      type: "image",
      src: "/blog/kiosk-vs-odoo-stock.svg",
      alt: "Kiosk.ke keeps one shared stock count across till, storefront, and supplier orders, while Odoo tracks separate numbers in separate modules",
      caption:
        "One shared count versus four numbers that need babysitting. Reconciliations are a feature of ERPs; with Kiosk.ke they're unnecessary.",
    },
    {
      type: "paragraph",
      text: "Kiosk.ke treats inventory as a single number. A sale at the till decrements it. An order on your storefront decrements the same number. Receiving a supplier delivery increments it. What the shelf says is what the website says — because there is only one number to be right about.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The spreadsheet-shop mindset — matching three lists at midnight — is exactly what most Kenyan shopkeepers are trying to escape. The fix isn't a more elaborate set of lists. It's fewer numbers.",
    },
    {
      type: "heading",
      text: "4. Your Storefront Should Exist by Dinner, Not Next Quarter",
    },
    {
      type: "paragraph",
      text: "A website only earns money once it's live. Every day your shop is invisible online is a day a customer who searched for 'cooking oil near me' bought from someone else. Odoo's eCommerce module is genuinely capable — after you pick a theme, build pages, configure taxes and currencies, wire up payments and delivery, and upload photography.",
    },
    {
      type: "image",
      src: "/blog/kiosk-vs-odoo-storefront.svg",
      alt: "yourshop.kiosk.ke is live with products and an order button the same day, while the Odoo eCommerce module still shows a setup checklist",
      caption:
        "One storefront is a URL you share on WhatsApp; the other is a project plan.",
    },
    {
      type: "paragraph",
      text: "With Kiosk.ke, claiming your storefront is part of signing up. The same product catalogue that runs your till runs your web shop — which is why the stock matches, why the prices match, and why you can send a customer a link before dinner.",
    },
    {
      type: "heading",
      text: "5. The Cost of 'Free' Is Real",
    },
    {
      type: "table",
      headers: ["Cost", "Kiosk.ke", "Odoo"],
      rows: [
        [
          "Setup time",
          "Minutes — self-serve, from your phone",
          "Weeks to months — an implementation project",
        ],
        [
          "M-Pesa payments",
          "Built in, works on day one",
          "Third-party module + credentials + sandbox testing",
        ],
        [
          "Licensing",
          "Priced for a shop counter",
          "Per-app, per-user fees that scale as you add apps",
        ],
        [
          "Storefront",
          "yourshop.kiosk.ke, live the same day",
          "eCommerce module: theme, pages, hosting, config",
        ],
        [
          "Maintenance",
          "Handled for you",
          "Updates, broken plugins, and a specialist on call",
        ],
      ],
    },
    {
      type: "paragraph",
      text: "None of this is to say Odoo is overpriced — for what it does, it's remarkably good value. But 'good value for an ERP' and 'good value for a shop' are different sentences. If you are paying for HR modules and multi-warehouse logic, you are paying for machinery you don't have yet.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "The most expensive POS is the one that isn't selling anything yet. Every week of implementation is a week of unrecorded sales, unmanaged stock, and cash that goes through without a receipt.",
    },
    {
      type: "heading",
      text: "6. What Odoo Genuinely Does Better (Be Honest)",
    },
    {
      type: "paragraph",
      text: "Credibility demands we say this plainly. Odoo is excellent at things Kiosk.ke will never pretend to do:",
    },
    {
      type: "list",
      items: [
        "Manufacturing — bills of materials, routing, and production planning that are genuinely world-class.",
        "Multi-warehouse logistics — inventory across locations, transfers, and complex supply chains.",
        "People operations — payroll, HR, and expense workflows for teams of dozens or hundreds.",
        "Full financial depth — a double-entry chart of accounts feeding auditors and lenders.",
      ],
    },
    {
      type: "paragraph",
      text: "If you run a factory, a chain with a central depot, or a company with an HR department, you should absolutely be evaluating Odoo. This post isn't arguing with that. It's arguing that a shopkeeper with a counter, a storefront, and a phone is closer to Odoo's ceiling than to where Odoo starts to pay.",
    },
    {
      type: "image",
      src: "/blog/kiosk-vs-odoo-bottom-line.svg",
      alt: "The bottom line: Kiosk.ke is the right tool for the counter and Odoo is the right tool for an enterprise",
      caption:
        "Both are right tools. They're right for different businesses at different moments.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Odoo beats Kiosk.ke on depth; Kiosk.ke beats Odoo on everything the counter actually touches today — speed to first sale, native M-Pesa, one shared inventory, a live storefront, and a price built for a Kenyan shop. Choose Odoo when you have an enterprise to run. Until then, choose the tool that sells things this week.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "Choosing the Right POS: Kiosk.ke vs. Odoo",
          href: "/blog/choosing-the-right-pos-kiosk-vs-odoo",
          blurb: "The balanced, decision-first guide this post argues from.",
        },
        {
          label: "ERP vs. POS: Do You Need the Full Suite?",
          href: "/blog/erp-vs-pos-do-you-need-the-full-suite",
          blurb: "When a lean POS is enough and an ERP is overkill.",
        },
        {
          label: "Why M-Pesa Integration Matters",
          href: "/blog/why-m-pesa-integration-matters",
          blurb: "Why native mobile money beats bolted-on payment plugins.",
        },
        {
          label: "Set Up a POS in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "Get your till and storefront live the same afternoon.",
        },
        {
          label: "The Real Cost of 'Free' Software",
          href: "/blog/the-real-cost-of-free-software",
          blurb: "Hidden fees, add-on modules, and implementation hours.",
        },
      ],
    },
  ],
};


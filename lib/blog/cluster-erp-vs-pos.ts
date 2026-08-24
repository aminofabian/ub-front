import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const ERP_VS_POS_ARTICLE: BlogArticle = {
  slug: "erp-vs-pos-do-you-need-the-full-suite",
  title: "ERP vs. POS: Do You Need the Full Suite?",
  description:
    "An ERP can run your whole company. A POS needs to run your counter. Knowing which problem you have today saves months of implementation.",
  category: "Comparison",
  publishedAt: "2026-07-20",
  updatedAt: "2026-08-24",
  tags: ["ERP", "POS", "Comparison", "Kenya"],
  keywords: [
    "ERP vs POS",
    "ERP for small business Kenya",
    "when to upgrade to ERP",
    "POS vs ERP difference",
    "do I need an ERP",
    "lean POS enough",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "why-kiosk-beats-odoo-for-kenyan-shops",
    "set-up-a-pos-in-30-minutes",
    "top-10-pos-systems-kenya-2026",
    "how-to-grow-a-mini-mart-in-kenya",
  ],
  faqs: [
    {
      question: "What's the difference between a POS and an ERP?",
      answer:
        "A POS runs the counter: sales, payments, stock, receipts. An ERP runs the company: HR, accounting, manufacturing, multi-warehouse logistics, and CRM. One answers 'what did we sell today?'; the other answers 'how is the whole business doing?'",
    },
    {
      question: "Do I need an ERP for a small shop in Kenya?",
      answer:
        "Usually not. A lean POS with native M-Pesa, a storefront, and honest stock control covers the counter's needs for most single-branch shops. The ERP earns its keep when you add warehouses, manufacturing, or an HR and finance team.",
    },
    {
      question: "When should I upgrade from a POS to an ERP?",
      answer:
        "When the business is complex enough to need it: multiple warehouses with transfers, manufacturing with bills of materials, dozens of staff on payroll, or a finance team wanting double-entry accounting. If none of those are true today, the upgrade can wait.",
    },
    {
      question: "Is an ERP more expensive than a POS?",
      answer:
        "Generally yes — per-module and per-user fees add up, and implementation takes weeks to months. The real cost is often the setup itself: weeks of configuration while the counter keeps selling with whatever you have. 'Free' suites still bill you in setup hours.",
    },
    {
      question: "Can I move from a POS to an ERP later?",
      answer:
        "Yes, and it's easier if you start with honest records. A POS that tracks real stock, prices, and sales gives an ERP clean data to import. The habits you build — ringing every sale, keeping one inventory — travel well into any bigger system.",
    },
    {
      question: "How do I know which one I need today?",
      answer:
        "Run the five-question test: multiple warehouses? Manufacturing? HR with payroll? A finance team? Five-plus locations with separate teams? Mostly 'no' means a lean POS answers today's question — and the ERP will still be there when the business earns it.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Two letters cause more overbuying than any brochure: ERP. Enterprise Resource Planning sounds like the grown-up choice — the full suite, every module, one system for everything. And for some businesses, it genuinely is. The problem is that 'some businesses' is a much shorter list than the software sales calls suggest, and the cost of buying too early is measured in months, not shillings.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The honest framing: an ERP can run your whole company; a POS needs to run your counter. They answer different questions. Knowing which question your business has today saves you months of implementation and a stack of unused modules.",
    },
    {
      type: "heading",
      text: "1. What the Words Actually Mean",
    },
    {
      type: "paragraph",
      text: "A point-of-sale system is built around one act: the sale. It handles the till, payments, receipts, and the stock that every sale touches. An enterprise resource planning system is built around the whole organisation: it connects sales to accounting, inventory to purchasing, people to payroll, and factories to warehouses.",
    },
    {
      type: "table",
      headers: ["Question", "POS answers it", "ERP answers it"],
      rows: [
        [
          "The till",
          "Ring sales, take M-Pesa, print receipts — in minutes",
          "One module among many; configure first",
        ],
        [
          "Payments",
          "Native M-Pesa STK, auto-credited",
          "Third-party payment modules, credentials, setup",
        ],
        [
          "Stock",
          "One count across counter, web, and supplies",
          "Multi-warehouse logistics, transfers, BOMs",
        ],
        [
          "People",
          "Roles and PINs for your team",
          "Full HR: payroll, shifts, statutory filings",
        ],
        [
          "Money",
          "Sales reports and honest margins",
          "Double-entry accounting for auditors and lenders",
        ],
        [
          "Setup",
          "Minutes, self-serve, from your phone",
          "Weeks to months, with implementation help",
        ],
      ],
    },
    {
      type: "heading",
      text: "2. Two Different Jobs, Two Different Tools",
    },
    {
      type: "image",
      src: "/blog/pos-vs-erp-scales.svg",
      alt: "POS versus ERP: the POS runs the counter with a phone till, native M-Pesa, a storefront, and one inventory; the ERP runs the company with HR, accounting, manufacturing, and multi-warehouse logistics",
      caption:
        "The POS answers 'what did we sell today?' The ERP answers 'how is the whole company doing?'",
    },
    {
      type: "paragraph",
      text: "Neither tool is better in the abstract — they're built for different sizes of problem. The POS is fast because it only worries about the counter. The ERP is powerful because it worries about everything. Buying the powerful one before you have 'everything' means paying for machinery you don't have yet.",
    },
    {
      type: "heading",
      text: "3. Where the Full Suite Genuinely Earns Its Keep",
    },
    {
      type: "list",
      items: [
        "Manufacturing — bills of materials, routing, and production planning are world-class in the big suites.",
        "Multi-warehouse logistics — inventory across locations, transfers, and complex supply chains.",
        "HR & payroll — roles, shifts, and salaries for teams of dozens or hundreds.",
        "Full financial depth — a double-entry chart of accounts that auditors and lenders recognise.",
        "CRM and business-wide reporting — every department in one system.",
      ],
    },
    {
      type: "callout",
      tone: "info",
      text: "If you run a factory, a chain with a central depot, or a company with an HR department, the full suite is genuinely the right answer — and this guide isn't arguing with that. It's arguing that a counter-first shop is closer to the ERP's ceiling than to where the ERP starts to pay.",
    },
    {
      type: "heading",
      text: "4. The Cost of the Full Suite",
    },
    {
      type: "paragraph",
      text: "The price of an ERP isn't just the licence. It's the per-module and per-user fees that grow as you switch things on, and it's the implementation itself — weeks of configuration, data migration, and training while the counter keeps selling on whatever you had before. Even 'free' open-source suites charge that tax in setup hours and maintenance.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "The most expensive software is the one that isn't selling anything yet. Every week of implementation is a week of unrecorded sales, unmanaged stock, and cash moving without a receipt.",
    },
    {
      type: "heading",
      text: "5. The Five-Question Readiness Test",
    },
    {
      type: "paragraph",
      text: "Forget the marketing — answer five questions about your business as it is today:",
    },
    {
      type: "image",
      src: "/blog/erp-readiness-test.svg",
      alt: "The ERP readiness test: five questions about warehouses, manufacturing, HR, finance, and locations — mostly no means a POS today, mostly yes means time to talk ERP",
      caption:
        "Mostly 'no'? A lean POS answers today's question. Mostly 'yes'? The suite has earned its place.",
    },
    {
      type: "list",
      items: [
        "Multiple warehouses or depots with stock transfers between them?",
        "Manufacturing — raw materials turning into finished goods?",
        "An HR department running payroll for dozens of staff?",
        "A finance team that wants double-entry accounting for auditors?",
        "Five or more locations, each with its own team?",
      ],
    },
    {
      type: "paragraph",
      text: "Mostly 'no' means the counter's question is the one you have today — and a lean POS answers it honestly, with numbers an ERP would respect anyway. Mostly 'yes' means the complexity is real, and the full suite is the right tool for it.",
    },
    {
      type: "heading",
      text: "6. The Middle Path",
    },
    {
      type: "paragraph",
      text: "The smartest route for most growing shops is chronological: start lean, sell first, and let the business earn its upgrade. The data habits you build on a good POS — ringing every sale, one honest inventory, clean prices — are exactly the data a future ERP needs to import. And the ERP will still be there. Suites don't disappear; they wait.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "An ERP can run your whole company; a POS needs to run your counter. If your business today is a counter with a phone, native M-Pesa, and a shelf to keep honest, the lean POS isn't the compromise — it's the right answer for right now. Choose by where your business is today, not where you hope it'll be in five years.",
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
          blurb: "The balanced pillar guide this argument is built on.",
        },
        {
          label: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
          href: "/blog/why-kiosk-beats-odoo-for-kenyan-shops",
          blurb: "The opinionated case for a turnkey till over a months-long ERP setup.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "Get the till live the same afternoon — no IT project required.",
        },
        {
          label: "How to Grow a Mini-Mart in Kenya",
          href: "/blog/how-to-grow-a-mini-mart-in-kenya",
          blurb: "The systems that scale a shop — without reaching for an ERP.",
        },
        {
          label: "Top 10 POS Systems in Kenya (2026)",
          href: "/blog/top-10-pos-systems-kenya-2026",
          blurb: "Where every platform lands on setup speed, M-Pesa, and fit.",
        },
      ],
    },
  ],
};

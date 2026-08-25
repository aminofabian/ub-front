import type { BlogArticle } from "./types";

export const ETIMS_TAX_PILLAR_SLUG = "taxes-for-mini-marts-in-kenya";

export const ETIMS_TAX_SPOKE_SLUGS = [
  "what-is-etims-kenya",
  "how-to-register-for-etims-kenya",
  "vat-for-small-businesses-kenya",
  "turnover-tax-kenya-shops",
  "income-tax-for-shop-owners-kenya",
  "excise-duty-for-retailers-kenya",
  "record-keeping-and-kra-penalties-kenya",
  "etims-pos-integration-kenya",
  "how-to-file-tax-returns-on-itax",
  "kra-audits-for-small-businesses-kenya",
] as const;

const START_MINI_MART_SLUG = "how-to-start-a-mini-mart-in-kenya";
const GROW_MINI_MART_SLUG = "how-to-grow-a-mini-mart-in-kenya";
const SETUP_POS_SLUG = "set-up-a-pos-in-30-minutes";
const TOP_10_POS_SLUG = "top-10-pos-systems-kenya-2026";

const PILLAR_ARTICLE: BlogArticle = {
  slug: ETIMS_TAX_PILLAR_SLUG,
  title: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
  description:
    "Everything a mini-mart owner in Kenya needs to know about tax — eTIMS, VAT, turnover tax, income tax, PAYE, excise, records, and penalties — and how the right till keeps it manageable.",
  category: "Tax & compliance",
  publishedAt: "2026-08-25",
  updatedAt: "2026-08-25",
  tags: [
    "eTIMS",
    "KRA",
    "Kenya",
    "Mini-mart",
    "Tax",
    "Compliance",
    "VAT",
    "Turnover tax",
  ],
  keywords: [
    "taxes for mini marts in Kenya",
    "eTIMS guide Kenya",
    "KRA compliance small business Kenya",
    "mini mart tax obligations Kenya",
    "VAT threshold Kenya",
    "turnover tax Kenya 2026",
    "how much tax does a mini mart pay Kenya",
  ],
  author: "Kiosk",
  relatedSlugs: [
    ...ETIMS_TAX_SPOKE_SLUGS,
    SETUP_POS_SLUG,
    START_MINI_MART_SLUG,
    GROW_MINI_MART_SLUG,
    TOP_10_POS_SLUG,
  ],
  faqs: [
    {
      question: "Which taxes does a mini-mart in Kenya actually pay?",
      answer:
        "Most mini-marts deal with four: eTIMS-compliant invoicing (KRA's electronic invoice system, now mandatory in practice for VAT-registered businesses), turnover tax (3% of gross turnover for businesses earning KSh 1–25 million a year) or income tax on profits, VAT only once annual turnover passes KSh 8 million, and PAYE if you employ staff. Excise duty is usually already embedded in the wholesale price of goods like sodas and juices.",
    },
    {
      question: "Is eTIMS mandatory for small shops in Kenya?",
      answer:
        "eTIMS is KRA's electronic tax invoice management system, and invoicing through it is now mandatory for businesses that must invoice for VAT. In practice KRA has been enforcing eTIMS across retail, and a modern POS that issues invoices and keeps them ready for eTIMS reporting is the painless way to stay compliant. Confirm your exact obligations with KRA or your accountant.",
    },
    {
      question: "How much tax does a small shop pay in Kenya?",
      answer:
        "A mini-mart turning over KSh 1–25 million a year typically pays turnover tax at 3% of gross turnover — roughly KSh 3,000 for every KSh 100,000 of sales, before any expenses are considered. Shops above the VAT threshold (KSh 8 million annual turnover) pay 16% VAT on taxable supplies instead, and sole proprietors pay income tax on their profits at rates of 10–30%.",
    },
    {
      question: "What happens if I don't file my taxes on time in Kenya?",
      answer:
        "Late filing attracts monthly penalties, unpaid tax accrues interest at 1% per month, and serious eTIMS violations (such as failing to issue electronic invoices) can attract fines of up to KSh 1 million and imprisonment under the Tax Procedures Act. The practical fix is software that generates the right records for every sale automatically — so month end is a review, not a reconstruction.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Running a mini-mart in Kenya means juggling rent, suppliers, stock, and staff — and somewhere in the middle of all of it, the tax man. It's tempting to treat taxation as a month-end mystery best left to an accountant, but for a shop owner the basics are surprisingly small: a handful of taxes, a few deadlines, and one system — eTIMS — that sits underneath all of it.",
    },
    {
      type: "paragraph",
      text: "This is the pillar guide for the whole series. It maps out every tax a Kenyan mini-mart owner deals with, explains what each one means in plain language, and points you to a dedicated guide for each topic. Read the sections that apply to your shop, then follow the links to go deeper.",
    },
    {
      type: "callout",
      tone: "info",
      text: "This is the anchor article of the eTIMS & tax series — every guide on eTIMS, VAT, turnover tax, income tax, excise, and KRA penalties links back here. Bookmark it as your map.",
    },
    {
      type: "heading",
      text: "The tax map for a Kenyan mini-mart",
    },
    {
      type: "paragraph",
      text: "Before we go deep, here's the whole landscape on one page. Every row is its own guide in this series:",
    },
    {
      type: "table",
      headers: ["Tax / obligation", "Who it applies to", "Rate", "When it's due"],
      rows: [
        [
          "eTIMS invoicing",
          "All businesses issuing invoices under KRA rules",
          "No tax — it's the invoice system itself",
          "Every sale, in real time",
        ],
        [
          "Turnover tax (TOT)",
          "Shops with KSh 1–25M annual turnover",
          "3% of gross turnover",
          "Monthly, by the 20th of the next month",
        ],
        [
          "VAT",
          "Only once annual turnover exceeds KSh 8M",
          "16% standard (some goods zero-rated or exempt)",
          "Monthly, by the 20th of the next month",
        ],
        [
          "Income tax",
          "Sole proprietors / business owners",
          "10–30% on profits",
          "Annual return by 30 June",
        ],
        [
          "PAYE",
          "Only if you employ staff",
          "Deducted from salaries at source",
          "Monthly, by the 9th of the next month",
        ],
        [
          "Excise duty",
          "Mostly embedded in wholesale prices",
          "Varies by product",
          "Paid to suppliers; nothing extra to file",
        ],
      ],
    },
    {
      type: "callout",
      tone: "warning",
      text: "Tax rules change with every Finance Act — thresholds, rates, and deadlines move. This guide is accurate as of 2026, but always confirm current figures on the KRA portal (kra.go.ke) or with your accountant before making decisions.",
    },
    {
      type: "image",
      src: "/blog/etims-tax-map.svg",
      alt: "A tax map for a Kenyan mini-mart showing six obligations: eTIMS invoicing, turnover tax at 3 percent, VAT above KSh 8 million, income tax at 10 to 30 percent, PAYE for staff, and excise duty already in wholesale prices",
      caption: "One map, six obligations — most mini-marts live in the eTIMS + turnover tax row.",
    },
    {
      type: "heading",
      text: "1. eTIMS: the system under everything",
    },
    {
      type: "paragraph",
      text: "eTIMS — KRA's Electronic Tax Invoice Management System — is how KRA now watches retail sales. You generate an invoice for a sale, KRA issues an authorization (AUTH) code for it in real time, the invoice carries a QR code, and the sale lands in KRA's records. It replaces the old ETR machines and it's how the taxman can see your turnover without ever visiting your shop.",
    },
    {
      type: "paragraph",
      text: "You can use eTIMS through KRA's web portal, the eTIMS mobile app, an offline desktop app, or — the option that matters for a shop — through a POS system that issues eTIMS-ready invoices automatically. Every invoice your till generates can carry the authorization code and sync to KRA without anyone retyping anything.",
    },
    {
      type: "links",
      items: [
        {
          label: "What Is eTIMS in Kenya? The System Explained",
          href: "/blog/what-is-etims-kenya",
          blurb: "How eTIMS works, who must use it, and the four ways to run it.",
        },
        {
          label: "How to Register for eTIMS in Kenya: Step-by-Step",
          href: "/blog/how-to-register-for-etims-kenya",
          blurb: "From iTax login to your first authorized invoice, same day.",
        },
      ],
    },
    {
      type: "heading",
      text: "2. Turnover tax (TOT): the default for most mini-marts",
    },
    {
      type: "paragraph",
      text: "If your mini-mart's annual turnover sits between KSh 1 million and KSh 25 million — which describes the vast majority of Kenyan mini-marts — turnover tax is likely your main income-related tax. It's a flat 3% of gross turnover, filed monthly through iTax by the 20th of the following month. No deductions, no expense schedules, no arguments: 3% of what you actually sold.",
    },
    {
      type: "paragraph",
      text: "The trade-off is that TOT is charged on turnover, not profit — so even a thin-margin month still owes its 3%. That's exactly why the shops that thrive keep their margins healthy and their records clean, rather than trying to make the numbers disappear.",
    },
    {
      type: "links",
      items: [
        {
          label: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
          href: "/blog/turnover-tax-kenya-shops",
          blurb: "The 1M–25M threshold, the 3% rate, and the monthly routine.",
        },
      ],
    },
    {
      type: "heading",
      text: "3. VAT: only once you cross the line",
    },
    {
      type: "paragraph",
      text: "VAT is the tax most shop owners worry about — and for most mini-marts, it never actually applies. VAT registration becomes mandatory only when annual taxable turnover passes KSh 8 million (raised from KSh 5 million by the Finance Act 2023). Below that, you don't charge VAT to customers, and you don't file VAT returns. Above it, you charge 16% on taxable sales and file monthly by the 20th.",
    },
    {
      type: "paragraph",
      text: "There's a nuance that suits mini-marts: many staples — maize flour, milk, unprocessed foods — are zero-rated or exempt, so a shop heavy on essentials may owe very little output VAT even after crossing the threshold. If you're edging toward KSh 8 million, read the VAT guide before you get there, not after.",
    },
    {
      type: "links",
      items: [
        {
          label: "VAT for Small Businesses in Kenya: Threshold, Rates & Filing",
          href: "/blog/vat-for-small-businesses-kenya",
          blurb: "When registration is compulsory, what 16% applies to, and the monthly return.",
        },
      ],
    },
    {
      type: "heading",
      text: "4. Income tax & PAYE: your profits and your staff",
    },
    {
      type: "paragraph",
      text: "Sole proprietors pay income tax on their business profits at the personal rates: 10% up to KSh 288,000 a year, 25% up to KSh 388,000, and 30% above that. The annual return goes in through iTax by 30 June. If you employ cashiers or shop attendants, you're also an employer: register for PAYE, deduct it from salaries, and remit it by the 9th of every month.",
    },
    {
      type: "paragraph",
      text: "The golden rule that keeps income tax small: pay it on profit, not turnover. Every legitimate business expense — stock, rent, power, transport, staff wages — reduces your taxable profit, but only if you have the records to prove it. A till that keeps your sales and stock honest is the same tool that keeps your tax honest.",
    },
    {
      type: "links",
      items: [
        {
          label: "Income Tax for Shop Owners in Kenya: Sole Proprietors, PAYE & Filing",
          href: "/blog/income-tax-for-shop-owners-kenya",
          blurb: "Tax bands, deductible expenses, PAYE for staff, and the 30 June deadline.",
        },
      ],
    },
    {
      type: "heading",
      text: "5. Excise duty: usually not your problem to file",
    },
    {
      type: "paragraph",
      text: "Excise duty is a tax on specific goods — sweetened sodas and juices, alcohol, cigarettes, and a few others. Here's what most mini-mart owners need to know: by the time those goods reach your shelf, the excise duty is already baked into the wholesale price you paid. You don't charge it separately at the till, and you don't register as an excise licensee unless you manufacture or import the goods yourself.",
    },
    {
      type: "paragraph",
      text: "The one real risk for a shop is stock that arrived without duty paid — cheap cigarettes or drinks that somehow cost far less than the market rate. That's not a bargain, that's a liability. If a price is too good to be true, it usually means the duty isn't in it.",
    },
    {
      type: "links",
      items: [
        {
          label: "Excise Duty and Retailers in Kenya: What Mini-Marts Actually Deal With",
          href: "/blog/excise-duty-for-retailers-kenya",
          blurb: "What's excisable, who has to register, and the duty-unpaid trap.",
        },
      ],
    },
    {
      type: "heading",
      text: "6. Records and penalties: what KRA can demand",
    },
    {
      type: "paragraph",
      text: "KRA can ask to see your records for up to five years — sales, purchases, invoices, stock movements, and payroll. If your records are an exercise book updated from memory, that's a stressful conversation waiting to happen. If they're generated automatically by your till, it's a file you hand over.",
    },
    {
      type: "paragraph",
      text: "The penalties for getting it wrong are real: monthly penalties for late returns, interest of 1% per month on unpaid tax, and fines of up to KSh 1 million with possible imprisonment for serious eTIMS violations — like failing to issue electronic invoices at all. None of it is worth the shortcut.",
    },
    {
      type: "links",
      items: [
        {
          label: "Record-Keeping and KRA Penalties: What Kenyan Shop Owners Must Keep (and Avoid)",
          href: "/blog/record-keeping-and-kra-penalties-kenya",
          blurb: "The five-year rule, the penalty schedule, and what triggers an audit.",
        },
      ],
    },
    {
      type: "heading",
      text: "7. The one thing that makes all of this easier",
    },
    {
      type: "paragraph",
      text: "Notice a pattern? Every tax on this list gets harder the further your records are from reality. The shops that sail through tax season aren't the ones with better accountants — they're the ones whose till generates the paper trail for every sale, automatically, without anyone reconstructing it at month end.",
    },
    {
      type: "paragraph",
      text: "Kiosk.ke is built on that idea: a point-of-sale that scans products, takes M-Pesa, tracks stock, and keeps every invoice ready for eTIMS reporting — so when your accountant asks for numbers, they're already there, accurate, dated, and reconciled with what's actually on your shelves. eTIMS compliance becomes a background process instead of a monthly archaeology project.",
    },
    {
      type: "links",
      items: [
        {
          label: "eTIMS and Your POS: How the Right Till Keeps You KRA-Ready",
          href: "/blog/etims-pos-integration-kenya",
          blurb: "How POS/eTIMS integration works and what to look for in a till.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: `/blog/${SETUP_POS_SLUG}`,
          blurb: "Till, storefront, M-Pesa, and eTIMS-ready invoices in one afternoon.",
        },
      ],
    },
    {
      type: "heading",
      text: "Your tax checklist as a mini-mart owner",
    },
    {
      type: "list",
      items: [
        "Register your business and get your KRA PIN attached to it, not just to you.",
        "Onboard to eTIMS — ideally through a POS that issues compliant invoices automatically.",
        "Know your tax type: turnover tax (under KSh 25M), income tax on profits, or VAT (over KSh 8M).",
        "Put the deadlines in your calendar: 20th monthly for TOT/VAT, 9th monthly for PAYE, 30 June for the annual return.",
        "Keep five years of records — and let your till generate them for you.",
        "Never buy duty-suspicious stock. A cheap cigarette is an expensive liability.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "Taxation for a Kenyan mini-mart isn't a maze — it's a short list of obligations, most of which get simpler the moment your sales data is real. Fix the till first, and the tax takes care of itself.",
    },
    {
      type: "heading",
      text: "Keep reading",
    },
    {
      type: "links",
      items: [
        {
          label: "What Is eTIMS in Kenya? The System Explained",
          href: "/blog/what-is-etims-kenya",
          blurb: "Start here if eTIMS still feels like alphabet soup.",
        },
        {
          label: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
          href: "/blog/turnover-tax-kenya-shops",
          blurb: "The tax most mini-marts actually pay, in plain language.",
        },
        {
          label: "VAT for Small Businesses in Kenya: Threshold, Rates & Filing",
          href: "/blog/vat-for-small-businesses-kenya",
          blurb: "Everything you need before (and after) KSh 8 million.",
        },
        {
          label: "eTIMS and Your POS: How the Right Till Keeps You KRA-Ready",
          href: "/blog/etims-pos-integration-kenya",
          blurb: "Why compliance gets easy when your till does the work.",
        },
        {
          label: "How to Start a Mini-Mart in Kenya: From Idea to Opening Day",
          href: `/blog/${START_MINI_MART_SLUG}`,
          blurb: "Capital, location, licenses, first stock, and the till that keeps it honest.",
        },
      ],
    },
  ],
};

/**
 * Planned spokes for the eTIMS & tax cluster. Each is listed on the hub with a
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
        text: "This guide is in the works and will land here soon. While it's being written, the complete guide to taxes for mini-marts in Kenya covers every tax a shop owner deals with — eTIMS, turnover tax, VAT, income tax, and excise — and links to the guide you need.",
      },
      {
        type: "links",
        items: [
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide for this series.",
          },
        ],
      },
    ],
  };
}

const SPOKE_ARTICLES: BlogArticle[] = [
  {
    slug: "what-is-etims-kenya",
    title: "What Is eTIMS in Kenya? The System Explained",
    description:
      "eTIMS — KRA's Electronic Tax Invoice Management System — explained for shop owners: how invoices get authorized, who must use it, and the four ways to run it.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["eTIMS", "KRA", "Kenya", "Invoicing", "Compliance"],
    keywords: [
      "what is eTIMS Kenya",
      "eTIMS meaning",
      "KRA electronic tax invoice",
      "eTIMS vs ETR Kenya",
      "eTIMS requirements Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "how-to-register-for-etims-kenya",
      "etims-pos-integration-kenya",
      "record-keeping-and-kra-penalties-kenya",
      "turnover-tax-kenya-shops",
    ],
    faqs: [
      {
        question: "What does eTIMS stand for?",
        answer:
          "Electronic Tax Invoice Management System. It's KRA's system for generating, authorizing, and tracking electronic tax invoices — the modern replacement for the old ETR (Electronic Tax Register) machines.",
      },
      {
        question: "Is eTIMS free to use?",
        answer:
          "The eTIMS web portal and mobile app are free to use for invoicing. KRA does not charge for onboarding to the system itself; the practical costs are your time and any device you choose, like a USB token for desktop signing or a POS system that integrates with eTIMS.",
      },
      {
        question: "Who must use eTIMS in Kenya?",
        answer:
          "Businesses required to issue tax invoices under KRA rules — in practice this means VAT-registered businesses, and KRA has been enforcing eTIMS across retail broadly. Even smaller shops find that issuing eTIMS-compliant invoices through a POS keeps them ahead of enforcement and makes month-end reporting trivial.",
      },
      {
        question: "Is eTIMS replacing ETR machines?",
        answer:
          "Yes. KRA has been phasing out ETR machines in favor of eTIMS, which streams invoice data to KRA in real time instead of relying on monthly downloads from a sealed register. If you still run an ETR, the migration path is to onboard to eTIMS through one of its four methods.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "If you run a shop in Kenya and you've heard the letters eTIMS but never quite had them explained, this is the guide for you. eTIMS is KRA's Electronic Tax Invoice Management System — the way the taxman now sees what you sell, in real time, without ever walking into your shop.",
      },
      {
        type: "paragraph",
        text: "It matters to you because it sits underneath nearly everything else in this tax series. Understand eTIMS and the rest of your tax life — turnover tax, VAT, records, audits — becomes clearer. So let's strip the jargon off it.",
      },
      {
        type: "heading",
        text: "How eTIMS works, in one paragraph",
      },
      {
        type: "paragraph",
        text: "You make a sale and generate an invoice for it. The invoice goes to KRA's system, which checks it and hands back an authorization code — the AUTH code — in real time. The invoice now carries that code and a QR code, and the sale is logged in KRA's records. Customer happy, sale closed, and the taxman already knows. That's the whole loop.",
      },
      {
        type: "image",
        src: "/blog/etims-invoice-loop.svg",
        alt: "The eTIMS invoice loop: the till builds the invoice, KRA returns an AUTH code in real time, the receipt prints with a QR code, and the sale is logged with KRA before the customer leaves",
        caption: "The whole loop: sale → AUTH code → receipt with QR → sale logged with KRA. Seconds, no retyping.",
      },
      {
        type: "heading",
        text: "The four ways to run eTIMS",
      },
      {
        type: "list",
        items: [
          "eTIMS Lite (web portal) — generate invoices in your browser. Fine for low volume, painful for a busy counter.",
          "eTIMS Mobile App — invoicing from your phone. Great for traders on the move, not built for checkout speed.",
          "eTIMS offline desktops (Lite/Standard) — KRA's desktop apps with a USB token that signs invoices. Workable, but still manual per invoice.",
          "POS / API integration — your till talks to eTIMS directly, so every sale gets an authorized invoice automatically. The only option that scales with a real shop floor.",
        ],
      },
      {
        type: "paragraph",
        text: "The first three are manual — someone has to create an invoice per sale, which is why they suit low-volume traders. The fourth is automatic, which is why it suits shops. If your till generates the invoice the moment the sale closes, the AUTH code and QR code appear without anyone lifting a finger.",
      },
      {
        type: "heading",
        text: "What eTIMS means for a mini-mart owner",
      },
      {
        type: "list",
        items: [
          "Every sale can (and should) produce an eTIMS-compliant invoice — even small cash sales, because KRA can now see your turnover directly.",
          "Your stock and your invoices should agree. An invoice trail that doesn't match your shelves is exactly the inconsistency an audit looks for.",
          "If a customer asks for a receipt, the invoice you hand them carries KRA's authorization — which is why it's also better for customer trust.",
          "Month-end reporting stops being a reconstruction. The data is already with KRA; you're just confirming it.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "The single best decision for eTIMS compliance is to stop generating invoices manually and let the till do it. A POS with built-in tax reporting issues the right paper trail for every sale — no retyping, no missed invoices, no month-end archaeology.",
      },
      {
        type: "heading",
        text: "Where eTIMS fits in your overall tax picture",
      },
      {
        type: "paragraph",
        text: "eTIMS is not a tax you pay — it's the invoice system under every tax you pay. Your turnover tax and VAT are calculated from the sales you report, and eTIMS is what makes that reporting verifiable. That's why the penalty for dodging it is serious, and why the smart play is to make it automatic.",
      },
      {
        type: "links",
        items: [
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
          {
            label: "How to Register for eTIMS in Kenya: Step-by-Step",
            href: "/blog/how-to-register-for-etims-kenya",
            blurb: "From iTax login to your first authorized invoice.",
          },
          {
            label: "eTIMS and Your POS: How the Right Till Keeps You KRA-Ready",
            href: "/blog/etims-pos-integration-kenya",
            blurb: "How integration works and what to look for in a till.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-to-register-for-etims-kenya",
    title: "How to Register for eTIMS in Kenya: Step-by-Step",
    description:
      "How to onboard to eTIMS in Kenya — the iTax steps, the four onboarding methods, what a USB token is for, and how a POS handles the whole thing for you.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["eTIMS", "KRA", "Kenya", "Registration", "Getting started"],
    keywords: [
      "how to register for eTIMS Kenya",
      "eTIMS onboarding Kenya",
      "eTIMS USB token",
      "eTIMS registration steps iTax",
      "eTIMS POS registration",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "what-is-etims-kenya",
      "etims-pos-integration-kenya",
      "set-up-a-pos-in-30-minutes",
      "record-keeping-and-kra-penalties-kenya",
    ],
    faqs: [
      {
        question: "How long does eTIMS registration take?",
        answer:
          "For most businesses, onboarding through iTax takes less than an hour of your time, and you can start issuing authorized invoices the same day — especially if you use the eTIMS web portal, mobile app, or a POS that handles the integration for you. Physical token or device setups can add a day or two for delivery.",
      },
      {
        question: "Does eTIMS registration cost money?",
        answer:
          "KRA does not charge a registration fee for eTIMS onboarding itself. The web portal and mobile app are free. If you choose a device-based setup, you may pay for the USB token or hardware; if you use a POS with built-in eTIMS support, that's part of your software plan, not a KRA charge.",
      },
      {
        question: "I already have an ETR machine. Do I still need to register for eTIMS?",
        answer:
          "Yes — eTIMS is the successor to ETR, and KRA has been migrating businesses across. The registration flow asks about your current setup so you can migrate cleanly instead of running both systems. Your accountant or POS provider can help you migrate without losing historical records.",
      },
      {
        question: "Can my POS register for eTIMS on my behalf?",
        answer:
          "A POS with eTIMS integration (OSCU/VSCU or API-based) walks you through the onboarding steps and registers the device or integration against your KRA PIN. You still approve it through iTax, but the software does the heavy lifting — which is why most shops prefer it to manual invoicing.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Registering for eTIMS sounds like a bureaucratic expedition — a day of forms and queues. In practice it's an iTax session, a choice of how you want to invoice, and then you're live. Here's the whole process, step by step, so it takes you an hour instead of a week.",
      },
      {
        type: "heading",
        text: "What you need before you start",
      },
      {
        type: "list",
        items: [
          "A KRA PIN — attached to the business, not just to you personally.",
          "Your business registration (business name on eCitizen, or company documents).",
          "An active iTax account with your PIN and password.",
          "A decision on how you want to invoice (see the methods below).",
        ],
      },
      {
        type: "heading",
        text: "The registration steps",
      },
      {
        type: "list",
        items: [
          "Log in to iTax (itax.kra.go.ke) with your KRA PIN and password.",
          "Open the eTIMS section — under registration or the eTIMS menu depending on your dashboard — and start the eTIMS onboarding flow.",
          "Confirm your business details: name, PIN, address, and the sector you operate in (retail).",
          "Choose your onboarding method — web portal, mobile app, offline desktop, or POS/API integration.",
          "For device-based methods, register the device or request your USB token; for POS integration, your provider walks you through connecting your till to your PIN.",
          "Verify and submit. KRA confirms your onboarding, and you can start issuing authorized invoices — often the same day.",
        ],
      },
      {
        type: "image",
        src: "/blog/etims-register-steps.svg",
        alt: "Four eTIMS onboarding steps: log in to iTax, pick a method (shops should pick POS), connect and confirm the device, then go live the same day",
        caption: "Four steps, usually under an hour — and a POS route makes every sale invoice itself.",
      },
      {
        type: "heading",
        text: "Choosing your invoicing method",
      },
      {
        type: "table",
        headers: ["Method", "Best for", "Effort per invoice"],
        rows: [
          [
            "eTIMS Lite (web portal)",
            "Low-volume traders",
            "Manual — type or upload each invoice",
          ],
          [
            "eTIMS Mobile App",
            "Traders on the move",
            "Manual — create on your phone",
          ],
          [
            "Offline desktops + USB token",
            "Small offices, patchy internet",
            "Manual — signed with the token",
          ],
          [
            "POS / API integration",
            "Shops with a till",
            "Automatic — every sale is an authorized invoice",
          ],
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If you run a counter with real foot traffic, skip the manual methods. A POS with built-in eTIMS reporting makes every sale an authorized invoice automatically — that's the difference between compliance as a byproduct and compliance as a chore.",
      },
      {
        type: "heading",
        text: "After you're onboarded",
      },
      {
        type: "paragraph",
        text: "Once you're live, the discipline is simple: every sale gets an invoice, every invoice carries KRA's authorization, and your numbers stay consistent across your till, your stock, and your returns. If you're on a POS, this is happening in the background — which is the whole point.",
      },
      {
        type: "links",
        items: [
          {
            label: "What Is eTIMS in Kenya? The System Explained",
            href: "/blog/what-is-etims-kenya",
            blurb: "The background you need before (or after) registering.",
          },
          {
            label: "eTIMS and Your POS: How the Right Till Keeps You KRA-Ready",
            href: "/blog/etims-pos-integration-kenya",
            blurb: "How integration works and what to look for in a till.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "vat-for-small-businesses-kenya",
    title: "VAT for Small Businesses in Kenya: Threshold, Rates & Filing",
    description:
      "When VAT registration is compulsory in Kenya, what the 16% applies to, why staples often owe little VAT, and the monthly return routine — explained for shop owners.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["VAT", "KRA", "Kenya", "Small business", "Compliance"],
    keywords: [
      "VAT threshold Kenya",
      "VAT registration Kenya small business",
      "VAT rate Kenya 16%",
      "do mini marts pay VAT Kenya",
      "VAT return Kenya deadline",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "turnover-tax-kenya-shops",
      "what-is-etims-kenya",
      "record-keeping-and-kra-penalties-kenya",
      "income-tax-for-shop-owners-kenya",
    ],
    faqs: [
      {
        question: "Do mini-marts in Kenya pay VAT?",
        answer:
          "Only if annual taxable turnover exceeds KSh 8 million (the compulsory registration threshold, raised from KSh 5 million by the Finance Act 2023). Below that you don't charge VAT, and you don't file VAT returns. Most single-branch mini-marts sit below the threshold — but the moment you approach it, registration is compulsory.",
      },
      {
        question: "What is the VAT rate in Kenya?",
        answer:
          "The standard rate is 16%. Some supplies are zero-rated (0%) and some are exempt. For a mini-mart the important nuance is that many basic foodstuffs — maize flour, milk, and other staples — are zero-rated or exempt, so even a VAT-registered shop selling mostly essentials may owe very little output VAT.",
      },
      {
        question: "When must I register for VAT in Kenya?",
        answer:
          "Registration is compulsory once your taxable turnover exceeds KSh 8 million in a 12-month period. You can also register voluntarily once turnover passes KSh 5 million — useful if you want to reclaim input VAT on big purchases. Confirm the current thresholds with KRA, as Finance Act changes can move them.",
      },
      {
        question: "How do I file VAT returns in Kenya?",
        answer:
          "VAT returns are filed monthly through iTax by the 20th of the following month, and any tax due is paid the same day. Registered businesses also charge 16% on taxable sales, reclaim input VAT on purchases, and must keep eTIMS-compliant invoices as the supporting paper trail.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "VAT is the tax every shop owner has heard horror stories about — and the one most mini-marts will never actually pay. The trick is knowing where the line is, what sits on either side of it, and what changes the day you cross it.",
      },
      {
        type: "heading",
        text: "The line: KSh 8 million of annual turnover",
      },
      {
        type: "paragraph",
        text: "VAT registration in Kenya is compulsory once your taxable turnover exceeds KSh 8 million in a year — raised from KSh 5 million by the Finance Act 2023. Below that line, you are not a VAT-registered business: you don't charge customers 16%, and you don't file VAT returns. You keep invoicing under eTIMS, but VAT itself stays off your plate.",
      },
      {
        type: "paragraph",
        text: "Voluntary registration is available from KSh 5 million — sometimes worth taking if you buy a lot of taxable stock, because it lets you reclaim the input VAT on those purchases. For most mini-marts, staying under the line and out of the VAT machinery is the simpler, better answer.",
      },
      {
        type: "heading",
        text: "What 16% applies to (and what it doesn't)",
      },
      {
        type: "list",
        items: [
          "Standard-rated (16%): most non-food goods and general retail items — toiletries, cleaning products, packaged snacks, drinks that aren't zero-rated.",
          "Zero-rated (0%): exports and certain supplies, plus many basic foodstuffs such as maize flour and other staples.",
          "Exempt: certain goods and services where no VAT is charged and no input VAT can be reclaimed — milk and other exempt items in the schedule.",
        ],
      },
      {
        type: "paragraph",
        text: "The practical consequence for a mini-mart: a shop whose sales are mostly staples — flour, sugar, milk, cooking oil — has very little output VAT even after crossing the threshold, because those goods carry little or no VAT. The liability concentrates on the discretionary shelf: sodas, snacks, toiletries, and the like.",
      },
      {
        type: "image",
        src: "/blog/vat-threshold-line.svg",
        alt: "The VAT threshold gauge: no VAT up to KSh 5 million, voluntary registration from 5 to 8 million, and compulsory registration above 8 million, with most mini-marts below the line",
        caption: "The VAT cliff: compulsory at KSh 8M, optional from KSh 5M, invisible below. Most mini-marts never reach it.",
      },
      {
        type: "heading",
        text: "The monthly routine once you're registered",
      },
      {
        type: "list",
        items: [
          "Charge 16% VAT on taxable sales — the POS should compute this line automatically per item.",
          "Collect the input VAT from your suppliers' invoices on taxable purchases.",
          "File the VAT return on iTax by the 20th of the following month, and pay any balance the same day.",
          "Keep every invoice eTIMS-compliant — KRA's system is exactly how they verify what you declare.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "The threshold is a cliff, not a suggestion: once annual turnover passes KSh 8 million, registration is compulsory and backdating applies from the point you crossed it. Track your running 12-month turnover — a POS that sums your sales automatically makes this a number you can see, not guess.",
      },
      {
        type: "heading",
        text: "Why your till matters for VAT",
      },
      {
        type: "paragraph",
        text: "A VAT return is only as good as the invoices behind it, and invoices are only as good as the sales that produced them. A till that generates an eTIMS-compliant invoice per sale, tracks tax per item, and hands your accountant a clean monthly summary turns VAT month from a reconstruction into a review.",
      },
      {
        type: "links",
        items: [
          {
            label: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
            href: "/blog/turnover-tax-kenya-shops",
            blurb: "The tax that applies below the VAT threshold.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "turnover-tax-kenya-shops",
    title: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
    description:
      "Turnover tax explained for Kenyan shop owners — the KSh 1–25 million range, the 3% rate, the monthly filing routine, and how TOT relates to income tax and VAT.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Turnover tax", "TOT", "KRA", "Kenya", "Small business"],
    keywords: [
      "turnover tax Kenya rate",
      "TOT Kenya 3%",
      "turnover tax threshold Kenya 25 million",
      "who pays turnover tax Kenya",
      "turnover tax vs income tax Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "vat-for-small-businesses-kenya",
      "income-tax-for-shop-owners-kenya",
      "what-is-etims-kenya",
      "record-keeping-and-kra-penalties-kenya",
    ],
    faqs: [
      {
        question: "What is the turnover tax rate in Kenya?",
        answer:
          "Turnover tax is 3% of gross turnover for businesses with annual turnover between KSh 1 million and KSh 25 million. It was raised from 1% (and the range widened from KSh 5 million) by the Finance Act 2023. It's charged on what you sell, not on your profit.",
      },
      {
        question: "Do mini-marts pay turnover tax?",
        answer:
          "Most do. A typical mini-mart turning over between KSh 1 million and KSh 25 million a year sits squarely in the TOT bracket — that's roughly KSh 3,000 of TOT for every KSh 100,000 of sales. Above KSh 25 million you move to regular income tax on profits, and above KSh 8 million VAT registration also kicks in.",
      },
      {
        question: "When is turnover tax due in Kenya?",
        answer:
          "TOT is filed and paid monthly through iTax by the 20th of the following month — the same monthly rhythm as VAT. There's also an annual turnover tax return and a 25% top-up option at year end if your annual TOT falls short of what income tax would have been.",
      },
      {
        question: "Can I claim expenses against turnover tax?",
        answer:
          "No — that's the trade-off. TOT is a flat percentage of gross turnover, so expenses don't reduce it. The simplicity (no expense schedules, no arguments with KRA about deductions) is the point. If your profit margins are very thin, regular income tax on profits might work out cheaper — that's a conversation for your accountant.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Turnover tax — TOT — is the tax most Kenyan mini-marts actually live with, and yet it's the one owners understand least. It's also one of the simplest taxes in the country once you see it clearly.",
      },
      {
        type: "heading",
        text: "Who TOT applies to",
      },
      {
        type: "paragraph",
        text: "TOT applies to businesses whose annual turnover is between KSh 1 million and KSh 25 million. That's a wide band on purpose: it captures the small trader who has outgrown the very bottom, and the mid-size shop that hasn't graduated to full income tax. The vast majority of single-branch mini-marts live in this range, which makes TOT the default tax for the neighbourhood shop.",
      },
      {
        type: "paragraph",
        text: "Below KSh 1 million you're in the micro range where tax obligations are minimal; above KSh 25 million you're out of TOT and onto income tax on your actual profits. And note: TOT and VAT are not either/or. Above KSh 8 million of annual turnover you can be on TOT for income purposes and VAT-registered at the same time.",
      },
      {
        type: "heading",
        text: "The rate: 3% of gross turnover",
      },
      {
        type: "paragraph",
        text: "The rate is a flat 3% of gross turnover — what you sold, before any expenses. No expense schedules, no deductions, no allowances. The math is brutal in its simplicity: KSh 100,000 of sales is KSh 3,000 of TOT. KSh 500,000 of sales is KSh 15,000.",
      },
      {
        type: "paragraph",
        text: "That's the honest trade-off of TOT: it's cheap to administer but blind to thin margins. Two shops, one with 30% margins and one with 8%, pay the same 3% on the same turnover. If your margins are genuinely thin, ask your accountant whether regular income tax on profits would leave you better off — TOT offers a year-end option to top up if your annual turnover tax undercuts what income tax would have been.",
      },
      {
        type: "image",
        src: "/blog/tot-calculator.svg",
        alt: "Turnover tax calculator: KSh 400,000 of monthly turnover multiplied by the 3 percent rate equals KSh 12,000 due by the 20th of next month",
        caption: "The arithmetic is the whole tax: turnover × 3% = what's due by the 20th.",
      },
      {
        type: "heading",
        text: "The filing routine",
      },
      {
        type: "list",
        items: [
          "File the monthly TOT return on iTax by the 20th of the following month.",
          "Pay the 3% the same day — the return and payment go together.",
          "At year end, file the annual TOT return; a 25% top-up applies if your total TOT for the year is less than 25% of what income tax on your profits would have been.",
          "Keep your sales records complete — TOT is calculated from what you declare, and eTIMS is how KRA checks.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "TOT is charged on what you actually sold — so the number you file is only as honest as your record of sales. A till that captures every sale and summarizes your turnover by month is the difference between filing from data and filing from memory.",
      },
      {
        type: "heading",
        text: "TOT vs. income tax vs. VAT — the one-line version",
      },
      {
        type: "table",
        headers: ["Tax", "Applies when", "Charged on", "Rate"],
        rows: [
          [
            "Turnover tax (TOT)",
            "Turnover KSh 1M–25M",
            "Gross turnover",
            "3%",
          ],
          [
            "Income tax",
            "Turnover above KSh 25M (or opted in)",
            "Profits",
            "10–30%",
          ],
          [
            "VAT",
            "Taxable turnover above KSh 8M",
            "Taxable supplies",
            "16% (standard)",
          ],
        ],
      },
      {
        type: "links",
        items: [
          {
            label: "Income Tax for Shop Owners in Kenya: Sole Proprietors, PAYE & Filing",
            href: "/blog/income-tax-for-shop-owners-kenya",
            blurb: "What happens above the TOT band, and how profits are taxed.",
          },
          {
            label: "VAT for Small Businesses in Kenya: Threshold, Rates & Filing",
            href: "/blog/vat-for-small-businesses-kenya",
            blurb: "The separate obligation that kicks in at KSh 8 million.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "income-tax-for-shop-owners-kenya",
    title: "Income Tax for Shop Owners in Kenya: Sole Proprietors, PAYE & Filing",
    description:
      "How income tax works for Kenyan shop owners — the 10/25/30% tax bands, what counts as a deductible expense, PAYE for staff, and the 30 June annual return.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Income tax", "PAYE", "KRA", "Kenya", "Sole proprietor"],
    keywords: [
      "income tax Kenya rates 2026",
      "sole proprietor tax Kenya",
      "PAYE Kenya due date",
      "business expenses deductible Kenya",
      "when is income tax return due Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "turnover-tax-kenya-shops",
      "vat-for-small-businesses-kenya",
      "record-keeping-and-kra-penalties-kenya",
      "building-systems-for-your-mini-mart",
    ],
    faqs: [
      {
        question: "How much income tax does a shop owner in Kenya pay?",
        answer:
          "Sole proprietors pay tax on their business profits at the individual rates: 10% up to KSh 288,000 a year, 25% on the next band up to KSh 388,000, and 30% above that. The rate applies to profit, not turnover — so legitimate expenses genuinely reduce what you owe.",
      },
      {
        question: "What business expenses can I deduct?",
        answer:
          "Expenses incurred wholly and exclusively for the business: stock purchases, rent, power, water, transport and delivery, staff wages, repairs, and business-related insurance and banking charges. The rule is simple — every deduction needs a record, so invoices from suppliers and your own till records are the evidence.",
      },
      {
        question: "When is the income tax return due in Kenya?",
        answer:
          "The annual income tax return is filed through iTax by 30 June following the end of the year (the tax year runs January to December). If your expected tax is significant, you also pay quarterly installment tax during the year rather than one painful lump in June.",
      },
      {
        question: "Do I pay PAYE as a mini-mart owner?",
        answer:
          "If you employ staff — cashiers, shop attendants, stock clerks — yes. You register for PAYE as an employer, deduct it from each employee's salary at source, and remit it to KRA by the 9th of the following month. It's a withholding tax: the money comes out of salaries, and your job is to pass it on.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Income tax is the tax on what you actually keep — your profit — and for a shop owner it comes in two flavours: the tax on your own business income, and PAYE for anyone on your payroll. Both are simpler than they sound, and both get dramatically easier when your records are real.",
      },
      {
        type: "heading",
        text: "Sole proprietors pay tax on profit, at personal rates",
      },
      {
        type: "paragraph",
        text: "Most mini-marts are sole proprietorships, and Kenya taxes a sole proprietor's business income at the same rates as personal income. For a year of profits:",
      },
      {
        type: "table",
        headers: ["Annual taxable income", "Rate"],
        rows: [
          ["Up to KSh 288,000", "10%"],
          ["KSh 288,001 – 388,000", "25%"],
          ["Above KSh 388,000", "30%"],
        ],
      },
      {
        type: "image",
        src: "/blog/income-tax-bands.svg",
        alt: "Income tax bands for a sole proprietor: 10 percent up to KSh 288,000, 25 percent to KSh 388,000, 30 percent above, with deductible expenses and PAYE for staff",
        caption: "Bands stack — each slice of profit is taxed at its own rate, and expenses shrink the pile first.",
      },
      {
        type: "paragraph",
        text: "The word that matters is profit. Tax applies to what's left after your genuine business expenses — not to the full value of everything you sold. That single distinction is why two shops with identical sales can owe very different amounts of income tax, and why record-keeping is the whole game.",
      },
      {
        type: "heading",
        text: "Expenses that reduce your taxable profit",
      },
      {
        type: "list",
        items: [
          "Stock — every purchase from your suppliers, evidenced by their invoices.",
          "Rent and utilities — the shop, power, water, and business phone costs.",
          "Staff wages — salaries of your employees (which also carry PAYE).",
          "Transport and delivery — moving stock from wholesaler to shelf.",
          "Repairs and small equipment — keeping the shop running.",
          "Business banking, insurance, and professional fees — accountant and licensing costs.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A deduction without a record doesn't exist in KRA's eyes. Supplier invoices, receipts, and your own till-generated sales records are the evidence. Software that stores all of it automatically beats a shoebox of receipts every single year.",
      },
      {
        type: "heading",
        text: "PAYE: the tax on your staff's salaries",
      },
      {
        type: "paragraph",
        text: "The moment you employ someone, you become an employer in KRA's eyes. Register for PAYE, deduct it from each salary at source using the official bands, and remit it by the 9th of the following month. The personal relief makes most low-wage retail staff pay little or no PAYE — but the deduction, remittance, and monthly return still need to happen.",
      },
      {
        type: "heading",
        text: "The annual routine",
      },
      {
        type: "list",
        items: [
          "Quarterly installment tax through the year if your expected annual tax is above the threshold — four installments that stop June being a shock.",
          "Annual income tax return on iTax by 30 June for the previous calendar year.",
          "PAYE monthly: deduct, remit by the 9th, file the return.",
          "Keep your profit and loss honest all year — the return is a summary of records you already have.",
        ],
      },
      {
        type: "heading",
        text: "Income tax vs. turnover tax",
      },
      {
        type: "paragraph",
        text: "If you're in the KSh 1–25 million turnover band, you're likely on turnover tax (3% of gross) rather than income tax on profits. Some shops choose income tax because their margins are thin and expenses are high — a conversation worth having with an accountant once your books are clean. The numbers are only comparable when the records are real.",
      },
      {
        type: "links",
        items: [
          {
            label: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
            href: "/blog/turnover-tax-kenya-shops",
            blurb: "The 3% alternative for shops in the KSh 1–25M band.",
          },
          {
            label: "Record-Keeping and KRA Penalties: What Kenyan Shop Owners Must Keep (and Avoid)",
            href: "/blog/record-keeping-and-kra-penalties-kenya",
            blurb: "The records that make income tax painless — and the penalties for not having them.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "excise-duty-for-retailers-kenya",
    title: "Excise Duty and Retailers in Kenya: What Mini-Marts Actually Deal With",
    description:
      "Excise duty for Kenyan mini-marts, explained: what's excisable, why the duty is already in your wholesale price, who has to register as a licensee, and the duty-unpaid trap to avoid.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Excise duty", "KRA", "Kenya", "Retail", "Compliance"],
    keywords: [
      "excise duty Kenya retailers",
      "excise duty mini mart Kenya",
      "who pays excise duty Kenya",
      "excise duty on sodas Kenya",
      "excise license Kenya retail",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "what-is-etims-kenya",
      "record-keeping-and-kra-penalties-kenya",
      "turnover-tax-kenya-shops",
    ],
    faqs: [
      {
        question: "Do mini-marts need an excise license in Kenya?",
        answer:
          "No — not for selling excisable goods like sodas, juices, beer, or cigarettes. An excise license is for manufacturers and importers of excisable goods. As a retailer, the duty is already embedded in the wholesale price you pay your supplier; you don't charge or remit excise yourself.",
      },
      {
        question: "Is excise duty included in the price I pay my supplier?",
        answer:
          "Yes. For excisable goods, the manufacturer or importer pays the duty, and it's built into the wholesale price that reaches your shelf. That's why a bottle of soda's price barely moves between shops — the duty component is fixed at source.",
      },
      {
        question: "Which goods sold in a mini-mart carry excise duty?",
        answer:
          "Typically sweetened beverages and sodas, fruit juices, beer and spirits, and cigarettes. The list changes with each Finance Act, so check the current schedule on KRA's portal. Airtime and data are also excisable, which is why your airtime reseller prices already reflect it.",
      },
      {
        question: "What is the duty-unpaid trap for retailers?",
        answer:
          "Goods that entered the country or the market without excise duty paid — smuggled cigarettes and drinks, usually — sell far below normal prices. The cheap price is the red flag: if a product costs suspiciously little, the duty probably isn't in it, and stocking it can land you in serious trouble with KRA regardless of whether you knew.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Excise duty is the tax on the fun stuff — sodas, juices, beer, cigarettes. For a mini-mart owner it sounds like another registration, another return, another deadline. The truth is the opposite: for a retailer, excise is mostly invisible, and the only real danger is a bargain that was never taxed in the first place.",
      },
      {
        type: "heading",
        text: "Who actually pays excise duty",
      },
      {
        type: "paragraph",
        text: "Excise duty is levied on manufacturers and importers of excisable goods — not on retailers. The duty is paid once, at the point of production or import, and it travels with the goods through the supply chain, embedded in every price you pay. By the time a bottle of soda reaches your shelf, the duty is already in the wholesale price. You never see it as a separate line, you never charge it to the customer, and you never file a return for it.",
      },
      {
        type: "heading",
        text: "What's excisable (and what that means for your shelf)",
      },
      {
        type: "table",
        headers: ["Category", "Examples", "Your role as retailer"],
        rows: [
          [
            "Sweetened beverages",
            "Sodas, sweetened juices",
            "None — duty in the wholesale price",
          ],
          [
            "Alcohol",
            "Beer, spirits (if you stock them)",
            "None — plus hold a liquor license where required",
          ],
          [
            "Tobacco",
            "Cigarettes",
            "None — but be alert to duty-unpaid stock",
          ],
          [
            "Telecom",
            "Airtime, data resale",
            "None — reflected in reseller prices",
          ],
        ],
      },
      {
        type: "paragraph",
        text: "The excise schedule changes with every Finance Act, so the exact list and rates move. What doesn't change is the structure: duty attaches to specific goods at source, and a retailer's job is simply to sell goods that were properly taxed on their way in.",
      },
      {
        type: "image",
        src: "/blog/excise-supply-chain.svg",
        alt: "The excise supply chain: the manufacturer or importer pays the duty, the wholesale price carries it, and the retailer files nothing — with a warning about duty-unpaid stock",
        caption: "Duty paid once at the source, embedded in every price you pay — your only job is to avoid duty-unpaid bargains.",
      },
      {
        type: "heading",
        text: "The one trap: duty-unpaid stock",
      },
      {
        type: "callout",
        tone: "warning",
        text: "If a supplier offers cigarettes or drinks at prices far below the market rate, the excise duty almost certainly isn't in them. Selling duty-unpaid goods is a serious KRA offense — and 'I didn't know' is not the defense people think it is. When a price looks too good to be true, it's usually a tax liability wearing a discount.",
      },
      {
        type: "paragraph",
        text: "This is also where records protect you. If you buy from legitimate distributors and keep their invoices, you can demonstrate where every excisable product on your shelf came from. A till that logs your purchases and stock movements makes that demonstration instant instead of frantic.",
      },
      {
        type: "heading",
        text: "The one registration you might actually need",
      },
      {
        type: "paragraph",
        text: "If you start manufacturing — say, blending juices or roasting and packaging snacks — or importing excisable goods directly, then you step into the licensee role and the returns that come with it. For a shop that buys finished goods from distributors, none of that applies.",
      },
      {
        type: "links",
        items: [
          {
            label: "Record-Keeping and KRA Penalties: What Kenyan Shop Owners Must Keep (and Avoid)",
            href: "/blog/record-keeping-and-kra-penalties-kenya",
            blurb: "The records that prove your stock was properly taxed.",
          },
          {
            label: "What Is eTIMS in Kenya? The System Explained",
            href: "/blog/what-is-etims-kenya",
            blurb: "The invoice system that shows KRA what you sell.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "record-keeping-and-kra-penalties-kenya",
    title: "Record-Keeping and KRA Penalties: What Kenyan Shop Owners Must Keep (and Avoid)",
    description:
      "What records a Kenyan shop must keep and for how long, the KRA penalty schedule for late returns and eTIMS violations, and why automatic records beat reconstruction.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["Records", "Penalties", "KRA", "Kenya", "Compliance", "Audit"],
    keywords: [
      "KRA penalties late filing Kenya",
      "how long keep records Kenya tax",
      "KRA audit small business Kenya",
      "eTIMS penalty Kenya",
      "tax records shop Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "what-is-etims-kenya",
      "how-to-register-for-etims-kenya",
      "turnover-tax-kenya-shops",
      "vat-for-small-businesses-kenya",
      "income-tax-for-shop-owners-kenya",
    ],
    faqs: [
      {
        question: "How long must I keep business records in Kenya?",
        answer:
          "Five years, under the Tax Procedures Act. That covers sales records, purchase invoices, stock movements, payroll, and bank statements. KRA can ask for them when reviewing or auditing your returns — and five years of exercise-book scribbles is a hard ask, while five years of till-generated records is a folder.",
      },
      {
        question: "What happens if I file my tax return late in Kenya?",
        answer:
          "Late filing attracts a monthly penalty — the amount depends on the tax type and period — and unpaid tax attracts interest at 1% per month. The longer it runs, the bigger the pile. Filing something accurate late is always cheaper than filing nothing.",
      },
      {
        question: "What is the penalty for not using eTIMS in Kenya?",
        answer:
          "Under the Tax Procedures Act as amended, failing to issue an electronic tax invoice is a serious offense, carrying fines of up to KSh 1 million and imprisonment of up to three years. Enforcement has focused on making eTIMS the default way to invoice — which is why the automatic invoice from your till is the safe route.",
      },
      {
        question: "What triggers a KRA audit of a small shop?",
        answer:
          "Inconsistencies usually do: returns that don't match your eTIMS invoice data, sales that contradict your stock purchases, or expenses that outgrow your declared turnover. A shop whose till data, stock, and returns all agree is a very boring audit target — which is exactly the outcome you want.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Tax enforcement in Kenya doesn't start with an audit. It starts with records — what you have, whether they're real, and whether they match. For a mini-mart, the entire tax relationship with KRA comes down to one question: can you show what you sold, and what you bought, in a way that adds up?",
      },
      {
        type: "heading",
        text: "The five-year rule",
      },
      {
        type: "paragraph",
        text: "The Tax Procedures Act requires you to keep records for five years. For a shop that means:",
      },
      {
        type: "list",
        items: [
          "Sales records — every sale, every day, with the till data to back it.",
          "Purchase invoices — what you bought from every supplier, with their receipts.",
          "Stock records — what came in, what went out, what's on the shelf.",
          "Payroll records — wages, PAYE deductions, and remittances.",
          "Bank statements and payment records — the money trail in and out.",
        ],
      },
      {
        type: "heading",
        text: "The penalty schedule, in plain language",
      },
      {
        type: "table",
        headers: ["Situation", "What KRA can charge"],
        rows: [
          [
            "Return filed late",
            "Monthly penalty per return until filed",
          ],
          [
            "Tax paid late",
            "Interest of 1% per month on the unpaid amount",
          ],
          [
            "Incorrect or incomplete records",
            "Penalties on top of the tax itself, plus audit attention",
          ],
          [
            "Failure to issue an eTIMS invoice",
            "Fine of up to KSh 1 million and/or imprisonment up to 3 years",
          ],
        ],
      },
      {
        type: "image",
        src: "/blog/records-penalties.svg",
        alt: "Five years of records to keep — sales, purchases, stock, payroll, and bank statements — alongside the penalty schedule for late returns, late payment, poor records, and missing eTIMS invoices",
        caption: "Five years of proof on the left, four ways to pay on the right. Records make the left column automatic.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "Penalty figures move with every Finance Act — this table reflects the rules as of 2026. What doesn't change is the pattern: penalties compound, interest compounds, and the cheapest moment to fix a tax problem is always today.",
      },
      {
        type: "heading",
        text: "What actually triggers an audit",
      },
      {
        type: "paragraph",
        text: "KRA's systems now see your sales through eTIMS before you ever file a return. When your declared numbers don't match what your invoices show — or when your stock purchases can't plausibly produce the sales you declare — that's when the questions start. The shops that get audited aren't the big ones; they're the inconsistent ones.",
      },
      {
        type: "heading",
        text: "Why the till is the cheapest insurance",
      },
      {
        type: "paragraph",
        text: "Every record on that five-year list is generated automatically by a modern POS: sales with invoice numbers, stock movements per item, and totals that reconcile with your bank and M-Pesa. The shop that reconstructs records from memory at audit time is doing archaeology under pressure. The shop with a till is printing a report.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Compliance isn't about knowing every KRA rule — it's about having real records that make the rules easy. A till that logs every sale and keeps the paper trail means your tax life is a monthly review, not an annual reconstruction.",
      },
      {
        type: "links",
        items: [
          {
            label: "What Is eTIMS in Kenya? The System Explained",
            href: "/blog/what-is-etims-kenya",
            blurb: "Why your invoices are visible to KRA in real time.",
          },
          {
            label: "Turnover Tax (TOT) in Kenya: Who Pays, the Rate, and How to File",
            href: "/blog/turnover-tax-kenya-shops",
            blurb: "The 3% monthly routine your records feed into.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  {
    slug: "etims-pos-integration-kenya",
    title: "eTIMS and Your POS: How the Right Till Keeps You KRA-Ready",
    description:
      "How eTIMS/POS integration works in Kenya — AUTH codes per sale, offline queues, OSCU/VSCU, and what to look for in a till that makes KRA compliance automatic.",
    category: "Tax & compliance",
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    tags: ["eTIMS", "POS", "KRA", "Kenya", "Integration", "Compliance"],
    keywords: [
      "eTIMS POS integration Kenya",
      "POS with eTIMS Kenya",
      "OSCU VSCU Kenya",
      "eTIMS API POS",
      "KRA compliant POS Kenya",
    ],
    author: "Kiosk",
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "what-is-etims-kenya",
      "how-to-register-for-etims-kenya",
      TOP_10_POS_SLUG,
      SETUP_POS_SLUG,
      "record-keeping-and-kra-penalties-kenya",
    ],
    faqs: [
      {
        question: "How does eTIMS integration with a POS work?",
        answer:
          "Your till talks to KRA's eTIMS through an integration (API-based, or OSCU/VSCU for offline-capable devices). When you complete a sale, the till requests an authorization (AUTH) code from KRA, prints it on the receipt with a QR code, and logs the invoice — all automatically and in seconds. The manual invoicing of eTIMS Lite or the mobile app is replaced by the sale itself.",
      },
      {
        question: "What does OSCU/VSCU mean?",
        answer:
          "They're KRA's device classifications for eTIMS: OSCU (Offline Sales Control Unit) and VSCU (Virtual Sales Control Unit) are control units that sign and authorize invoices, including when connectivity drops. A POS built on these standards can keep issuing valid invoices offline and sync them when the network returns.",
      },
      {
        question: "What if the internet drops at my shop?",
        answer:
          "The right POS keeps selling. Sales are queued locally, invoices stay numbered and signed (per OSCU/VSCU rules), and everything syncs to KRA when connectivity returns. Selling offline is fine; losing the invoice trail is not. Ask a POS vendor specifically how their offline queue handles eTIMS authorization.",
      },
      {
        question: "Does Kiosk.ke support eTIMS?",
        answer:
          "Kiosk.ke includes built-in tax reporting for day-to-day retail: invoices generated at the till are kept ready for KRA eTIMS reporting, with accurate, dated records that reconcile with your stock and M-Pesa. If eTIMS obligations apply to your shop, that built-in compliance beats reconciling manually at month end.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Here's the choice every Kenyan shop owner eventually faces: eTIMS invoices generated by hand, or eTIMS invoices generated by the sale itself. The first is how compliance becomes a full-time job. The second is how it disappears into the background. This guide is about the second.",
      },
      {
        type: "heading",
        text: "How POS/eTIMS integration works",
      },
      {
        type: "paragraph",
        text: "When a till integrates with eTIMS, the invoicing loop becomes automatic: you ring up a sale, the till asks KRA's system for an authorization (AUTH) code, KRA returns it in seconds, the receipt prints with the code and a QR code, and the invoice is logged. The customer gets a proper tax invoice; KRA gets the sale; your record-keeping gets a number to point at. Nobody retypes anything.",
      },
      {
        type: "paragraph",
        text: "That's the core difference from KRA's manual tools — the eTIMS Lite web portal and the mobile app, which require someone to create an invoice per transaction. At a busy counter, manual invoicing quietly stops happening by day two. Integrated invoicing never gets skipped, because skipping it would require stopping the sale.",
      },
      {
        type: "image",
        src: "/blog/pos-etims-sync.svg",
        alt: "An integrated till: the sale completes, an AUTH code is issued by KRA automatically, the receipt carries it, and an offline queue keeps invoices numbered and syncing when the network drops",
        caption: "Complete the sale, get the AUTH code, sync to KRA — and keep selling through outages with a queue that clears itself.",
      },
      {
        type: "heading",
        text: "OSCU, VSCU, and selling through outages",
      },
      {
        type: "paragraph",
        text: "KRA's eTIMS ecosystem includes control-unit standards — OSCU (Offline Sales Control Unit) and VSCU (Virtual Sales Control Unit) — that let authorized devices sign invoices even without a live connection. A POS built on these can keep issuing valid invoices during a network outage and sync them to KRA when you're back online.",
      },
      {
        type: "paragraph",
        text: "This matters more than it sounds. Kenyan shops lose connectivity all the time, and the wrong POS turns every outage into either lost sales or a gap in the invoice trail. The right one turns it into a queue that clears itself. When you evaluate a POS, ask the vendor exactly how offline sales are authorized and synced — vague answers are a red flag.",
      },
      {
        type: "heading",
        text: "What to look for in a KRA-ready POS",
      },
      {
        type: "list",
        items: [
          "Automatic invoicing — every sale generates an authorized invoice without manual steps.",
          "Offline queue — sales keep flowing and sync cleanly when connectivity returns.",
          "Tax-per-item accuracy — correct treatment of standard, zero-rated, and exempt goods.",
          "Reconciled records — invoices that match your stock counts and M-Pesa payments.",
          "Accountant-friendly exports — monthly summaries your accountant can use without a guided tour.",
          "Clear onboarding — the vendor walks you through connecting your till to your KRA PIN.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Kiosk.ke is built around that list: barcode speed at the till, native M-Pesa, offline-tolerant sales, and built-in tax reporting that keeps every invoice ready for eTIMS. Compliance becomes a byproduct of good sales — not a separate chore.",
      },
      {
        type: "heading",
        text: "The month-end payoff",
      },
      {
        type: "paragraph",
        text: "With an integrated till, month end is a review instead of a reconstruction: your turnover totals are already filed-ready, your invoices are already with KRA, and your accountant's questions are answered by a report rather than a memory. That's the whole pitch for eTIMS-integrated POS software — it turns the taxman's new system from a burden into a background process.",
      },
      {
        type: "links",
        items: [
          {
            label: "Top 10 POS Systems in Kenya (2026) — Ranked & Compared",
            href: `/blog/${TOP_10_POS_SLUG}`,
            blurb: "Which Kenyan POS platforms are eTIMS-ready.",
          },
          {
            label: "Set Up a POS in Kenya in 30 Minutes",
            href: `/blog/${SETUP_POS_SLUG}`,
            blurb: "Till, storefront, M-Pesa, and eTIMS-ready invoices in one afternoon.",
          },
          {
            label: "Taxes for Mini-Marts in Kenya: The Complete eTIMS & KRA Guide",
            href: `/blog/${ETIMS_TAX_PILLAR_SLUG}`,
            blurb: "The pillar guide — every tax mapped in one place.",
          },
        ],
      },
    ],
  },
  comingSoon({
    slug: "how-to-file-tax-returns-on-itax",
    title: "How to File Tax Returns on iTax: A Walkthrough for Shop Owners",
    description:
      "Filing TOT, VAT, PAYE, and the annual return on iTax, step by step — the login, the forms, the deadlines, and the mistakes that trigger penalties.",
    category: "Tax & compliance",
    tags: ["iTax", "KRA", "Kenya", "Filing", "Compliance"],
    keywords: [
      "how to file tax returns on iTax",
      "iTax login Kenya",
      "file turnover tax iTax",
      "VAT return iTax step by step",
      "iTax payment Kenya",
    ],
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "turnover-tax-kenya-shops",
      "vat-for-small-businesses-kenya",
      "income-tax-for-shop-owners-kenya",
      "record-keeping-and-kra-penalties-kenya",
    ],
    teaser:
      "Filing on iTax doesn't have to be a guided tour of a maze: the login, the return forms for TOT, VAT, and PAYE, the payment steps, and the small mistakes that turn a five-minute filing into a penalty notice.",
  }),
  comingSoon({
    slug: "kra-audits-for-small-businesses-kenya",
    title: "KRA Audits for Small Businesses: What Triggers One and How to Prepare",
    description:
      "What a KRA audit looks like for a mini-mart, what usually triggers one, and the five documents you'll be asked for first.",
    category: "Tax & compliance",
    tags: ["KRA", "Audit", "Kenya", "Compliance", "Records"],
    keywords: [
      "KRA audit small business Kenya",
      "KRA audit triggers Kenya",
      "what to do during a KRA audit",
      "tax audit mini mart Kenya",
    ],
    relatedSlugs: [
      ETIMS_TAX_PILLAR_SLUG,
      "record-keeping-and-kra-penalties-kenya",
      "what-is-etims-kenya",
      "turnover-tax-kenya-shops",
    ],
    teaser:
      "An audit isn't a random visit — it's usually triggered by a pattern in your own numbers. Here's what KRA looks at first, why consistent till data makes you a boring target, and how to prepare in an afternoon.",
  }),
];

export const ETIMS_TAX_ARTICLES: BlogArticle[] = [
  PILLAR_ARTICLE,
  ...SPOKE_ARTICLES,
];

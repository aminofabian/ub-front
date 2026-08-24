import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const STALL_TO_STORE_ARTICLE: BlogArticle = {
  slug: "from-stall-to-store-a-retailers-journey",
  title: "From Stall to Store: A Retailer's Journey",
  description:
    "How a small retailer moves from cash-only stall sales to a synced till and online shop without losing the plot.",
  category: "Stories",
  publishedAt: "2026-07-17",
  updatedAt: "2026-08-24",
  tags: ["Stories", "Retail", "Growth", "Kenya"],
  keywords: [
    "stall to store journey",
    "retailer journey Kenya",
    "cash only to POS",
    "kiosk to mini mart",
    "small shop growth Kenya",
    "first POS story",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "how-to-grow-a-mini-mart-in-kenya",
    "set-up-a-pos-in-30-minutes",
    "online-physical-one-inventory",
    "5-signs-youve-outgrown-your-pos",
    "top-10-pos-systems-kenya-2026",
  ],
  faqs: [
    {
      question: "Can a small stall really move to a digital till?",
      answer:
        "Yes — that's the whole point of a phone-based till. No terminal wall, no IT project: the stall's owner scans products, takes M-Pesa, and closes the shift from the phone she already carries.",
    },
    {
      question: "How long does the stall-to-store transition take?",
      answer:
        "The honest timeline: products and prices in the first afternoon, a first M-Pesa sale the same day, and a storefront live within a week. The journey is an afternoon repeated — not a months-long project.",
    },
    {
      question: "What's the hardest part of the switch?",
      answer:
        "Habits, not software. The first habit that matters is ringing every sale — even the small ones — so the till's numbers become the shop's truth. Everything else follows from that.",
    },
    {
      question: "Do I lose the personal touch with a till?",
      answer:
        "No — the opposite. The till handles the counting so the owner has time for the customers. Regulars get the same greeting; they just also get a receipt and a storefront that matches the shelf.",
    },
    {
      question: "What does a storefront add to a physical shop?",
      answer:
        "Reach without new walls: customers order for pickup, prices are always the real ones, and the stock count is shared with the counter. One shop, two doors into it.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Every shop in Kenya starts somewhere small — a table, a few crates, a spot at the corner of the estate. This is the story of one of those spots, told the way it happens a thousand times a year: a stall that sold, a notebook that recorded, and the afternoon the owner decided the notebook wasn't going to be the ceiling.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The arc to watch: it's not a story about buying a bigger system. It's a story about one stall, one till, and a storefront that finally matches what's on the shelf. Growth isn't always a bigger ERP — sometimes it's the same shop with tools that fit.",
    },
    {
      type: "heading",
      text: "Chapter 1 — The Stall",
    },
    {
      type: "paragraph",
      text: "The stall sold the classics: cooking oil, rice, soap, the things an estate runs out of on a Tuesday. It worked. The owner knew her customers by name, knew when the oil would run out, and knew — roughly — what she'd made each day. 'Roughly' was the problem.",
    },
    {
      type: "paragraph",
      text: "Sales were remembered, not recorded. The notebook held the numbers she could catch, which wasn't all of them. Stock was a feeling. And M-Pesa, when a customer asked, meant her personal number and a manual log — a payment that didn't belong to the shop at all.",
    },
    {
      type: "image",
      src: "/blog/stall-to-store-journey.svg",
      alt: "The three-chapter journey: a cash-only stall with a notebook, then a phone till with native M-Pesa and stock that updates itself, then a live storefront with orders landing in the till record",
      caption:
        "Chapter one: the stall that worked but never grew. Chapter two: the till that remembered. Chapter three: the storefront that reached further.",
    },
    {
      type: "paragraph",
      text: "The stall wasn't failing. It was capped — by a notebook, a cash box, and the hours in a day. Growth needed records, and records needed a system. That's the moment most stall owners face: keep the ceiling, or build a floor that can hold more.",
    },
    {
      type: "heading",
      text: "Chapter 2 — The Decision",
    },
    {
      type: "paragraph",
      text: "When the owner went looking for a till, the checklist was short and specific: it had to run on her phone, take M-Pesa the way customers pay (a tap, not an app-switching ceremony), and count stock without a spreadsheet. The POS rankings she read scored exactly those three things — native M-Pesa first, setup speed second.",
    },
    {
      type: "paragraph",
      text: "The first afternoon was the whole transition: products scanned in, prices set, a test sale rung. By evening the till had a memory the notebook never did — and the stall had a first M-Pesa sale under its belt, auto-credited, no manual log.",
    },
    {
      type: "heading",
      text: "Chapter 3 — The First Week",
    },
    {
      type: "list",
      items: [
        "Day 1 — products and prices in; first M-Pesa sale before closing.",
        "Day 2 — closing the shift takes minutes; the numbers agree for once.",
        "Day 3 — the storefront is live; the link goes on WhatsApp.",
        "Day 4 — a regular orders for pickup before she even walks over.",
        "Day 7 — stock is honest in both places, and the notebook retires.",
      ],
    },
    {
      type: "heading",
      text: "Chapter 4 — The Storefront",
    },
    {
      type: "paragraph",
      text: "The storefront didn't replace the stall — it opened a second door into it. Customers order for pickup, prices are always the real ones, and the stock count is shared with the counter, so the website can't promise what the shelf already sold. One shop, two doors, one number.",
    },
    {
      type: "image",
      src: "/blog/stall-to-store-before-after.svg",
      alt: "Before and after: the stall era of cash-only, notebook ledgers, night counting, and a WhatsApp-album shop, versus the store era of native M-Pesa, one honest inventory, closing in minutes, and a real storefront",
      caption:
        "Same shop, same stock — the tools finally fit the ambition.",
    },
    {
      type: "heading",
      text: "Chapter 5 — What Changed",
    },
    {
      type: "table",
      headers: ["The stall era", "The store era"],
      rows: [
        [
          "Cash only; M-Pesa meant a personal number and a manual log",
          "Native M-Pesa — one tap, auto-credited, in the till record",
        ],
        [
          "A notebook ledger and stock that was 'probably fine'",
          "One honest inventory shared by till, web, and reports",
        ],
        [
          "Ninety minutes of counting at close",
          "A shift that balances itself in minutes",
        ],
        [
          "A WhatsApp-album 'online shop' with prices in captions",
          "A real storefront where orders land in the till record",
        ],
        [
          "Suppliers trusted a guess; growth had no paperwork",
          "Numbers that open doors — suppliers, lenders, a second branch",
        ],
      ],
    },
    {
      type: "heading",
      text: "The Lesson",
    },
    {
      type: "paragraph",
      text: "The stall didn't become a bigger ERP. It became a better shop. The tools changed in an afternoon; the habits took a week — ring every sale, read the numbers, let the storefront share the shelf. That's the whole journey: not a project, but an afternoon, repeated until it's routine.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Growth isn't always a bigger system. Sometimes it's one shop, one till, and an online storefront that finally matches what's on the shelf. If your business is running on a notebook and a prayer, the first afternoon is closer than you think.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "The journey from stall to store is a journey from 'roughly' to 'exactly' — exact sales, exact stock, exact payments, exact reach. It starts with one afternoon and one till that runs on the phone in your hand. The notebook retires, the numbers get honest, and the shop finally has a floor that can hold more.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "How to Grow a Mini-Mart in Kenya",
          href: "/blog/how-to-grow-a-mini-mart-in-kenya",
          blurb: "What comes after the stall — the systems that scale a real shop.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "The first afternoon, step by step — till, products, M-Pesa, eTIMS.",
        },
        {
          label: "Online + Physical: One Inventory",
          href: "/blog/online-physical-one-inventory",
          blurb: "Why the storefront and the shelf share one honest number.",
        },
        {
          label: "5 Signs You've Outgrown Your POS",
          href: "/blog/5-signs-youve-outgrown-your-pos",
          blurb: "How to tell when the tool — not the shop — is the ceiling.",
        },
        {
          label: "Choosing the Right POS: Kiosk.ke vs. Odoo",
          href: "/blog/choosing-the-right-pos-kiosk-vs-odoo",
          blurb: "The balanced guide to picking the platform for your journey.",
        },
      ],
    },
  ],
};

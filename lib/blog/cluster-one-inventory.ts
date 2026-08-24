import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const ONE_INVENTORY_ARTICLE: BlogArticle = {
  slug: "online-physical-one-inventory",
  title: "Online + Physical: One Inventory (Stop Selling What You Don't Have)",
  description:
    "How a single stock count across your web shop and counter stops overselling, ghost stock, and late-night spreadsheet reconciliations.",
  category: "Inventory",
  publishedAt: "2026-07-15",
  updatedAt: "2026-08-24",
  tags: ["Inventory", "Omnichannel", "Retail", "Kenya", "Storefront"],
  keywords: [
    "one inventory online physical",
    "omnichannel stock Kenya",
    "till and web shop same stock",
    "overselling storefront",
    "inventory reconciliation",
    "live stock storefront",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "set-up-a-pos-in-30-minutes",
    "from-stall-to-store-a-retailers-journey",
    "what-hardware-do-you-actually-need",
    "why-m-pesa-integration-matters",
    "how-to-grow-a-mini-mart-in-kenya",
  ],
  faqs: [
    {
      question: "What does 'one inventory' mean?",
      answer:
        "Your till and your online storefront share the same stock count. A sale at the counter decrements it, a web order decrements the same number, and a received supply increments it — there is only one number to be right about.",
    },
    {
      question: "How do online and counter sales stay in sync?",
      answer:
        "They don't need syncing — they read and write the same count. Because the storefront pulls stock from the same catalog as the till, a counter sale is reflected online the instant it closes.",
    },
    {
      question: "Can I sell the same item in both channels?",
      answer:
        "Yes, and that's the point. One count means the last unit can only be sold once — if the till sells it first, the storefront immediately shows the reduced stock instead of taking an order you can't fulfil.",
    },
    {
      question: "Do I still need to reconcile stock at night?",
      answer:
        "No. Nightly spreadsheet matching exists to fix the gap between two separate lists. With one count, the till, the web shop, and your reports all agree by construction.",
    },
    {
      question: "Can customers see live stock on my storefront?",
      answer:
        "Yes — the stock status a customer sees online comes from the same count the till uses, so 'in stock' means the same thing in both places.",
    },
    {
      question: "What happens if I keep two separate systems?",
      answer:
        "That's exactly how overselling and ghost stock happen: the website shows 10 while the shelf has 2, and someone has to reconcile the difference by hand. Two lists always drift; one number can't.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "The moment a shop starts selling in two places — at the counter and on a web storefront — a question appears that no shopkeeper asked for: which list is the truth? The one on the till? The one on the website? The one in the notebook? For shops that started digital with two separate systems, that question gets answered the expensive way — at midnight, with a calculator and a headache.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The fix isn't a better way to reconcile two lists. It's having one list. When the till and the storefront share a single stock count, overselling becomes impossible, ghost stock stops existing, and the nightly reconciliation ritual quietly disappears.",
    },
    {
      type: "heading",
      text: "1. The Two-Number Trap",
    },
    {
      type: "paragraph",
      text: "Here's how it usually starts: the shop adds an online storefront, but the web shop keeps its own little stock list while the till keeps its own too. Nothing is wrong at first — until a Saturday sale and a web order meet in the middle of the same last unit. The website says 1 left. The shelf says sold. Somebody has to apologise to a customer.",
    },
    {
      type: "paragraph",
      text: "That's the two-number trap: separate counts that drift apart, then demand reconciliation — usually late at night, from memory, with a pile of receipts. The more channels you add, the more lists you juggle, and the more certain the mismatch becomes.",
    },
    {
      type: "heading",
      text: "2. One Count, Everywhere",
    },
    {
      type: "paragraph",
      text: "Kiosk treats inventory as a single number. The till, the storefront, supplier deliveries, and stock takes all read and write the same count:",
    },
    {
      type: "image",
      src: "/blog/one-inventory-sync.svg",
      alt: "One shared stock number fed by counter sales, web orders, supply receipts, and stock takes — with overselling and ghost stock eliminated",
      caption:
        "Every channel reads and writes the same number — nothing reconciles at midnight because nothing drifts.",
    },
    {
      type: "list",
      items: [
        "A sale at the counter decrements the count — and the storefront sees it instantly.",
        "A web order decrements the same count — the shelf next to the till already knows.",
        "A received supply increments it — once, and every channel benefits.",
        "A stock take corrects it — and both channels inherit the correction.",
      ],
    },
    {
      type: "heading",
      text: "3. What One Count Stops",
    },
    {
      type: "list",
      items: [
        "Overselling — the last unit can only be sold once; the second channel sees the truth immediately.",
        "Ghost stock — 'shows 10, shelf has 2' is a two-list problem; one number can't have it.",
        "Midnight reconciliation — the shift balances itself because the sale is the record.",
        "Price drift — change a price once and both the till and the storefront show the new number.",
      ],
    },
    {
      type: "heading",
      text: "4. Same Product, Same Number — Counter and Web",
    },
    {
      type: "paragraph",
      text: "Watch one product move through both channels: a customer buys the last cooking oil at the counter at 09:12; at 09:13, the storefront shows 23 — not 24, not 'probably fine' — because the storefront pulls its stock from the same count the till just wrote to.",
    },
    {
      type: "image",
      src: "/blog/one-inventory-storefront.svg",
      alt: "The same cooking oil shown at the counter and on the storefront: the till sale drops the shared count and the web card shows 23 in the same second",
      caption:
        "A counter sale at 09:12, a storefront that shows 23 at 09:13 — one count, both places.",
    },
    {
      type: "paragraph",
      text: "And when a web order for pickup lands at 14:30, it fulfils from the same number. No double-counting, no 'did I sell this twice?' — just one count moving honestly between two channels.",
    },
    {
      type: "heading",
      text: "5. What This Looks Like When You Run the Shop",
    },
    {
      type: "paragraph",
      text: "For the shopkeeper, one inventory changes the daily rhythm:",
    },
    {
      type: "list",
      items: [
        "Closing time is faster — cash, M-Pesa, and web orders all land in the same till record.",
        "Restocking is clearer — the low-stock list comes from the same count customers see online.",
        "Expansion is easier — a second branch is one more reader of the same system, not one more spreadsheet to reconcile.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "The test for any POS: sell something at the counter, then check your web shop. If the number already changed, you have one inventory. If it hasn't, you have homework.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Two channels deserve one number, not two lists. When the till and the storefront share inventory, you stop selling what you don't have, stop counting what you sold, and stop reconciling what never drifted. That's the whole promise of online + physical, one inventory.",
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
          blurb: "Get the till and storefront live the same afternoon — one stock count included.",
        },
        {
          label: "How to Grow a Mini-Mart in Kenya",
          href: "/blog/how-to-grow-a-mini-mart-in-kenya",
          blurb: "From surviving to scaling, with honest stock control at the centre.",
        },
        {
          label: "What Hardware Do You Actually Need?",
          href: "/blog/what-hardware-do-you-actually-need",
          blurb: "Phone, scanner, printer — the only kit a Kenyan counter needs.",
        },
        {
          label: "Why M-Pesa Integration Matters",
          href: "/blog/why-m-pesa-integration-matters",
          blurb: "Native mobile money that lands in the same till record as cash.",
        },
        {
          label: "From Stall to Store: A Retailer's Journey",
          href: "/blog/from-stall-to-store-a-retailers-journey",
          blurb: "One shop, one till, one storefront — the growth story in practice.",
        },
      ],
    },
  ],
};

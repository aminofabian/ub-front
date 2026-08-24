import type { BlogArticle } from "./types";

/**
 * Full, detailed replacement for the listed-only spoke of the same slug —
 * all existing cross-links keep working.
 */
export const POS_HARDWARE_ARTICLE: BlogArticle = {
  slug: "what-hardware-do-you-actually-need",
  title: "What Hardware Do You Actually Need for a POS in Kenya?",
  description:
    "Phone, scanner, printer — a no-nonsense hardware checklist for a Kenyan retail counter. Start with the phone you own, upgrade when the queue demands it.",
  category: "Hardware",
  publishedAt: "2026-07-16",
  updatedAt: "2026-08-24",
  tags: ["Hardware", "POS", "Setup", "Kenya", "Scanner"],
  keywords: [
    "POS hardware Kenya",
    "POS scanner Kenya",
    "receipt printer Kenya",
    "POS on a phone",
    "barcode scanner Kenya",
    "POS setup hardware",
    "receipt printer thermal",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "set-up-a-pos-in-30-minutes",
    "why-m-pesa-integration-matters",
    "why-kiosk-beats-odoo-for-kenyan-shops",
    "top-10-pos-systems-kenya-2026",
    "barcode-search-kenya-lookup-guide",
  ],
  faqs: [
    {
      question: "Do I need a computer or a dedicated POS terminal?",
      answer:
        "No. A phone or tablet is the whole till — it runs the cashier, tracks stock, and takes M-Pesa. A dedicated terminal is an upgrade, not a requirement.",
    },
    {
      question: "Which barcode scanner should I buy?",
      answer:
        "Start with the phone camera — it's free and built in. Add a USB scanner for a fixed counter, or a Bluetooth scanner if you move around the shop (restocking, receiving supplies).",
    },
    {
      question: "Do I need a receipt printer?",
      answer:
        "Not to start — digital receipts work from day one. When the counter gets busy and customers expect paper, a thermal printer (no ink) is the right add-on.",
    },
    {
      question: "Can I use the POS with only my phone?",
      answer:
        "Yes, completely. Phone-only setups are the norm for most new shops: the camera scans, M-Pesa is built in, and offline cash sales sync when the network returns.",
    },
    {
      question: "How much should I spend on POS hardware?",
      answer:
        "As little as KSh 0 to start — the phone in your pocket. A scanner and a thermal printer together are a modest one-time cost that pays off once your queue moves faster than your fingers.",
    },
    {
      question: "Should I buy hardware before or after setup?",
      answer:
        "After. Set up the software first, take your first sales with the camera, and only then buy the tools your actual counter needs. Hardware is an upgrade, not a prerequisite.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Walk into the wrong POS conversation and you'll hear about terminal walls, kitchen displays, and drawers of proprietary hardware. Walk into a Kenyan shop and you'll see the truth: a phone on the counter, a customer's phone paying, and the whole business running on the screen in someone's hand. This guide is the honest version — what hardware you actually need, in the order you actually need it.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The promise: you can run a full till — cash, M-Pesa, stock, storefront — with the phone you already own. Everything else on this page is an upgrade you earn by getting busy, not a prerequisite to start.",
    },
    {
      type: "heading",
      text: "1. The Till: a Phone or Tablet (You Already Have One)",
    },
    {
      type: "paragraph",
      text: "The software is the POS; your phone is the counter. A phone or tablet runs the cashier, scans barcodes with its camera, sends M-Pesa STK pushes, and keeps selling — even when the network drops, with cash sales that sync when you reconnect.",
    },
    {
      type: "image",
      src: "/blog/pos-hardware-basics.svg",
      alt: "The hardware that matters: a phone as the till, a barcode scanner as the first upgrade, a thermal receipt printer as the second, and nice-to-haves like a cash drawer",
      caption:
        "Phone first, scanner second, printer third — and only buy after the software is live.",
    },
    {
      type: "paragraph",
      text: "A tablet is a genuine comfort upgrade (bigger tiles, easier for two people to watch), but it's optional. Start with what's in your pocket; move to a tablet when the counter becomes a permanent station.",
    },
    {
      type: "heading",
      text: "2. First Upgrade: a Barcode Scanner",
    },
    {
      type: "paragraph",
      text: "Scanning beats typing at the till — a scan takes a second; a name takes ten. The good news is you already own the first scanner: your phone's camera. The second step is a dedicated scanner, and there are three flavours:",
    },
    {
      type: "image",
      src: "/blog/pos-hardware-scanner-options.svg",
      alt: "Three barcode scanning options: the built-in phone camera for starters, a USB scanner for a fixed counter, and a Bluetooth scanner for moving around the shop",
      caption:
        "Camera to start, USB for a fixed counter, Bluetooth for movement. All three work with the same till.",
    },
    {
      type: "table",
      headers: ["Option", "Best for", "Why"],
      rows: [
        [
          "Phone camera",
          "Every new shop",
          "Free, built in, always with you — point and scan.",
        ],
        [
          "USB scanner",
          "One fixed counter",
          "Plug in and scan instantly — the queue stops waiting on typing.",
        ],
        [
          "Bluetooth scanner",
          "Shops that move",
          "Cable-free scanning while restocking or receiving supplies.",
        ],
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "Start with the camera. If your queue starts moving faster than your fingers, that's the moment a dedicated scanner pays for itself — not before.",
    },
    {
      type: "heading",
      text: "3. Second Upgrade: a Receipt Printer",
    },
    {
      type: "paragraph",
      text: "Digital receipts work from day one — shared on WhatsApp or shown on screen. A thermal receipt printer is the upgrade for busy counters where customers expect paper in hand. 'Thermal' is the word that matters: it prints without ink, so there's no cartridge to refill and no smudging.",
    },
    {
      type: "paragraph",
      text: "Most shops do fine with a compact 58mm or 80mm thermal printer that pairs with the till over Bluetooth or USB.",
    },
    {
      type: "heading",
      text: "4. Nice-to-Haves (Skip Until You Need Them)",
    },
    {
      type: "list",
      items: [
        "Cash drawer — unlocks with a sale; useful once cash handling is a daily routine.",
        "Stand or tablet holder — frees your hands at the counter; nice, not necessary.",
        "Label printer — only when you start printing shelf labels for a big catalogue.",
        "Second screen or kitchen display — irrelevant until you have a dedicated kitchen or busy deli counter.",
      ],
    },
    {
      type: "heading",
      text: "5. The Budget Reality",
    },
    {
      type: "table",
      headers: ["Item", "Typical cost", "Worth it?"],
      rows: [
        [
          "Phone / tablet (yours)",
          "KSh 0",
          "The whole till — this is where you start.",
        ],
        [
          "Phone camera scanning",
          "Free",
          "Built in — use it first.",
        ],
        [
          "USB scanner",
          "Modest one-time cost",
          "Yes, once the counter is fixed and busy.",
        ],
        [
          "Bluetooth scanner",
          "Slightly more than USB",
          "Yes, if you restock or receive away from the till.",
        ],
        [
          "Thermal receipt printer",
          "Modest one-time cost",
          "Yes, once customers expect paper receipts.",
        ],
        [
          "Cash drawer",
          "Cheap add-on",
          "Only once cash is a daily habit.",
        ],
      ],
    },
    {
      type: "heading",
      text: "6. The Mistake to Avoid: Buying Before Setup",
    },
    {
      type: "paragraph",
      text: "The most common hardware mistake isn't buying the wrong scanner — it's buying anything at all before the software is live. Set up the till, add your products, take your first sales with the camera. Then watch your actual counter: if the queue waits on typing, buy a scanner. If customers ask for paper, buy a printer. Let the shop tell you what it needs.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "Hardware is an upgrade, not a prerequisite. The shop that starts selling today with a phone beats the shop that's still waiting for the perfect terminal setup next month.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "You don't need a wall of terminals to sell in Kenya. You need a phone — yours — running a till with native M-Pesa, a camera that scans, and the discipline to ring every sale. Add a scanner when the queue asks for it, a printer when customers ask for paper, and nothing before the software is live. Start today; upgrade when you're busier.",
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
          blurb: "Get your till live the same afternoon — no hardware required to start.",
        },
        {
          label: "Why M-Pesa Integration Matters",
          href: "/blog/why-m-pesa-integration-matters",
          blurb: "Native mobile money at the till — one tap, auto-credited.",
        },
        {
          label: "Barcode Search in Kenya: Look Up Any Product",
          href: "/blog/barcode-search-kenya-lookup-guide",
          blurb: "Know what's on the shelf before you ring it up.",
        },
        {
          label: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
          href: "/blog/why-kiosk-beats-odoo-for-kenyan-shops",
          blurb: "A turnkey till on your phone versus a months-long ERP setup.",
        },
        {
          label: "Scan barcodes at the till (Help Center)",
          href: "/help/merchants/point-of-sale/scan-barcodes-at-the-till",
          blurb: "USB, Bluetooth, or camera scanning — the detailed walkthrough.",
        },
      ],
    },
  ],
};

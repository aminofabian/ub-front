import type { BlogArticle } from "./types";

export const BARCODE_LOOKUP_PILLAR_SLUG = "barcode-search-kenya-lookup-guide";

export const BARCODE_LOOKUP_ARTICLES: BlogArticle[] = [
  {
    slug: BARCODE_LOOKUP_PILLAR_SLUG,
    title: "Barcode Search in Kenya: Look Up Any Product by Barcode or Name",
    description:
      "Look up any product by barcode or name in Kenya — EAN-13, UPC, GTIN. Check prices and stock across Kiosk stores with the free kiosk.ke barcode search.",
    category: "Guides",
    publishedAt: "2026-08-22",
    updatedAt: "2026-08-24",
    tags: ["Barcode", "Kenya", "Product search", "EAN-13", "GTIN", "UPC"],
    keywords: [
      "barcode search Kenya",
      "barcode lookup Kenya",
      "EAN-13 Kenya",
      "GS1 Kenya 616",
      "find product by barcode",
      "check price by barcode",
      "UPC lookup",
      "product name search",
    ],
    author: "Kiosk",
    relatedSlugs: [
      "set-up-a-pos-in-30-minutes",
      "top-10-pos-systems-kenya-2026",
      "online-physical-one-inventory",
      "what-hardware-do-you-actually-need",
      "why-kiosk-beats-odoo-for-kenyan-shops",
    ],
    faqs: [
      {
        question: "How do I look up a barcode in Kenya?",
        answer:
          "Open kiosk.ke/barcode, type the barcode digits or scan them with your phone camera, and search. It's free, works on any phone, and needs no sign-up.",
      },
      {
        question: "What is Kenya's barcode country prefix?",
        answer:
          "616. It's the GS1 country prefix assigned to Kenya, and it appears at the start of EAN-13 barcodes registered through GS1 Kenya.",
      },
      {
        question: "Can I search for a product without a barcode?",
        answer:
          "Yes. The same search box handles product names — type 'cooking oil' or 'pishori rice' and Kiosk.ke searches product names across its store catalogue.",
      },
      {
        question: "What does a barcode lookup show me?",
        answer:
          "The product name, a typical selling price, stock availability across Kiosk-powered stores, and a copyable barcode you can reuse in your own catalog.",
      },
      {
        question: "Why do the same products cost different amounts in different shops?",
        answer:
          "Shopkeepers set their own prices based on where they buy stock and what their customers pay. A lookup shows you what's typical, so you can spot a fair price before you pay.",
      },
      {
        question: "Is barcode lookup really free?",
        answer:
          "Yes — no sign-up, no app install, no limits. If you later want the same lookup inside a till at your counter, Kiosk POS includes barcode scanning as part of the product catalog.",
      },
    ],
    body: [
      {
        type: "paragraph",
        text: "Every packaged product in a Kenyan shop carries a tiny pattern of stripes — on the cooking oil, the detergent, the rice packet, the biscuit pack. Most of us never think about it, but that pattern is the product's fingerprint: a number that means the same thing in Nairobi, Mombasa, Nakuru, and anywhere else in the world. It's called a barcode, and once you can read it, shopping stops being guesswork.",
      },
      {
        type: "callout",
        tone: "info",
        text: "This guide is built around a free tool we made: kiosk.ke/barcode. Type a barcode or a product name and it searches across Kiosk-powered stores. No sign-up, no app install — it just works. The rest of this article shows you what barcodes are, how to read them, and why looking one up is one of the handiest tricks in Kenyan retail.",
      },
      {
        type: "heading",
        text: "1. What Is a Barcode, Really?",
      },
      {
        type: "paragraph",
        text: "A barcode is a machine-readable way of writing a number. The stripes encode digits that identify a specific product — not its category, not its brand in general, but that exact item: that size, that pack, that variant. Two products can sit side by side and look identical, yet carry different barcodes because they're different sizes or different formulations.",
      },
      {
        type: "image",
        src: "/blog/barcode-guide-hero.svg",
        alt: "A phone camera scanning a product's barcode and instantly showing a result card with the product name, price in KES, and stock availability",
        caption:
          "One scan and the stripes become a product card: name, typical price, and stock — no typing required.",
      },
      {
        type: "paragraph",
        text: "When you scan a barcode at a till, the till doesn't 'see' the product — it sees a number, then looks that number up. That lookup is exactly what kiosk.ke/barcode does in your browser, for free: point your camera or type the digits, and the number becomes a product.",
      },
      {
        type: "heading",
        text: "2. Anatomy of an EAN-13: Kenya's 616 Prefix",
      },
      {
        type: "paragraph",
        text: "The most common barcode on Kenyan shelves is EAN-13 — 13 digits that follow a global standard run by GS1. The structure isn't random; every group of digits means something, and the first three are the most fun: they reveal where the product's barcode was registered.",
      },
      {
        type: "image",
        src: "/blog/barcode-anatomy.svg",
        alt: "Anatomy of an EAN-13 barcode: the Kenya country prefix 616, the manufacturer digits, the item reference, and the check digit",
        caption:
          "616 is Kenya's GS1 country prefix — the first clue in every EAN-13 barcode registered here.",
      },
      {
        type: "list",
        items: [
          "616 — Kenya's GS1 country prefix. Barcodes registered through GS1 Kenya start with these digits.",
          "Manufacturer block — the digits that identify the company behind the brand.",
          "Item reference — which specific product: size, pack, and variant.",
          "Check digit — built-in math that lets a scanner reject mistyped or counterfeit-looking numbers.",
        ],
      },
      {
        type: "heading",
        text: "3. Barcode Formats You'll Meet in Kenya",
      },
      {
        type: "table",
        headers: ["Format", "Digits", "Where you'll see it"],
        rows: [
          [
            "EAN-13",
            "13",
            "Everyday packaged goods — groceries, toiletries, household items. The default on Kenyan shelves.",
          ],
          [
            "UPC-A",
            "12",
            "Mostly imported goods from North America; a 13-digit EAN can be derived from it.",
          ],
          [
            "EAN-8",
            "8",
            "Small packages where 13 digits won't fit — chewing gum, small sachets.",
          ],
          [
            "GTIN-14 / ITF-14",
            "14",
            "Cases and cartons used in wholesale and distribution — the box of 24, not the single item.",
          ],
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "You don't need to memorize any of this. The kiosk.ke lookup accepts EAN-13, UPC, and GTIN digits automatically — and if you'd rather just type a product name, that works too.",
      },
      {
        type: "heading",
        text: "4. How to Look Up a Barcode in Kenya",
      },
      {
        type: "paragraph",
        text: "Open kiosk.ke/barcode on any phone. The search box auto-detects what you're doing: digits only? It treats them as a barcode and looks them up. Words? It searches product names. Either way, you get the same result card — product, typical price, and stock.",
      },
      {
        type: "image",
        src: "/blog/barcode-lookup-kiosk-ke.svg",
        alt: "The kiosk.ke/barcode tool: type or scan a barcode, auto-detect digits versus names, and get a product result with price, stock, and a copyable barcode",
        caption:
          "kiosk.ke/barcode — one box handles barcode digits, camera scans, and plain product names.",
      },
      {
        type: "list",
        items: [
          "Shoppers — check a typical price before you pay, and see stock before you travel to a store.",
          "Shopkeepers — match a barcode to a product name while building your catalog, without typing.",
          "Suppliers — confirm the exact item in an order instead of trusting a lookalike package.",
          "Anyone with a shelf of unlabeled stock — scan the package and learn what you're actually holding.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Try it right now: grab any packaged product — cooking oil, a drink, a biscuit — and look up its barcode at kiosk.ke/barcode. The stripes you've passed a thousand times finally talk back.",
      },
      {
        type: "heading",
        text: "5. Know Before You Pay: Why Lookup Beats Guessing",
      },
      {
        type: "paragraph",
        text: "Here's the scenario: the same bottle of cooking oil sits on three shelves in the same estate at three different prices. Which one is fair? Without identifying the product precisely, you're comparing names and hoping they mean the same thing. With a barcode, there's no hoping — the number is the same, so the comparison is honest.",
      },
      {
        type: "image",
        src: "/blog/barcode-kenya-shelf.svg",
        alt: "Guessing between three similar bottles versus scanning the barcode to reveal the typical price and compare stores honestly",
        caption:
          "Same barcode, honest comparison. Lookup turns 'which price is fair?' into a fact instead of a gamble.",
      },
      {
        type: "paragraph",
        text: "That's the quiet superpower of barcode lookup: it removes the ambiguity from shopping. Once you know the exact item, prices become comparable, stock becomes verifiable, and the checkout line stops being a place where surprises happen.",
      },
      {
        type: "heading",
        text: "6. Barcodes at Your Own Counter",
      },
      {
        type: "paragraph",
        text: "If you run a shop, barcodes aren't just for checking prices — they're how your till stays honest. Every scan at checkout updates stock automatically, prices are always the ones you set, and 'missing barcodes' stops being a mystery because you can see exactly which items still need one.",
      },
      {
        type: "list",
        items: [
          "Faster checkout — a scan takes a second; typing a name takes ten.",
          "Honest stock — every sale decrements the shelf, in real time.",
          "Cleaner catalog — one barcode per product means no duplicate entries for the same item.",
          "Better supplier orders — order by barcode, receive by barcode, and the two always match.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "The same lookup that powers kiosk.ke/barcode lives inside Kiosk POS. Set up your till, scan your best sellers once, and watch your catalog build itself — with prices and stock attached.",
      },
      {
        type: "heading",
        text: "Bottom Line",
      },
      {
        type: "callout",
        tone: "tip",
        text: "A barcode is a product's fingerprint, and 616 is Kenya's slice of the global numbering system. Knowing how to read one — or letting kiosk.ke/barcode read it for you — turns guesswork into facts: fair prices, verifiable stock, and a catalog that builds itself. Scan once, know everything.",
      },
      {
        type: "paragraph",
        text: "Read next:",
      },
      {
        type: "links",
        items: [
          {
            label: "Try the Barcode Lookup Tool",
            href: "/barcode",
            blurb: "kiosk.ke/barcode — free product search by barcode or name, no sign-up.",
          },
          {
            label: "Set Up a POS in Kenya in 30 Minutes",
            href: "/blog/set-up-a-pos-in-30-minutes",
            blurb: "Your till, storefront, M-Pesa, and eTIMS live the same afternoon.",
          },
          {
            label: "What Hardware Do You Actually Need?",
            href: "/blog/what-hardware-do-you-actually-need",
            blurb: "Phone, scanner, printer — the only kit a Kenyan counter really needs.",
          },
          {
            label: "Online + Physical: One Inventory",
            href: "/blog/online-physical-one-inventory",
            blurb: "One stock count across your web shop and your counter.",
          },
          {
            label: "Top 10 POS Systems in Kenya (2026)",
            href: "/blog/top-10-pos-systems-kenya-2026",
            blurb: "The ranking that compares Kenya's POS platforms on M-Pesa, eTIMS, and fit.",
          },
        ],
      },
    ],
  },
];

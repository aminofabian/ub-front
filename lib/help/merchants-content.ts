import type { HelpArticle, HelpCategoryDef } from "./types";

export const MERCHANT_CATEGORIES: HelpCategoryDef[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Create your shop, claim a subdomain, and go live.",
    icon: "rocket",
  },
  {
    slug: "point-of-sale",
    title: "Point of sale",
    description: "Scan, sell, print receipts, and run the till.",
    icon: "scan",
  },
  {
    slug: "mpesa-payments",
    title: "M-Pesa & payments",
    description: "STK Push, cash, split payments, and settlements.",
    icon: "smartphone",
  },
  {
    slug: "inventory",
    title: "Inventory & stock",
    description: "Catalog, barcodes, stock takes, and transfers.",
    icon: "package",
  },
  {
    slug: "suppliers-supplies",
    title: "Suppliers & supplies",
    description: "Vendors, receiving stock, costs, and what you owe.",
    icon: "truck",
  },
  {
    slug: "storefront",
    title: "Online storefront",
    description: "Yourshop.kiosk.ke, branding, and web orders.",
    icon: "store",
  },
  {
    slug: "staff-branches",
    title: "Staff & branches",
    description: "Users, roles, PIN login, and multi-branch stock.",
    icon: "users",
  },
];

export const MERCHANT_ARTICLES: HelpArticle[] = [
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "create-your-kiosk-shop",
    title: "Create your Kiosk shop",
    description:
      "Sign up, name your business, and claim yourshop.kiosk.ke in a few minutes.",
    updatedAt: "2026-07-01",
    tags: ["signup", "subdomain", "onboarding"],
    popular: true,
    relatedSlugs: [
      "why-kiosk-stands-out",
      "claim-your-subdomain",
      "invite-your-first-staff",
    ],
    body: [
      {
        type: "paragraph",
        text: "Kiosk is built for shop counters in Kenya. You can create a business, stock a catalog, and start selling from the cashier screen the same day.",
      },
      {
        type: "steps",
        items: [
          "Open kiosk.ke and choose Get started.",
          "Enter your business name, phone, and email.",
          "Verify your email, then sign in to the dashboard.",
          "Complete the short onboarding flow to claim your subdomain.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Use the business name customers already know — it appears on receipts and your online storefront.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Is Kiosk free to start?",
            answer:
              "Yes. You can create a shop and start selling without paying upfront. Pricing plans are listed on the kiosk.ke home page.",
          },
          {
            question: "Do I need a custom domain on day one?",
            answer:
              "No. Every shop gets a free yourshop.kiosk.ke subdomain. Add a custom domain later from Business → Domains.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "why-kiosk-stands-out",
    title: "Why Kiosk stands out from other POS",
    description:
      "Built for Kenyan counters: M-Pesa STK, offline sales, one stock count for till and storefront — without bolt-on modules.",
    updatedAt: "2026-07-21",
    tags: [
      "POS Kenya",
      "comparison",
      "M-Pesa",
      "offline",
      "storefront",
      "why Kiosk",
    ],
    popular: true,
    relatedSlugs: [
      "create-your-kiosk-shop",
      "sell-when-offline",
      "accept-mpesa-stk",
      "set-up-your-online-store",
      "why-record-supplies",
    ],
    body: [
      {
        type: "paragraph",
        text: "Most POS tools were designed for other markets and bolted onto Kenya later — or they sell you a till, then charge again for stock, suppliers, and an online shop. Kiosk is built for the counter you already run: scan barcodes, take M-Pesa, keep selling when the network drops, and share one catalog with yourshop.kiosk.ke.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "One system at the till and online — not a cashier app plus a separate inventory spreadsheet plus a third storefront.",
      },
      {
        type: "heading",
        text: "What makes Kiosk different",
      },
      {
        type: "list",
        items: [
          "M-Pesa STK at the counter — send a prompt to the customer’s phone; no shouting till numbers across the shop.",
          "Offline-ready selling — cash sales continue when Wi‑Fi or mobile data drops; they sync when you reconnect.",
          "One stock truth — sales, supplies, transfers, and the online storefront share the same on-hand count.",
          "Storefront included — every shop gets yourshop.kiosk.ke with branding, so counter and online are not two catalogs.",
          "Supplies that update stock — post a delivery and quantities rise automatically; costs and payables stay attached to the vendor.",
          "Groups and variants — keep brands tidy (Coca-Cola → 300 ml / 500 ml) instead of a flat mess of near-duplicate products.",
          "Built with shop owners — barcode scan, split cash + M-Pesa, multi-branch transfers, and staff PIN login for shared tills.",
          "No module maze — barcode, M-Pesa, offline POS, inventory, suppliers, and analytics ship as one platform, not a shopping list of add-ons.",
        ],
      },
      {
        type: "heading",
        text: "Where generic POS often falls short in Kenya",
      },
      {
        type: "list",
        items: [
          "Weak or afterthought M-Pesa — or only “enter amount on the customer’s phone” without a proper STK flow from the till.",
          "Cloud-only tills that freeze when Safaricom/Airtel or Wi‑Fi blips during a rush.",
          "Inventory and e‑commerce sold separately, so stock on the shelf never matches the website.",
          "Receiving goods by manually editing stock, with no supplier bill or cost history.",
          "Designed for US/EU card rails first — Kenya’s cash + M-Pesa reality is secondary.",
        ],
      },
      {
        type: "heading",
        text: "Who Kiosk is for",
      },
      {
        type: "paragraph",
        text: "Kiosks, dukas, groceries, butcheries, and multi-branch shops that need a fast till today and a real online shop without hiring a systems integrator. Free to start on kiosk.ke — claim a subdomain and sell the same afternoon.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Is Kiosk only a cashier screen?",
            answer:
              "No. Cashier is the front door. Behind it you get catalog, supplies, stock takes, branches, staff roles, analytics, and a branded storefront on the same stock.",
          },
          {
            question: "Do I need extra apps for M-Pesa or inventory?",
            answer:
              "No. STK payments, inventory, suppliers, and the online shop are part of the same Kiosk workspace — not separate products you stitch together.",
          },
          {
            question: "What if the internet goes down mid-sale?",
            answer:
              "Keep taking cash sales offline. Complete M-Pesa when the network returns. Offline sales sync so stock and reports catch up.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "claim-your-subdomain",
    title: "Claim your subdomain",
    description:
      "Pick a unique yourshop.kiosk.ke address for your branded storefront.",
    updatedAt: "2026-07-01",
    tags: ["subdomain", "domain", "branding"],
    relatedSlugs: ["create-your-kiosk-shop", "set-up-your-online-store"],
    body: [
      {
        type: "paragraph",
        text: "Your subdomain is the public address for your online shop, for example mama-mboga.kiosk.ke. Choose something short, memorable, and close to your trading name.",
      },
      {
        type: "steps",
        items: [
          "During onboarding, enter the subdomain you want.",
          "Kiosk checks availability instantly.",
          "Confirm to reserve it for your business.",
          "Later, open Business → Domains if you want to connect a custom domain.",
        ],
      },
      {
        type: "list",
        items: [
          "Use letters, numbers, and hyphens only.",
          "Avoid spaces and special characters.",
          "Prefer the name customers already search for.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Changing a subdomain later can break shared links. Pick carefully the first time.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "add-your-first-products",
    title: "Add your first products",
    description:
      "Create product groups and variants so one brand (like Coca-Cola) stays tidy at the till, online, and in stock counts.",
    updatedAt: "2026-07-21",
    tags: ["products", "catalog", "groups", "variants", "barcode", "import"],
    popular: true,
    relatedSlugs: ["scan-barcodes-at-the-till", "run-a-stock-take", "how-to-add-products"],
    body: [
      {
        type: "paragraph",
        text: "Sales and your online storefront share one catalog. Before your first shift, add products so cashiers can scan instead of typing — and set them up as groups with variants whenever the same brand comes in more than one size, colour, or pack.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Default habit: create a Group for the brand or product line, then add Variants for each sellable SKU (300 ml, 500 ml, 1 L, Red, Blue, …). Use Single product only for one-off items that will never have siblings.",
      },
      {
        type: "heading",
        text: "Why groups and variants matter",
      },
      {
        type: "list",
        items: [
          "One place to find the brand — cashiers search “Coca-Cola” and pick 300 ml or 500 ml instead of hunting three separate products.",
          "Cleaner catalog — stock, pricing, and barcodes live on each variant, while the group holds the shared name and category.",
          "Variants inherit the group’s category — set Soft drinks once on the group; every size you add stays correctly classified.",
          "Storefront stays organized — shoppers see one product family with size options instead of a flat list of near-duplicates.",
          "Easier stock takes and reports — you count and sell by SKU, but browse by brand.",
        ],
      },
      {
        type: "heading",
        text: "Step 1 — Create a product group",
      },
      {
        type: "steps",
        items: [
          "Open Products in the dashboard, then choose Add / New product.",
          "At the top of the drawer, switch from Single product to Group.",
          "Enter the Group name (the brand or family — e.g. Coca-Cola).",
          "Pick Category and Department. Variants you add next will inherit this category.",
          "Tap Create group. The group itself is not sold at the till — the variants are.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-group.png",
        alt: "New product group drawer with Group selected, group name Coca-Cola, Soft drinks category, and Create group button",
        caption:
          "Toggle Group, name the brand, set category once — then Create group.",
      },
      {
        type: "heading",
        text: "Step 2 — Add variants under the group",
      },
      {
        type: "steps",
        items: [
          "Open the group you just created in Products.",
          "Choose Add variant (on the product detail panel).",
          "For each sellable size or option, enter a Variant name (e.g. 300 ml, 500 ml), sell price, and barcode if you have one.",
          "Use Add another variant to create several sizes in one go.",
          "Tap Create variants. Each variant becomes its own SKU with its own stock and barcode — still nested under the group.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-variants.png",
        alt: "Add variants drawer for Coca-Cola showing 300 ml and 500 ml rows with prices and Create 2 variants",
        caption:
          "Add every size or option as a variant under the group — each gets its own price and barcode.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Package sizes (tray, crate) are different: on a single product you can enable “Sell in different units” so a tray deducts shared parent stock. Option variants under a group (sizes/colours) usually keep their own stock. Pick the model that matches how you receive goods.",
      },
      {
        type: "heading",
        text: "When a single product is fine",
      },
      {
        type: "list",
        items: [
          "Truly unique items with no sizes or colours (e.g. one handmade craft).",
          "You will never add a sibling SKU under the same brand name.",
        ],
      },
      {
        type: "steps",
        items: [
          "Leave Single product selected.",
          "Enter name, price, barcode, and opening stock.",
          "Optionally enable Sell in different units for trays/crates of that same item.",
          "Or import many SKUs at once from Business → Import / CSV — then convert families into groups + variants as you tidy the catalog.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Avoid creating “Coca-Cola 300ml”, “Coca-Cola 500ml”, and “Coca-Cola 1L” as three unrelated single products. That duplicates search noise, breaks category inheritance, and makes the storefront harder to shop. Prefer one group + variants from day one.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I turn an existing single product into a group later?",
            answer:
              "Yes — open the product and use Add variant / Add sibling to grow a family under a parent. Starting as a group is cleaner when you already know sizes are coming.",
          },
          {
            question: "Do groups appear on the cashier?",
            answer:
              "Cashiers sell variants (the SKUs with prices and barcodes). Searching the brand name surfaces those variants under the group so checkout stays fast.",
          },
          {
            question: "What if an item has no barcode?",
            answer:
              "You can still sell it by searching the product or variant name on the cashier screen. Add the barcode later from the product detail when packaging arrives.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "open-the-cashier-for-the-first-time",
    title: "Open the cashier for the first time",
    description:
      "Launch the till on a phone, tablet, or desktop and take your first sale.",
    updatedAt: "2026-07-01",
    tags: ["cashier", "pos", "first sale"],
    relatedSlugs: ["scan-barcodes-at-the-till", "accept-mpesa-stk"],
    body: [
      {
        type: "paragraph",
        text: "The cashier screen is optimized for speed at the counter. Staff can sign in with a PIN on shared devices.",
      },
      {
        type: "steps",
        items: [
          "Sign in as staff or owner.",
          "Open Cashier from the main navigation.",
          "Add items by scanning or searching.",
          "Collect cash or send an M-Pesa STK request, then complete the sale.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I use cashier offline?",
            answer:
              "Yes. Kiosk is built to keep selling when the network drops. Offline sales sync when connectivity returns.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "scan-barcodes-at-the-till",
    title: "Scan barcodes at the till",
    description:
      "Use a USB or Bluetooth scanner, or the on-device camera, to ring up items fast.",
    updatedAt: "2026-07-01",
    tags: ["barcode", "scanner", "cashier"],
    popular: true,
    relatedSlugs: ["add-your-first-products", "apply-discounts-and-split-payments"],
    body: [
      {
        type: "paragraph",
        text: "Barcode scanning keeps queues short. Point the scanner at the barcode or use search when a code is missing or damaged.",
      },
      {
        type: "steps",
        items: [
          "Focus the cashier search / scan field.",
          "Scan the product barcode — it should appear in the cart.",
          "Adjust quantity if the customer takes more than one.",
          "Continue scanning until the cart is complete.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "If a scan does nothing, check that the barcode is saved on the product and that the scanner is in keyboard-wedge mode.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "apply-discounts-and-split-payments",
    title: "Apply discounts and split payments",
    description:
      "Reduce a line or cart total, and take part cash plus part M-Pesa.",
    updatedAt: "2026-07-01",
    tags: ["discount", "split payment", "cashier"],
    relatedSlugs: ["accept-mpesa-stk", "print-or-share-receipts"],
    body: [
      {
        type: "paragraph",
        text: "Promotions and mixed tenders are common at Kenyan counters. Kiosk lets you discount and split without leaving the sale.",
      },
      {
        type: "list",
        items: [
          "Apply a percentage or fixed discount when your role allows it.",
          "Split the remaining balance across cash and M-Pesa.",
          "Confirm each tender before completing the sale.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Discount permissions can be limited per staff role so only supervisors can approve large reductions.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "print-or-share-receipts",
    title: "Print or share receipts",
    description:
      "Issue a paper receipt or share a digital copy after checkout.",
    updatedAt: "2026-07-01",
    tags: ["receipt", "print", "cashier"],
    relatedSlugs: ["scan-barcodes-at-the-till", "sell-when-offline"],
    body: [
      {
        type: "paragraph",
        text: "After a successful sale, you can print to a connected receipt printer or share the receipt details with the customer.",
      },
      {
        type: "steps",
        items: [
          "Complete the sale on the cashier screen.",
          "Choose print if a thermal printer is connected.",
          "Or open the sale from Sales history to reprint later.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "sell-when-offline",
    title: "Sell when the network drops",
    description:
      "Keep ringing up cash sales offline; sync when connectivity returns.",
    updatedAt: "2026-07-01",
    tags: ["offline", "sync", "pos"],
    popular: true,
    relatedSlugs: ["accept-mpesa-stk", "open-the-cashier-for-the-first-time"],
    body: [
      {
        type: "paragraph",
        text: "Network outages should not stop the counter. Offline mode lets you continue cash sales and queue them for sync.",
      },
      {
        type: "list",
        items: [
          "Cash sales can continue while offline.",
          "M-Pesa STK needs a live connection — use cash or complete STK when the network returns.",
          "When you reconnect, pending sales sync to the dashboard and stock counts update.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Watch the connection indicator on the cashier screen before promising an M-Pesa payment.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "accept-mpesa-stk",
    title: "Accept M-Pesa with STK Push",
    description:
      "Send a payment prompt to the customer’s phone and confirm at the till.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "stk", "lipa na mpesa"],
    popular: true,
    relatedSlugs: ["troubleshoot-failed-stk", "apply-discounts-and-split-payments"],
    body: [
      {
        type: "paragraph",
        text: "STK Push asks the customer to enter their M-Pesa PIN on their phone. You do not need to read a till number aloud.",
      },
      {
        type: "steps",
        items: [
          "Build the cart and choose M-Pesa as the payment method.",
          "Enter the customer’s Safaricom number (usually 07… or 01…).",
          "Send the STK request and ask the customer to approve on their phone.",
          "Wait for confirmation on the cashier screen before handing over goods.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "What if the prompt never arrives?",
            answer:
              "Confirm the number is Safaricom, the phone has signal, and try again. See Troubleshoot a failed STK payment.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "troubleshoot-failed-stk",
    title: "Troubleshoot a failed STK payment",
    description:
      "Common reasons an STK request fails — and what to do next.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "stk", "troubleshooting"],
    relatedSlugs: ["accept-mpesa-stk", "sell-when-offline"],
    body: [
      {
        type: "paragraph",
        text: "Failed STK requests are usually about the phone number, network, PIN timeout, or insufficient balance — not a broken till.",
      },
      {
        type: "list",
        items: [
          "Double-check the MSISDN format and that it is a Safaricom line.",
          "Ask the customer to unlock their phone and watch for the prompt.",
          "If they cancel or time out, send a fresh request.",
          "If the network is down, take cash or complete the sale when online.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never mark a sale complete unless the till shows payment confirmed. Ask the customer to wait for the M-Pesa SMS.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "configure-payment-settings",
    title: "Configure payment settings",
    description:
      "Connect M-Pesa credentials and review how settlements appear in Kiosk.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "settings", "payments"],
    relatedSlugs: ["accept-mpesa-stk", "set-up-your-online-store", "accept-card-payments-paystack"],
    body: [
      {
        type: "paragraph",
        text: "Payment configuration is usually done once by the business owner or an admin. Staff then use STK from the cashier without seeing secrets.",
      },
      {
        type: "steps",
        items: [
          "Open Payments or Business settings (depending on your plan).",
          "Enter the M-Pesa / Lipa Na M-Pesa details provided for your shop.",
          "Save and run a small test sale on the cashier.",
          "Confirm the payment appears in sales history.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Only trusted admins should access payment credentials. Rotate keys if staff with access leave.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "accept-card-payments-paystack",
    title: "Accept card payments with Paystack",
    description:
      "Connect your own Paystack account so customers can pay by card on your storefront.",
    updatedAt: "2026-08-07",
    tags: ["paystack", "card", "online payments", "payments"],
    relatedSlugs: ["configure-payment-settings", "set-up-your-online-store"],
    body: [
      {
        type: "paragraph",
        text: "Paystack lets customers pay by card, bank transfer, or mobile money on a secure payment page. You connect your own Paystack account — money settles to your Paystack balance and then to your bank. Kiosk never holds the funds. Open Manage on the Paystack row in Payments → Settings for a link to the Paystack Dashboard (withdrawals happen there).",
      },
      {
        type: "heading",
        text: "Before you start",
      },
      {
        type: "list",
        items: [
          "Create a Paystack account at paystack.com and complete business verification.",
          "Find your API keys under Settings → API Keys & Webhooks in the Paystack dashboard.",
          "You get two pairs: test keys (pk_test_ / sk_test_) and live keys (pk_live_ / sk_live_).",
        ],
      },
      {
        type: "heading",
        text: "Connect Paystack in Kiosk",
      },
      {
        type: "steps",
        items: [
          "Open Settings → Payments in your Kiosk dashboard.",
          "On the Paystack card, choose Test or Production, then paste your public key and secret key (prefixes must match the environment).",
          "Save, then tap Test connection — it checks that the keys authenticate with Paystack.",
          "Activate the gateway when the test passes.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never mix key pairs: test keys with the Test environment and live keys with Production. Using a pk_test_ key under Production is rejected automatically.",
      },
      {
        type: "heading",
        text: "Register the webhook",
      },
      {
        type: "paragraph",
        text: "In the Paystack dashboard, open Settings → API Keys & Webhooks → Webhook URL and enter: {api-base}/webhooks/paystack — replacing {api-base} with your Kiosk API base URL. This is how Kiosk confirms payments and marks orders paid automatically.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Start with a small real test: place a low-value order on your storefront, pay with a test card, and confirm the order shows Paid. Then switch to live keys for real sales.",
      },
      {
        type: "paragraph",
        text: "Paystack appears on your storefront checkout as “Pay by card”. Customers are redirected to the Paystack page and returned to your checkout once payment is done. Secret keys are encrypted at rest; only admins with payment settings access can re-view them when editing the connection.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "how-to-add-products",
    title: "Add products: single, groups, and packages",
    description:
      "Add standalone items, group brands into variants, and sell trays and crates — with screenshots for every step.",
    updatedAt: "2026-08-24",
    tags: [
      "products",
      "catalog",
      "standalone",
      "single",
      "groups",
      "variants",
      "packages",
      "tray",
      "crate",
      "barcode",
      "pricing",
    ],
    relatedSlugs: [
      "add-your-first-products",
      "understand-stock-levels",
      "fix-missing-barcodes",
      "run-a-stock-take",
    ],
    body: [
      {
        type: "paragraph",
        text: "Your till and your online storefront share one catalog, so the way you add a product matters. This guide walks through every shape a product can take — a single item, a group with variants, and packages like trays or crates — with screenshots of the exact screens you will see.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Three quick rules: one-off item → Single product. Same brand in several sizes/colours → Group with variants. Same item sold loose and in trays → Single product with packages enabled.",
      },
      {
        type: "heading",
        text: "Single product vs group — what is the difference?",
      },
      {
        type: "list",
        items: [
          "Single (standalone) product: one name, one price, one barcode, its own stock. No siblings. Perfect for a one-off item you will never split into sizes.",
          "Group: a brand or family (e.g. Coca-Cola) that is not sold itself. Under it you add Variants — the sellable SKUs (300 ml, 500 ml, 1 L) that each carry their own price, barcode, and stock.",
          "Variants inherit the group's department and category, so you set classification once instead of repeating it.",
          "Cashiers and online shoppers search the brand name and pick a size — one clean entry instead of three near-duplicate products.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not create “Coca-Cola 300ml”, “Coca-Cola 500ml”, and “Coca-Cola 1L” as three separate single products. That splits stock, breaks category inheritance, and makes the storefront hard to shop. Use one group with variants instead.",
      },
      {
        type: "heading",
        text: "Add a single product",
      },
      {
        type: "steps",
        items: [
          "Open Products in the dashboard and tap New (top right).",
          "Leave Single product selected at the top of the drawer.",
          "Type the product name, pick Department, and optionally a Category.",
          "Fill Buying price (what you pay) and Sell price (what customers pay). Kiosk shows your margin as you type.",
          "Scan or type the Barcode — SKU fills automatically if you leave it blank.",
          "Set Opening qty to add stock right away, then tap Create.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-drawer.svg",
        alt: "Add product drawer with Single product selected, name Sunbest Cooking Oil 1 L, Grocery department, Cooking oils category, buying price 450, sell price 520, barcode, opening quantity 24, and Create button",
        caption:
          "The Add product drawer: name, department, prices, barcode, and opening stock — then Create.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Three toggles under Stock do the heavy lifting: Track stock counts this product in inventory, Sellable makes it appear on the till and storefront, and Sell by weight makes it a variable-weight item with a scale PLU (useful for produce and meat).",
      },
      {
        type: "heading",
        text: "Add a group with variants",
      },
      {
        type: "paragraph",
        text: "When the same brand comes in multiple sizes, colours, or packs, create a Group first — then add one Variant per sellable SKU under it.",
      },
      {
        type: "steps",
        items: [
          "Open Products and tap New.",
          "Switch the toggle from Single product to Group.",
          "Enter the group name (the brand or family — e.g. Coca-Cola), choose Department and Category, then tap Create group.",
          "Open the group from the catalog and choose Add variant.",
          "For each size, enter the Variant name (300 ml, 500 ml), Sell price, Buy price, and Barcode. Use Add another variant to create several at once.",
          "Tap Create variants — each variant becomes its own SKU with its own stock, still nested under the group.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-group-drawer.svg",
        alt: "New product group drawer with Group selected, group name Coca-Cola, Soft drinks department and category, and a dashed placeholder showing variants appear after creation",
        caption:
          "Create the group first. The group itself is never sold — the variants under it are.",
      },
      {
        type: "image",
        src: "/help/add-variant-drawer.svg",
        alt: "Add variants drawer for Coca-Cola with two rows: 300 ml at sell price 60 and 500 ml at sell price 80, each with buying price, barcode, and opening quantity",
        caption:
          "Add every size as a variant in one go — each gets its own price, barcode, and stock.",
      },
      {
        type: "heading",
        text: "Packages: trays, crates, and bundles",
      },
      {
        type: "paragraph",
        text: "Packages let you sell the same item in different units that share one stock pool — for example eggs sold loose (1 piece) or as a tray (30 pieces). Selling one tray deducts 30 pieces from the same inventory, so stock never double-counts.",
      },
      {
        type: "steps",
        items: [
          "While creating a single product, tick Sell in different units and fill each package row (name, conversion, price).",
          "Already created? Open the product from the catalog and choose Package sales.",
          "Enter the Package name (e.g. Tray of 30), the Conversion (how many base units are in it, e.g. 30), and the Price per package.",
          "Add a SKU or Barcode for the package if you want to scan it, then tap Add package — it becomes a variant SKU that shares the base product's stock.",
        ],
      },
      {
        type: "image",
        src: "/help/add-package-modal.svg",
        alt: "Package sales dialog for Coca-Cola 500 ml with package name Tray of 30, conversion 30 pieces per unit, price per package 1,500 KES, and the hint that selling one tray deducts 30 pieces from stock",
        caption:
          "Package sales: one tray = 30 pieces, deducted from the same stock when you sell it.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Packages and option variants solve different problems: a package (tray of 30) shares the parent's stock through a conversion, while an option variant (500 ml vs 300 ml) usually keeps its own stock. Pick the model that matches how you receive goods.",
      },
      {
        type: "heading",
        text: "Manage your products after they are created",
      },
      {
        type: "list",
        items: [
          "Select any product in the catalog to open its detail panel — edit name, SKU, barcode, sell price, and stock inline without leaving the page.",
          "Use Edit for photos, description, supplier link, and buying cost.",
          "Add variant grows a family; Package sales adds tray or crate SKUs; Change department moves the product between departments.",
          "Track down problems from the header: missing barcode, no price, zero stock, and low stock counters filter the list in one tap.",
          "Big cleanup? Import hundreds of SKUs from Business → Import, or fix barcodes in bulk from Inventory → Missing barcodes.",
        ],
      },
      {
        type: "image",
        src: "/help/product-detail-manage.svg",
        alt: "Product detail panel for Coca-Cola showing sell price 60, buy cost 48, margin 20 percent, on hand 32, quick edit rows, Variant and Package sales buttons, and three variant rows",
        caption:
          "The detail panel is your management hub: quick-edit prices and stock, add variants or packages, and review every SKU.",
      },
      {
        type: "faq",
        items: [
          {
            question: "I already added sizes as separate single products — can I fix it?",
            answer:
              "Yes. Open the product and use Add variant / Add sibling to grow a family under one parent, or merge duplicates during a cleanup pass. Starting as a group is cleaner when you know sizes are coming.",
          },
          {
            question: "What is the difference between a package variant and an option variant?",
            answer:
              "A package variant (e.g. tray of 30) shares the base product's stock and deducts a conversion when sold. An option variant (e.g. 500 ml vs 300 ml) normally keeps its own stock. Packages suit one item sold in multiple units; option variants suit a brand with distinct SKUs.",
          },
          {
            question: "Do groups appear on the cashier?",
            answer:
              "Cashiers sell variants — the SKUs with prices and barcodes. Searching the brand name surfaces those variants under the group, so checkout stays fast.",
          },
          {
            question: "What if an item has no barcode?",
            answer:
              "You can still sell it by searching the product or variant name on the cashier. Add the barcode later from the product detail when packaging arrives.",
          },
          {
            question: "How do I stop selling a product?",
            answer:
              "Turn off Sellable on the product, or remove it from the catalog. Stock stays visible in reports either way, which keeps history honest.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "understand-stock-levels",
    title: "Understand stock levels",
    description:
      "How on-hand quantity updates after sales, supplies, and transfers.",
    updatedAt: "2026-07-01",
    tags: ["stock", "inventory"],
    relatedSlugs: ["run-a-stock-take", "why-record-supplies", "transfer-stock-between-branches"],
    body: [
      {
        type: "paragraph",
        text: "Kiosk keeps one stock count behind the register and the online storefront so you do not oversell.",
      },
      {
        type: "list",
        items: [
          "Sales decrease on-hand stock automatically.",
          "Posting a supply increases stock automatically — you do not edit quantities by hand after a delivery.",
          "Transfers move stock between branches.",
          "Stock takes adjust counts only when the shelf count differs from the system (shrink, spoilage, mistakes).",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "When goods arrive, record them under Supplies. Stock updates itself from that receipt — skip manual stock bumps for deliveries.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "run-a-stock-take",
    title: "Run a stock take",
    description:
      "Count shelves, record variances, and reconcile so reports stay honest.",
    updatedAt: "2026-07-01",
    tags: ["stock take", "audit", "inventory"],
    relatedSlugs: ["understand-stock-levels", "add-your-first-products"],
    body: [
      {
        type: "paragraph",
        text: "Regular stock takes catch shrink, receiving errors, and mis-scans before month-end.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Stock take.",
          "Start a count for the branch you are auditing.",
          "Scan or enter counted quantities shelf by shelf.",
          "Review variances and submit reconciliation when finished.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Count during quieter hours and pause large receiving jobs mid-count so numbers stay stable.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "transfer-stock-between-branches",
    title: "Transfer stock between branches",
    description:
      "Move inventory from one branch to another without double-counting.",
    updatedAt: "2026-07-01",
    tags: ["transfer", "multi-branch", "inventory"],
    relatedSlugs: ["understand-stock-levels", "add-staff-and-roles"],
    body: [
      {
        type: "paragraph",
        text: "Multi-branch shops can move stock formally so each location’s on-hand quantity stays accurate.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Transfers.",
          "Choose the source and destination branches.",
          "Add the products and quantities to move.",
          "Confirm dispatch and receipt so both sides update.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "fix-missing-barcodes",
    title: "Fix missing barcodes",
    description:
      "Find products without barcodes and attach codes before peak hours.",
    updatedAt: "2026-07-01",
    tags: ["barcode", "catalog", "inventory"],
    relatedSlugs: ["scan-barcodes-at-the-till", "add-your-first-products"],
    body: [
      {
        type: "paragraph",
        text: "Items without barcodes slow the till. Use the missing-barcodes tools to catch them early.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Missing barcodes (or filter products without a code).",
          "Open each product and add the EAN/UPC from the packaging.",
          "Save, then test-scan on the cashier before the next rush.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "manage-suppliers-supplies-orders",
    title: "Suppliers, supplies & purchase orders",
    description:
      "Add vendors, link products, order stock, confirm deliveries, and keep payables straight — with screenshots of every screen.",
    updatedAt: "2026-08-24",
    tags: [
      "suppliers",
      "vendors",
      "supplies",
      "purchase order",
      "PO",
      "receiving",
      "stock",
      "payables",
      "WhatsApp",
      "marketplace",
    ],
    relatedSlugs: [
      "add-a-supplier",
      "record-a-supply",
      "why-record-supplies",
      "understand-stock-levels",
    ],
    body: [
      {
        type: "paragraph",
        text: "Three words carry your purchasing: Suppliers (who you buy from), Supplies (the delivery bills that raise stock), and Orders (the purchase orders you send before goods arrive). They link together — order first, confirm the delivery, and the supply appears with stock already raised. This guide walks the full loop with screenshots.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "One rule to remember: an order is only a promise. Stock moves only when the delivery is confirmed — either from the order, or directly from a New supply receipt.",
      },
      {
        type: "heading",
        text: "Step 1 — Add a supplier",
      },
      {
        type: "paragraph",
        text: "Create each vendor once, before their first delivery, so every receipt, cost, and unpaid balance stays under the right name.",
      },
      {
        type: "steps",
        items: [
          "Open Suppliers in the dashboard and tap New supplier.",
          "Enter the legal / display name, contact phone and email — the phone doubles as the WhatsApp number for orders.",
          "Add a VAT / tax ID if you have one; Kiosk uses it to match existing vendors so you never create duplicates.",
          "Set credit terms (e.g. 30 days) and a credit limit when they sell to you on account.",
          "Save. If they trade on the marketplace, you can also import the vendor plus their catalogue in one step.",
        ],
      },
      {
        type: "image",
        src: "/help/add-supplier-drawer.svg",
        alt: "New supplier drawer with marketplace import banner, supplier name Sunrise Fresh Produce Ltd, contact phone 0712 345 678, email, VAT tax ID, credit terms 30 days, and credit limit",
        caption:
          "The New supplier drawer — identity, contacts, and credit terms in one place.",
      },
      {
        type: "heading",
        text: "Step 2 — Link products to the supplier",
      },
      {
        type: "list",
        items: [
          "Linked products form the supplier’s shelf: the exact list you see when ordering and when receiving.",
          "From the supplier profile, add each product they supply (with their SKU and your last cost).",
          "Or link while creating a product — the New product drawer has a Supplier field.",
          "Links carry cost and stock hints, so a New supply and an Order open pre-filled with sensible prices.",
        ],
      },
      {
        type: "heading",
        text: "Step 3 — Order stock (purchase orders)",
      },
      {
        type: "paragraph",
        text: "Order is a till-style screen built around the supplier’s shelf: pick the vendor, tap the products you need, set quantities, and send.",
      },
      {
        type: "steps",
        items: [
          "Open Order from the dashboard sidebar.",
          "Pick the supplier — their linked products load as tiles with cost and low-stock badges.",
          "Tap products to add them; use +/− to set quantities. Search and family chips keep big catalogues fast.",
          "Review the slip on the right, then choose: Save & WhatsApp sends the order to their number, Save only stores the PO, and Ticket copies a shareable order link.",
          "Saving creates a purchase order (PO) with its own number — the supplier sees it on the portal when they are connected, or in the WhatsApp message you send.",
        ],
      },
      {
        type: "image",
        src: "/help/supplier-order-shelf.svg",
        alt: "Order screen with supplier Sunrise Fresh Produce selected, product tiles for tomatoes onions and eggs with quantity steppers, and the This order slip showing two lines totaling KES 660 with a Save and WhatsApp button",
        caption:
          "Build the order from the supplier’s shelf, then Save & WhatsApp it.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Round to 10 nudges the total to the nearest 10 shillings (great for cash suppliers). You can toggle it under the slip total before saving.",
      },
      {
        type: "heading",
        text: "Step 4 — Confirm the delivery",
      },
      {
        type: "paragraph",
        text: "When the goods arrive, Confirm on the order screen turns the PO into a supply: it posts a goods receipt, creates a supplier bill, and raises stock for every line you received.",
      },
      {
        type: "steps",
        items: [
          "Open the order and tap Confirm (or visit Order → Confirm).",
          "Select the open order — its lines list what was ordered and what is still outstanding.",
          "Check the boxes and adjust the quantities to what actually arrived (short deliveries happen).",
          "Tap Confirm selected → supply. Stock rises automatically and the bill lands in Supplies.",
        ],
      },
      {
        type: "image",
        src: "/help/order-confirm-receive.svg",
        alt: "Confirm to supply panel with open orders list, PO-2026-0141 from Sunrise Fresh Produce, three checked lines with received quantities, selected total KES 3,780, and Confirm selected to supply button",
        caption:
          "Confirm what arrived — partial deliveries are fine; stock rises for exactly what you received.",
      },
      {
        type: "heading",
        text: "Step 5 — Record a walk-in supply",
      },
      {
        type: "paragraph",
        text: "No order was placed? Record the delivery directly. New supply accepts linked products or ad-hoc lines, so you can receive even items you never linked.",
      },
      {
        type: "steps",
        items: [
          "Open Supplies and tap New supply.",
          "Pick the supplier, the receiving branch, and the delivery date.",
          "Add lines: product (search the catalogue), quantity received, and unit cost from the invoice.",
          "Add extras like freight or tax if they belong on the bill, then Post.",
        ],
      },
      {
        type: "image",
        src: "/help/new-supply-drawer.svg",
        alt: "New supply drawer with a four-step workflow rail, supplier Sunrise Fresh Produce, three lines with quantity and unit cost, a payable summary of KES 12,480, and a Post button",
        caption:
          "New supply — the workflow rail shows where you are; Post raises stock and opens the bill.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never add the same delivery twice — posting a supply already raises stock. If you make a mistake, edit or delete the bill instead of manually chopping quantities.",
      },
      {
        type: "heading",
        text: "Step 6 — Manage supplies and pay",
      },
      {
        type: "paragraph",
        text: "Supplies is your vendor ledger: every receipt with its total, what you have paid, and what is still open. The strip on top summarises the whole picture.",
      },
      {
        type: "steps",
        items: [
          "Filter with the chips — Today, 7 days, 30 days, All, Unpaid — or jump straight to Pay open for anything outstanding.",
          "Pay settles one bill; Pay all clears every open invoice for that supplier in one go.",
          "Use Deposit to prepay a supplier wallet; the credit applies automatically when they next bring supplies.",
          "Open AP aging to see balances by age across every vendor, and pay from there when month-end comes.",
        ],
      },
      {
        type: "image",
        src: "/help/supplies-list-pay.svg",
        alt: "Supplies page with deposit banner, summary strip showing total 4, invoiced 46,900, paid 34,420, unpaid 12,480, a receipts table with Pay and Pay all buttons, and unpaid badges",
        caption:
          "The Supplies ledger — amber rows are unpaid; Pay and Pay all settle them.",
      },
      {
        type: "callout",
        tone: "info",
        text: "A paid supply keeps its history. Delete is only offered on unpaid bills, because deleting a supply reverses the stock it raised — keep history honest and edit instead.",
      },
      {
        type: "faq",
        items: [
          {
            question: "What is the difference between an order and a supply?",
            answer:
              "An order is the purchase order you send before goods arrive — a promise, not stock. A supply is the delivery you actually receive. Stock rises only on the supply (from Confirm or New supply), never on the order itself.",
          },
          {
            question: "Can I skip ordering and just record a supply?",
            answer:
              "Yes. Walk-in deliveries go straight through Supplies → New supply. Ordering first is useful when you want the PO, WhatsApp hand-off, or portal flow, but it is never required.",
          },
          {
            question: "Why is my supplier’s shelf empty when I order?",
            answer:
              "The shelf shows linked products only. Open the supplier profile, add the products they supply, and they will appear for ordering and receiving.",
          },
          {
            question: "What happens when I confirm an order?",
            answer:
              "Kiosk posts a goods receipt, creates a supplier bill from the lines you received, and raises stock for those products — the delivery becomes a supply with one tap.",
          },
          {
            question: "How do deposits work?",
            answer:
              "Deposit prepays a supplier wallet from Supplies. When they bring the next delivery, the credit applies to the bill automatically — you only top up the difference.",
          },
          {
            question: "Can I delete a supply?",
            answer:
              "Only when nothing has been paid on it, because deleting reverses the stock it raised. Paid bills stay in history; edit them instead of deleting.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "why-record-supplies",
    title: "Why you should record every supply",
    description:
      "Posting a supply updates stock automatically — and locks in cost, payables, and a clean audit trail.",
    updatedAt: "2026-07-21",
    tags: ["supplies", "stock", "cost", "purchasing", "receiving"],
    popular: true,
    relatedSlugs: ["record-a-supply", "add-a-supplier", "understand-stock-levels"],
    body: [
      {
        type: "paragraph",
        text: "A supply is the delivery note for goods that arrived from a vendor. When you post it in Kiosk, stock for those products goes up on its own — you do not open each product and type quantities by hand.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Goods arrived → record the supply. Stock updates automatically. Manual stock edits are for corrections and stock takes, not for routine deliveries.",
      },
      {
        type: "heading",
        text: "What recording a supply does for you",
      },
      {
        type: "list",
        items: [
          "Updates on-hand stock for every line you receive — till and storefront stay accurate without a separate stock bump.",
          "Captures buying cost per unit so margins and reports reflect what you actually paid, not a guess.",
          "Tracks what you owe the supplier (open payables) until you mark the bill paid.",
          "Leaves a receipt trail — who supplied what, when, to which branch — for disputes, audits, and reorders.",
          "Feeds purchasing intelligence so you can see which vendors and products move money.",
        ],
      },
      {
        type: "heading",
        text: "What goes wrong if you skip it",
      },
      {
        type: "list",
        items: [
          "Stock looks empty (or wrong) while shelves are full — cashiers and the online shop under-sell or oversell.",
          "You invent stock with manual edits, then lose the link to cost and supplier.",
          "You cannot tell how much you owe a vendor at month-end.",
          "Margins look fake because sell price is known but buy price never landed with the delivery.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not “fix” a delivery by editing product stock alone. That hides the supplier bill and breaks cost history. Always post the supply first.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Do I still need stock takes if I record supplies?",
            answer:
              "Yes, but for a different job. Supplies keep stock moving with every delivery and sale. Stock takes catch shrink, breakage, and counting mistakes — not routine receiving.",
          },
          {
            question: "Does posting a supply also pay the supplier?",
            answer:
              "No. Posting receives the goods and updates stock (and usually creates an open payable). Paying the bill is a separate step from Supplies when you settle cash, M-Pesa, or bank.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "add-a-supplier",
    title: "Add a supplier",
    description:
      "Save vendor details once so every delivery, cost, and payable stays attached to the right person.",
    updatedAt: "2026-07-21",
    tags: ["suppliers", "vendors", "purchasing"],
    relatedSlugs: ["record-a-supply", "why-record-supplies", "manage-suppliers-supplies-orders"],
    body: [
      {
        type: "paragraph",
        text: "Suppliers are the distributors, wholesalers, or farmers you buy from. Create each vendor in Suppliers before you record deliveries so receipts, costs, and unpaid balances stay under the right name.",
      },
      {
        type: "steps",
        items: [
          "Open Suppliers in the dashboard.",
          "Choose New / Add supplier.",
          "Enter the supplier name (as you know them day to day).",
          "Add contact phone or email so staff can reach them about deliveries.",
          "Optionally set credit terms (e.g. 30 days) and a credit limit if they sell to you on account.",
          "Save. You can link catalog products to this supplier later for faster receiving.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "You need an active supplier on the receipt before you can post a supply. Add the vendor once; reuse them on every delivery.",
      },
      {
        type: "list",
        items: [
          "Link products on the supplier profile so the New supply drawer can pull their SKUs quickly.",
          "Keep one supplier record per trading partner — avoid duplicate names for the same company.",
          "Mark a supplier inactive or blocked if you stop buying from them.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "record-a-supply",
    title: "Record a supply (receive stock)",
    description:
      "Post a vendor delivery so stock rises automatically and costs land on the right products.",
    updatedAt: "2026-07-21",
    tags: ["supplies", "receiving", "stock", "purchasing"],
    popular: true,
    relatedSlugs: ["why-record-supplies", "add-a-supplier", "understand-stock-levels", "manage-suppliers-supplies-orders"],
    body: [
      {
        type: "paragraph",
        text: "When a delivery arrives, record it under Supplies. Choose the supplier, branch, and lines (product, quantity, unit cost). When you post, Kiosk increases stock for those products automatically — no separate stock edit.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Stock update is automatic on post. After a successful supply, check Inventory or the product detail — quantities should already reflect what you received.",
      },
      {
        type: "heading",
        text: "How to post a delivery",
      },
      {
        type: "steps",
        items: [
          "Open Supplies (Purchasing).",
          "Choose New supply.",
          "Select the supplier (add them first if they are new).",
          "Confirm the receiving branch and delivery date.",
          "Add lines: product, quantity received, and unit cost from the invoice.",
          "Add a document reference (invoice / LPO number) if you have one.",
          "Post the supply. Stock increases for each line; the bill appears in your supplies list (often unpaid until you settle it).",
        ],
      },
      {
        type: "heading",
        text: "After you post",
      },
      {
        type: "list",
        items: [
          "On-hand stock is already updated — do not add the same quantities again on the product screen.",
          "Use Pay on the supply (or Pay open) when you settle the vendor.",
          "Open AP aging to see unpaid balances across suppliers.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Posting twice for the same delivery doubles stock. If you made a mistake, edit or delete the supply bill (when allowed) instead of manually chopping stock.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Why can’t I post without a supplier?",
            answer:
              "Every receipt needs a vendor so cost and payables stay attributable. Add the supplier first, then post the supply.",
          },
          {
            question: "Should I change stock manually after recording?",
            answer:
              "No. The supply already moved stock. Manual changes are for stock takes and rare corrections — not for normal deliveries.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "set-up-your-online-store",
    title: "Set up your online store",
    description:
      "Turn on yourshop.kiosk.ke so customers can browse and order online.",
    updatedAt: "2026-07-01",
    tags: ["storefront", "online shop", "orders"],
    popular: true,
    relatedSlugs: ["brand-your-storefront", "manage-web-orders"],
    body: [
      {
        type: "paragraph",
        text: "Your online storefront uses the same catalog and stock as the till. When an item sells out in-store, it stops selling online too.",
      },
      {
        type: "steps",
        items: [
          "Confirm products have prices and stock.",
          "Open Business → Branding to set logo and colors.",
          "Visit yourshop.kiosk.ke to preview the shop.",
          "Share the link with customers on WhatsApp or social media.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "brand-your-storefront",
    title: "Brand your storefront",
    description:
      "Upload a logo, pick colors, and tune the title customers see in search.",
    updatedAt: "2026-07-01",
    tags: ["branding", "seo", "storefront"],
    relatedSlugs: ["set-up-your-online-store", "claim-your-subdomain"],
    body: [
      {
        type: "paragraph",
        text: "Branding makes yourshop.kiosk.ke feel like your shop — not a generic template.",
      },
      {
        type: "list",
        items: [
          "Upload a clear logo (square works best for favicons).",
          "Set a primary brand color used across the shop.",
          "Write a clear SEO title and description for Google results.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Aim for about 50–60 characters in the title and 140–160 in the description.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "manage-web-orders",
    title: "Manage web orders",
    description:
      "See incoming online orders, fulfill them, and keep customers updated.",
    updatedAt: "2026-07-01",
    tags: ["orders", "storefront", "fulfillment"],
    relatedSlugs: ["set-up-your-online-store", "understand-stock-levels"],
    body: [
      {
        type: "paragraph",
        text: "Web orders appear in your dashboard so counter staff can pack and deliver without juggling WhatsApp screenshots.",
      },
      {
        type: "steps",
        items: [
          "Open Storefront / Web orders in the dashboard.",
          "Review items, delivery notes, and payment status.",
          "Mark the order fulfilled when packed or delivered.",
          "Stock decreases automatically when the order is confirmed.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "add-staff-and-roles",
    title: "Add staff and roles",
    description:
      "Invite cashiers and supervisors with the right access for their job.",
    updatedAt: "2026-07-01",
    tags: ["staff", "roles", "users"],
    relatedSlugs: ["staff-pin-login", "invite-your-first-staff"],
    body: [
      {
        type: "paragraph",
        text: "Not everyone needs full admin access. Assign roles so cashiers can sell while only owners change prices or payment settings.",
      },
      {
        type: "steps",
        items: [
          "Open Users in the dashboard.",
          "Invite a staff member by phone or email.",
          "Choose a role (for example cashier or manager).",
          "Ask them to complete signup or set a PIN for till login.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "invite-your-first-staff",
    title: "Invite your first staff member",
    description:
      "Get a cashier onto the till quickly without sharing the owner password.",
    updatedAt: "2026-07-01",
    tags: ["invite", "staff", "onboarding"],
    relatedSlugs: ["add-staff-and-roles", "staff-pin-login"],
    body: [
      {
        type: "paragraph",
        text: "Sharing the owner account is risky. Invite staff so every sale is attributable and you can revoke access later.",
      },
      {
        type: "steps",
        items: [
          "From Users, send an invite link.",
          "Staff open the link and create their login.",
          "They sign in at /login/staff and open Cashier.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Remove or disable accounts when someone leaves so they cannot open the till.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "staff-pin-login",
    title: "Staff PIN login at the till",
    description:
      "Let cashiers unlock a shared device with a short PIN instead of a long password.",
    updatedAt: "2026-07-01",
    tags: ["pin", "staff", "cashier"],
    relatedSlugs: ["add-staff-and-roles", "open-the-cashier-for-the-first-time"],
    body: [
      {
        type: "paragraph",
        text: "PIN login is designed for busy counters where several people share a tablet or desktop.",
      },
      {
        type: "list",
        items: [
          "Each staff user sets their own PIN.",
          "PINs should stay private — do not write them on the till.",
          "Owners can reset a PIN if staff forget it.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "work-with-multiple-branches",
    title: "Work with multiple branches",
    description:
      "Track stock and sales per location when you run more than one shop.",
    updatedAt: "2026-07-01",
    tags: ["branches", "multi-branch"],
    relatedSlugs: ["transfer-stock-between-branches", "add-staff-and-roles"],
    body: [
      {
        type: "paragraph",
        text: "Branches keep inventory and reporting separated while one business account owns everything.",
      },
      {
        type: "steps",
        items: [
          "Open Branches and create each location.",
          "Assign staff to the branches they work in.",
          "Sell from the correct branch on the cashier.",
          "Use transfers when moving stock between shops.",
        ],
      },
    ],
  },
];

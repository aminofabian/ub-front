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
    relatedSlugs: ["scan-barcodes-at-the-till", "run-a-stock-take"],
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
    relatedSlugs: ["accept-mpesa-stk", "set-up-your-online-store"],
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
    relatedSlugs: ["record-a-supply", "why-record-supplies"],
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
    relatedSlugs: ["why-record-supplies", "add-a-supplier", "understand-stock-levels"],
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

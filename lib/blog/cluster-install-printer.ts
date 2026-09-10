import type { BlogArticle } from "./types";

export const INSTALL_PRINTER_SLUG = "how-to-install-receipt-printer-kenya";

export const INSTALL_PRINTER_ARTICLE: BlogArticle = {
  slug: INSTALL_PRINTER_SLUG,
  title: "How to Install a Receipt Printer for Your POS in Kenya (Step-by-Step)",
  description:
    "Install a thermal receipt printer on a Kenyan POS in about 15 minutes — USB, Bluetooth, or Ethernet — with screenshots for Windows, macOS, Linux, and Kiosk Cashier.",
  category: "Hardware",
  publishedAt: "2026-09-10",
  updatedAt: "2026-09-10",
  tags: [
    "Receipt printer",
    "Hardware",
    "POS",
    "Setup",
    "Kenya",
    "Thermal printer",
  ],
  keywords: [
    "how to install a receipt printer",
    "how to install a printer Kenya",
    "POS receipt printer setup Kenya",
    "thermal printer POS Kenya",
    "install thermal printer Windows",
    "Bluetooth receipt printer Kenya",
    "58mm 80mm receipt printer",
    "connect receipt printer to POS",
    "ESC/POS printer Kenya",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "what-hardware-do-you-actually-need",
    "set-up-a-pos-in-30-minutes",
    "why-m-pesa-integration-matters",
    "barcode-search-kenya-lookup-guide",
    "choosing-the-right-pos-kiosk-vs-odoo",
    "top-10-pos-systems-kenya-2026",
  ],
  howto: {
    name: "How to install a receipt printer on a POS in Kenya",
    description:
      "Connect a thermal receipt printer to Windows, macOS, or Linux, install the Kiosk print helper, detect the queue in Cashier, and print a test receipt.",
    totalTime: "PT15M",
    estimatedCost: { currency: "KES", value: "0" },
    supply: [
      "Thermal receipt printer (58mm or 80mm)",
      "USB data cable or Ethernet cable",
      "Thermal paper roll",
    ],
    tool: [
      "Till computer, tablet dock, or laptop",
      "Kiosk Cashier in a browser",
    ],
    steps: [
      {
        name: "Step 1 — Pick a thermal printer and plug it in",
        text: "Buy a thermal 58mm or 80mm receipt printer. Power it on, seat the paper roll shiny-side to the head, and connect USB (default), Bluetooth, or Ethernet. Run a self-test with FEED + power.",
        image: "/help/printer-pick-and-connect.svg",
      },
      {
        name: "Step 2 — Add the printer in Windows",
        text: "Open Settings → Bluetooth & devices → Printers & scanners. Confirm the thermal unit appears. Skip Microsoft Print to PDF and Fax.",
        image: "/help/printer-windows-add.svg",
      },
      {
        name: "Step 3 — Add the printer on macOS",
        text: "Open System Settings → Printers & Scanners and add the thermal printer with a generic ESC/POS or maker driver — not AirPrint.",
        image: "/help/printer-macos-add.svg",
      },
      {
        name: "Step 4 — Add the printer on Linux",
        text: "Install CUPS, add a raw ESC/POS queue, then run the Kiosk Linux print-bridge installer.",
        image: "/help/printer-linux-cups.svg",
      },
      {
        name: "Step 5 — Open Cashier and connect a printer",
        text: "On the till PC, open Cashier, tap Receipts on screen, then Connect a printer. Download the Print Bridge for this operating system.",
        image: "/help/printer-cashier-connect.svg",
      },
      {
        name: "Step 6 — Detect printers and save the queue",
        text: "Unzip and run the installer once on the computer with the printer. Click Detect printers, pick the thermal queue, and Save on the branch.",
        image: "/help/printer-detect-queues.svg",
      },
      {
        name: "Step 7 — Print a test receipt",
        text: "Complete a small test sale. The chip should show the printer name. Paper should feed and cut. Reprint from Sales history if the first slip is blank.",
        image: "/help/printer-first-receipt.svg",
      },
    ],
  },
  faqs: [
    {
      question: "How do I install a receipt printer on a POS in Kenya?",
      answer:
        "Power on a thermal printer, add it in Windows, macOS, or Linux, install the Kiosk Print Bridge on that same computer, then Detect printers in Cashier and take a test sale. The browser cannot talk to a USB printer without the helper.",
    },
    {
      question: "Do I need a printer to start selling?",
      answer:
        "No. Kiosk shows the receipt on screen and can send it on WhatsApp. Add paper when customers start asking for it.",
    },
    {
      question: "USB, Bluetooth, or Ethernet — which is best?",
      answer:
        "USB is the shop-floor default: one cable, one till, fewer mysteries. Bluetooth fits a tablet that moves. Ethernet (port 9100) fits one printer shared by several tills on the same LAN.",
    },
    {
      question: "Why does Detect printers say the helper is not running?",
      answer:
        "The Print Bridge must run on the computer the printer is plugged into — not a phone, and not a different office PC. Unzip the installer for your OS, run it once, then Detect again.",
    },
    {
      question: "The printer is on but nothing prints. What should I check?",
      answer:
        "Confirm it is thermal (not inkjet), the roll is seated shiny-side to the head, you did not pick Print to PDF or Fax, and the Cashier chip shows the real printer name. Then reprint from Sales history — do not hammer print.",
    },
    {
      question: "The slip came out blank and grey. Is the printer broken?",
      answer:
        "Almost never. The roll is loaded backwards — the blank side is facing the print head. Flip the roll, close the lid, and reprint from Sales history. If a whole fresh roll prints grey, it baked in a hot car or boda box; store spares cool and dry.",
    },
    {
      question: "How do I change my shop name or M-Pesa till on the receipt?",
      answer:
        "In Branches → Receipt details, then Save. The printer only draws what Kiosk sends — wording never lives on the printer itself.",
    },
    {
      question: "Can I use an Epson, Xprinter, or Caysn printer?",
      answer:
        "Yes. Kiosk sends ESC/POS, which those common 58mm and 80mm till printers speak. Use the data USB cable from the box, not a phone charger.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "A receipt printer is not a gadget. It is the last handshake of the sale — the scrap of paper a customer folds into a pocket while they still trust you. Installing one on a Kenyan POS should feel like hiring a quiet extra cashier, not surviving a Windows wizard.",
    },
    {
      type: "paragraph",
      text: "This guide is the complete path: pick the right thermal printer, load the paper the right way round, add it to Windows, macOS, or Linux, connect it in Kiosk Cashier, and print a real slip. Plan on about 15 minutes — provided the cable in the box is the data cable. Many shops lose half an hour to a phone charger that only powers the lights.",
    },
    {
      type: "callout",
      tone: "info",
      text: "You can sell today without paper. Digital receipts and WhatsApp copies work from the first sale. Follow this page when the queue starts asking for a slip — not before.",
    },
    {
      type: "heading",
      text: "What you need (and what you can skip)",
    },
    {
      type: "table",
      headers: ["Item", "Required?", "Why"],
      rows: [
        [
          "Thermal receipt printer (58mm or 80mm)",
          "Yes, for paper",
          "No ink. Fast. The only kind a till should use.",
        ],
        [
          "USB data cable (square USB-B on most units)",
          "Yes, for USB tills",
          "Chargers light the printer and print nothing.",
        ],
        [
          "Till PC, laptop, or tablet dock",
          "Yes",
          "The helper runs on the machine the printer is attached to.",
        ],
        [
          "Kiosk Cashier in a browser",
          "Yes",
          "Detect printers lives on the till strip.",
        ],
        [
          "Thermal paper roll",
          "Yes",
          "Shiny side faces the print head.",
        ],
        [
          "Cash drawer",
          "No",
          "Nice later. It kicks from the printer, not from hope.",
        ],
      ],
    },
    {
      type: "heading",
      text: "58mm or 80mm? Match the printer to the queue",
    },
    {
      type: "table",
      headers: ["", "58mm", "80mm"],
      rows: [
        ["Fits", "Dukas, pharmacies, salons, M-Pesa agents", "Busy mini-marts, supermarket counters"],
        ["Slip width", "Narrow — items wrap to two lines", "Wide — items and totals on one line"],
        ["Paper rolls", "57×30 mm — small and cheap", "80×60 or 80×80 mm — fewer changes per day"],
        ["Best when", "Sales are short and quick", "Carts are long and the queue never stops"],
      ],
    },
    {
      type: "paragraph",
      text: "Both widths are thermal, and both speak ESC/POS. If you are unsure, walk into the shop and say “POS printer” — then buy the spare rolls at the same time. Paper is pennies; running out mid-queue is the only paper mistake that costs sales.",
    },
    {
      type: "heading",
      text: "Step 1 — Pick a thermal printer and plug it in",
    },
    {
      type: "paragraph",
      text: "Buy the printer and the spare rolls in the same trip. At the counter, ask for a thermal POS printer in your width, and check the box has the square USB-B data cable and a power adapter — some units ship with a charger-only lead that will cost you an afternoon. Inkjet and laser belong in an office, not beside the mango crate.",
    },
    {
      type: "list",
      items: [
        "USB — one till, one cable. Start here.",
        "Bluetooth — the till is a tablet that walks the aisle.",
        "Ethernet / Wi-Fi — several tills share one printer on the LAN (raw port 9100).",
      ],
    },
    {
      type: "image",
      src: "/help/printer-connection-map.svg",
      alt: "Decision map of three printer connections: USB for one till with a square data cable, Bluetooth for a roaming tablet till, Ethernet for several tills sharing one printer on port 9100",
      caption:
        "Pick the connection before you touch any settings — it decides everything downstream. One till, one printer: USB.",
    },
    {
      type: "image",
      src: "/help/printer-pick-and-connect.svg",
      alt: "Annotated diagram of a thermal receipt printer with USB as the default connection, Bluetooth for a moving till, Ethernet for a shared counter printer, and a FEED plus power self-test",
      caption:
        "Power on, seat the roll, plug the data cable. A self-test slip means the hardware is alive before any software gets a vote.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Hold FEED while switching the printer on. A test page with barcodes and service lines is a good sign — and it usually lists the printer's IP address, which you will want if it ever goes on the LAN. Silence here is a paper, power, or lid problem, not a Kiosk problem.",
    },
    {
      type: "paragraph",
      text: "Before you close the lid, get the paper the right way round. The shiny, thermal-coated side must face the print head — a roll loaded backwards prints blank grey slips and has sent more “broken” printers back to the shop than any real fault. Not sure which side is shiny? Scratch the paper hard with a fingernail: the side that greys is the one that prints.",
    },
    {
      type: "image",
      src: "/help/printer-paper-roll.svg",
      alt: "Printer with open compartment showing the paper roll loaded shiny side toward the print head, plus the fingernail scratch test, roll sizes, and heat storage warning",
      caption:
        "Shiny side to the head. Thermal paper also hates heat — a roll that baked in a car or boda box prints grey from end to end.",
    },
    {
      type: "heading",
      text: "Step 2 — Add the printer in Windows",
    },
    {
      type: "paragraph",
      text: "Most Kenyan tills are Windows 10 or 11. Plug the USB in, switch the printer on, then open Settings → Bluetooth & devices → Printers & scanners. A thermal unit named XP-80, Caysn, Epson TM, or similar should appear. Some Xprinters hide until Kiosk Detect runs — that is normal, not a fault.",
    },
    {
      type: "image",
      src: "/help/printer-windows-add.svg",
      alt: "Windows Printers and scanners settings showing XP-80C marked as the receipt printer to use, with Microsoft Print to PDF and Fax listed as printers to skip",
      caption:
        "Windows 10/11 — pick the thermal row. Never install Microsoft Print to PDF or Fax as the till printer.",
    },
    {
      type: "list",
      items: [
        "Printer ON, lid closed, paper seated shiny-side to the head.",
        "Data USB cable into the till PC — not a charger-only lead.",
        "If the row is missing: Device Manager should show a USB printing support or COM device; keep Print Spooler running.",
        "Windows 7 tills use the separate Kiosk Windows 7 Print Bridge package.",
      ],
    },
    {
      type: "heading",
      text: "Step 3 — Add the printer on macOS",
    },
    {
      type: "paragraph",
      text: "On a Mac till: System Settings → Printers & Scanners → Add Printer. Keep the factory name so Detect can read it. Choose a generic ESC/POS or the maker's thermal driver. AirPrint is for office documents — it will not cut a 58mm slip.",
    },
    {
      type: "image",
      src: "/help/printer-macos-add.svg",
      alt: "macOS System Settings Printers and Scanners with a Caysn CN811 USB receipt printer selected as default and an Add Printer button",
      caption:
        "macOS — add the thermal printer first, then return to Cashier. Do not use the office AirPrint queue for receipts.",
    },
    {
      type: "heading",
      text: "Step 4 — Add the printer on Linux",
    },
    {
      type: "paragraph",
      text: "Linux tills speak CUPS. Install cups if needed, add a raw ESC/POS queue (localhost:631 or your desktop Printers app), confirm lpstat shows the printer idle, then run the Kiosk Linux installer. Detect in Cashier is the same button as on Windows — the OS changes, the habit does not.",
    },
    {
      type: "image",
      src: "/help/printer-linux-cups.svg",
      alt: "Linux terminal showing CUPS installed, lpstat listing XP-80C as the default printer, and the Palmart print bridge listening on 127.0.0.1 port 19500",
      caption:
        "Linux — CUPS queue first, Print Bridge second, Detect third.",
    },
    {
      type: "heading",
      text: "Step 5 — Open Cashier and connect a printer",
    },
    {
      type: "paragraph",
      text: "Kiosk in the browser cannot see USB — that is a browser rule, not a bug. On the till computer, open Cashier. The strip shows a quiet chip: Receipts on screen. Tap it, then Connect a printer, and download the helper for this OS.",
    },
    {
      type: "image",
      src: "/help/printer-cashier-connect.svg",
      alt: "Kiosk Cashier till strip expanded to Connect a printer, with Download for Windows and Detect printers, explaining the helper must run on this till PC",
      caption:
        "Paper stays optional until you connect. Setup lives behind one tap so a busy shift is never a settings maze.",
    },
    {
      type: "callout",
      tone: "warning",
      text: "Install the zip on THIS computer — the one with the printer. A download on your phone, or a helper running in the back office, will never see the USB port at the counter.",
    },
    {
      type: "heading",
      text: "Step 6 — Detect printers and save the queue",
    },
    {
      type: "paragraph",
      text: "Unzip the package. Windows 10/11: run Install-Palmart-Print-Bridge.cmd (no Node.js needed; it can start hidden at sign-in). Windows 7: the Win7 installer. macOS: Install Palmart Print Bridge.command. Linux: bash install-palmart-print-bridge.sh. Then click Detect printers.",
    },
    {
      type: "image",
      src: "/help/printer-detect-queues.svg",
      alt: "Branches receipt details with Detect printers listing XP-80C as a receipt printer to pick, and Microsoft Print to PDF and Fax greyed as skip",
      caption:
        "Detect talks to the helper on localhost port 19500, auto-picks a thermal queue when there is only one, and can save the name on the branch.",
    },
    {
      type: "list",
      items: [
        "Choose the row marked (receipt). Skip Fax and PDF.",
        "If you manage the shop, Detect can save the name onto the branch so every cashier on that till inherits it.",
        "You can also set the printer under Branches → Receipt details, then Save.",
      ],
    },
    {
      type: "heading",
      text: "Step 7 — Print a test receipt",
    },
    {
      type: "paragraph",
      text: "The chip should now show the printer name, not Receipts on screen. Ring a cheap test item, complete the sale, and watch the paper feed and cut. Shop name, M-Pesa till, and footer come from Branches → Receipt details — fix the wording there, not on the printer.",
    },
    {
      type: "image",
      src: "/help/printer-first-receipt.svg",
      alt: "Thermal printer with a Kiosk test receipt hanging showing Sunrise Groceries, line items, M-Pesa till, and a first-shift checklist",
      caption:
        "A cut slip is the only proof. If it is blank, flip the thermal roll and reprint from Sales history.",
    },
    {
      type: "paragraph",
      text: "Wondering what each line on the slip is, or where to change it? Every line has exactly one source:",
    },
    {
      type: "image",
      src: "/help/printer-receipt-anatomy.svg",
      alt: "Anatomy of a receipt slip showing which lines you set in Branches receipt details, which come from the sale, and the REPRINT mark on reprinted slips",
      caption:
        "Your words come from Branches → Receipt details. The numbers come from the sale. The printer only draws what Kiosk sends.",
    },
    {
      type: "heading",
      text: "When nothing comes out",
    },
    {
      type: "paragraph",
      text: "Work down the flow below and stop at the first row that fails. It is almost never the software — it is paper, power, or the cable.",
    },
    {
      type: "image",
      src: "/help/printer-troubleshoot-flow.svg",
      alt: "Five-step troubleshooting flowchart from power and self-test to system queue, Print Bridge detection, and picking the thermal receipt queue",
      caption:
        "Five checks, in order. Each one rules out a whole category of problems before you touch settings again.",
    },
    {
      type: "table",
      headers: ["Symptom", "Likely cause", "Fix"],
      rows: [
        [
          "Lights on, no paper",
          "Charger cable, or roll seated backwards",
          "Use the square data USB. Flip the shiny side to the head.",
        ],
        [
          "Detect: helper not running",
          "Installer never ran on this PC",
          "Unzip and run the OS installer, then Detect again.",
        ],
        [
          "PDF or Fax selected",
          "Windows defaulted to a virtual printer",
          "Pick the thermal (receipt) queue and Save.",
        ],
        [
          "Prints on another PC",
          "Helper installed in the office",
          "Move the helper to the counter computer.",
        ],
        [
          "Blank grey paper",
          "Wrong face of thermal roll",
          "Flip the roll. Reprint from Sales history.",
        ],
        [
          "Cuts mid-logo",
          "58mm driver on 80mm paper, or the reverse",
          "Match paper width to the printer model.",
        ],
        [
          "Prints grey from end to end",
          "Roll baked in a hot car or boda box",
          "Bin that roll. Store spares cool, dry, out of the sun.",
        ],
      ],
    },
    {
      type: "callout",
      tone: "warning",
      text: "If a job times out, the bytes may already be in the spooler. Do not tap print again until you look at the printer — double jobs waste paper and confuse the drawer kick.",
    },
    {
      type: "heading",
      text: "The 15-minute version",
    },
    {
      type: "list",
      items: [
        "Thermal printer ON, paper seated shiny-side to the head, data cable in the till PC.",
        "Self-test with FEED + power. Confirm it exists in Windows / macOS / CUPS. Skip PDF and Fax.",
        "Cashier → Receipts on screen → Connect a printer → download the helper.",
        "Run the installer once on this computer.",
        "Detect printers → pick the thermal name → Save on the branch.",
        "One test sale. Paper in the customer's hand.",
      ],
    },
    {
      type: "heading",
      text: "Bottom line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Installing a printer is introducing a staff member: power, name, handshake, first shift. Kiosk already sells without paper. When you are ready, USB plus Detect is the shortest path from box to beep on a Kenyan counter.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "Install a receipt printer (Help Center)",
          href: "/help/merchants/point-of-sale/install-a-receipt-printer",
          blurb: "The same walkthrough inside Help — for cashiers at the till.",
        },
        {
          label: "What Hardware Do You Actually Need?",
          href: "/blog/what-hardware-do-you-actually-need",
          blurb: "Phone first, scanner second, printer third.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "Software live the same afternoon — hardware optional.",
        },
        {
          label: "Print or share receipts",
          href: "/help/merchants/point-of-sale/print-or-share-receipts",
          blurb: "Paper, screen, or WhatsApp after checkout.",
        },
      ],
    },
  ],
};

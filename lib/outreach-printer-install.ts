import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

/** Public help article — always the host site, never a tenant subdomain. */
export const PRINTER_INSTALL_GUIDE_URL =
  "https://kiosk.ke/help/merchants/point-of-sale/install-a-receipt-printer";

export const PRINTER_INSTALL_EMAIL_SUBJECT =
  "Install your receipt printer on Kiosk — {{name}}";

export const PRINTER_INSTALL_EMAIL_PREVIEW =
  "Cashier download, Detect printers, and a live call if you get stuck.";

export const PRINTER_INSTALL_CTA = "Open printer guide";

/**
 * Body for campaign emails. Uses {{name}} / {{businessName}} like other
 * super-admin templates.
 */
export const PRINTER_INSTALL_EMAIL_BODY = `Hello {{name}},

We have a step-by-step guide here:
${PRINTER_INSTALL_GUIDE_URL}

On the Cashier page at {{businessName}}:

1. Click Receipts on screen → Connect a printer.
2. Download for Windows or for macOS, matching the computer the printer is plugged into.
3. Unzip the file. Open Install Palmart Print Bridge (the one with the gear icon).
4. A terminal window will open — press any key, then follow Next until it finishes.
5. Go back to Cashier and click Detect printers. Pick the receipt printer (skip Fax and Print to PDF).

If Detect finds nothing, open Settings → Printers & scanners.

- If the printer is listed, pick it in Detect (not Fax, not Print to PDF).
- If it is not listed, add it by hand:
  1. Add a printer → The printer that I want isn’t listed
  2. Add a local printer
  3. Port: USB001, or the COM port from Device Manager (e.g. COM3)
  4. Driver: Generic / Text Only
  5. Name it Xprinter, set it Online
  6. Back to Cashier → Detect printers again

Device Manager only confirms the USB cable is working. The till only sees printers that appear under Printers & scanners.

If any step is unclear, call me on ${KIOSK_PLATFORM_CONTACT.phoneDisplay} and I will walk you through it live, on the same computer.
`;

/** Chat / WhatsApp-style body. Pass a first name when you have one. */
export function printerInstallChatBody(firstName?: string | null): string {
  const name = firstName?.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hello ${name},` : "Hello,";
  return PRINTER_INSTALL_EMAIL_BODY.replace("Hello {{name}},", hello).replaceAll(
    " at {{businessName}}",
    "",
  );
}

export const PRINTER_INSTALL_CANNED_REPLY = {
  id: "install-receipt-printer",
  label: "Printer install",
  hint: "Guide + Detect + add queue + live call",
} as const;

import { fetchItemsPage, patchItem } from "@/lib/api";
import { generateBarcodes } from "@/lib/barcode-generate";

/** True when a live product in this business already carries `code`. */
async function isTaken(code: string): Promise<boolean> {
  const page = await fetchItemsPage(undefined, { barcode: code, size: 1, includeInactive: true });
  return page.content.length > 0;
}

/**
 * `count` codes confirmed unused in this business. Checks each against the
 * catalogue (the server has no unique index on barcode), a few at a time.
 */
export async function reserveBarcodes(count: number, alsoTaken: ReadonlySet<string> = new Set()): Promise<string[]> {
  const taken = new Set(alsoTaken);
  const out: string[] = [];
  while (out.length < count) {
    const batch = generateBarcodes(count - out.length, taken);
    const used = await Promise.all(batch.map((code) => isTaken(code)));
    batch.forEach((code, i) => {
      taken.add(code);
      if (!used[i]) out.push(code);
    });
  }
  return out;
}

export async function reserveBarcode(): Promise<string> {
  return (await reserveBarcodes(1))[0];
}

export async function saveBarcode(itemId: string, barcode: string): Promise<void> {
  await patchItem(itemId, { barcode });
}

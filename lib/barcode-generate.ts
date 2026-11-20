/**
 * In-store EAN-13 codes for products that arrive without a manufacturer barcode.
 *
 * Shape: 2-digit prefix + 10 serial digits + check digit. The backend only keeps
 * all-digit barcodes of 4+ characters (`ItemCatalogService.normalizeBarcode`), so
 * these are numeric and scan on any till scanner.
 *
 * Prefix 29 sits in the GS1 "restricted circulation" block (20–29) set aside for
 * in-store use, so it never collides with a real manufacturer code. It avoids a
 * prefix-2 start only partly: a shop with variable-weight (butcher) labels on
 * parses any code starting with 2 as a scale label.
 */
export const GENERATED_BARCODE_PREFIX = "29";

const SERIAL_DIGITS = 10;

export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error("EAN-13 needs 12 digits before the check digit");
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

export function buildEan13(serial: number, prefix: string = GENERATED_BARCODE_PREFIX): string {
  if (!/^\d{2}$/.test(prefix)) throw new Error("Prefix must be 2 digits");
  if (!Number.isInteger(serial) || serial < 0 || serial >= 10 ** SERIAL_DIGITS) {
    throw new Error("Serial out of range");
  }
  const first12 = `${prefix}${String(serial).padStart(SERIAL_DIGITS, "0")}`;
  return `${first12}${ean13CheckDigit(first12)}`;
}

export function randomEan13(rng: () => number = Math.random, prefix: string = GENERATED_BARCODE_PREFIX): string {
  return buildEan13(Math.floor(rng() * 10 ** SERIAL_DIGITS), prefix);
}

/**
 * `count` new codes, none repeated and none in `taken`. Random serials keep two
 * tills (or two people) generating at once from picking the same next number.
 */
export function generateBarcodes(
  count: number,
  taken: ReadonlySet<string> = new Set(),
  rng: () => number = Math.random,
): string[] {
  const out: string[] = [];
  const seen = new Set(taken);
  let guard = 0;
  while (out.length < count && guard < count * 50 + 100) {
    guard += 1;
    const code = randomEan13(rng);
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  if (out.length < count) throw new Error("Could not find free barcodes");
  return out;
}

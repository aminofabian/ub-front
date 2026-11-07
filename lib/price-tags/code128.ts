/**
 * How wide a Code 128 symbol is, in modules (the narrowest bar), for the code
 * JsBarcode would produce in its automatic mode. Pure arithmetic, so a tag can
 * decide before drawing whether the bars would come out too thin to scan.
 *
 * Mirrors JsBarcode's auto.js for the printable ASCII that `assessBarcodeCode`
 * lets through: start in set C on two or more leading digits, pairs of digits
 * stay in C, everything else goes to set B, and an even run of four or more
 * digits inside B switches back to C.
 */

const MODULES_PER_SYMBOL = 11;
/** Stop pattern plus its termination bar. */
const STOP_MODULES = 13;
/** Start code and checksum. */
const FIXED_SYMBOLS = 2;

function leadingDigitPairs(text: string): number {
  const match = text.match(/^(\d\d)+/);
  return match ? match[0].length : 0;
}

/** Symbols for a run in set B, switching into C where JsBarcode would. */
function symbolsInB(text: string): number {
  if (text.length === 0) return 0;
  // The shortest B prefix followed by an even run of four or more digits, then a non-digit or the end.
  const untilC = text.match(/^(.+?)((\d\d){2,})(\D|$)/);
  if (!untilC) return text.length;
  return untilC[1].length + 1 + symbolsInC(text.slice(untilC[1].length));
}

/** Symbols for a run in set C, switching to B when the digit pairs run out. */
function symbolsInC(text: string): number {
  const paired = leadingDigitPairs(text);
  if (paired === text.length) return paired / 2;
  return paired / 2 + 1 + symbolsInB(text.slice(paired));
}

export function code128Symbols(code: string): number {
  const data = leadingDigitPairs(code) >= 2 ? symbolsInC(code) : symbolsInB(code);
  return data + FIXED_SYMBOLS;
}

export function code128Modules(code: string): number {
  return code128Symbols(code) * MODULES_PER_SYMBOL + STOP_MODULES;
}

/**
 * Narrowest bar an office printer or PDF viewer should be asked for. A 203 dpi
 * label printer needs 2 dots (0.25 mm); `minModuleMm` for it comes from the
 * printer's resolution instead.
 */
export const MIN_PRINT_MODULE_MM = 0.19;

/**
 * Whether a Code 128 for `code` drawn `widthMm` wide keeps every bar at least
 * `minModuleMm` wide. Narrower bars merge into a grey smear no scanner reads,
 * so a tag leaves the barcode off (the SKU text stays) rather than print one.
 */
export function barcodeFitsWidth(code: string, widthMm: number, minModuleMm: number): boolean {
  return code128Modules(code) * minModuleMm <= widthMm + 1e-6;
}

/**
 * Fitting a product name into a few lines on a small tag. Names put the
 * variant last ("Sunlight Detergent Pink 500g"), so when the name is too long
 * the middle gives way, never the end: two "Sunlight Detergent…" stickers
 * with different sizes could not be told apart.
 */

export type TextMeasure = {
  splitTextToSize(text: string, width: number): string[];
  getTextWidth(text: string): number;
};

const ELLIPSIS = "…";

/** A size, count or code ("500g", "2kg", "40pcs", "x6") marks the variant. */
function looksLikeVariant(word: string): boolean {
  return /\d/.test(word);
}

/**
 * The words that tell this product from its neighbours: a size and the word
 * before it ("Pink 500g", "Chicken 7g"), or a last word that follows a size
 * ("500g Pink"); otherwise just the last word.
 */
function variantTail(words: readonly string[]): string[] {
  if (words.length < 3) return words.slice(-1);
  const last = words[words.length - 1];
  const before = words[words.length - 2];
  const keepTwo = looksLikeVariant(last) || looksLikeVariant(before) || last.length <= 3;
  return keepTwo ? words.slice(-2) : words.slice(-1);
}

/** Cut the end off a single line until it fits with an ellipsis. */
function cutEnd(measure: TextMeasure, line: string, width: number): string {
  let text = line;
  while (text.length > 1 && measure.getTextWidth(`${text}${ELLIPSIS}`) > width) text = text.slice(0, -1);
  return `${text.trimEnd()}${ELLIPSIS}`;
}

/**
 * The name in at most `maxLines` lines of `width`. A name that fits is left
 * alone; a longer one keeps its start and its variant, with an ellipsis where
 * the middle was taken out. The font must already be set on `measure`.
 */
export function fitNameLines(measure: TextMeasure, name: string, width: number, maxLines = 2): string[] {
  const text = name.trim();
  const lines = measure.splitTextToSize(text, width);
  if (lines.length <= maxLines) return lines;

  const words = text.split(/\s+/);
  const tail = variantTail(words);
  const head = words.slice(0, words.length - tail.length);
  const tailText = tail.join(" ");

  // Drop head words from the end until "head… tail" fits.
  for (let keep = head.length; keep >= 1; keep -= 1) {
    const candidate = `${head.slice(0, keep).join(" ")}${ELLIPSIS} ${tailText}`;
    const split = measure.splitTextToSize(candidate, width);
    if (split.length <= maxLines) return split;
  }
  // Even one word and the tail are too long: shorten the first word itself.
  for (let length = head[0]?.length ?? 0; length >= 2; length -= 1) {
    const candidate = `${head[0].slice(0, length)}${ELLIPSIS} ${tailText}`;
    const split = measure.splitTextToSize(candidate, width);
    if (split.length <= maxLines) return split;
  }
  // The variant alone overflows: fall back to the start of the name.
  return [...lines.slice(0, maxLines - 1), cutEnd(measure, lines[maxLines - 1], width)];
}

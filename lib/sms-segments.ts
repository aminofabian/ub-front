/**
 * How many SMS parts a text is sent as. Mirrors the backend's `SmsSegments`
 * (one part = one SMS credit): plain GSM text carries 160 characters in one part
 * or 153 per part when split; anything else (emoji, most non-Latin scripts) is
 * sent as Unicode, 70 in one part or 67 per part.
 */

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
/** Each of these costs two GSM characters. */
const GSM_EXTENDED = "^{}\\[~]|€\f";

export type SmsSize = {
  /** Characters the text occupies in its encoding. */
  units: number;
  parts: number;
  encoding: "GSM" | "UNICODE";
  /** Characters left before the text needs one more part. */
  remaining: number;
};

export function isGsm7(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!GSM_BASIC.includes(c) && !GSM_EXTENDED.includes(c)) return false;
  }
  return true;
}

export function smsSize(text: string): SmsSize {
  const gsm = isGsm7(text);
  let units = 0;
  if (gsm) {
    for (let i = 0; i < text.length; i++) {
      units += GSM_EXTENDED.includes(text[i]) ? 2 : 1;
    }
  } else {
    units = text.length;
  }
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const parts = units <= single ? 1 : Math.ceil(units / multi);
  const capacity = parts === 1 ? single : parts * multi;
  return {
    units,
    parts,
    encoding: gsm ? "GSM" : "UNICODE",
    remaining: capacity - units,
  };
}

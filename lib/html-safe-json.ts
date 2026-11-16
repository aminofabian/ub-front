/**
 * Safe JSON embedding inside HTML `<script>` elements.
 *
 * `JSON.stringify` does NOT escape `<`, `>`, `&`, or the Unicode line/paragraph
 * separators (U+2028 / U+2029). Dropping its raw output into a `<script>` body
 * (inline bootstrap scripts, `application/ld+json` blocks) therefore allows a
 * `</script>` sequence inside any string value to close the element early and
 * inject arbitrary markup - a stored/reflected XSS. These helpers escape those
 * characters so the serialized value can never break out of the script element.
 *
 * The escapes use JSON string unicode escapes (e.g. `<` for `<`), which
 * are valid inside both JSON and JavaScript string literals, so the result
 * still parses as the same value and stays safe to interpolate into HTML.
 */

// Matches <, >, & and U+2028 / U+2029. Written entirely with \u escapes so this
// source file stays pure ASCII - the legacy-Safari build guard and some editors
// mangle raw line/paragraph separators.
const HTML_SENSITIVE = new RegExp("[<>&\\u2028\\u2029]", "g");

function escapeChar(ch: string): string {
  // Encode as a 4-digit \uXXXX escape: valid in both JSON and JS string
  // literals and equal to the original character after parsing.
  return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
}

/**
 * Escape an already-serialized JSON string so it is safe to place inside a
 * `<script>` element. Use this when a value was individually `JSON.stringify`d
 * (e.g. building inline-script statement strings).
 */
export function escapeJsonForScript(serialized: string): string {
  return serialized.replace(HTML_SENSITIVE, escapeChar);
}

/**
 * Serialize a value to JSON that is safe to embed in a `<script>` element
 * (inline bootstrap scripts or `application/ld+json`). Prefer this over a bare
 * `JSON.stringify` anywhere the result is interpolated into HTML.
 */
export function jsonForScript(value: unknown): string {
  return escapeJsonForScript(JSON.stringify(value));
}

export type MessageTextSegment = {
  type: "text" | "url" | "email" | "phone";
  value: string;
  href?: string;
};

/**
 * Tokenise plain chat text into tappable URLs, emails, and Kenyan phone
 * numbers while preserving everything else byte-for-byte (including newlines).
 *
 * Keep this pure and framework-free: the renderer lives in
 * `components/conversations/message-body.tsx`.
 */
// No lookbehind: the product still supports Safari/iOS versions where
// lookbehind is a syntax error. Word boundaries are checked manually below.
const TOKEN_RE =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?254\d{9}|0\d{9})/g;

function trimTrailingPunctuation(token: string): [string, string] {
  let end = token.length;
  while (end > 0) {
    const last = token[end - 1];
    if (".,;:!?".includes(last)) {
      end -= 1;
      continue;
    }
    if (last === ")" && !token.slice(0, end).includes("(")) {
      end -= 1;
      continue;
    }
    break;
  }
  return [token.slice(0, end), token.slice(end)];
}

function classify(token: string): MessageTextSegment | null {
  if (/^https?:\/\//i.test(token)) {
    return { type: "url", value: token, href: token };
  }
  if (/^www\./i.test(token)) {
    return { type: "url", value: token, href: `https://${token}` };
  }
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(token)) {
    return { type: "email", value: token, href: `mailto:${token}` };
  }
  if (/^\+?254\d{9}$/.test(token) || /^0\d{9}$/.test(token)) {
    const dialable = token.replace(/[^\d+]/g, "");
    return { type: "phone", value: token, href: `tel:${dialable}` };
  }
  return null;
}

export function parseMessageText(text: string): MessageTextSegment[] {
  if (!text) return [];
  const segments: MessageTextSegment[] = [];
  let cursor = 0;

  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const index = match.index;
    if (raw.length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const before = index > 0 ? text[index - 1] : "";
    const after = index + raw.length < text.length ? text[index + raw.length] : "";
    if ((before && /\w/.test(before)) || (after && /\w/.test(after))) {
      // Part of a larger word/number (e.g. digits inside an order code).
      continue;
    }
    if (index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, index) });
    }

    const [token, trailing] = trimTrailingPunctuation(raw);
    const link = token ? classify(token) : null;
    if (link) {
      segments.push(link);
      if (trailing) segments.push({ type: "text", value: trailing });
    } else {
      segments.push({ type: "text", value: raw });
    }
    cursor = index + raw.length;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }
  return segments;
}

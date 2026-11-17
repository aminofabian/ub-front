/**
 * Vendored emoji dataset — no runtime dependency (the frontend lockfiles are
 * frozen; see docs/plans/CHAT_TIER_1_IMPLEMENTATION.md §3). A curated, practical
 * set across the common groups, each tagged with search keywords. Deliberately
 * not the full Unicode set: these cover everyday chat without shipping a megabyte
 * of data or skin-tone permutations. Add entries as needed.
 *
 * Kept as plain object literals so the iPadOS 15 / Safari 15 legacy guard passes.
 */

export type EmojiGroup =
  | "frequent"
  | "smileys"
  | "gestures"
  | "hearts"
  | "objects"
  | "symbols";

export type EmojiEntry = {
  emoji: string;
  name: string;
  keywords: string[];
  group: Exclude<EmojiGroup, "frequent">;
};

/** The quick row shown first and used as the reaction shelf. */
export const QUICK_REACTIONS: string[] = ["👍", "❤️", "😂", "🎉", "🙏", "😮", "😢", "🔥"];

export const EMOJI: EmojiEntry[] = [
  // ── Smileys & people ──────────────────────────────────────────────────
  { emoji: "🙂", name: "slightly smiling face", keywords: ["smile", "happy"], group: "smileys" },
  { emoji: "😀", name: "grinning face", keywords: ["smile", "happy", "grin"], group: "smileys" },
  { emoji: "😄", name: "grinning face with smiling eyes", keywords: ["smile", "happy", "joy"], group: "smileys" },
  { emoji: "😁", name: "beaming face", keywords: ["grin", "smile"], group: "smileys" },
  { emoji: "😂", name: "face with tears of joy", keywords: ["laugh", "lol", "funny", "haha"], group: "smileys" },
  { emoji: "🤣", name: "rolling on the floor laughing", keywords: ["laugh", "rofl", "lol"], group: "smileys" },
  { emoji: "😊", name: "smiling face with smiling eyes", keywords: ["smile", "blush", "happy"], group: "smileys" },
  { emoji: "😍", name: "smiling face with heart-eyes", keywords: ["love", "crush", "heart"], group: "smileys" },
  { emoji: "😘", name: "face blowing a kiss", keywords: ["kiss", "love"], group: "smileys" },
  { emoji: "😎", name: "smiling face with sunglasses", keywords: ["cool", "sunglasses"], group: "smileys" },
  { emoji: "🤔", name: "thinking face", keywords: ["think", "hmm", "consider"], group: "smileys" },
  { emoji: "😅", name: "grinning face with sweat", keywords: ["sweat", "phew", "relief"], group: "smileys" },
  { emoji: "😉", name: "winking face", keywords: ["wink"], group: "smileys" },
  { emoji: "🙃", name: "upside-down face", keywords: ["sarcasm", "silly"], group: "smileys" },
  { emoji: "😇", name: "smiling face with halo", keywords: ["angel", "innocent"], group: "smileys" },
  { emoji: "🥳", name: "partying face", keywords: ["party", "celebrate", "birthday"], group: "smileys" },
  { emoji: "😮", name: "face with open mouth", keywords: ["wow", "surprise", "shock"], group: "smileys" },
  { emoji: "😲", name: "astonished face", keywords: ["shock", "surprise"], group: "smileys" },
  { emoji: "😢", name: "crying face", keywords: ["sad", "cry", "tear"], group: "smileys" },
  { emoji: "😭", name: "loudly crying face", keywords: ["cry", "sob", "sad"], group: "smileys" },
  { emoji: "😤", name: "face with steam", keywords: ["frustrated", "angry"], group: "smileys" },
  { emoji: "😠", name: "angry face", keywords: ["angry", "mad"], group: "smileys" },
  { emoji: "😴", name: "sleeping face", keywords: ["sleep", "tired", "zzz"], group: "smileys" },
  { emoji: "🤗", name: "hugging face", keywords: ["hug", "thanks"], group: "smileys" },
  { emoji: "😬", name: "grimacing face", keywords: ["awkward", "nervous"], group: "smileys" },
  { emoji: "🤯", name: "exploding head", keywords: ["mind blown", "shock", "wow"], group: "smileys" },
  { emoji: "😋", name: "face savoring food", keywords: ["yum", "tasty", "delicious"], group: "smileys" },

  // ── Gestures & body ───────────────────────────────────────────────────
  { emoji: "👍", name: "thumbs up", keywords: ["yes", "ok", "approve", "good", "like"], group: "gestures" },
  { emoji: "👎", name: "thumbs down", keywords: ["no", "dislike", "bad"], group: "gestures" },
  { emoji: "👏", name: "clapping hands", keywords: ["clap", "applause", "bravo"], group: "gestures" },
  { emoji: "🙏", name: "folded hands", keywords: ["please", "thanks", "pray", "asante"], group: "gestures" },
  { emoji: "🙌", name: "raising hands", keywords: ["celebrate", "hooray", "praise"], group: "gestures" },
  { emoji: "👋", name: "waving hand", keywords: ["hi", "hello", "bye", "wave"], group: "gestures" },
  { emoji: "🤝", name: "handshake", keywords: ["deal", "agree", "shake"], group: "gestures" },
  { emoji: "👌", name: "OK hand", keywords: ["ok", "perfect", "good"], group: "gestures" },
  { emoji: "✌️", name: "victory hand", keywords: ["peace", "victory"], group: "gestures" },
  { emoji: "🤞", name: "crossed fingers", keywords: ["hope", "luck"], group: "gestures" },
  { emoji: "💪", name: "flexed biceps", keywords: ["strong", "strength", "power"], group: "gestures" },
  { emoji: "🫡", name: "saluting face", keywords: ["salute", "respect", "yes sir"], group: "gestures" },
  { emoji: "👀", name: "eyes", keywords: ["look", "watch", "see"], group: "gestures" },

  // ── Hearts & love ─────────────────────────────────────────────────────
  { emoji: "❤️", name: "red heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "🧡", name: "orange heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "💛", name: "yellow heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "💚", name: "green heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "💙", name: "blue heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "💜", name: "purple heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "🖤", name: "black heart", keywords: ["love", "heart"], group: "hearts" },
  { emoji: "💕", name: "two hearts", keywords: ["love", "hearts"], group: "hearts" },
  { emoji: "💯", name: "hundred points", keywords: ["100", "perfect", "agree"], group: "hearts" },

  // ── Objects & commerce ────────────────────────────────────────────────
  { emoji: "🎉", name: "party popper", keywords: ["party", "celebrate", "congrats", "hooray"], group: "objects" },
  { emoji: "🎊", name: "confetti ball", keywords: ["party", "celebrate"], group: "objects" },
  { emoji: "🔥", name: "fire", keywords: ["fire", "hot", "lit", "great"], group: "objects" },
  { emoji: "✨", name: "sparkles", keywords: ["sparkle", "shiny", "new", "clean"], group: "objects" },
  { emoji: "⭐", name: "star", keywords: ["star", "favorite", "rate"], group: "objects" },
  { emoji: "💰", name: "money bag", keywords: ["money", "cash", "payment"], group: "objects" },
  { emoji: "💵", name: "dollar banknote", keywords: ["money", "cash", "paid"], group: "objects" },
  { emoji: "🛒", name: "shopping cart", keywords: ["cart", "shop", "order"], group: "objects" },
  { emoji: "🛍️", name: "shopping bags", keywords: ["shopping", "buy", "order"], group: "objects" },
  { emoji: "📦", name: "package", keywords: ["package", "parcel", "delivery", "order"], group: "objects" },
  { emoji: "🚚", name: "delivery truck", keywords: ["delivery", "shipping", "truck"], group: "objects" },
  { emoji: "📱", name: "mobile phone", keywords: ["phone", "mobile", "mpesa"], group: "objects" },
  { emoji: "🧾", name: "receipt", keywords: ["receipt", "bill", "invoice"], group: "objects" },
  { emoji: "☕", name: "hot beverage", keywords: ["coffee", "tea"], group: "objects" },
  { emoji: "🎈", name: "balloon", keywords: ["party", "celebrate"], group: "objects" },
  { emoji: "🏆", name: "trophy", keywords: ["win", "trophy", "champion"], group: "objects" },

  // ── Symbols ───────────────────────────────────────────────────────────
  { emoji: "✅", name: "check mark button", keywords: ["check", "done", "yes", "ok"], group: "symbols" },
  { emoji: "☑️", name: "check box", keywords: ["check", "done"], group: "symbols" },
  { emoji: "❌", name: "cross mark", keywords: ["no", "wrong", "cancel", "x"], group: "symbols" },
  { emoji: "❓", name: "question mark", keywords: ["question", "help", "what"], group: "symbols" },
  { emoji: "❗", name: "exclamation mark", keywords: ["important", "alert"], group: "symbols" },
  { emoji: "⚠️", name: "warning", keywords: ["warning", "caution", "alert"], group: "symbols" },
  { emoji: "👏", name: "applause", keywords: ["clap", "bravo"], group: "symbols" },
  { emoji: "🆗", name: "OK button", keywords: ["ok", "approve"], group: "symbols" },
  { emoji: "🔔", name: "bell", keywords: ["notify", "alert", "reminder"], group: "symbols" },
];

/** Case-insensitive search over name + keywords. Empty query returns all. */
export function searchEmoji(query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return EMOJI;
  return EMOJI.filter(
    (e) =>
      e.name.includes(q) ||
      e.keywords.some((k) => k.includes(q)) ||
      e.emoji === query.trim(),
  );
}

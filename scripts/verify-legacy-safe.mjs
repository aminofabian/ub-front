// Fails the build if the client bundle contains JS syntax that crashes at
// PARSE time on the oldest iPad Safari we support (iPadOS 15.x / Safari 15).
//
// Background: a single unsupported token (e.g. a `static { }` class
// initialization block — Safari < 16.4, or a regex lookbehind — Safari < 16.4)
// makes WebKit reject the ENTIRE chunk. The page then renders its SSR HTML but
// never hydrates: dead buttons, no fetches, no session, infinite skeleton.
// This is invisible on modern devices, so we guard it in CI instead.
//
// Browserslist (package.json) should down-level these. This script is the
// tripwire that catches a regression (e.g. a Next.js upgrade reintroducing the
// syntax, or a stale build cache shipping old vendor chunks).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");

/** Each pattern is fatal at parse time on Safari < 16.4. */
const FATAL_PATTERNS = [
  { name: "static initialization block", re: /static\s*\{[A-Za-z#]/ },
  { name: "regex lookbehind", re: /\(\?<[=!]/ },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

let files;
try {
  files = walk(CHUNKS_DIR);
} catch (err) {
  console.error(`[verify-legacy-safe] cannot read ${CHUNKS_DIR}: ${err.message}`);
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const code = readFileSync(file, "utf8");
  for (const { name, re } of FATAL_PATTERNS) {
    const m = re.exec(code);
    if (m) {
      const idx = Math.max(0, m.index - 30);
      violations.push(
        `${file.replace(process.cwd() + "/", "")}: ${name}\n    …${code
          .slice(idx, m.index + 40)
          .replace(/\n/g, " ")}…`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    "\n[verify-legacy-safe] FATAL: client bundle contains syntax that crashes old iPad Safari (< 16.4):\n",
  );
  for (const v of violations) console.error("  - " + v);
  console.error(
    "\nFix: ensure `browserslist` in package.json targets old iOS and the build " +
      "did a clean compile (this build clears .next/cache). Do not ship until clean.\n",
  );
  process.exit(1);
}

console.log(
  `[verify-legacy-safe] OK — ${files.length} chunks free of parse-fatal syntax for old iPad Safari.`,
);

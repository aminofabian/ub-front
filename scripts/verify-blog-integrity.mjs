// Quick integrity check for blog content:
//  1. every `image` block's `src` exists under public/
//  2. every `links` block's `href` resolves to a real article slug
//  3. every `relatedSlugs` entry resolves to a real article
//  4. no duplicate slugs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const { BLOG_ARTICLES } = await import("../lib/blog/content.ts");

const slugs = new Set(BLOG_ARTICLES.map((a) => a.slug));
const problems = [];

// duplicate slugs
const seen = new Set();
for (const a of BLOG_ARTICLES) {
  if (seen.has(a.slug)) problems.push(`DUPLICATE slug: ${a.slug}`);
  seen.add(a.slug);
}

for (const article of BLOG_ARTICLES) {
  for (const [i, block] of article.body.entries()) {
    if (block.type === "image") {
      const file = path.join(publicDir, block.src.replace(/^\//, ""));
      if (!fs.existsSync(file)) {
        problems.push(
          `${article.slug} body[${i}] image missing: ${block.src}`,
        );
      }
    }
    if (block.type === "links") {
      for (const item of block.items) {
        const href = item.href;
        // Only /blog/* links must resolve to a registered article;
        // other internal routes (e.g. /barcode) and anchors are fine.
        if (!href.startsWith("/blog/")) continue;
        const slug = href.replace(/^\/blog\//, "");
        if (!slug || !slugs.has(slug)) {
          problems.push(
            `${article.slug} body[${i}] links broken: ${href}`,
          );
        }
      }
    }
  }
  for (const rel of article.relatedSlugs) {
    if (!slugs.has(rel)) {
      problems.push(`${article.slug} relatedSlugs broken: ${rel}`);
    }
  }
}

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(
  `OK: ${BLOG_ARTICLES.length} articles, all image srcs, links, and relatedSlugs resolve.`,
);

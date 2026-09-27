import fs from "node:fs";
import path from "node:path";
import { listArticles, getArticle } from "../lib/blog";
import {
  POS_COST_PILLAR_SLUG,
  POS_COST_SPOKE_SLUGS,
  POS_COST_ARTICLES,
} from "../lib/blog/cluster-pos-cost";

const refs = listArticles();
const valid = new Set(refs.map((r) => r.slug));
const problems: string[] = [];
const nonBlog: string[] = [];
let images = 0;
let articlesWithFaqs = 0;
let faqCount = 0;
let links = 0;

const counts = new Map<string, number>();
for (const r of refs) counts.set(r.slug, (counts.get(r.slug) ?? 0) + 1);
for (const [s, c] of counts) if (c > 1) problems.push(`duplicate slug: ${s} (${c})`);

if (!valid.has(POS_COST_PILLAR_SLUG))
  problems.push(`pillar slug missing: ${POS_COST_PILLAR_SLUG}`);
for (const s of POS_COST_SPOKE_SLUGS)
  if (!valid.has(s)) problems.push(`spoke slug missing from registry: ${s}`);

for (const art of POS_COST_ARTICLES) {
  if (!valid.has(art.slug)) problems.push(`article not registered: ${art.slug}`);
  if (!art.title) problems.push(`${art.slug}: no title`);
  if (!art.description || art.description.length < 60)
    problems.push(`${art.slug}: description too short`);
  if (!art.tags?.length) problems.push(`${art.slug}: no tags`);
  if (art.faqs?.length) {
    articlesWithFaqs++;
    faqCount += art.faqs.length;
  }
  for (const rs of art.relatedSlugs)
    if (!valid.has(rs)) problems.push(`${art.slug}: relatedSlug missing -> ${rs}`);
  for (const b of art.body) {
    if (b.type === "links") {
      for (const it of b.items) {
        links++;
        if (it.href.startsWith("/blog/")) {
          const slug = it.href.slice("/blog/".length);
          if (!valid.has(slug)) problems.push(`${art.slug}: broken link -> ${it.href}`);
        } else {
          nonBlog.push(it.href);
        }
      }
    }
    if (b.type === "image") {
      images++;
      const p = path.join("public", b.src.replace(/^\//, ""));
      if (!fs.existsSync(p)) problems.push(`${art.slug}: missing image file ${b.src}`);
    }
  }
}

let globalRelatedChecked = 0;
for (const r of refs) {
  const a = getArticle(r.slug);
  if (!a) {
    problems.push(`no article for ref: ${r.slug}`);
    continue;
  }
  for (const rs of a.relatedSlugs) {
    globalRelatedChecked++;
    if (!valid.has(rs)) problems.push(`${a.slug}: relatedSlug missing -> ${rs}`);
  }
}

console.log(
  JSON.stringify(
    {
      registryArticles: refs.length,
      clusterArticles: POS_COST_ARTICLES.length,
      clusterSpokes: POS_COST_SPOKE_SLUGS.length,
      imagesChecked: images,
      articlesWithFaqs,
      faqCount,
      internalLinksChecked: links,
      globalRelatedChecked,
      nonBlogHrefs: [...new Set(nonBlog)].sort(),
      problems: problems.length ? problems : "NONE",
    },
    null,
    2,
  ),
);

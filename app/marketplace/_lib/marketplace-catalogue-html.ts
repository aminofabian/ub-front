/**
 * Shareable HTML price list (phone-first). Matches the Githurai catalogue
 * sheet: forest hero, A–Z jump, search, mango prices, WhatsApp FAB.
 */
import type { MarketplaceSupplierDetail } from "@/lib/marketplace-api";
import {
  catalogPackLabel,
  groupCatalogProducts,
  normalizeCatalogLabel,
  type CatalogProductGroup,
} from "@/lib/marketplace-catalog-groups";
import { normalizeWhatsAppPhone } from "./marketplace-order-pdf";

export type CatalogueHtmlInput = {
  detail: MarketplaceSupplierDetail;
};

type HtmlItem = {
  name: string;
  unit?: string;
  price?: string;
  variants?: [string, string][];
};

type HtmlSection = { letter: string; items: HtmlItem[] };

export function buildMarketplaceCatalogueHtml({ detail }: CatalogueHtmlInput): string {
  const groups = groupCatalogProducts(detail.products);
  const sections = toSections(groups);
  const familyCount = groups.length;
  const packCount = detail.products.length;
  const itemCount = sections.reduce((n, s) => n + s.items.length, 0);

  const now = new Date();
  const dateLong = now.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateShort = now.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const locations = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => Boolean(l))
    .filter((l) => !/^(optional|n\/a|na|none|-)$/i.test(l))
    .filter((l, i, arr) => arr.indexOf(l) === i);
  const eyebrow = locations.join(" · ");
  const listedBy = detail.listedBy?.trim() || "";
  const rawPhone = detail.contactPhone?.trim() || "";
  const phoneDisplay = rawPhone ? formatPhoneDisplay(rawPhone) : "";
  const wa = normalizeWhatsAppPhone(rawPhone);
  const tel = wa ? `+${wa}` : rawPhone.replace(/\s+/g, "");

  const dataJson = JSON.stringify(sections).replace(/</g, "\\u003c");
  const title = `${detail.name} — Price List`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
${CATALOGUE_CSS}
</style>
</head>
<body>
<div class="hero">
  ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
  <h1>${esc(detail.name)}</h1>
  ${listedBy ? `<p class="sub">${esc(listedBy)}</p>` : ""}
  <div class="stats">
    <span class="stat-pill">${familyCount} ${familyCount === 1 ? "family" : "families"} served</span>
    <span class="stat-pill">${packCount} ${packCount === 1 ? "pack" : "packs"} on the list</span>
    <span class="stat-pill">Updated ${esc(dateShort)}</span>
  </div>
</div>
${
  phoneDisplay
    ? `<div class="contact">
  <a class="phone-link" href="tel:${esc(tel)}">${esc(phoneDisplay)}</a>
  <span class="contact-note">WhatsApp or call with packs &amp; quantities</span>
</div>`
    : ""
}
<nav class="azbar" id="azbar"></nav>
<div class="search-wrap">
  <input id="search" type="search" placeholder="Find an item — e.g. tomatoes, avocado, kales…" autocomplete="off">
  <p class="search-hint" id="resultCount"></p>
</div>
<main id="catalogue"></main>
<p class="no-results" id="noResults">No items match that search. Try another name.</p>
<footer>Kiosk.ke &nbsp;·&nbsp; ${esc(dateLong)} &nbsp;·&nbsp; 1/1</footer>
${
  wa
    ? `<a class="wa-fab" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.478 2 2 6.477 2 12c0 1.85.5 3.585 1.373 5.075L2 22l5.064-1.328A9.94 9.94 0 0 0 12.004 22C17.53 22 22 17.523 22 12S17.53 2 12.004 2zm0 18.06a8.02 8.02 0 0 1-4.09-1.12l-.293-.174-3.007.789.803-2.93-.19-.302A8.02 8.02 0 0 1 3.94 12c0-4.45 3.62-8.06 8.064-8.06 4.444 0 8.064 3.61 8.064 8.06 0 4.45-3.62 8.06-8.064 8.06z"/></svg>
  WhatsApp order
</a>`
    : ""
}
<script>
const data = ${dataJson};
const packCount = ${packCount};
const itemCount = ${itemCount};
const azbar = document.getElementById('azbar');
const cat = document.getElementById('catalogue');

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtPrice(p){
  if(p === "Ask") return '<span class="price ask">Ask</span>';
  if(/^[A-Za-z]/.test(p) && /\\s/.test(p)) return '<span class="price">'+esc(p)+'</span>';
  return '<span class="price">Ksh '+esc(p)+'</span>';
}
function fmtVariantPrice(p){
  if(p === "Ask") return '<span class="variant-price ask">Ask</span>';
  if(/^[A-Za-z]/.test(p) && /\\s/.test(p)) return '<span class="variant-price">'+esc(p)+'</span>';
  return '<span class="variant-price">Ksh '+esc(p)+'</span>';
}

data.forEach(section => {
  azbar.innerHTML += '<a href="#letter-'+esc(section.letter)+'">'+esc(section.letter)+'</a>';
  const sec = document.createElement('div');
  sec.className = 'letter-section';
  sec.id = 'letter-'+section.letter;
  let html = '<div class="letter-stamp">'+esc(section.letter)+'</div>';
  section.items.forEach(it => {
    const searchKey = (it.name+' '+(it.unit||'')+' '+(it.variants ? it.variants.map(v=>v[0]).join(' ') : '')).toLowerCase();
    html += '<div class="item" data-search="'+esc(searchKey)+'">';
    html += '<div class="item-row"><span class="item-name">'+esc(it.name)+(it.unit ? ' <span class="item-unit">· '+esc(it.unit)+'</span>' : '')+'</span><span class="leader"></span>'+(it.price ? fmtPrice(it.price) : '')+'</div>';
    if(it.variants){
      html += '<div class="variants">';
      it.variants.forEach(([vname, vprice]) => {
        html += '<div class="variant-row"><span class="variant-name">'+esc(vname)+'</span><span class="variant-leader"></span>'+fmtVariantPrice(vprice)+'</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  sec.innerHTML = html;
  cat.appendChild(sec);
});

document.getElementById('resultCount').textContent = itemCount+' items · '+packCount+' packs available';

const search = document.getElementById('search');
const noResults = document.getElementById('noResults');
search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.letter-section').forEach(sec => {
    let sectionVisible = 0;
    sec.querySelectorAll('.item').forEach(item => {
      const match = !q || (item.dataset.search || '').includes(q);
      item.classList.toggle('hidden', !match);
      if(match) sectionVisible++;
    });
    sec.classList.toggle('hidden', sectionVisible === 0);
    visible += sectionVisible;
  });
  noResults.style.display = visible === 0 ? 'block' : 'none';
  document.getElementById('resultCount').textContent = q
    ? visible+' match'+(visible===1?'':'es')+' for "'+search.value.trim()+'"'
    : itemCount+' items · '+packCount+' packs available';
});
</script>
</body>
</html>
`;
}

function toSections(groups: CatalogProductGroup[]): HtmlSection[] {
  const byLetter = new Map<string, HtmlItem[]>();
  for (const group of groups) {
    const ch = group.label.trim().charAt(0).toUpperCase();
    const letter = ch >= "A" && ch <= "Z" ? ch : "#";
    const list = byLetter.get(letter) ?? [];
    list.push(toHtmlItem(group));
    byLetter.set(letter, list);
  }
  return [...byLetter.entries()].map(([letter, items]) => ({ letter, items }));
}

function toHtmlItem(group: CatalogProductGroup): HtmlItem {
  if (group.items.length > 1) {
    return {
      name: group.label,
      variants: group.items.map((product) => {
        const pack = catalogPackLabel(product, group.label);
        const label =
          normalizeCatalogLabel(pack) === normalizeCatalogLabel(group.label) ? "Each" : pack;
        return [label, priceToken(product)];
      }),
    };
  }
  const product = group.items[0];
  const pack = catalogPackLabel(product, group.label);
  if (normalizeCatalogLabel(pack) === normalizeCatalogLabel(group.label)) {
    return { name: group.label, price: priceToken(product) };
  }
  return { name: group.label, unit: pack, price: priceToken(product) };
}

function priceToken(product: CatalogProductGroup["items"][number]): string {
  if (product.unitPrice == null) return "Ask";
  const n = Number(product.unitPrice);
  if (!Number.isFinite(n)) return "Ask";
  const code = (product.currency ?? "KES").trim().toUpperCase();
  if (code === "KES" || !code) return n.toFixed(2);
  return `${code} ${n.toFixed(2)}`;
}

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("254")) {
    return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim();
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CATALOGUE_CSS = `
  :root{
    --ink:#24312A;
    --ink-soft:#5C6A5F;
    --paper:#EFF2EC;
    --paper-raised:#F8FAF6;
    --line:#D8DECE;
    --forest:#2F5233;
    --forest-deep:#1E3B26;
    --mango:#E08A24;
    --mango-deep:#B9691A;
    --tomato:#C1452B;
    --whatsapp:#3A7D5C;
  }

  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:var(--paper);
    color:var(--ink);
    font-family:'Work Sans', ui-sans-serif, sans-serif;
    padding-bottom:90px;
  }

  .hero{
    background:var(--forest-deep);
    color:var(--paper-raised);
    padding:28px 20px 22px;
    position:relative;
    overflow:hidden;
  }
  .hero::after{
    content:"";
    position:absolute;
    right:-40px; top:-40px;
    width:160px; height:160px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(224,138,36,0.25), transparent 70%);
  }
  .eyebrow{
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:12px;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:#B9C9B4;
    margin:0 0 6px;
  }
  h1{
    font-family:'Fraunces', ui-serif, Georgia, serif;
    font-weight:700;
    font-size:34px;
    line-height:1.05;
    margin:0 0 8px;
  }
  .sub{
    font-size:14.5px;
    color:#CBD8C4;
    margin:0 0 18px;
  }
  .stats{
    display:flex; gap:8px; flex-wrap:wrap;
  }
  .stat-pill{
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:12px;
    background:rgba(255,255,255,0.08);
    border:1px solid rgba(255,255,255,0.18);
    color:#E7EEE2;
    padding:5px 11px;
    border-radius:100px;
  }

  .contact{
    background:var(--forest);
    padding:14px 20px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
  }
  .phone-link{
    color:#fff;
    text-decoration:none;
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:19px;
    font-weight:600;
    letter-spacing:0.02em;
  }
  .contact-note{
    color:#D6E3D0;
    font-size:12.5px;
  }

  .azbar{
    position:sticky; top:0; z-index:20;
    background:var(--paper-raised);
    border-bottom:1px solid var(--line);
    display:flex;
    overflow-x:auto;
    padding:9px 12px;
    gap:6px;
    scrollbar-width:none;
  }
  .azbar::-webkit-scrollbar{display:none;}
  .azbar a{
    flex:0 0 auto;
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:12.5px;
    font-weight:600;
    color:var(--forest);
    background:var(--paper);
    border:1px solid var(--line);
    border-radius:6px;
    padding:5px 9px;
    text-decoration:none;
  }
  .azbar a:active{ background:var(--forest); color:#fff; }

  .search-wrap{
    padding:16px 20px 4px;
  }
  #search{
    width:100%;
    font-family:'Work Sans', ui-sans-serif, sans-serif;
    font-size:16px;
    padding:11px 14px;
    border-radius:10px;
    border:1px solid var(--line);
    background:var(--paper-raised);
    color:var(--ink);
    outline:none;
  }
  #search:focus{ border-color:var(--forest); }
  .search-hint{
    font-size:12px; color:var(--ink-soft); margin:6px 2px 0;
    font-family:'IBM Plex Mono', ui-monospace, monospace;
  }

  main{ padding:6px 16px 30px; max-width:640px; margin:0 auto; }

  .letter-section{ margin-top:26px; scroll-margin-top:56px; }

  .letter-stamp{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:34px; height:34px;
    border:2px solid var(--forest);
    border-radius:8px;
    transform:rotate(-3deg);
    font-family:'Fraunces', ui-serif, Georgia, serif;
    font-weight:700;
    font-size:18px;
    color:var(--forest);
    margin-bottom:10px;
  }

  .item{
    padding:10px 4px;
    border-bottom:1px dashed var(--line);
  }
  .item-row{
    display:flex;
    align-items:baseline;
    gap:8px;
  }
  .item-name{
    font-weight:600;
    font-size:15px;
    color:var(--ink);
  }
  .item-unit{
    font-size:12px; color:var(--ink-soft); font-weight:400;
  }
  .leader{
    flex:1;
    border-bottom:1px dotted #B9C2AC;
    margin-bottom:4px;
    min-width:14px;
  }
  .price{
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-weight:600;
    font-size:14.5px;
    color:var(--mango-deep);
    white-space:nowrap;
  }
  .price.ask{
    color:var(--tomato);
    font-style:italic;
    font-weight:500;
  }

  .variants{ margin-top:6px; padding-left:2px; }
  .variant-row{
    display:flex; align-items:baseline; gap:8px;
    padding:4px 0 4px 14px;
    border-left:2px solid var(--line);
  }
  .variant-name{ font-size:13.5px; color:var(--ink); }
  .variant-leader{
    flex:1; border-bottom:1px dotted #C6CDB9; margin-bottom:3px; min-width:10px;
  }
  .variant-price{
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:13px; font-weight:600; color:var(--mango-deep); white-space:nowrap;
  }
  .variant-price.ask{ color:var(--tomato); font-style:italic; font-weight:500; }

  .hidden{ display:none !important; }
  .no-results{
    text-align:center; color:var(--ink-soft);
    font-size:14px; padding:40px 10px; display:none;
  }

  footer{
    text-align:center;
    font-family:'IBM Plex Mono', ui-monospace, monospace;
    font-size:11.5px;
    color:var(--ink-soft);
    padding:26px 20px 10px;
  }

  .wa-fab{
    position:fixed;
    right:18px; bottom:18px;
    background:var(--whatsapp);
    color:#fff;
    text-decoration:none;
    font-family:'Work Sans', ui-sans-serif, sans-serif;
    font-weight:600;
    font-size:14px;
    padding:13px 18px;
    border-radius:100px;
    box-shadow:0 6px 18px rgba(30,59,38,0.35);
    display:flex; align-items:center; gap:8px;
    z-index:30;
    animation:pulse 2.6s ease-in-out infinite;
  }
  .wa-fab svg{ width:18px; height:18px; fill:#fff; }
  @keyframes pulse{
    0%,100%{ box-shadow:0 6px 18px rgba(30,59,38,0.35); }
    50%{ box-shadow:0 6px 22px rgba(58,125,92,0.55); }
  }
  @media (prefers-reduced-motion: reduce){
    .wa-fab{ animation:none; }
    html{ scroll-behavior:auto; }
  }

  @media (min-width:680px){
    main{ padding:10px 16px 40px; }
  }
`.trim();

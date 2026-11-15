"use client";

import { ArrowLeft, Printer, QrCode } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  defaultMenuQrOptions,
  MENU_QR_LAYOUTS,
  menuPageUrl,
  menuQrGrid,
  menuQrHeadline,
  menuQrPages,
  readableAddress,
  readMenuQrOptions,
  tablesWithCodes,
  type MenuQrLayout,
  type MenuQrOptions,
} from "@/lib/menu-qr";
import { PRINTED_MENU_INKS, PRINTED_MENU_PAPERS } from "@/lib/printed-menu";
import {
  fetchRestaurantSettings,
  fetchTables,
  saveRestaurantSettings,
  type RestaurantSettingsRecord,
  type RestaurantTableRecord,
} from "@/lib/restaurant-api";
import { cn } from "@/lib/utils";

import { appFonts } from "../../print/_components/app-fonts";
import { PaperFrame, type PaperFrameHandle } from "../../print/_components/paper-frame";
import { menuQrCss } from "./menu-qr-css";
import { MenuQrSheet } from "./menu-qr-sheet";

const MM_TO_PX = 96 / 25.4;
const INK_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)]";
const ON = "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-1";
const CHOICE = cn("min-h-11 rounded-[2px] border px-3 py-2 text-left text-sm font-semibold transition-[border-color,background-color] duration-200", INK_RULE, FOCUS);

/** A QR code on paper: for the menu page, or one for each table that customers may order from. */
export function MenuQrStudio({ canManage }: { canManage: boolean }) {
  const { branchId, business } = useDashboard();
  const shopName = business?.name?.trim() || "Menu";
  const storageKey = `kiosk.menu-qr.${business?.id ?? "shop"}`;

  const [settings, setSettings] = useState<RestaurantSettingsRecord | null>(null);
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [failed, setFailed] = useState(false);
  const [options, setOptions] = useState<MenuQrOptions>(() => defaultMenuQrOptions(shopName));
  const [restored, setRestored] = useState(false);
  const [fonts, setFonts] = useState<ReturnType<typeof appFonts> | null>(null);
  const [origin, setOrigin] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [switching, setSwitching] = useState(false);
  const frame = useRef<PaperFrameHandle>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [s, t] = await Promise.all([
        fetchRestaurantSettings(),
        // Tables belong to a branch; with none chosen there are simply no table codes to print.
        branchId ? fetchTables(branchId) : Promise.resolve([] as RestaurantTableRecord[]),
      ]);
      setSettings(s);
      setTables(t);
    } catch {
      setFailed(true);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let saved: unknown = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    } catch {
      // Nothing saved, or storage is refused; start from the usual sheet.
    }
    setOptions(readMenuQrOptions(saved, shopName));
    setRestored(true);
    setFonts(appFonts());
    setOrigin(window.location.origin);
  }, [storageKey, shopName]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(options));
    } catch {
      // Not remembered; the sheet still prints.
    }
  }, [options, restored, storageKey]);

  const set = <K extends keyof MenuQrOptions>(key: K, value: MenuQrOptions[K]) => setOptions((prev) => ({ ...prev, [key]: value }));

  const pages = useMemo(() => (origin ? menuQrPages({ options, origin, tables }) : []), [options, origin, tables]);

  // Draw each address once. Black on white, with the library's medium error correction: a code
  // on a table gets scuffed and splashed.
  useEffect(() => {
    const wanted = Array.from(new Set(pages.flat().map((c) => c.url))).filter((url) => !codes[url]);
    if (wanted.length === 0) return;
    let live = true;
    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const drawn: Record<string, string> = {};
      for (const url of wanted) {
        drawn[url] = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
      }
      if (live) setCodes((prev) => ({ ...prev, ...drawn }));
    })().catch(() => {
      if (live) toast.error("Could not draw the code. Reload the page and try again.");
    });
    return () => {
      live = false;
    };
  }, [pages, codes]);

  const paper = PRINTED_MENU_PAPERS.find((p) => p.id === options.paper) ?? PRINTED_MENU_PAPERS[0];
  const accent = (PRINTED_MENU_INKS.find((i) => i.id === options.ink) ?? PRINTED_MENU_INKS[0]).hex;
  const css = useMemo(
    () =>
      menuQrCss({
        paper: options.paper,
        layout: options.layout,
        accent,
        serif: fonts?.serif ?? "Georgia, serif",
        sans: fonts?.sans ?? "Arial, sans-serif",
        mono: fonts?.mono ?? "monospace",
        fontFaces: fonts?.fontFaces ?? "",
      }),
    [options.paper, options.layout, accent, fonts],
  );

  if (failed) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoadError title="QR codes" message="Could not load your tables and settings. Check your connection and try again." onRetry={() => void load()} />
      </div>
    );
  }
  if (settings == null) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoading label="Loading…" />
      </div>
    );
  }

  const coded = tablesWithCodes(tables);
  const count = pages.reduce((n, p) => n + p.length, 0);
  const ready = count > 0 && pages.flat().every((c) => Boolean(codes[c.url]));
  const grid = menuQrGrid(options.layout, options.paper);
  const emptyText =
    options.target === "tables"
      ? "No table has a code yet. Give tables their codes under Floor, Tables."
      : "Drawing the code…";

  function print() {
    if (!ready) {
      toast.error(count === 0 ? "There is nothing on the sheet to print yet" : "The code is still being drawn. Try again in a moment.");
      return;
    }
    if (!frame.current?.print()) toast.error("The sheet is not ready yet. Try again in a moment.");
  }

  async function switchOn(change: Partial<RestaurantSettingsRecord>, done: string) {
    setSwitching(true);
    try {
      setSettings(await saveRestaurantSettings(change));
      toast.success(done);
    } catch (e) {
      toast.error(e instanceof ApiRequestError && e.message ? e.message : "Could not change the setting. Try again.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-5")}>
      <DashboardPageHero icon={QrCode} title="QR codes" description="A code customers scan with their phone, ready to print for the door, the counter and the tables.">
        <Button asChild variant="outline" size="sm">
          <Link href={APP_ROUTES.restaurantMenu}>
            <ArrowLeft className="size-4" aria-hidden /> Menu
          </Link>
        </Button>
        <Button size="sm" onClick={print}>
          <Printer className="size-4" aria-hidden /> Print or save as PDF
        </Button>
      </DashboardPageHero>

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section className={cn(DASHBOARD_SECTION_SURFACE, "grid gap-5")} aria-label="What the code does and how it prints">
          <fieldset className="grid gap-2">
            <legend className={dashboardLabelClass()}>What the code opens</legend>
            <div className="grid gap-2" role="radiogroup" aria-label="What the code opens">
              <button type="button" role="radio" aria-checked={options.target === "menu"} className={cn(CHOICE, options.target === "menu" && ON)} onClick={() => set("target", "menu")}>
                Your menu page
                <span className={`block font-normal ${dashboardHintClass()}`}>One code for the whole restaurant. Customers read the menu; they cannot order from it.</span>
              </button>
              <button type="button" role="radio" aria-checked={options.target === "tables"} className={cn(CHOICE, options.target === "tables" && ON)} onClick={() => set("target", "tables")}>
                Ordering from a table
                <span className={`block font-normal ${dashboardHintClass()}`}>A different code for each table. The order goes to that table and waits for staff to send it.</span>
              </button>
            </div>
          </fieldset>

          {options.target === "menu" && !settings.menuOnline ? (
            <div role="status" className={cn("grid gap-2 rounded-[2px] border p-3 text-sm", INK_RULE, "bg-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_8%,transparent)]")}>
              <p>
                <strong>Your menu is not on your web page yet.</strong> The code works, but it opens your page without the menu.
              </p>
              {canManage ? (
                <Button size="sm" variant="outline" disabled={switching} className="justify-self-start" onClick={() => void switchOn({ menuOnline: true }, "Your menu is now on your web page")}>
                  {switching ? "Switching on…" : "Show the menu on your web page"}
                </Button>
              ) : (
                <p className={dashboardHintClass()}>Ask the owner to switch it on under Menu, How the restaurant runs.</p>
              )}
            </div>
          ) : null}
          {options.target === "tables" && !settings.qrOrdering ? (
            <div role="status" className={cn("grid gap-2 rounded-[2px] border p-3 text-sm", INK_RULE, "bg-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_8%,transparent)]")}>
              <p>
                <strong>Ordering from tables is switched off.</strong> Table codes will not work until it is on.
              </p>
              {canManage ? (
                <Button size="sm" variant="outline" disabled={switching} className="justify-self-start" onClick={() => void switchOn({ qrOrdering: true }, "Customers can now order from a table's code")}>
                  {switching ? "Switching on…" : "Let customers order from tables"}
                </Button>
              ) : (
                <p className={dashboardHintClass()}>Ask the owner to switch it on under Menu, How the restaurant runs.</p>
              )}
            </div>
          ) : null}
          {options.target === "tables" ? (
            <p className={dashboardHintClass()}>
              {coded.length === 0
                ? "No table has a code yet. Open Floor, then Tables, and press QR code beside each table."
                : `${coded.length} of ${tables.filter((t) => t.active).length} tables in use have a code. Give the others one under Floor, Tables. Making a new code for a table means printing its card again.`}
            </p>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className={dashboardLabelClass()}>Size</legend>
            <div className="grid gap-2" role="radiogroup" aria-label="Size">
              {MENU_QR_LAYOUTS.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={options.layout === l.id} className={cn(CHOICE, "flex items-center gap-3", options.layout === l.id && ON)} onClick={() => set("layout", l.id)}>
                  <LayoutSketch layout={l.id} />
                  <span>
                    {l.name}
                    <span className={`block font-normal ${dashboardHintClass()}`}>{l.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Paper</span>
              <select className={dashboardSelectClass(false)} value={options.paper} onChange={(e) => set("paper", e.target.value as MenuQrOptions["paper"])}>
                {PRINTED_MENU_PAPERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-1">
              <legend className={dashboardLabelClass()}>Colour of the words</legend>
              <div className="flex min-h-11 flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Colour of the words">
                {PRINTED_MENU_INKS.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    role="radio"
                    aria-checked={options.ink === ink.id}
                    aria-label={ink.name}
                    onClick={() => set("ink", ink.id)}
                    className={cn("h-8 w-8 rounded-full border-2 border-transparent p-0.5 transition-[border-color] duration-200", options.ink === ink.id && "border-[var(--order-ink,#121A16)]", FOCUS)}
                  >
                    <span className="block h-full w-full rounded-full" style={{ background: ink.hex }} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Name at the top</span>
            <input className={dashboardInputClass(false)} value={options.title} maxLength={80} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>What to tell the customer</span>
            <input className={dashboardInputClass(false)} value={options.headline} maxLength={60} placeholder={menuQrHeadline({ target: options.target, headline: "" })} onChange={(e) => set("headline", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Line at the bottom (optional)</span>
            <input className={dashboardInputClass(false)} value={options.line} maxLength={120} placeholder="Wi-Fi: Diner Guest" onChange={(e) => set("line", e.target.value)} />
            <span className={dashboardHintClass()}>Left off the small labels; there is no room.</span>
          </label>
          {options.target === "menu" ? (
            <label className="flex min-h-9 items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={options.address} onChange={(e) => set("address", e.target.checked)} />
              <span>
                Print the address under the code
                <span className={`block ${dashboardHintClass()}`}>For a phone that will not scan: {origin ? readableAddress(menuPageUrl(origin)) : "your shop's address"}</span>
              </span>
            </label>
          ) : null}

          <div className="grid gap-2 border-t pt-4">
            <Button onClick={print}>
              <Printer className="size-4" aria-hidden /> Print or save as PDF
            </Button>
            <span className={dashboardHintClass()}>
              Print at full size (100%, not &ldquo;fit to page&rdquo;) on {paper.name.split(" ")[0]} paper, with headers and footers off. Scan one with your own phone before
              you cut and laminate the rest.
            </span>
          </div>
        </section>

        <section aria-label="The pages" className="min-w-0">
          <p className={cn("mb-2", dashboardHintClass())}>
            {count === 0
              ? "Nothing to print yet."
              : `${count} ${count === 1 ? "code" : "codes"} on ${pages.length} ${pages.length === 1 ? "page" : "pages"} of ${paper.name.split(" ")[0]}${
                  grid.columns * grid.rows > 1 ? `, ${grid.columns * grid.rows} to a page. Cut along the dashed lines.` : "."
                }`}
          </p>
          <PaperFrame
            ref={frame}
            css={css}
            documentTitle={`${options.title.trim() || shopName} QR ${options.target === "tables" ? "table codes" : "code"}`}
            paperWidthPx={paper.widthMm * MM_TO_PX}
            className={cn("h-[78vh] min-h-[28rem] w-full rounded-[2px] border bg-[#e9e6df]", INK_RULE)}
          >
            <MenuQrSheet options={options} pages={ready ? pages : []} codes={codes} emptyText={emptyText} />
          </PaperFrame>
        </section>
      </div>
    </div>
  );
}

/** How many codes a page holds, drawn small. */
function LayoutSketch({ layout }: { layout: MenuQrLayout }) {
  const { columns, rows } = menuQrGrid(layout, "a4");
  return (
    <span aria-hidden className="grid h-12 w-9 shrink-0 gap-[2px] rounded-[1px] border border-black/15 bg-white p-[3px]" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {Array.from({ length: columns * rows }, (_, i) => (
        <span key={i} className="grid place-items-center">
          <span className="block aspect-square w-[60%] max-w-[14px] bg-[#121a16]" />
        </span>
      ))}
    </span>
  );
}

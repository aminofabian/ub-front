"use client";

import { ArrowLeft, Printer } from "lucide-react";
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
import { APP_ROUTES } from "@/lib/config";
import {
  defaultPrintedMenuOptions,
  PRINTED_MENU_INKS,
  PRINTED_MENU_PAPERS,
  PRINTED_MENU_TEMPLATES,
  printedHeadings,
  printedSections,
  readPrintedMenuOptions,
  type PrintedMenuOptions,
  type PrintedMenuTemplate,
} from "@/lib/printed-menu";
import { fetchMenu, type MenuRecord } from "@/lib/restaurant-api";
import { cn } from "@/lib/utils";

import { appFonts } from "./app-fonts";
import { PaperFrame, type PaperFrameHandle } from "./paper-frame";
import { printedMenuCss } from "./printed-menu-css";
import { PrintedMenuSheet } from "./printed-menu-sheet";

const MM_TO_PX = 96 / 25.4;
const INK_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_14%,transparent)]";
const ON = "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-1";

/** Choose a template, say what goes on the sheet, see it, print it or save it as a PDF. */
export function MenuPrintStudio() {
  const { branchId, business } = useDashboard();
  const shopName = business?.name?.trim() || "Menu";
  const storageKey = `kiosk.printed-menu.${business?.id ?? "shop"}`;

  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [failed, setFailed] = useState(false);
  const [options, setOptions] = useState<PrintedMenuOptions>(() => defaultPrintedMenuOptions(shopName));
  const [restored, setRestored] = useState(false);
  const [fonts, setFonts] = useState<ReturnType<typeof appFonts> | null>(null);
  const frame = useRef<PaperFrameHandle>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setMenu(await fetchMenu(branchId || null));
    } catch {
      setFailed(true);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The last sheet this shop set up on this device, so the owner does not start again each time.
  useEffect(() => {
    let saved: unknown = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    } catch {
      // Nothing saved, or storage is refused; start from the usual sheet.
    }
    setOptions(readPrintedMenuOptions(saved, shopName));
    setRestored(true);
    setFonts(appFonts());
  }, [storageKey, shopName]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(options));
    } catch {
      // Not remembered; the sheet still prints.
    }
  }, [options, restored, storageKey]);

  const set = <K extends keyof PrintedMenuOptions>(key: K, value: PrintedMenuOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const headings = useMemo(() => (menu ? printedHeadings(menu) : []), [menu]);
  const sections = useMemo(
    () => (menu ? printedSections(menu, options, business?.currency?.trim() || "KES") : []),
    [menu, options, business?.currency],
  );
  const paper = PRINTED_MENU_PAPERS.find((p) => p.id === options.paper) ?? PRINTED_MENU_PAPERS[0];
  const accent = (PRINTED_MENU_INKS.find((i) => i.id === options.ink) ?? PRINTED_MENU_INKS[0]).hex;
  const css = useMemo(
    () =>
      printedMenuCss({
        paper: options.paper,
        accent,
        serif: fonts?.serif ?? "Georgia, serif",
        sans: fonts?.sans ?? "Arial, sans-serif",
        mono: fonts?.mono ?? "monospace",
        fontFaces: fonts?.fontFaces ?? "",
      }),
    [options.paper, accent, fonts],
  );
  const dishCount = sections.reduce((n, s) => n + s.dishes.length, 0);
  const pictured = menu ? menu.items.filter((i) => i.active && i.imageUrl).length : 0;

  if (failed) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoadError title="Print the menu" message="Could not load the menu. Check your connection and try again." onRetry={() => void load()} />
      </div>
    );
  }
  if (menu == null) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardLoading label="Loading the menu…" />
      </div>
    );
  }

  function print() {
    if (dishCount === 0) {
      toast.error("There is nothing on the sheet to print yet");
      return;
    }
    if (!frame.current?.print()) toast.error("The sheet is not ready yet. Try again in a moment.");
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-5")}>
      <DashboardPageHero icon={Printer} title="Print the menu" description="Pick a look, check the sheet, then print it or save it as a PDF.">
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
        <section className={cn(DASHBOARD_SECTION_SURFACE, "grid gap-5")} aria-label="What goes on the sheet">
          <fieldset className="grid gap-2">
            <legend className={dashboardLabelClass()}>Look</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Look">
              {PRINTED_MENU_TEMPLATES.map((t) => {
                const on = options.template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("template", t.id)}
                    className={cn(
                      "grid gap-2 rounded-[2px] border p-2 text-left transition-[border-color,background-color] duration-200",
                      INK_RULE,
                      "hover:border-[var(--pos-primary,#1D4B3B)]",
                      on && ON,
                      FOCUS,
                    )}
                  >
                    <TemplateSketch template={t.id} accent={accent} />
                    <span className="text-sm font-semibold leading-tight">{t.name}</span>
                  </button>
                );
              })}
            </div>
            <span className={dashboardHintClass()}>
              {PRINTED_MENU_TEMPLATES.find((t) => t.id === options.template)?.blurb}
              {options.template === "pictures" && pictured === 0 ? " None of your dishes has a picture yet; add some from the menu." : ""}
            </span>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Paper</span>
              <select className={dashboardSelectClass(false)} value={options.paper} onChange={(e) => set("paper", e.target.value as PrintedMenuOptions["paper"])}>
                {PRINTED_MENU_PAPERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-1">
              <legend className={dashboardLabelClass()}>Colour</legend>
              <div className="flex min-h-11 flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Colour">
                {PRINTED_MENU_INKS.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    role="radio"
                    aria-checked={options.ink === ink.id}
                    aria-label={ink.name}
                    title={ink.name}
                    onClick={() => set("ink", ink.id)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 border-transparent p-0.5 transition-[border-color] duration-200",
                      options.ink === ink.id && "border-[var(--order-ink,#121A16)]",
                      FOCUS,
                    )}
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
            <span className={dashboardLabelClass()}>Line under the name (optional)</span>
            <input
              className={dashboardInputClass(false)}
              value={options.line}
              maxLength={140}
              placeholder="Mirema Drive, opposite the stage"
              onChange={(e) => set("line", e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Line at the bottom (optional)</span>
            <input
              className={dashboardInputClass(false)}
              value={options.foot}
              maxLength={200}
              placeholder="Call 07… to order. Open every day."
              onChange={(e) => set("foot", e.target.value)}
            />
          </label>

          <div className="grid gap-1">
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" checked={options.descriptions} onChange={(e) => set("descriptions", e.target.checked)} />
              Print the line about each dish
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" checked={options.currency} onChange={(e) => set("currency", e.target.checked)} />
              Write {business?.currency?.trim() || "KES"} before each price
            </label>
          </div>

          {headings.length > 1 ? (
            <fieldset className="grid gap-1">
              <legend className={dashboardLabelClass()}>Headings to print</legend>
              {headings.map((h) => {
                const on = !options.hidden.includes(h.id);
                return (
                  <label key={h.id} className="flex min-h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        set("hidden", e.target.checked ? options.hidden.filter((id) => id !== h.id) : [...options.hidden, h.id])
                      }
                    />
                    <span className="flex-1">{h.name}</span>
                    <span className="font-mono text-xs tabular-nums text-[color-mix(in_srgb,var(--order-ink,#121A16)_60%,transparent)]">{h.count}</span>
                  </label>
                );
              })}
              <span className={dashboardHintClass()}>A drinks list or a lunch card is the same menu with fewer headings ticked.</span>
            </fieldset>
          ) : null}

          <div className="grid gap-2 border-t pt-4">
            <Button onClick={print}>
              <Printer className="size-4" aria-hidden /> Print or save as PDF
            </Button>
            <span className={dashboardHintClass()}>
              To keep a file, choose &ldquo;Save as PDF&rdquo; as the printer in the window that opens. Set the paper there to {paper.name.split(" ")[0]} and
              switch off headers and footers.
            </span>
          </div>
        </section>

        <section aria-label="The sheet" className="min-w-0">
          <p className={cn("mb-2 flex flex-wrap items-baseline justify-between gap-x-4", dashboardHintClass())}>
            <span>
              {dishCount} {dishCount === 1 ? "dish" : "dishes"} on {paper.name.split(" ")[0]} paper. Switched-off dishes and dishes with no price are left out.
            </span>
            <span>A long menu runs on to more pages; a dish is never split across two.</span>
          </p>
          <PaperFrame
            ref={frame}
            css={css}
            documentTitle={`${options.title.trim() || shopName} menu`}
            paperWidthPx={paper.widthMm * MM_TO_PX}
            className={cn("h-[78vh] min-h-[28rem] w-full rounded-[2px] border bg-[#e9e6df]", INK_RULE)}
          >
            <PrintedMenuSheet options={options} sections={sections} />
          </PaperFrame>
        </section>
      </div>
    </div>
  );
}

/** A thumbnail of each look, drawn from a few bars: enough to tell them apart before choosing. */
function TemplateSketch({ template, accent }: { template: PrintedMenuTemplate; accent: string }) {
  const bar = (className: string, color?: string) => <span className={cn("block h-[3px] rounded-[1px]", className)} style={{ background: color ?? "#b9b4a8" }} />;
  return (
    <span aria-hidden className="block aspect-[5/6] w-full overflow-hidden rounded-[1px] border border-black/10 bg-white p-2">
      {template === "house" ? (
        <span className="grid h-full content-start gap-1.5">
          {bar("h-[6px] w-3/5", "#121a16")}
          <span className="block border-b-2 border-double border-black/60" />
          <span className="grid grid-cols-2 gap-2">
            {[0, 1].map((col) => (
              <span key={col} className="grid gap-1">
                {bar("w-1/2", accent)}
                {bar("w-full")}
                {bar("w-full")}
                {bar("w-4/5")}
                {bar("w-full")}
              </span>
            ))}
          </span>
        </span>
      ) : template === "card" ? (
        <span className="grid h-full content-start justify-items-center gap-1.5 pt-1">
          {bar("h-[6px] w-3/5", "#121a16")}
          <span className="block h-1 w-1 rotate-45" style={{ background: accent }} />
          {bar("w-2/5", accent)}
          {bar("w-3/5")}
          {bar("w-2/5")}
          {bar("w-3/5")}
          {bar("w-2/5", accent)}
          {bar("w-3/5")}
        </span>
      ) : template === "pictures" ? (
        <span className="grid h-full content-start gap-1.5">
          {bar("h-[6px] w-1/2", "#121a16")}
          <span className="block h-[3px]" style={{ background: accent }} />
          <span className="grid grid-cols-3 gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="grid gap-0.5">
                <span className="block aspect-[4/3] rounded-[1px]" style={{ background: i % 2 ? "#cfc8b8" : "#ddd6c6" }} />
                {bar("w-4/5")}
              </span>
            ))}
          </span>
        </span>
      ) : (
        <span className="grid h-full content-start gap-1">
          {bar("h-[5px] w-2/3", "#121a16")}
          <span className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[0, 1, 2].map((col) => (
              <span key={col} className="grid gap-[3px]">
                {bar("h-[2px] w-full", accent)}
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} className="block h-[2px] rounded-[1px] bg-[#b9b4a8]" style={{ width: i % 3 === 2 ? "70%" : "100%" }} />
                ))}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

"use client";

import JsBarcode from "jsbarcode";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  ghostCtaClass,
  goldCtaClass,
  landingRootStyle,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";
import {
  EXAMPLE_CODE,
  MAX_CODE_LENGTH,
  assessBarcodeCode,
  barcodeFileName,
  canEncodeBarcode,
  type BarcodeCodeState,
} from "@/lib/barcode-label";

const BAR_MODULE = 2;
const BAR_HEIGHT = 100;
const QUIET_ZONE = 20;
const BAR_FONT_SIZE = 16;
const TEXT_GAP = 8;

const EMPTY_COPY = "Your barcode shows up here.";
const BLOCKED_COPY = "Fix the code to see a barcode.";
const LONG_COPY = "This code is long. Shorter codes scan more easily on a shelf label.";
const INVALID_COPY = "Use letters, numbers, and symbols from a standard keyboard.";
const TOO_LONG_COPY = "Use 80 characters or fewer.";

const BARCODE_OPTIONS = {
  format: "CODE128",
  lineColor: "#141412",
  background: "#ffffff",
  width: BAR_MODULE,
  height: BAR_HEIGHT,
  displayValue: true,
  font: "ui-sans-serif, system-ui, sans-serif",
  fontSize: BAR_FONT_SIZE,
  textMargin: TEXT_GAP,
  margin: QUIET_ZONE,
};

const FAQS = [
  {
    q: "What barcode is this?",
    a: "Code 128. It holds letters and numbers, and most shop scanners read it.",
  },
  {
    q: "How do I print it?",
    a: "Download the SVG and print it on a shelf label or the pack. The file stays sharp at any size.",
  },
  {
    q: "What should I put in it?",
    a: "Your own product code. Keep one code per item so a scan always finds the same product.",
  },
  {
    q: "Is the code stored?",
    a: "No. The barcode is drawn in your browser. Nothing is uploaded.",
  },
] as const;

function drawBarcode(svg: SVGSVGElement, code: string) {
  svg.replaceChildren();
  JsBarcode(svg, code, BARCODE_OPTIONS);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Code 128 barcode for ${code}`);
  svg.setAttribute("shape-rendering", "crispEdges");
}

function downloadBarcode(svg: SVGSVGElement, code: string) {
  const clone = svg.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) return;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  const href = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = barcodeFileName(code);
  link.click();
  URL.revokeObjectURL(href);
}

function alertFor(state: BarcodeCodeState): { tone: "warn" | "error"; message: string } | null {
  if (state === "too-long") return { tone: "error", message: TOO_LONG_COPY };
  if (state === "invalid") return { tone: "error", message: INVALID_COPY };
  if (state === "long") return { tone: "warn", message: LONG_COPY };
  return null;
}

export function BarcodeGeneratorPage() {
  const [raw, setRaw] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code") ?? "";
    setRaw(fromUrl);
    setHydrated(true);
  }, []);

  const assessed = assessBarcodeCode(raw);
  const encodable = canEncodeBarcode(assessed.state);
  const alert = alertFor(assessed.state);

  useEffect(() => {
    if (!hydrated) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (!encodable) {
      svg.replaceChildren();
    } else {
      try {
        drawBarcode(svg, assessed.code);
      } catch {
        svg.replaceChildren();
      }
    }
    const url = new URL(window.location.href);
    if (encodable) url.searchParams.set("code", assessed.code);
    else url.searchParams.delete("code");
    if (url.href !== window.location.href) history.replaceState(null, "", url);
  }, [hydrated, encodable, assessed.code]);

  const onDownload = () => {
    const svg = svgRef.current;
    if (!svg || !encodable) return;
    downloadBarcode(svg, assessed.code);
    setStatus("SVG downloaded.");
  };

  const onCopy = async () => {
    if (!encodable) return;
    try {
      await navigator.clipboard.writeText(assessed.code);
      setStatus("Code copied.");
    } catch {
      setStatus("Couldn't copy. Select the code and copy it yourself.");
    }
  };

  const onShare = async () => {
    if (!encodable) return;
    const url = new URL(window.location.href);
    url.searchParams.set("code", assessed.code);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Kiosk barcode", text: assessed.code, url: url.toString() });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus("Link copied.");
    } catch {
      setStatus("Couldn't share from this browser.");
    }
  };

  return (
    <div
      className="flex min-h-svh flex-col bg-[var(--kiosk-bg)] text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <header className="flex items-center justify-between border-b border-[var(--kiosk-border-soft)] px-4 py-4 sm:px-10">
        <KioskLogo href="/" size="md" variant="landing" plain />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--kiosk-text-dim)] transition-colors hover:text-[var(--kiosk-text)]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          Back to home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-20 pt-10 sm:px-10 sm:pt-16">
        <p className={sectionLabelPillClass}>Free tool</p>
        <h1 className="mt-5 max-w-[16ch] font-heading text-[clamp(1.9rem,6vw,3.2rem)] leading-[1.08] tracking-[-0.03em]">
          Barcode generator
        </h1>
        <p className="mt-4 max-w-[38rem] text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)] sm:text-[17px]">
          Type a product code. A Code 128 barcode appears, ready to download and print on a shelf label.
        </p>

        <div className="mt-8 grid border border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <form
            className="p-6 sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              onDownload();
            }}
          >
            <label htmlFor="barcode-code" className="block text-sm font-medium">
              Product code or text
            </label>
            <input
              id="barcode-code"
              name="code"
              value={raw}
              maxLength={MAX_CODE_LENGTH}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder={EXAMPLE_CODE}
              aria-invalid={alert?.tone === "error"}
              aria-describedby="barcode-hint barcode-alert"
              onChange={(event) => {
                setStatus("");
                setRaw(event.target.value);
              }}
              className="mt-2 h-11 w-full border border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] px-3 font-mono text-base text-[var(--kiosk-text)] caret-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kiosk-text)] aria-[invalid=true]:border-[var(--kiosk-danger)]"
            />
            <p id="barcode-hint" className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
              Letters, numbers, and symbols. One code per product.
            </p>
            {alert ? (
              <p
                id="barcode-alert"
                className={
                  alert.tone === "error"
                    ? "mt-2 text-sm font-medium text-[var(--kiosk-danger)]"
                    : "mt-2 text-sm font-medium text-[var(--kiosk-text)]"
                }
              >
                {alert.message}
              </p>
            ) : (
              <p id="barcode-alert" className="sr-only" />
            )}
          </form>

          <div className="flex flex-col border-t border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 sm:p-8 md:border-t-0 md:border-l">
            <div className="flex min-h-[168px] flex-col items-center justify-start gap-4 border-t-[10px] border-t-[var(--kiosk-gold)] pt-5">
              <svg
                ref={svgRef}
                className={encodable ? "h-auto max-w-full" : "hidden"}
              />
              {encodable ? null : (
                <p className="max-w-[24ch] text-center text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
                  {assessed.state === "empty" ? EMPTY_COPY : BLOCKED_COPY}
                </p>
              )}
              {assessed.state === "empty" ? (
                <button
                  type="button"
                  className={ghostCtaClass}
                  onClick={() => {
                    setStatus("");
                    setRaw(EXAMPLE_CODE);
                  }}
                >
                  Try {EXAMPLE_CODE}
                </button>
              ) : null}
            </div>
            {encodable ? (
              <p className="mt-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--kiosk-text-muted)]">
                Code 128
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className={goldCtaClass} disabled={!encodable} onClick={onDownload}>
                Download SVG
              </button>
              <button type="button" className={ghostCtaClass} disabled={!encodable} onClick={() => void onCopy()}>
                Copy code
              </button>
              <button type="button" className={ghostCtaClass} disabled={!encodable} onClick={() => void onShare()}>
                Share
              </button>
            </div>
            <p className="mt-3 min-h-[1.4em] text-sm font-medium" role="status">
              {status}
            </p>
          </div>
        </div>

        <section className="mt-14 max-w-[40rem]" aria-labelledby="print-heading">
          <h2 id="print-heading" className="font-heading text-2xl tracking-[-0.02em]">
            Print it on a label
          </h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)]">
            Download the SVG, print it, and stick it on the shelf or the pack. A scanner at the till reads the same code you typed.
          </p>
          <h2 className="mt-10 font-heading text-2xl tracking-[-0.02em]">Questions</h2>
          <div className="mt-2">
            {FAQS.map((item) => (
              <details key={item.q} className="border-b border-[var(--kiosk-border)]">
                <summary className="cursor-pointer py-4 text-base font-medium">{item.q}</summary>
                <p className="pb-4 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

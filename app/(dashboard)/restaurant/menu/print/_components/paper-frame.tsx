"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type PaperFrameHandle = {
  /** Opens the browser's print window for the sheet alone. False when the frame is not ready. */
  print: () => boolean;
};

const BLANK = "<!doctype html><html lang='en'><head><meta charset='utf-8'></head><body></body></html>";

/**
 * A frame holding a document of its own for the sheet. The app's styles do not reach inside, so
 * what is previewed is what prints, at the paper size the sheet's own stylesheet asks for.
 *
 * @param paperWidthPx the sheet's width on screen, used to shrink it to fit a narrow frame
 */
export const PaperFrame = forwardRef<
  PaperFrameHandle,
  { css: string; documentTitle: string; paperWidthPx: number; className?: string; children: ReactNode }
>(function PaperFrame({ css, documentTitle, paperWidthPx, className, children }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ready = () => {
      const body = el.contentDocument?.body ?? null;
      setMount((prev) => (prev === body ? prev : body));
    };
    ready();
    el.addEventListener("load", ready);
    return () => el.removeEventListener("load", ready);
  }, []);

  useEffect(() => {
    if (!mount) return;
    const doc = mount.ownerDocument;
    let style = doc.getElementById("sheet-css");
    if (!style) {
      style = doc.createElement("style");
      style.id = "sheet-css";
      doc.head.appendChild(style);
    }
    style.textContent = css;
    // The print window offers this as the file name when saving as PDF.
    doc.title = documentTitle;
  }, [mount, css, documentTitle]);

  // Shrink the sheet to the frame on a narrow screen; never enlarge it.
  useEffect(() => {
    const el = frame.current;
    if (!el || !mount) return;
    const fit = () => {
      const room = el.clientWidth - 24;
      const scale = room > 0 && room < paperWidthPx ? room / paperWidthPx : 1;
      mount.style.setProperty("--fit", String(Math.max(0.25, Math.round(scale * 1000) / 1000)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [mount, paperWidthPx]);

  useImperativeHandle(
    ref,
    () => ({
      print: () => {
        const win = frame.current?.contentWindow;
        if (!win || !mount) return false;
        win.focus();
        win.print();
        return true;
      },
    }),
    [mount],
  );

  return (
    <>
      <iframe ref={frame} title="How the menu will print" srcDoc={BLANK} className={className} />
      {mount ? createPortal(children, mount) : null}
    </>
  );
});

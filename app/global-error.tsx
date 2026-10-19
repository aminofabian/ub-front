"use client";

import { useEffect, type CSSProperties } from "react";

import { isStaleAssetError, reloadStaleClientOnce } from "@/lib/stale-client";

const PAGE_TITLE = "The counter is offline.";
const PAGE_COPY =
  "Something interrupted this page. Reload to reopen the shop, or go back one step.";
const REFRESH_TITLE = "A newer shelf is ready.";
const REFRESH_COPY = "A fresh version just went live. Refreshing this page now.";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleAssetError(error);

  useEffect(() => {
    if (!stale) return;
    reloadStaleClientOnce();
  }, [stale]);

  const title = stale ? REFRESH_TITLE : PAGE_TITLE;
  const copy = stale ? REFRESH_COPY : PAGE_COPY;

  return (
    <html lang="en-KE">
      <body style={shell}>
        <div style={frame}>
          <span style={wordmark}>Kiosk</span>
          <span style={rule} aria-hidden />
          <p style={eyebrow}>{stale ? "Updating" : "Something went wrong"}</p>
          <h1 style={heading}>{title}</h1>
          <p style={message}>{copy}</p>
          {stale ? null : (
            <div style={actions}>
              <button
                type="button"
                style={primary}
                onClick={() => window.location.reload()}
              >
                Reload the page
              </button>
              <button
                type="button"
                style={secondary}
                onClick={() => window.history.back()}
              >
                Go back
              </button>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}

const shell: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "#F4F1EA",
  color: "#121A16",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  textAlign: "left",
};

const frame: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  padding: "32px 0 0",
};

const wordmark: CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 28,
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

const rule: CSSProperties = {
  display: "block",
  width: "100%",
  height: 1,
  margin: "22px 0 26px",
  background: "rgba(18,26,22,0.12)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#A55237",
};

const heading: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 40,
  lineHeight: 1.04,
  fontWeight: 400,
  letterSpacing: "-0.03em",
  color: "#121A16",
};

const message: CSSProperties = {
  margin: "16px 0 0",
  maxWidth: "44ch",
  fontSize: 15,
  lineHeight: 1.7,
  color: "#556159",
};

const actions: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 28,
};

const primary: CSSProperties = {
  appearance: "none",
  border: 0,
  borderRadius: 2,
  padding: "11px 18px",
  background: "#1D4B3B",
  color: "#FCFAF5",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondary: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(18,26,22,0.16)",
  borderRadius: 2,
  padding: "11px 18px",
  background: "transparent",
  color: "#121A16",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

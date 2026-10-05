"use client";

import { useEffect, type CSSProperties } from "react";

import { isStaleAssetError, reloadStaleClientOnce } from "@/lib/stale-client";

const PAGE_TITLE = "This page couldn’t load";
const PAGE_COPY = "Reload to try again, or go back.";
const REFRESH_TITLE = "Refreshing this page";
const REFRESH_COPY = "A newer version just went live.";

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
        <p style={heading}>{title}</p>
        <p style={message}>{copy}</p>
        {stale ? null : (
          <p style={actions}>
            <button type="button" style={primary} onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" style={secondary} onClick={() => window.history.back()}>
              Back
            </button>
          </p>
        )}
      </body>
    </html>
  );
}

const shell: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 12,
  background: "#0a0a0a",
  color: "#ededed",
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
};

const heading: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
};

const message: CSSProperties = {
  margin: 0,
  fontSize: 15,
};

const actions: CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
};

const primary: CSSProperties = {
  background: "#ededed",
  color: "#0a0a0a",
  border: 0,
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
};

const secondary: CSSProperties = {
  background: "transparent",
  color: "#ededed",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
};

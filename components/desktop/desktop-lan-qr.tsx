"use client";

import { useEffect, useRef } from "react";

type DesktopLanQrProps = {
  url: string;
  size?: number;
  className?: string;
};

/**
 * Offline-friendly LAN QR (no external image CDN). Uses the `qrcode` package.
 */
export function DesktopLanQr({ url, size = 160, className }: DesktopLanQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const QRCode = (await import("qrcode")).default;
      if (cancelled || !canvasRef.current || !url) return;
      await QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      aria-label={`QR code for ${url}`}
    />
  );
}

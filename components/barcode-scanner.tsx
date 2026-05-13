"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X } from "lucide-react";

type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<string>("");
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScanner = useCallback(async () => {
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await reader.listVideoInputDevices();
      if (devices.length === 0) {
        setError("No camera found on this device.");
        return;
      }

      // Prefer the rear camera on mobile
      const rearCamera =
        devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment"),
        ) ?? devices[0];

      if (videoRef.current) {
        await reader.decodeFromVideoDevice(
          rearCamera.deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              const barcode = result.getText();
              // Debounce: ignore repeat scans of the same barcode within 2s
              if (
                barcode !== lastScanRef.current ||
                !scanTimeoutRef.current
              ) {
                lastScanRef.current = barcode;
                if (scanTimeoutRef.current) {
                  clearTimeout(scanTimeoutRef.current);
                }
                scanTimeoutRef.current = setTimeout(() => {
                  lastScanRef.current = "";
                  scanTimeoutRef.current = null;
                }, 2000);
                onScan(barcode);
              }
            }
          },
        );
        setScanning(true);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to start camera. Check permissions.",
      );
    }
  }, [onScan]);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    setScanning(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    startScanner();
    return () => {
      if (readerRef.current) {
        readerRef.current = null;
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <span className="text-sm font-semibold">Scan Barcode</span>
          </div>
          <button
            onClick={stopScanner}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close scanner"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Video / Error */}
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-400">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
          )}

          {/* Scanning guide overlay */}
          {!error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-64 rounded-lg border-2 border-primary/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3">
          <p className="text-center text-[11px] text-muted-foreground">
            Point camera at a barcode. Scanning automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

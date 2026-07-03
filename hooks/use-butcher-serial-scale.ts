"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_BUTCHER_SCALE_CONFIG,
  StableWeightGate,
  type ButcherScaleConfig,
  isWebSerialSupported,
  netWeightKg,
  parseButcherScaleLine,
} from "@/lib/butcher-scale";

export type ButcherScaleStatus =
  | "unsupported"
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type ButcherScaleSnapshot = {
  status: ButcherScaleStatus;
  grossKg: number | null;
  netKg: number | null;
  stable: boolean;
  tareKg: number;
  lastLine: string | null;
  error: string | null;
};

type SerialPortLike = {
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
};

type SerialNavigator = Navigator & {
  serial: {
    requestPort: () => Promise<SerialPortLike>;
    getPorts: () => Promise<SerialPortLike[]>;
  };
};

const initialSnapshot = (status: ButcherScaleStatus): ButcherScaleSnapshot => ({
  status,
  grossKg: null,
  netKg: null,
  stable: false,
  tareKg: 0,
  lastLine: null,
  error: null,
});

export function useButcherSerialScale(
  config: ButcherScaleConfig = DEFAULT_BUTCHER_SCALE_CONFIG,
) {
  const supported = isWebSerialSupported();
  const [snapshot, setSnapshot] = useState<ButcherScaleSnapshot>(() =>
    initialSnapshot(supported ? "idle" : "unsupported"),
  );

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const gateRef = useRef(
    new StableWeightGate(config.stableMs, config.stableToleranceKg),
  );
  const tareRef = useRef(0);
  const bufferRef = useRef("");

  useEffect(() => {
    gateRef.current = new StableWeightGate(
      config.stableMs,
      config.stableToleranceKg,
    );
  }, [config.stableMs, config.stableToleranceKg]);

  const applyReading = useCallback((line: string) => {
    const parsed = parseButcherScaleLine(line);
    if (!parsed) return;

    const stable = gateRef.current.feed(
      parsed.kg,
      Date.now(),
      parsed.hardwareStable,
    );
    const net = netWeightKg(parsed.kg, tareRef.current);

    setSnapshot((prev) => ({
      ...prev,
      grossKg: parsed.kg,
      netKg: net,
      stable,
      lastLine: parsed.rawLine,
      error: null,
    }));
  }, []);

  const readLoop = useCallback(
    async (port: SerialPortLike, signal: AbortSignal) => {
      const reader = port.readable?.getReader();
      if (!reader) {
        throw new Error("Scale port has no readable stream.");
      }
      readerRef.current = reader;
      const decoder = new TextDecoder();
      bufferRef.current = "";

      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        bufferRef.current += decoder.decode(value, { stream: true });
        const parts = bufferRef.current.split(/\r?\n/);
        bufferRef.current = parts.pop() ?? "";
        for (const part of parts) {
          applyReading(part);
        }
      }
    },
    [applyReading],
  );

  const disconnect = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    try {
      await readerRef.current?.cancel();
    } catch {
      /* port may already be closed */
    }
    readerRef.current = null;
    try {
      await portRef.current?.close();
    } catch {
      /* ignore */
    }
    portRef.current = null;
    gateRef.current.reset();
    setSnapshot((prev) => ({
      ...initialSnapshot("idle"),
      tareKg: prev.tareKg,
    }));
  }, []);

  const connect = useCallback(async () => {
    if (!supported) return;
    setSnapshot((prev) => ({
      ...prev,
      status: "connecting",
      error: null,
    }));
    try {
      await disconnect();
      const nav = navigator as SerialNavigator;
      const ports = await nav.serial.getPorts();
      const port =
        ports.length > 0 ? ports[0]! : await nav.serial.requestPort();
      await port.open({ baudRate: config.baudRate });
      portRef.current = port;
      gateRef.current.reset();
      const abort = new AbortController();
      abortRef.current = abort;
      setSnapshot((prev) => ({
        ...prev,
        status: "connected",
        error: null,
      }));
      void readLoop(port, abort.signal).catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Scale read loop failed.";
        setSnapshot((prev) => ({
          ...prev,
          status: "error",
          error: msg,
        }));
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not connect to scale.";
      setSnapshot((prev) => ({
        ...prev,
        status: "idle",
        error: msg,
      }));
    }
  }, [config.baudRate, disconnect, readLoop, supported]);

  const tare = useCallback(() => {
    const gross = snapshot.grossKg;
    if (gross == null) return;
    tareRef.current = gross;
    const net = netWeightKg(gross, tareRef.current);
    setSnapshot((prev) => ({
      ...prev,
      tareKg: tareRef.current,
      netKg: net,
    }));
  }, [snapshot.grossKg]);

  const clearTare = useCallback(() => {
    tareRef.current = 0;
    setSnapshot((prev) => ({
      ...prev,
      tareKg: 0,
      netKg: prev.grossKg != null ? prev.grossKg : null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    supported,
    snapshot,
    connect,
    disconnect,
    tare,
    clearTare,
    config,
  };
}

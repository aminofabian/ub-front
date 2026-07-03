/**
 * v1 butcher counter scale — generic continuous ASCII over Web Serial.
 * See backend/docs/BUTCHERY_SCALE_V1.md for supported hardware notes.
 */

export type ButcherScaleConfig = {
  enabled: boolean;
  baudRate: number;
  /** Weight must stay within tolerance for this long (ms). */
  stableMs: number;
  /** Max kg drift while counting as stable. */
  stableToleranceKg: number;
  /** When connected, block add-to-order until stable. */
  requireStableToAdd: boolean;
};

export const DEFAULT_BUTCHER_SCALE_CONFIG: ButcherScaleConfig = {
  enabled: true,
  baudRate: 9600,
  stableMs: 600,
  stableToleranceKg: 0.002,
  requireStableToAdd: true,
};

export type ParsedScaleLine = {
  kg: number;
  /** Scale line carried an explicit stable flag (S / ST / STABLE). */
  hardwareStable: boolean;
  rawLine: string;
};

const LB_TO_KG = 0.45359237;

/** Parse one line from a continuous ASCII scale stream. */
export function parseButcherScaleLine(line: string): ParsedScaleLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let hardwareStable = false;
  let working = trimmed;

  if (/^ST(?:ABLE)?[,\s]/i.test(working)) {
    hardwareStable = true;
    working = working.replace(/^ST(?:ABLE)?[,\s]+/i, "");
  } else if (/^S\s+/.test(working)) {
    hardwareStable = true;
    working = working.replace(/^S\s+/, "");
  }

  const match = working.match(
    /(-?\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gram|lb|lbs|pound)?/i,
  );
  if (!match) return null;

  const rawNum = Number(match[1]!.replace(",", "."));
  if (!Number.isFinite(rawNum)) return null;

  const unit = (match[2] ?? "kg").toLowerCase();
  let kg = rawNum;
  if (unit === "g" || unit === "gram") {
    kg = rawNum / 1000;
  } else if (unit === "lb" || unit === "lbs" || unit === "pound") {
    kg = rawNum * LB_TO_KG;
  }

  if (kg < 0 || kg > 9999) return null;

  return {
    kg: roundKg(kg),
    hardwareStable,
    rawLine: trimmed,
  };
}

export function roundKg(kg: number): number {
  return Math.round(kg * 1000) / 1000;
}

export function formatKg(kg: number): string {
  return roundKg(kg).toFixed(3).replace(/\.?0+$/, "") || "0";
}

/** Software stable gate when the scale does not send a stable flag. */
export class StableWeightGate {
  private lastKg: number | null = null;
  private stableSince: number | null = null;

  constructor(
    private readonly stableMs: number,
    private readonly toleranceKg: number,
  ) {}

  reset(): void {
    this.lastKg = null;
    this.stableSince = null;
  }

  feed(kg: number, now = Date.now(), hardwareStable = false): boolean {
    if (hardwareStable) {
      this.lastKg = kg;
      this.stableSince = now;
      return true;
    }

    if (
      this.lastKg === null ||
      Math.abs(kg - this.lastKg) > this.toleranceKg
    ) {
      this.lastKg = kg;
      this.stableSince = now;
      return false;
    }

    if (this.stableSince === null) {
      this.stableSince = now;
    }
    return now - this.stableSince >= this.stableMs;
  }
}

export function netWeightKg(grossKg: number, tareKg: number): number {
  const net = grossKg - tareKg;
  return net > 0 ? roundKg(net) : 0;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

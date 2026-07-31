/**
 * Soft alert chimes (cashier orders, grocery, supply / hub).
 *
 * Triangle + quiet sine blend with a short attack/release envelope so tones
 * feel mellow rather than piercing. No external audio assets.
 */
import { DEFAULT_HUB_ALERT_VOLUME, hubChimeGain } from "./hub-alert-settings";

export type CashierChimeVariant = "order" | "grocery" | "supply";

export type PlayCashierChimeOptions = {
  /** Loudness 1–100. Defaults to hub default. */
  volume?: number;
};

type Tone = {
  /** Fundamental frequency in Hz. */
  freq: number;
  /** Start offset from now (seconds). */
  at: number;
  /** Sustain length before release (seconds). */
  hold: number;
};

/** Sale / web-order: soft rising major third (warm “cha-ching” without the edge). */
const ORDER_TONES: Tone[] = [
  { freq: 523.25, at: 0, hold: 0.1 }, // C5
  { freq: 659.25, at: 0.09, hold: 0.16 }, // E5
];

/** Supply: lower, descending minor third — distinct and calmer. */
const SUPPLY_TONES: Tone[] = [
  { freq: 392.0, at: 0, hold: 0.12 }, // G4
  { freq: 329.63, at: 0.1, hold: 0.18 }, // E4
];

/** Grocery: gentle step up a fifth. */
const GROCERY_TONES: Tone[] = [
  { freq: 440.0, at: 0, hold: 0.11 }, // A4
  { freq: 659.25, at: 0.1, hold: 0.16 }, // E5
];

const ATTACK = 0.028;
const RELEASE = 0.2;

function playSoftTone(
  ctx: AudioContext,
  master: GainNode,
  now: number,
  tone: Tone,
): void {
  const start = now + tone.at;
  const peak = start + ATTACK;
  const releaseStart = start + ATTACK + tone.hold;
  const end = releaseStart + RELEASE;

  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0, start);
  voice.gain.linearRampToValueAtTime(1, peak);
  voice.gain.setValueAtTime(1, releaseStart);
  voice.gain.exponentialRampToValueAtTime(0.001, end);
  voice.connect(master);

  // Warm body (triangle) + a hush of sine an octave up for a soft “glass” sheen.
  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.value = tone.freq;
  body.connect(voice);
  body.start(start);
  body.stop(end);

  const sheen = ctx.createOscillator();
  sheen.type = "sine";
  sheen.frequency.value = tone.freq * 2;
  const sheenGain = ctx.createGain();
  sheenGain.gain.value = 0.12;
  sheen.connect(sheenGain);
  sheenGain.connect(voice);
  sheen.start(start);
  sheen.stop(end);
}

function tonesFor(variant: CashierChimeVariant): Tone[] {
  if (variant === "supply") return SUPPLY_TONES;
  if (variant === "grocery") return GROCERY_TONES;
  return ORDER_TONES;
}

function chimeDurationMs(tones: Tone[]): number {
  let end = 0;
  for (const tone of tones) {
    end = Math.max(end, tone.at + ATTACK + tone.hold + RELEASE);
  }
  return Math.ceil(end * 1000) + 80;
}

export function playCashierChime(
  variant: CashierChimeVariant = "order",
  opts?: PlayCashierChimeOptions,
): void {
  try {
    const ctx = new AudioContext();
    const start = () => {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      // Peak sits under the volume slider; envelope handles attack/release.
      master.gain.value = hubChimeGain(opts?.volume ?? DEFAULT_HUB_ALERT_VOLUME) * 0.85;
      master.connect(ctx.destination);

      const tones = tonesFor(variant);
      for (const tone of tones) {
        playSoftTone(ctx, master, now, tone);
      }

      window.setTimeout(() => {
        void ctx.close();
      }, chimeDurationMs(tones));
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(start).catch(() => {
        void ctx.close();
      });
    } else {
      start();
    }
  } catch {
    // Audio not available — visual toast remains the primary notification.
  }
}

/**
 * Shared alert chime (cashier orders, grocery, supply bills).
 *
 * Uses the Web Audio API so it works offline and does not depend on external
 * assets. Keep this utility tiny; callers decide when to play.
 */
import { DEFAULT_HUB_ALERT_VOLUME, hubChimeGain } from "./hub-alert-settings";

export type CashierChimeVariant = "order" | "grocery" | "supply";

export type PlayCashierChimeOptions = {
  /** Loudness 1–100. Defaults to hub default (~0.18 gain). */
  volume?: number;
};

export function playCashierChime(
  variant: CashierChimeVariant = "order",
  opts?: PlayCashierChimeOptions,
): void {
  try {
    const ctx = new AudioContext();
    const start = () => {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.value = hubChimeGain(opts?.volume ?? DEFAULT_HUB_ALERT_VOLUME);
      gain.connect(ctx.destination);

      if (variant === "order") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (variant === "supply") {
        // Lower single beep so supply posts are distinct from sales.
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 660;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        // Two-pulse grocery chime: 660 Hz then 880 Hz.
        const pulses = [
          { freq: 660, start: 0, duration: 0.12 },
          { freq: 880, start: 0.12, duration: 0.12 },
        ];
        for (const pulse of pulses) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = pulse.freq;
          osc.connect(gain);
          osc.start(now + pulse.start);
          osc.stop(now + pulse.start + pulse.duration);
        }
      }

      window.setTimeout(() => {
        void ctx.close();
      }, 400);
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

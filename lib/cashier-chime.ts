/**
 * Shared cashier alert chime.
 *
 * Uses the Web Audio API so it works offline and does not depend on external
 * assets. Keep this utility tiny and synchronous; callers decide when to play.
 */
export type CashierChimeVariant = "order" | "grocery";

export function playCashierChime(variant: CashierChimeVariant = "order"): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    gain.connect(ctx.destination);

    if (variant === "order") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.15);
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

    void ctx.close();
  } catch {
    // Audio not available — visual toast remains the primary notification.
  }
}

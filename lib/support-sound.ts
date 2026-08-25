/**
 * Subtle notification chime for incoming support messages.
 *
 * Synthesized with WebAudio (no audio asset to ship) as a soft two-note pop.
 * Browsers block audio before a user gesture, so call {@link unlockSupportAudio}
 * on the first pointer/key interaction; playback before that is silently skipped.
 */

const SOUND_KEY = "ub.support.sound";
const VOLUME = 0.28;

let audioCtx: AudioContext | null = null;

export function isSupportSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSupportSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    // Non-fatal: preference won't persist.
  }
}

/** Create/resume the audio context. Call from a user-gesture handler. */
export function unlockSupportAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
  } catch {
    // Audio unavailable — never throw from a notification path.
  }
}

/** Play the soft two-note chime. No-op when muted, audio is blocked, or SSR. */
export function playSupportMessageSound(): void {
  if (!isSupportSoundEnabled()) return;
  if (typeof window === "undefined" || !audioCtx) return;
  try {
    const ctx = audioCtx;
    const now = ctx.currentTime;
    // A gentle "pop-pop" (E5 → D#6), shaped like a chat app's message sound.
    [659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.1;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(VOLUME, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch {
    // Ignore audio failures — never break the message flow.
  }
}

import { describe, expect, it, jest, beforeEach, afterEach } from "bun:test";

import { playCashierChime } from "./cashier-chime";

describe("playCashierChime", () => {
  let audioCtxMock: {
    createOscillator: ReturnType<typeof jest.fn>;
    createGain: ReturnType<typeof jest.fn>;
    close: ReturnType<typeof jest.fn>;
    currentTime: number;
    destination: unknown;
  };
  let oscillatorMocks: Array<{
    connect: ReturnType<typeof jest.fn>;
    start: ReturnType<typeof jest.fn>;
    stop: ReturnType<typeof jest.fn>;
    frequency: { value: number };
    type: string;
  }>;
  let gainMocks: Array<{
    connect: ReturnType<typeof jest.fn>;
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof jest.fn>;
      linearRampToValueAtTime: ReturnType<typeof jest.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof jest.fn>;
    };
  }>;

  beforeEach(() => {
    oscillatorMocks = [];
    gainMocks = [];
    audioCtxMock = {
      createOscillator: jest.fn(() => {
        const osc = {
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          frequency: { value: 0 },
          type: "sine",
        };
        oscillatorMocks.push(osc);
        return osc;
      }),
      createGain: jest.fn(() => {
        const g = {
          connect: jest.fn(),
          gain: {
            value: 0,
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
          },
        };
        gainMocks.push(g);
        return g;
      }),
      close: jest.fn(),
      resume: jest.fn(() => Promise.resolve()),
      currentTime: 1.5,
      destination: {},
      state: "running",
    };
    global.AudioContext = jest.fn(() => audioCtxMock) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not throw when AudioContext is unavailable", () => {
    global.AudioContext = undefined as unknown as typeof AudioContext;
    expect(() => playCashierChime("order")).not.toThrow();
  });

  it("plays a soft rising C5→E5 for order (triangle + sheen)", () => {
    playCashierChime("order");
    // 2 tones × (body + sheen) = 4 oscillators
    expect(audioCtxMock.createOscillator).toHaveBeenCalledTimes(4);
    expect(oscillatorMocks[0].type).toBe("triangle");
    expect(oscillatorMocks[0].frequency.value).toBeCloseTo(523.25);
    expect(oscillatorMocks[2].frequency.value).toBeCloseTo(659.25);
  });

  it("plays a soft A4→E5 for grocery", () => {
    playCashierChime("grocery");
    expect(audioCtxMock.createOscillator).toHaveBeenCalledTimes(4);
    expect(oscillatorMocks[0].frequency.value).toBeCloseTo(440);
    expect(oscillatorMocks[2].frequency.value).toBeCloseTo(659.25);
  });

  it("plays a soft descending G4→E4 for supply", () => {
    playCashierChime("supply");
    expect(audioCtxMock.createOscillator).toHaveBeenCalledTimes(4);
    expect(oscillatorMocks[0].type).toBe("triangle");
    expect(oscillatorMocks[0].frequency.value).toBeCloseTo(392);
    expect(oscillatorMocks[2].frequency.value).toBeCloseTo(329.63);
  });

  it("applies master gain from default hub volume (45%)", () => {
    playCashierChime("order");
    // master is first createGain; peak ≈ 0.18 * 0.85
    expect(gainMocks[0].gain.value).toBeCloseTo(0.18 * 0.85);
  });

  it("honors explicit volume percent", () => {
    playCashierChime("order", { volume: 100 });
    expect(gainMocks[0].gain.value).toBeCloseTo(0.4 * 0.85);
  });

  it("shapes each voice with attack and release", () => {
    playCashierChime("order");
    const voiceGain = gainMocks[1].gain;
    expect(voiceGain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(voiceGain.exponentialRampToValueAtTime).toHaveBeenCalled();
  });
});

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
  let gainMock: {
    connect: ReturnType<typeof jest.fn>;
    gain: { value: number };
  };

  beforeEach(() => {
    oscillatorMocks = [];
    gainMock = {
      connect: jest.fn(),
      gain: { value: 0 },
    };
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
      createGain: jest.fn(() => gainMock),
      close: jest.fn(),
      currentTime: 1.5,
      destination: {},
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

  it("plays a single 880 Hz tone for order variant", () => {
    playCashierChime("order");
    expect(audioCtxMock.createOscillator).toHaveBeenCalledTimes(1);
    expect(oscillatorMocks[0].frequency.value).toBe(880);
    expect(oscillatorMocks[0].start).toHaveBeenCalledWith(1.5);
    expect(oscillatorMocks[0].stop).toHaveBeenCalledWith(1.65);
  });

  it("plays a two-pulse grocery chime (660 Hz then 880 Hz)", () => {
    playCashierChime("grocery");
    expect(audioCtxMock.createOscillator).toHaveBeenCalledTimes(2);
    expect(oscillatorMocks[0].frequency.value).toBe(660);
    expect(oscillatorMocks[0].start).toHaveBeenCalledWith(1.5);
    expect(oscillatorMocks[0].stop).toHaveBeenCalledWith(1.62);
    expect(oscillatorMocks[1].frequency.value).toBe(880);
    expect(oscillatorMocks[1].start).toHaveBeenCalledWith(1.62);
    expect(oscillatorMocks[1].stop).toHaveBeenCalled();
  });

  it("sets gain to 0.08", () => {
    playCashierChime("order");
    expect(gainMock.gain.value).toBe(0.08);
  });
});

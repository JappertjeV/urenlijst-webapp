import { describe, expect, it } from "vitest";
import { Throttle, waitMessage } from "@/auth/throttle";

function setup(overrides: Partial<ConstructorParameters<typeof Throttle>[0]> = {}) {
  let now = 1_000_000;
  const throttle = new Throttle(
    {
      freeAttempts: 3,
      baseDelayMs: 1_000,
      maxDelayMs: 10_000,
      forgetAfterMs: 60_000,
      maxKeys: 100,
      ...overrides,
    },
    () => now,
  );
  return { throttle, tick: (ms: number) => (now += ms) };
}

describe("Throttle", () => {
  it("laat de vrije pogingen zonder wachttijd door", () => {
    const { throttle } = setup();
    throttle.fail("a");
    throttle.fail("a");
    expect(throttle.retryAfterMs("a")).toBe(0);
  });

  it("laat de wachttijd verdubbelen tot het maximum", () => {
    const { throttle } = setup();
    for (let i = 0; i < 3; i++) throttle.fail("a");
    expect(throttle.retryAfterMs("a")).toBe(1_000);
    throttle.fail("a");
    expect(throttle.retryAfterMs("a")).toBe(2_000);
    for (let i = 0; i < 10; i++) throttle.fail("a");
    expect(throttle.retryAfterMs("a")).toBe(10_000);
  });

  it("laat na afloop van de wachttijd weer toe", () => {
    const { throttle, tick } = setup();
    for (let i = 0; i < 3; i++) throttle.fail("a");
    tick(999);
    expect(throttle.retryAfterMs("a")).toBe(1);
    tick(1);
    expect(throttle.retryAfterMs("a")).toBe(0);
  });

  it("houdt sleutels gescheiden en vergeet na reset of na lange stilte", () => {
    const { throttle, tick } = setup();
    for (let i = 0; i < 5; i++) throttle.fail("a");
    expect(throttle.retryAfterMs("b")).toBe(0);
    throttle.reset("a");
    expect(throttle.retryAfterMs("a")).toBe(0);
    for (let i = 0; i < 5; i++) throttle.fail("a");
    tick(60_001);
    expect(throttle.retryAfterMs("a")).toBe(0);
  });

  it("blijft binnen de geheugengrens bij veel verschillende sleutels", () => {
    const { throttle } = setup({ maxKeys: 10, freeAttempts: 0 });
    for (let i = 0; i < 50; i++) throttle.fail(`k${i}`);
    // de nieuwste sleutel is er nog, de oudste is weggevallen
    expect(throttle.retryAfterMs("k49")).toBeGreaterThan(0);
    expect(throttle.retryAfterMs("k0")).toBe(0);
  });
});

describe("waitMessage", () => {
  it("rondt af op hele minuten", () => {
    expect(waitMessage(30_000)).toMatch(/een minuut/);
    expect(waitMessage(4 * 60_000 + 1)).toMatch(/5 minuten/);
  });
});

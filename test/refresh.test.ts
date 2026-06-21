// test/refresh.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RefreshController } from "../src/refresh";

describe("RefreshController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("start で即時1回呼ぶ", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    expect(load).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it("間隔ごとに再実行する", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(load).toHaveBeenCalledTimes(4); // 即時 + 3回
    c.stop();
  });

  it("stop 後はタイマーが止まる", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    c.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refreshNow で即時実行できる", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.refreshNow();
    expect(load).toHaveBeenCalledTimes(1);
    c.stop();
  });
});

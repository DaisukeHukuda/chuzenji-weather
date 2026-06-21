// test/weather-code.test.ts
import { describe, it, expect } from "vitest";
import { weatherIcon, weatherLabel } from "../src/weather-code";

describe("weatherIcon / weatherLabel", () => {
  it("快晴・晴れ", () => {
    expect(weatherIcon(0)).toBe("☀");
    expect(weatherLabel(0)).toBe("快晴");
  });
  it("薄曇り/晴れ間", () => {
    expect(weatherIcon(2)).toBe("⛅");
  });
  it("曇り", () => {
    expect(weatherIcon(3)).toBe("☁");
  });
  it("雨", () => {
    expect(weatherIcon(63)).toBe("🌧");
  });
  it("雪", () => {
    expect(weatherIcon(73)).toBe("🌨");
  });
  it("雷雨", () => {
    expect(weatherIcon(95)).toBe("⛈");
  });
  it("未知コードは — を返す", () => {
    expect(weatherIcon(999)).toBe("—");
    expect(weatherLabel(999)).toBe("—");
  });
});

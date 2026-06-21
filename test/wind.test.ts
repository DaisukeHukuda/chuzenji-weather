// test/wind.test.ts
import { describe, it, expect } from "vitest";
import { compass16, arrowRotation } from "../src/wind";

describe("compass16", () => {
  it("0°=北, 90°=東, 180°=南, 270°=西", () => {
    expect(compass16(0)).toBe("北");
    expect(compass16(90)).toBe("東");
    expect(compass16(180)).toBe("南");
    expect(compass16(270)).toBe("西");
  });
  it("22.5°刻みで丸める（45°=北東）", () => {
    expect(compass16(45)).toBe("北東");
    expect(compass16(350)).toBe("北"); // 360付近は北へ
  });
  it("null は —", () => {
    expect(compass16(null)).toBe("—");
  });
});

describe("arrowRotation", () => {
  it("吹いてくる方位+180で吹いていく先を指す", () => {
    expect(arrowRotation(0)).toBe(180); // 北から → 南へ
    expect(arrowRotation(90)).toBe(270); // 東から → 西へ
    expect(arrowRotation(270)).toBe(90); // 西から → 東へ
  });
  it("null は null", () => {
    expect(arrowRotation(null)).toBe(null);
  });
});

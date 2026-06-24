// test/colors.test.ts
import { describe, it, expect } from "vitest";
import { tempColor, windColor } from "../src/colors";

describe("tempColor", () => {
  it("低温は寒色、高温は暖色のbgを返す", () => {
    expect(tempColor(0).bg).not.toBe(tempColor(30).bg);
  });
  it("null は無色(transparent)・文字色は既定", () => {
    const c = tempColor(null);
    expect(c.bg).toBe("transparent");
  });
  it("高温(>=28)は白文字", () => {
    expect(tempColor(30).fg).toBe("#fff");
  });
});

describe("windColor", () => {
  it("整数の階級ごとに色が変わる（0m台と1m台で異なる）", () => {
    expect(windColor(0.5).bg).not.toBe(windColor(1.2).bg);
  });
  it("同じ階級内（小数違い）は同色（2.1も2.9も2m台）", () => {
    expect(windColor(2.1).bg).toBe(windColor(2.9).bg);
    expect(windColor(2.9).bg).not.toBe(windColor(3.0).bg);
  });
  it("弱風は黒文字、強風(>=6m台)は白文字", () => {
    expect(windColor(0).fg).toBe("#111");
    expect(windColor(7).fg).toBe("#fff");
  });
  it("8m台以上は同色に丸める", () => {
    expect(windColor(8).bg).toBe(windColor(20).bg);
  });
  it("null は transparent", () => {
    expect(windColor(null).bg).toBe("transparent");
  });
});

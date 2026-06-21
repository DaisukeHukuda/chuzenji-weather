// test/colors.test.ts
import { describe, it, expect } from "vitest";
import { tempColor, gustColor } from "../src/colors";

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

describe("gustColor", () => {
  it("弱風と強風で色が異なる", () => {
    expect(gustColor(2).bg).not.toBe(gustColor(15).bg);
  });
  it("強風(>=12)は白文字", () => {
    expect(gustColor(15).fg).toBe("#fff");
  });
  it("null は transparent", () => {
    expect(gustColor(null).bg).toBe("transparent");
  });
});

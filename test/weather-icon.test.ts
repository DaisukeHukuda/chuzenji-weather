import { describe, it, expect } from "vitest";
import { wxCategory, weatherIconSvg, weatherIconSvgSplit, windArrowSvg } from "../src/weather-icon";

describe("wxCategory", () => {
  it("WMOコードをカテゴリへ", () => {
    expect(wxCategory(0)).toBe("sunny");
    expect(wxCategory(2)).toBe("psun");
    expect(wxCategory(3)).toBe("cloudy");
    expect(wxCategory(45)).toBe("fog");
    expect(wxCategory(61)).toBe("rain");
    expect(wxCategory(71)).toBe("snow");
    expect(wxCategory(95)).toBe("thunder");
    expect(wxCategory(null)).toBeNull();
  });
});

describe("weatherIconSvg", () => {
  it("SVGタイルを返す", () => {
    const s = weatherIconSvg(0);
    expect(s).toContain("<svg");
    expect(s).toContain('class="wi"');
  });
  it("不明コードは — ", () => {
    expect(weatherIconSvg(null)).toContain("—");
  });
});

describe("weatherIconSvgSplit", () => {
  it("午前午後でカテゴリが違えば斜め分割（白い対角線あり）", () => {
    const s = weatherIconSvgSplit(0, 61); // sunny / rain
    expect(s).toContain("<line"); // 対角線
    expect(s).toContain("#f6a821"); // sunny bg
    expect(s).toContain("#2f7fed"); // rain bg
  });
  it("同カテゴリなら単一タイル（対角線なし）", () => {
    const s = weatherIconSvgSplit(0, 1); // どちらも sunny
    expect(s).not.toContain('stroke-width="1.2"');
  });
});

describe("windArrowSvg", () => {
  it("吹いていく向き(deg+180)へ回転", () => {
    expect(windArrowSvg(0, 5)).toContain("rotate(180deg)");
    expect(windArrowSvg(90, 5)).toContain("rotate(270deg)");
  });
  it("弱風は淡色、強風は濃色", () => {
    expect(windArrowSvg(0, 0)).toContain("#cbd5e1");
    expect(windArrowSvg(0, 8)).toContain("#1e3a8a");
  });
  it("風向nullは —", () => {
    expect(windArrowSvg(null, 3)).toContain("—");
  });
});

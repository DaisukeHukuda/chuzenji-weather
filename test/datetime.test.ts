// test/datetime.test.ts
import { describe, it, expect } from "vitest";
import { parseLocalIso, hourLabel, dayKey, dayLabel, sunLabel, formatCountdown } from "../src/datetime";

describe("datetime", () => {
  it("parseLocalIso は年月日時分を返す", () => {
    expect(parseLocalIso("2026-06-21T09:00")).toEqual({
      y: 2026, mo: 6, d: 21, h: 9, mi: 0,
    });
  });
  it("hourLabel は2桁時", () => {
    expect(hourLabel("2026-06-21T09:00")).toBe("09");
    expect(hourLabel("2026-06-21T00:00")).toBe("00");
  });
  it("dayKey は YYYY-MM-DD", () => {
    expect(dayKey("2026-06-21T09:00")).toBe("2026-06-21");
  });
  it("dayLabel は M/D（曜）", () => {
    // 2026-06-21 は日曜
    expect(dayLabel("2026-06-21T09:00")).toBe("6/21（日）");
    // 2026-06-22 は月曜
    expect(dayLabel("2026-06-22T00:00")).toBe("6/22（月）");
  });
  it("sunLabel は H:MM / H:MM", () => {
    expect(sunLabel("2026-06-21T04:30", "2026-06-21T19:05")).toBe("4:30 / 19:05");
  });
  it("formatCountdown は残りミリ秒を M:SS へ", () => {
    expect(formatCountdown(252000)).toBe("4:12");
    expect(formatCountdown(5000)).toBe("0:05");
    expect(formatCountdown(600000)).toBe("10:00");
  });
  it("formatCountdown は 0・負値を 0:00 に丸める", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-1)).toBe("0:00");
    expect(formatCountdown(-9999)).toBe("0:00");
  });
});

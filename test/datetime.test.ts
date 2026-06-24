// test/datetime.test.ts
import { describe, it, expect } from "vitest";
import { parseLocalIso, hourLabel, dayKey, dayLabel, monthDayLabel, sunLabel, formatCountdown, currentSlotIndex } from "../src/datetime";

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
  it("monthDayLabel は M月D日（曜）", () => {
    expect(monthDayLabel("2026-06-24T18:00")).toBe("6月24日（水）");
  });
  it("sunLabel は 日の出・日の入りを改行2段で返す", () => {
    expect(sunLabel("2026-06-21T04:30", "2026-06-21T19:05")).toBe("4:30\n19:05");
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
  it("currentSlotIndex は 開始が現在以下である最後の列のindexを返す", () => {
    const slots = ["2026-06-21T00:00", "2026-06-21T01:00", "2026-06-21T02:00", "2026-06-21T03:00"];
    // 02:30 は 02:00 のスロット内 → index 2
    expect(currentSlotIndex(slots, "2026-06-21T02:30")).toBe(2);
    // ちょうど境界 01:00 は index 1
    expect(currentSlotIndex(slots, "2026-06-21T01:00")).toBe(1);
    // 全スロットより前 → -1
    expect(currentSlotIndex(slots, "2026-06-20T23:00")).toBe(-1);
    // 全スロットより後 → 最後のindex
    expect(currentSlotIndex(slots, "2026-06-21T09:00")).toBe(3);
  });
  it("currentSlotIndex は日単位のスロットでも機能する", () => {
    const days = ["2026-06-21T00:00", "2026-06-22T00:00", "2026-06-23T00:00"];
    expect(currentSlotIndex(days, "2026-06-22T15:00")).toBe(1); // 6/22 が当日
  });
});

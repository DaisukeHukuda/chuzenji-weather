// test/render.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderMatrix } from "../src/render";
import type { Column } from "../src/types";

const cols: Column[] = [
  {
    startIso: "2026-06-21T09:00",
    timeLabel: "09", group: "6/21（日）", sunLabel: "4:30 / 19:05",
    weatherCode: 2, temp: 16, tempMax: null, tempMin: null,
    windSpeed: 1, windDirDeg: 0, gust: 3, precip: 0.7,
    precipProb: 20, cloud: 40, uv: 3, uvAvg: 3,
  },
  {
    startIso: "2026-06-21T10:00",
    timeLabel: "10", group: "6/21（日）", sunLabel: "4:30 / 19:05",
    weatherCode: 61, temp: 19, tempMax: null, tempMin: null,
    windSpeed: 3, windDirDeg: 90, gust: 8, precip: 1.1,
    precipProb: 70, cloud: 90, uv: 2, uvAvg: 2,
  },
];

describe("renderMatrix", () => {
  let host: HTMLElement;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  it("列数ぶんのデータ列を描画し、固定ラベル列を持つ", () => {
    renderMatrix(host, cols, false);
    // 1行(時刻行)あたりのデータセル数 = 列数
    expect(host.querySelectorAll('[data-row="time"] [data-col]').length).toBe(2);
    expect(host.querySelector("[data-label-col]")).not.toBeNull();
  });

  it("気温セルに値が入る", () => {
    renderMatrix(host, cols, false);
    const temps = host.querySelectorAll('[data-row="temp"] [data-col]');
    expect(temps[0]!.textContent).toContain("16");
  });

  it("再描画で既存内容を置き換える（重複しない）", () => {
    renderMatrix(host, cols, false);
    renderMatrix(host, cols, false);
    expect(host.querySelectorAll('[data-row="temp"]').length).toBe(1);
  });

  it("空配列でも例外を投げず、データ列0", () => {
    renderMatrix(host, [], false);
    expect(host.querySelectorAll("[data-col]").length).toBe(0);
  });

  it("最上段の日付見出しバンドは描画しない", () => {
    renderMatrix(host, cols, false);
    expect(host.querySelector("[data-daygroup]")).toBeNull();
    expect(host.querySelector(".day-row")).toBeNull();
  });

  it("showDateRow=true で日ごとのsticky日付ラベルを持つ「日」行を追加する", () => {
    renderMatrix(host, cols, true);
    // cols は全て同じ日(6/21) → セグメント1つ・ラベル1つ
    expect(host.querySelectorAll(".date-row .date-lbl").length).toBe(1);
    expect(host.querySelector(".date-row .date-lbl")!.textContent).toContain("6/21");
    const labels = [...host.querySelectorAll("[data-label-col] .label-cell")].map((e) => e.textContent);
    expect(labels[0]).toBe("日");
  });
  it("showDateRow=false では日付行を描画しない", () => {
    renderMatrix(host, cols, false);
    expect(host.querySelector(".date-row")).toBeNull();
  });
});

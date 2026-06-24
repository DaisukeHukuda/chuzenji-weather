// src/render.ts
import type { Column } from "./types";
import { weatherIcon } from "./weather-code";
import { compass16, arrowRotation } from "./wind";
import { tempColor, gustColor } from "./colors";

interface RowDef {
  key: string;
  label: string;
  cell: (c: Column) => { text: string; bg?: string; fg?: string; rotate?: number | null };
}

const fmt = (v: number | null, suffix = ""): string =>
  v == null ? "—" : `${v}${suffix}`;

const ROWS: RowDef[] = [
  { key: "time", label: "時刻", cell: (c) => ({ text: c.timeLabel }) },
  { key: "weather", label: "天気", cell: (c) => ({ text: weatherIcon(c.weatherCode) }) },
  { key: "windDir", label: "風向", cell: (c) => ({ text: "↑", rotate: arrowRotation(c.windDirDeg) }) },
  { key: "windDirName", label: "", cell: (c) => ({ text: compass16(c.windDirDeg) }) },
  { key: "windSpeed", label: "風速 m/s", cell: (c) => ({ text: fmt(c.windSpeed) }) },
  {
    key: "gust", label: "最大 m/s",
    cell: (c) => { const col = gustColor(c.gust); return { text: fmt(c.gust), bg: col.bg, fg: col.fg }; },
  },
  { key: "precip", label: "降水 mm", cell: (c) => ({ text: fmt(c.precip) }) },
  { key: "precipProb", label: "降水 %", cell: (c) => ({ text: fmt(c.precipProb, "%") }) },
  { key: "cloud", label: "雲量 %", cell: (c) => ({ text: fmt(c.cloud, "%") }) },
  {
    key: "temp", label: "気温 ℃",
    cell: (c) => {
      const text = c.tempMax != null ? `${fmt(c.tempMax)}/${fmt(c.tempMin)}` : fmt(c.temp);
      const col = tempColor(c.tempMax ?? c.temp);
      return { text, bg: col.bg, fg: col.fg };
    },
  },
  { key: "uv", label: "UV", cell: (c) => ({ text: fmt(c.uv) }) },
  { key: "sun", label: "日の出\n日の入", cell: (c) => ({ text: c.sunLabel ?? "—" }) },
];

export function renderMatrix(host: HTMLElement, cols: Column[]): void {
  host.replaceChildren();
  const table = document.createElement("div");
  table.className = "matrix";

  // 固定ラベル列
  const labelCol = document.createElement("div");
  labelCol.className = "label-col";
  labelCol.setAttribute("data-label-col", "");
  // 日付見出しバンドと高さを揃えるための角セル
  const corner = document.createElement("div");
  corner.className = "label-cell corner";
  labelCol.appendChild(corner);
  for (const r of ROWS) {
    const cell = document.createElement("div");
    cell.className = "label-cell";
    cell.textContent = r.label;
    labelCol.appendChild(cell);
  }
  table.appendChild(labelCol);

  // スクロールするデータ列
  const scroller = document.createElement("div");
  scroller.className = "scroller";
  const grid = document.createElement("div");
  grid.className = "grid";

  // 日付見出しバンド: 同じ group の列をまとめて1セルにする
  const CELL_W = 56; // .data-cell の幅(px)と一致させる
  const dayRow = document.createElement("div");
  dayRow.className = "day-row";
  let gi = 0;
  while (gi < cols.length) {
    let gj = gi;
    while (gj < cols.length && cols[gj]!.group === cols[gi]!.group) gj++;
    const span = gj - gi;
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";
    dayCell.setAttribute("data-daygroup", "");
    dayCell.style.flex = `0 0 ${span * CELL_W}px`;
    dayCell.textContent = cols[gi]!.group;
    dayRow.appendChild(dayCell);
    gi = gj;
  }
  grid.appendChild(dayRow);

  for (const r of ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "data-row";
    rowEl.setAttribute("data-row", r.key);
    for (const c of cols) {
      const cellEl = document.createElement("div");
      cellEl.className = "data-cell";
      if (c.isPast) cellEl.classList.add("past");
      cellEl.setAttribute("data-col", "");
      const v = r.cell(c);
      if (v.bg) cellEl.style.background = v.bg;
      if (v.fg) cellEl.style.color = v.fg;
      if (v.rotate != null) {
        // 矢印はセル中央を保ったまま内側の要素だけ回転させる
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = v.text;
        arrow.style.transform = `rotate(${v.rotate}deg)`;
        cellEl.appendChild(arrow);
      } else {
        cellEl.textContent = v.text;
      }
      rowEl.appendChild(cellEl);
    }
    grid.appendChild(rowEl);
  }
  scroller.appendChild(grid);
  table.appendChild(scroller);
  host.appendChild(table);
}

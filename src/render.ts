// src/render.ts
import type { Column } from "./types";
import { weatherIconSvg, weatherIconSvgSplit, windArrowSvg } from "./weather-icon";
import { compass16 } from "./wind";
import { tempColor, windColor } from "./colors";

interface CellOut { text?: string; html?: string; bg?: string; fg?: string; }

interface RowDef {
  key: string;
  label: string;
  cell: (c: Column) => CellOut;
}

const fmt = (v: number | null, suffix = ""): string =>
  v == null ? "—" : `${v}${suffix}`;

// 小数1桁に丸めた数値（整数も小数1桁で）
const round1 = (v: number): number => Math.round(v * 10) / 10;

// UVセル: 代表値（最大）に、平均が異なる場合だけ括弧で平均を併記
function uvText(uv: number | null, uvAvg: number | null): string {
  if (uv == null) return "—";
  const m = round1(uv);
  if (uvAvg == null) return String(m);
  const a = round1(uvAvg);
  return a === m ? String(m) : `${m}（${a}）`;
}

// 天気アイコン: daily系(amCode/pmCode あり)は午前/午後の斜め分割、それ以外は単一タイル
function weatherCell(c: Column): string {
  if (c.amCode != null || c.pmCode != null) {
    return weatherIconSvgSplit(c.amCode ?? null, c.pmCode ?? null);
  }
  return weatherIconSvg(c.weatherCode);
}

const ROWS: RowDef[] = [
  { key: "time", label: "時", cell: (c) => ({ text: c.timeLabel }) },
  { key: "weather", label: "天気", cell: (c) => ({ html: weatherCell(c) }) },
  { key: "windDir", label: "風向", cell: (c) => ({ html: windArrowSvg(c.windDirDeg, c.windSpeed) }) },
  { key: "windDirName", label: "", cell: (c) => ({ text: compass16(c.windDirDeg) }) },
  {
    key: "windSpeed", label: "風速 m/s",
    cell: (c) => {
      if (c.windSpeed == null) return { text: "—" };
      const v = round1(c.windSpeed);
      const col = windColor(v);
      return { text: v.toFixed(1), bg: col.bg, fg: col.fg };
    },
  },
  { key: "gust", label: "最大 m/s", cell: (c) => ({ text: fmt(c.gust) }) },
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
  { key: "uv", label: "UV", cell: (c) => ({ text: uvText(c.uv, c.uvAvg) }) },
  { key: "sun", label: "日の出\n日の入", cell: (c) => ({ text: c.sunLabel ?? "—" }) },
];

// showDateRow=true のとき、最上段に「日」行（左端固定の日付）を追加する（1時間・半日用）
export function renderMatrix(host: HTMLElement, cols: Column[], showDateRow: boolean): void {
  host.replaceChildren();
  const table = document.createElement("div");
  table.className = "matrix";

  // 各列が「日付の変わり目」か（境目に区切り線を入れるため）
  const dayStart = cols.map((c, i) =>
    i > 0 && c.startIso.slice(0, 10) !== cols[i - 1]!.startIso.slice(0, 10));

  // 固定ラベル列
  const labelCol = document.createElement("div");
  labelCol.className = "label-col";
  labelCol.setAttribute("data-label-col", "");
  if (showDateRow) {
    const dcell = document.createElement("div");
    dcell.className = "label-cell";
    dcell.textContent = "日";
    labelCol.appendChild(dcell);
  }
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

  // 「日」行: 1つの日付要素を左端に position:sticky で固定（テキストはapp側がスクロールに応じて更新）
  if (showDateRow) {
    const dateRow = document.createElement("div");
    dateRow.className = "date-row";
    const sticky = document.createElement("div");
    sticky.className = "date-sticky";
    dateRow.appendChild(sticky);
    grid.appendChild(dateRow);
  }

  for (const r of ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "data-row";
    rowEl.setAttribute("data-row", r.key);
    cols.forEach((c, ci) => {
      const cellEl = document.createElement("div");
      cellEl.className = "data-cell";
      if (c.isPast) cellEl.classList.add("past");
      if (dayStart[ci]) cellEl.classList.add("day-start");
      cellEl.setAttribute("data-col", "");
      const v = r.cell(c);
      if (v.bg) cellEl.style.background = v.bg;
      if (v.fg) cellEl.style.color = v.fg;
      if (v.html !== undefined) {
        cellEl.innerHTML = v.html;
      } else {
        cellEl.textContent = v.text ?? "";
      }
      rowEl.appendChild(cellEl);
    });
    grid.appendChild(rowEl);
  }
  scroller.appendChild(grid);
  table.appendChild(scroller);
  host.appendChild(table);
}

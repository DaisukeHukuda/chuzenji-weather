// src/colors.ts
export interface CellColor {
  bg: string;
  fg: string;
}

// 区間境界の上限値と色（昇順）。値以下で最初に一致した色を使う。
type Stop = { max: number; bg: string; fg: string };

const TEMP_STOPS: Stop[] = [
  { max: 0, bg: "#bfdbfe", fg: "#111" },
  { max: 5, bg: "#dbeafe", fg: "#111" },
  { max: 10, bg: "#d1fae5", fg: "#111" },
  { max: 15, bg: "#fef9c3", fg: "#111" },
  { max: 20, bg: "#fde047", fg: "#111" },
  { max: 25, bg: "#fbbf24", fg: "#111" },
  { max: 28, bg: "#f59e0b", fg: "#111" },
  { max: Infinity, bg: "#f97316", fg: "#fff" },
];

// 風速は整数の階級(0m台/1m台/2m台…)ごとに色を分ける。穏やか→強いで寒色系の淡色→暖色系の濃色。
const WIND_BANDS: CellColor[] = [
  { bg: "#e0f2fe", fg: "#111" }, // 0m台（ほぼ無風）
  { bg: "#bbf7d0", fg: "#111" }, // 1m台
  { bg: "#86efac", fg: "#111" }, // 2m台
  { bg: "#fde68a", fg: "#111" }, // 3m台
  { bg: "#fcd34d", fg: "#111" }, // 4m台
  { bg: "#fb923c", fg: "#111" }, // 5m台
  { bg: "#f97316", fg: "#fff" }, // 6m台
  { bg: "#ef4444", fg: "#fff" }, // 7m台
  { bg: "#b91c1c", fg: "#fff" }, // 8m台以上（強風）
];

function pick(stops: Stop[], value: number | null): CellColor {
  if (value == null || Number.isNaN(value)) {
    return { bg: "transparent", fg: "#111" };
  }
  for (const s of stops) {
    if (value <= s.max) return { bg: s.bg, fg: s.fg };
  }
  const last = stops[stops.length - 1]!;
  return { bg: last.bg, fg: last.fg };
}

export function tempColor(value: number | null): CellColor {
  return pick(TEMP_STOPS, value);
}

// 風速を整数の階級で色分け（0.x→0m台, 1.x→1m台 …）。8以上は同色。
export function windColor(value: number | null): CellColor {
  if (value == null || Number.isNaN(value)) {
    return { bg: "transparent", fg: "#111" };
  }
  const band = Math.max(0, Math.floor(value));
  return WIND_BANDS[Math.min(band, WIND_BANDS.length - 1)]!;
}

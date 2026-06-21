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

const GUST_STOPS: Stop[] = [
  { max: 3, bg: "#7c3aed", fg: "#fff" },
  { max: 6, bg: "#6d28d9", fg: "#fff" },
  { max: 9, bg: "#4f46e5", fg: "#fff" },
  { max: 12, bg: "#3b5bdb", fg: "#fff" },
  { max: Infinity, bg: "#2563eb", fg: "#fff" },
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

export function gustColor(value: number | null): CellColor {
  return pick(GUST_STOPS, value);
}

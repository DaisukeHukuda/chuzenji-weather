// src/datetime.ts
export interface LocalParts {
  y: number; mo: number; d: number; h: number; mi: number;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function parseLocalIso(s: string): LocalParts {
  const [date, time = "00:00"] = s.split("T");
  const [y, mo, d] = date!.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return { y: y!, mo: mo!, d: d!, h: h!, mi: mi! };
}

export function hourLabel(s: string): string {
  return String(parseLocalIso(s).h).padStart(2, "0");
}

export function dayKey(s: string): string {
  const { y, mo, d } = parseLocalIso(s);
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function dayLabel(s: string): string {
  const { y, mo, d } = parseLocalIso(s);
  const wd = WEEKDAYS[new Date(y, mo - 1, d).getDay()];
  return `${mo}/${d}（${wd}）`;
}

// 上部の日付バー用（"6月24日（水）"）
export function monthDayLabel(s: string): string {
  const { y, mo, d } = parseLocalIso(s);
  const wd = WEEKDAYS[new Date(y, mo - 1, d).getDay()];
  return `${mo}月${d}日（${wd}）`;
}

// 残りミリ秒を M:SS 形式へ（負値は 0:00 に丸める）
export function formatCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 列の開始ISO配列(昇順)と現在ISOから、「今いるスロット」のindexを返す（該当なしは-1）。
// = 開始が現在以下である最後の列。これより前のindexは過去、これより後は未来。
// 同形式・ゼロ詰めのローカルISO文字列同士なので辞書順比較で時系列比較になる。
export function currentSlotIndex(startIsos: string[], nowIso: string): number {
  let curr = -1;
  for (let i = 0; i < startIsos.length; i++) {
    if (startIsos[i]! <= nowIso) curr = i;
  }
  return curr;
}

// 日の出/日の入りを2段表示（上段=日の出, 下段=日の入り）。スラッシュは使わず改行区切り。
export function sunLabel(sunrise: string | null, sunset: string | null): string | null {
  if (!sunrise || !sunset) return null;
  const r = parseLocalIso(sunrise);
  const s = parseLocalIso(sunset);
  return `${r.h}:${String(r.mi).padStart(2, "0")}\n${s.h}:${String(s.mi).padStart(2, "0")}`;
}

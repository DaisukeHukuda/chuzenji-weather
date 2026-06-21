// src/aggregate.ts
import type { ForecastResponse, Column } from "./types";
import type { Granularity } from "./config";
import { hourLabel, dayKey, dayLabel, sunLabel, parseLocalIso } from "./datetime";

// days1d=14: 1日表示は2週間先まで（Open-Meteoは forecast_days=16 を取得しているので取得可能。
// ただし7日より先は予報の信頼度が下がる参考値）。
const LIMITS = { hourly1h: 48, days3h: 5, daysHalf: 7, days1d: 14, daysWeek: 16 };

function max(nums: number[]): number | null {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  return v.length ? Math.max(...v) : null;
}
function sum(nums: number[]): number | null {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 10) / 10 : null;
}
function avg(nums: number[]): number | null {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

// daily の日の出/日の入りを dayKey で引けるMapに
function sunByDay(res: ForecastResponse): Map<string, string | null> {
  const m = new Map<string, string | null>();
  res.daily.time.forEach((t, i) => {
    m.set(dayKey(t + "T00:00"), sunLabel(res.daily.sunrise[i] ?? null, res.daily.sunset[i] ?? null));
  });
  return m;
}

// hourly の指定インデックス範囲から1列を作る
function hourlyBucket(
  res: ForecastResponse, idxs: number[], timeLabel: string, sun: Map<string, string | null>,
): Column {
  const h = res.hourly;
  const at = (arr: number[]) => idxs.map((i) => arr[i]!);
  const firstTime = h.time[idxs[0]!]!;
  // 風向は最大風速の時刻のものを代表に
  let dirDeg: number | null = null;
  let best = -Infinity;
  for (const i of idxs) {
    if (h.wind_speed_10m[i]! > best) { best = h.wind_speed_10m[i]!; dirDeg = h.wind_direction_10m[i]!; }
  }
  return {
    timeLabel,
    group: dayLabel(firstTime),
    sunLabel: sun.get(dayKey(firstTime)) ?? null,
    weatherCode: max(at(h.weather_code)),
    temp: h.temperature_2m[idxs[0]!] ?? null,
    tempMax: null,
    tempMin: null,
    windSpeed: max(at(h.wind_speed_10m)),
    windDirDeg: dirDeg,
    gust: max(at(h.wind_gusts_10m)),
    precip: sum(at(h.precipitation)),
    precipProb: max(at(h.precipitation_probability)),
    cloud: avg(at(h.cloud_cover)),
    uv: max(at(h.uv_index)),
  };
}

function build1h(res: ForecastResponse, sun: Map<string, string | null>): Column[] {
  const n = Math.min(res.hourly.time.length, LIMITS.hourly1h);
  const cols: Column[] = [];
  for (let i = 0; i < n; i++) cols.push(hourlyBucket(res, [i], hourLabel(res.hourly.time[i]!), sun));
  return cols;
}

// 前提: Open-Meteoの hourly 系列は当日の 00:00（ローカル時刻）始まりで連続して並ぶ。
// そのため固定3時間刻みのインデックス送り（i += 3）は 00/03/.../21 の境界に揃い、
// 各バケットが日付（深夜0時）をまたぐことはない。先頭が00:00でない系列ではこの前提は崩れる。
function build3h(res: ForecastResponse, sun: Map<string, string | null>): Column[] {
  const n = Math.min(res.hourly.time.length, LIMITS.days3h * 24);
  const cols: Column[] = [];
  for (let i = 0; i < n; i += 3) {
    const idxs: number[] = [];
    for (let j = i; j < Math.min(i + 3, n); j++) idxs.push(j);
    cols.push(hourlyBucket(res, idxs, hourLabel(res.hourly.time[i]!), sun));
  }
  return cols;
}

function buildHalfDay(res: ForecastResponse, sun: Map<string, string | null>): Column[] {
  const n = Math.min(res.hourly.time.length, LIMITS.daysHalf * 24);
  // dayKey + (午前/午後) でグルーピング
  const groups = new Map<string, number[]>();
  const order: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = res.hourly.time[i]!;
    const half = parseLocalIso(t).h < 12 ? "午前" : "午後";
    const key = dayKey(t) + "|" + half;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(i);
  }
  return order.map((key) => {
    const idxs = groups.get(key)!;
    const label = key.endsWith("午前") ? "午前" : "午後";
    return hourlyBucket(res, idxs, label, sun);
  });
}

function buildDaily(res: ForecastResponse, days: number): Column[] {
  const d = res.daily;
  const n = Math.min(d.time.length, days);
  const cols: Column[] = [];
  for (let i = 0; i < n; i++) {
    const iso = d.time[i]! + "T00:00";
    const p = parseLocalIso(iso);
    cols.push({
      timeLabel: dayLabel(iso),
      group: `${p.y}年${p.mo}月`,
      sunLabel: sunLabel(d.sunrise[i] ?? null, d.sunset[i] ?? null),
      weatherCode: d.weather_code[i] ?? null,
      temp: null,
      tempMax: d.temperature_2m_max[i] ?? null,
      tempMin: d.temperature_2m_min[i] ?? null,
      windSpeed: d.wind_speed_10m_max[i] ?? null,
      windDirDeg: d.wind_direction_10m_dominant[i] ?? null,
      gust: d.wind_gusts_10m_max[i] ?? null,
      precip: d.precipitation_sum[i] ?? null,
      precipProb: d.precipitation_probability_max[i] ?? null,
      cloud: null,
      uv: d.uv_index_max[i] ?? null,
    });
  }
  return cols;
}

export function buildColumns(res: ForecastResponse, g: Granularity): Column[] {
  const sun = sunByDay(res);
  switch (g) {
    case "1h": return build1h(res, sun);
    case "3h": return build3h(res, sun);
    case "halfday": return buildHalfDay(res, sun);
    case "1d": return buildDaily(res, LIMITS.days1d);
    case "week": return buildDaily(res, LIMITS.daysWeek);
  }
}

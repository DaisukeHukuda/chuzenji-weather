# 中禅寺湖 天気アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 中禅寺湖（標高1269m）のピンポイント予報を、Windfinder風マトリクスで・5分自動更新・スマホ最適化して表示する社内用の静的Webアプリを作る。

**Architecture:** ブラウザから直接 Open-Meteo Forecast API（JMAモデル・`elevation=1269` 補正）を取得する静的SPA。`api`（取得）→ `transform`（純粋関数: 集計・コード変換・色・整形）→ `render`（マトリクスDOM）→ `refresh`（5分タイマー・可視性/通信連動・エラー保持）→ `app`（結線）の単方向構成。`transform` は副作用なしで単体テスト可能。

**Tech Stack:** TypeScript / Vite（静的ビルド & devサーバ）/ vitest（jsdom）/ Cloudflare Pages。外部ランタイム依存なし。

設計書: `docs/superpowers/specs/2026-06-21-chuzenji-weather-app-design.md`

---

## File Structure

```
chuzenji-weather/
  package.json
  tsconfig.json
  vite.config.ts            # vite + vitest 設定 (jsdom)
  index.html                # アプリのHTMLシェル（タブ・ヘッダー・表コンテナ）
  src/
    config.ts               # 地点座標・APIパラメータ・更新間隔などの定数
    types.ts                # Forecast応答型・Column ビューモデル型
    api.ts                  # buildForecastUrl() / fetchForecast()
    weather-code.ts         # WMO天気コード → アイコン+ラベル
    wind.ts                 # 風向(度) → 16方位ラベル + 矢印回転角
    colors.ts               # 気温・突風 → 色（色分けセル）
    datetime.ts             # ISO文字列のパース・時刻/日付ラベル整形
    aggregate.ts            # hourly/daily → Column[]（各粒度の集計）
    render.ts               # Column[] → マトリクス表DOM（生成・差し替え）
    refresh.ts              # RefreshController（5分・visibility・online・エラー保持）
    app.ts                  # 初期化・タブ状態・各モジュール結線
    styles.css              # Windfinder風・左ラベル固定・横スクロール・モバイル
  test/
    api.test.ts
    weather-code.test.ts
    wind.test.ts
    colors.test.ts
    datetime.test.ts
    aggregate.test.ts
    render.test.ts
    refresh.test.ts
  README.md
```

各ファイルは単一責務。`transform` 系（weather-code / wind / colors / datetime / aggregate）はDOM・ネットワークに依存しない純粋関数群。

---

## Task 1: プロジェクト雛形・型・設定

**Files:**
- Create: `chuzenji-weather/package.json`
- Create: `chuzenji-weather/tsconfig.json`
- Create: `chuzenji-weather/vite.config.ts`
- Create: `chuzenji-weather/src/config.ts`
- Create: `chuzenji-weather/src/types.ts`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "chuzenji-weather",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: vite.config.ts を作成**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 4: src/config.ts を作成**

```ts
// 中禅寺湖の地点設定とAPIパラメータ
export const LOCATION = {
  name: "中禅寺湖",
  latitude: 36.727,
  longitude: 139.477,
  elevation: 1269, // 湖面標高(m)。Open-Meteoの標高補正に使う
} as const;

// 5分ごとに自動更新
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const HOURLY_VARS = [
  "weather_code",
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "precipitation",
  "precipitation_probability",
  "cloud_cover",
  "uv_index",
] as const;

export const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "precipitation_sum",
  "precipitation_probability_max",
  "uv_index_max",
  "sunrise",
  "sunset",
] as const;

export type Granularity = "1h" | "3h" | "halfday" | "1d" | "week";
```

- [ ] **Step 5: src/types.ts を作成**

```ts
// Open-Meteo forecast 応答（必要な部分のみ）
export interface ForecastResponse {
  hourly: {
    time: string[];
    weather_code: number[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    cloud_cover: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

// マトリクス1列分のビューモデル（hourly系/daily系で共通）
export interface Column {
  timeLabel: string; // 列見出し（"09" / "午前" / "6/21(日)"）
  group: string; // 日や月の区切り見出し（"6/21（日）" / "2026年6月"）
  sunLabel: string | null; // 日の出/日の入り（"5:30 / 19:00"）
  weatherCode: number | null;
  temp: number | null; // 代表気温（hourly系の気温・色の元）
  tempMax: number | null; // daily系のみ
  tempMin: number | null; // daily系のみ
  windSpeed: number | null;
  windDirDeg: number | null;
  gust: number | null;
  precip: number | null;
  precipProb: number | null;
  cloud: number | null;
  uv: number | null;
}
```

- [ ] **Step 6: 依存をインストール**

Run: `cd chuzenji-weather && npm install`
Expected: `node_modules` 生成、エラーなし

- [ ] **Step 7: Commit**

```bash
cd chuzenji-weather
git add -f package.json package-lock.json tsconfig.json vite.config.ts src/config.ts src/types.ts
git commit -m "chore: 中禅寺湖天気アプリの雛形・型・設定を追加"
```

> 注: リポジトリの `.gitignore` は `*` で未追跡ファイルを除外する設定。新規ファイルは `git add -f` で追加する。`node_modules` は追加しないこと。

---

## Task 2: API URL 組み立て

**Files:**
- Create: `chuzenji-weather/src/api.ts`
- Test: `chuzenji-weather/test/api.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/api.test.ts
import { describe, it, expect } from "vitest";
import { buildForecastUrl } from "../src/api";

describe("buildForecastUrl", () => {
  it("中禅寺湖の座標・標高・JMAモデル・16日・m/s を含む", () => {
    const url = new URL(buildForecastUrl());
    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(url.searchParams.get("latitude")).toBe("36.727");
    expect(url.searchParams.get("longitude")).toBe("139.477");
    expect(url.searchParams.get("elevation")).toBe("1269");
    expect(url.searchParams.get("models")).toBe("jma_seamless");
    expect(url.searchParams.get("timezone")).toBe("Asia/Tokyo");
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(url.searchParams.get("forecast_days")).toBe("16");
    expect(url.searchParams.get("hourly")).toContain("wind_gusts_10m");
    expect(url.searchParams.get("daily")).toContain("sunrise");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/api.test.ts`
Expected: FAIL（`buildForecastUrl` 未定義）

- [ ] **Step 3: 最小実装**

```ts
// src/api.ts
import { LOCATION, HOURLY_VARS, DAILY_VARS } from "./config";
import type { ForecastResponse } from "./types";

export function buildForecastUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    elevation: String(LOCATION.elevation),
    models: "jma_seamless",
    timezone: "Asia/Tokyo",
    wind_speed_unit: "ms",
    forecast_days: "16",
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/api.ts test/api.test.ts
git commit -m "feat: Open-Meteo の予報URLを組み立てる buildForecastUrl"
```

---

## Task 3: 天気コード → アイコン+ラベル

**Files:**
- Create: `chuzenji-weather/src/weather-code.ts`
- Test: `chuzenji-weather/test/weather-code.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/weather-code.test.ts
import { describe, it, expect } from "vitest";
import { weatherIcon, weatherLabel } from "../src/weather-code";

describe("weatherIcon / weatherLabel", () => {
  it("快晴・晴れ", () => {
    expect(weatherIcon(0)).toBe("☀");
    expect(weatherLabel(0)).toBe("快晴");
  });
  it("薄曇り/晴れ間", () => {
    expect(weatherIcon(2)).toBe("⛅");
  });
  it("曇り", () => {
    expect(weatherIcon(3)).toBe("☁");
  });
  it("雨", () => {
    expect(weatherIcon(63)).toBe("🌧");
  });
  it("雪", () => {
    expect(weatherIcon(73)).toBe("🌨");
  });
  it("雷雨", () => {
    expect(weatherIcon(95)).toBe("⛈");
  });
  it("未知コードは — を返す", () => {
    expect(weatherIcon(999)).toBe("—");
    expect(weatherLabel(999)).toBe("—");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/weather-code.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
// src/weather-code.ts
// WMO weather code → 表示
interface WeatherInfo {
  icon: string;
  label: string;
}

const TABLE: Array<{ codes: number[]; info: WeatherInfo }> = [
  { codes: [0], info: { icon: "☀", label: "快晴" } },
  { codes: [1], info: { icon: "🌤", label: "晴れ" } },
  { codes: [2], info: { icon: "⛅", label: "薄曇り" } },
  { codes: [3], info: { icon: "☁", label: "曇り" } },
  { codes: [45, 48], info: { icon: "🌫", label: "霧" } },
  { codes: [51, 53, 55, 56, 57], info: { icon: "🌦", label: "霧雨" } },
  { codes: [61, 63, 65, 66, 67], info: { icon: "🌧", label: "雨" } },
  { codes: [71, 73, 75, 77], info: { icon: "🌨", label: "雪" } },
  { codes: [80, 81, 82], info: { icon: "🌦", label: "にわか雨" } },
  { codes: [85, 86], info: { icon: "🌨", label: "にわか雪" } },
  { codes: [95, 96, 99], info: { icon: "⛈", label: "雷雨" } },
];

function lookup(code: number | null): WeatherInfo | null {
  if (code == null) return null;
  for (const row of TABLE) {
    if (row.codes.includes(code)) return row.info;
  }
  return null;
}

export function weatherIcon(code: number | null): string {
  return lookup(code)?.icon ?? "—";
}

export function weatherLabel(code: number | null): string {
  return lookup(code)?.label ?? "—";
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/weather-code.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/weather-code.ts test/weather-code.test.ts
git commit -m "feat: WMO天気コードをアイコン/ラベルへ変換"
```

---

## Task 4: 風向 → 16方位 + 矢印回転角

**Files:**
- Create: `chuzenji-weather/src/wind.ts`
- Test: `chuzenji-weather/test/wind.test.ts`

風向 `wind_direction_10m` は「風が吹いてくる方位（°）」。表示は (1) 16方位ラベル、(2) 矢印の回転角。矢印グリフ `↑` は上（北＝吹いていく先）を指す前提とし、「吹いてくる方位＋180°」で回転させ、風が向かう方向を指すようにする。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/wind.test.ts
import { describe, it, expect } from "vitest";
import { compass16, arrowRotation } from "../src/wind";

describe("compass16", () => {
  it("0°=北, 90°=東, 180°=南, 270°=西", () => {
    expect(compass16(0)).toBe("北");
    expect(compass16(90)).toBe("東");
    expect(compass16(180)).toBe("南");
    expect(compass16(270)).toBe("西");
  });
  it("22.5°刻みで丸める（45°=北東）", () => {
    expect(compass16(45)).toBe("北東");
    expect(compass16(350)).toBe("北"); // 360付近は北へ
  });
  it("null は —", () => {
    expect(compass16(null)).toBe("—");
  });
});

describe("arrowRotation", () => {
  it("吹いてくる方位+180で吹いていく先を指す", () => {
    expect(arrowRotation(0)).toBe(180); // 北から → 南へ
    expect(arrowRotation(90)).toBe(270); // 東から → 西へ
    expect(arrowRotation(270)).toBe(90); // 西から → 東へ
  });
  it("null は null", () => {
    expect(arrowRotation(null)).toBe(null);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/wind.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
// src/wind.ts
const DIRS16 = [
  "北", "北北東", "北東", "東北東",
  "東", "東南東", "南東", "南南東",
  "南", "南南西", "南西", "西南西",
  "西", "西北西", "北西", "北北西",
];

export function compass16(deg: number | null): string {
  if (deg == null || Number.isNaN(deg)) return "—";
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return DIRS16[idx]!;
}

export function arrowRotation(deg: number | null): number | null {
  if (deg == null || Number.isNaN(deg)) return null;
  return (((deg + 180) % 360) + 360) % 360;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/wind.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/wind.ts test/wind.test.ts
git commit -m "feat: 風向を16方位ラベルと矢印回転角へ変換"
```

---

## Task 5: 色分けセル（気温・突風）

**Files:**
- Create: `chuzenji-weather/src/colors.ts`
- Test: `chuzenji-weather/test/colors.test.ts`

値を区間に応じた色へ変換する。気温は寒色→暖色、突風は弱(紫)→強(青)（Windfinder調）。返り値は `{ bg, fg }`（背景色と読みやすい文字色）。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/colors.test.ts
import { describe, it, expect } from "vitest";
import { tempColor, gustColor } from "../src/colors";

describe("tempColor", () => {
  it("低温は寒色、高温は暖色のbgを返す", () => {
    expect(tempColor(0).bg).not.toBe(tempColor(30).bg);
  });
  it("null は無色(transparent)・文字色は既定", () => {
    const c = tempColor(null);
    expect(c.bg).toBe("transparent");
  });
  it("高温(>=28)は白文字", () => {
    expect(tempColor(30).fg).toBe("#fff");
  });
});

describe("gustColor", () => {
  it("弱風と強風で色が異なる", () => {
    expect(gustColor(2).bg).not.toBe(gustColor(15).bg);
  });
  it("強風(>=12)は白文字", () => {
    expect(gustColor(15).fg).toBe("#fff");
  });
  it("null は transparent", () => {
    expect(gustColor(null).bg).toBe("transparent");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/colors.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/colors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/colors.ts test/colors.test.ts
git commit -m "feat: 気温・突風の色分けセル色を算出"
```

---

## Task 6: 日時パース・ラベル整形

**Files:**
- Create: `chuzenji-weather/src/datetime.ts`
- Test: `chuzenji-weather/test/datetime.test.ts`

Open-Meteo は `timezone=Asia/Tokyo` 指定でオフセットなしのローカルISO（例 `2026-06-21T09:00`）を返す。タイムゾーンずれを避けるため**文字列を手動パース**する。曜日は日付部分から算出。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/datetime.test.ts
import { describe, it, expect } from "vitest";
import { parseLocalIso, hourLabel, dayKey, dayLabel, sunLabel } from "../src/datetime";

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
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/datetime.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
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

export function sunLabel(sunrise: string | null, sunset: string | null): string | null {
  if (!sunrise || !sunset) return null;
  const r = parseLocalIso(sunrise);
  const s = parseLocalIso(sunset);
  return `${r.h}:${String(r.mi).padStart(2, "0")} / ${s.h}:${String(s.mi).padStart(2, "0")}`;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/datetime.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/datetime.ts test/datetime.test.ts
git commit -m "feat: ローカルISOのパースと時刻/日付/日の出ラベル整形"
```

---

## Task 7: 集計 — 各粒度を Column[] へ

**Files:**
- Create: `chuzenji-weather/src/aggregate.ts`
- Test: `chuzenji-weather/test/aggregate.test.ts`

責務: `ForecastResponse` から 1h/3h/halfday/1d/week の `Column[]` を生成。hourly系は daily から当日の日の出/日の入りを引いて各列に付与する。集計規則は設計書の通り（気温=代表値、風速/突風=最大、降水量=合計、降水確率=最大、雲量/UV=平均、天気コード=最大）。

テスト用に小さなフィクスチャを使う。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { buildColumns } from "../src/aggregate";
import type { ForecastResponse } from "../src/types";

// 2日分・3時間刻みの簡易フィクスチャ（hourlyは6時間だけ）
const fixture: ForecastResponse = {
  hourly: {
    time: ["2026-06-21T00:00", "2026-06-21T01:00", "2026-06-21T02:00",
           "2026-06-21T03:00", "2026-06-21T04:00", "2026-06-21T05:00"],
    weather_code: [0, 1, 2, 3, 61, 95],
    temperature_2m: [10, 11, 12, 13, 14, 15],
    wind_speed_10m: [1, 2, 3, 2, 4, 5],
    wind_direction_10m: [0, 10, 20, 90, 100, 110],
    wind_gusts_10m: [3, 4, 5, 4, 7, 9],
    precipitation: [0, 0.2, 0.3, 0, 1, 0.5],
    precipitation_probability: [10, 20, 30, 0, 70, 60],
    cloud_cover: [0, 20, 40, 80, 90, 100],
    uv_index: [0, 1, 2, 1, 0, 0],
  },
  daily: {
    time: ["2026-06-21", "2026-06-22"],
    weather_code: [61, 3],
    temperature_2m_max: [18, 16],
    temperature_2m_min: [9, 8],
    wind_speed_10m_max: [6, 4],
    wind_gusts_10m_max: [11, 7],
    wind_direction_10m_dominant: [90, 270],
    precipitation_sum: [4.0, 0.5],
    precipitation_probability_max: [70, 30],
    uv_index_max: [3, 2],
    sunrise: ["2026-06-21T04:30", "2026-06-22T04:30"],
    sunset: ["2026-06-21T19:05", "2026-06-22T19:05"],
  },
};

describe("buildColumns 1h", () => {
  it("hourlyをそのまま列にし、当日の日の出/日の入りを付ける", () => {
    const cols = buildColumns(fixture, "1h");
    expect(cols).toHaveLength(6);
    expect(cols[0]!.timeLabel).toBe("00");
    expect(cols[0]!.temp).toBe(10);
    expect(cols[0]!.windDirDeg).toBe(0);
    expect(cols[0]!.group).toBe("6/21（日）");
    expect(cols[0]!.sunLabel).toBe("4:30 / 19:05");
  });
});

describe("buildColumns 3h", () => {
  it("3時間ごとに集計（最大/合計/代表）", () => {
    const cols = buildColumns(fixture, "3h");
    // 6時間 → 2バケット
    expect(cols).toHaveLength(2);
    const b0 = cols[0]!;
    expect(b0.timeLabel).toBe("00");
    expect(b0.temp).toBe(10); // 代表=先頭
    expect(b0.windSpeed).toBe(3); // 最大
    expect(b0.gust).toBe(5); // 最大
    expect(b0.precip).toBeCloseTo(0.5); // 合計
    expect(b0.precipProb).toBe(30); // 最大
    expect(b0.weatherCode).toBe(2); // 最大コード
  });
});

describe("buildColumns halfday", () => {
  it("午前/午後で集計し列ラベルを付ける", () => {
    const cols = buildColumns(fixture, "halfday");
    // フィクスチャは0-5時のみ → 6/21の午前1列のみ
    expect(cols).toHaveLength(1);
    expect(cols[0]!.timeLabel).toBe("午前");
    expect(cols[0]!.windSpeed).toBe(5);
    expect(cols[0]!.precip).toBeCloseTo(2.0);
  });
});

describe("buildColumns 1d / week", () => {
  it("dailyを列にする。1dは7日まで、weekは16日まで", () => {
    const d = buildColumns(fixture, "1d");
    expect(d).toHaveLength(2);
    expect(d[0]!.timeLabel).toBe("6/21（日）");
    expect(d[0]!.tempMax).toBe(18);
    expect(d[0]!.tempMin).toBe(9);
    expect(d[0]!.windDirDeg).toBe(90);
    expect(d[0]!.sunLabel).toBe("4:30 / 19:05");
    expect(d[0]!.group).toBe("2026年6月");
    const w = buildColumns(fixture, "week");
    expect(w).toHaveLength(2);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/aggregate.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
// src/aggregate.ts
import type { ForecastResponse, Column } from "./types";
import type { Granularity } from "./config";
import { hourLabel, dayKey, dayLabel, sunLabel, parseLocalIso } from "./datetime";

const LIMITS = { hourly1h: 48, days3h: 5, daysHalf: 7, days1d: 7, daysWeek: 16 };

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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/aggregate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/aggregate.ts test/aggregate.test.ts
git commit -m "feat: 各粒度(1h/3h/半日/1d/週)の列ビューモデルを生成"
```

---

## Task 8: fetchForecast（fetchモック）

**Files:**
- Modify: `chuzenji-weather/src/api.ts`
- Modify: `chuzenji-weather/test/api.test.ts`

- [ ] **Step 1: 失敗するテストを追記**

```ts
// test/api.test.ts に追記
import { fetchForecast } from "../src/api";
import { vi } from "vitest";

describe("fetchForecast", () => {
  it("成功時に hourly/daily を含むJSONを返す", async () => {
    const fake = { hourly: { time: [] }, daily: { time: [] } };
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fake), { status: 200 }),
    );
    const data = await fetchForecast();
    expect(data.hourly).toBeDefined();
    expect(data.daily).toBeDefined();
    spy.mockRestore();
  });

  it("HTTPエラー時は例外を投げる", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("err", { status: 500 }),
    );
    await expect(fetchForecast()).rejects.toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/api.test.ts`
Expected: FAIL（`fetchForecast` 未定義）

- [ ] **Step 3: src/api.ts に追記**

```ts
export async function fetchForecast(): Promise<ForecastResponse> {
  const res = await fetch(buildForecastUrl());
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status}`);
  }
  return (await res.json()) as ForecastResponse;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/api.ts test/api.test.ts
git commit -m "feat: Open-Meteoから予報を取得する fetchForecast"
```

---

## Task 9: マトリクス描画（render）

**Files:**
- Create: `chuzenji-weather/src/render.ts`
- Test: `chuzenji-weather/test/render.test.ts`

責務: `Column[]` から Windfinder風マトリクスのDOMを生成し、与えられたコンテナに差し込む。固定ラベル列＋スクロール列で構成。気温行は daily系なら最高/最低、hourly系なら代表値を表示。色・矢印・アイコンは前タスクの関数を利用。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/render.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderMatrix } from "../src/render";
import type { Column } from "../src/types";

const cols: Column[] = [
  {
    timeLabel: "09", group: "6/21（日）", sunLabel: "4:30 / 19:05",
    weatherCode: 2, temp: 16, tempMax: null, tempMin: null,
    windSpeed: 1, windDirDeg: 0, gust: 3, precip: 0.7,
    precipProb: 20, cloud: 40, uv: 3,
  },
  {
    timeLabel: "10", group: "6/21（日）", sunLabel: "4:30 / 19:05",
    weatherCode: 61, temp: 19, tempMax: null, tempMin: null,
    windSpeed: 3, windDirDeg: 90, gust: 8, precip: 1.1,
    precipProb: 70, cloud: 90, uv: 2,
  },
];

describe("renderMatrix", () => {
  let host: HTMLElement;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  it("列数ぶんのデータ列を描画し、固定ラベル列を持つ", () => {
    renderMatrix(host, cols);
    // 1行(時刻行)あたりのデータセル数 = 列数
    expect(host.querySelectorAll('[data-row="time"] [data-col]').length).toBe(2);
    expect(host.querySelector("[data-label-col]")).not.toBeNull();
  });

  it("気温セルに値が入る", () => {
    renderMatrix(host, cols);
    const temps = host.querySelectorAll('[data-row="temp"] [data-col]');
    expect(temps[0]!.textContent).toContain("16");
  });

  it("再描画で既存内容を置き換える（重複しない）", () => {
    renderMatrix(host, cols);
    renderMatrix(host, cols);
    expect(host.querySelectorAll('[data-row="temp"]').length).toBe(1);
  });

  it("空配列でも例外を投げず、データ列0", () => {
    renderMatrix(host, []);
    expect(host.querySelectorAll("[data-col]").length).toBe(0);
  });

  it("日ごとの見出し(group)を列上部に表示し、同じ日は1つにまとめる", () => {
    renderMatrix(host, cols);
    const groups = host.querySelectorAll("[data-daygroup]");
    expect(groups.length).toBe(1); // 両列とも 6/21（日）
    expect(groups[0]!.textContent).toBe("6/21（日）");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/render.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
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
  { key: "sun", label: "日の出/入", cell: (c) => ({ text: c.sunLabel ?? "—" }) },
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
  const CELL_W = 44; // .data-cell の幅(px)と一致させる
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
      cellEl.setAttribute("data-col", "");
      const v = r.cell(c);
      cellEl.textContent = v.text;
      if (v.bg) cellEl.style.background = v.bg;
      if (v.fg) cellEl.style.color = v.fg;
      if (v.rotate != null) {
        cellEl.style.display = "inline-block";
        cellEl.style.transform = `rotate(${v.rotate}deg)`;
      }
      rowEl.appendChild(cellEl);
    }
    grid.appendChild(rowEl);
  }
  scroller.appendChild(grid);
  table.appendChild(scroller);
  host.appendChild(table);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/render.ts test/render.test.ts
git commit -m "feat: Windfinder風マトリクスのDOM描画 renderMatrix"
```

---

## Task 10: 自動更新コントローラ（refresh）

**Files:**
- Create: `chuzenji-weather/src/refresh.ts`
- Test: `chuzenji-weather/test/refresh.test.ts`

責務: 一定間隔で `load` を呼び、可視性復帰・通信復帰でも即実行。成功で `onData`、失敗で `onError`（直近データ保持はapp側）。テストはフェイクタイマーで検証。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// test/refresh.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RefreshController } from "../src/refresh";

describe("RefreshController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("start で即時1回呼ぶ", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    expect(load).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it("間隔ごとに再実行する", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(load).toHaveBeenCalledTimes(4); // 即時 + 3回
    c.stop();
  });

  it("stop 後はタイマーが止まる", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.start();
    c.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refreshNow で即時実行できる", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const c = new RefreshController(load, 1000);
    c.refreshNow();
    expect(load).toHaveBeenCalledTimes(1);
    c.stop();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd chuzenji-weather && npx vitest run test/refresh.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 最小実装**

```ts
// src/refresh.ts
export class RefreshController {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisible = () => {
    if (document.visibilityState === "visible") this.refreshNow();
  };
  private readonly onOnline = () => this.refreshNow();

  constructor(
    private readonly load: () => Promise<void>,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    this.refreshNow();
    this.timer = setInterval(() => this.refreshNow(), this.intervalMs);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisible);
      window.addEventListener("online", this.onOnline);
    }
  }

  refreshNow(): void {
    void this.load();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisible);
      window.removeEventListener("online", this.onOnline);
    }
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd chuzenji-weather && npx vitest run test/refresh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f src/refresh.ts test/refresh.test.ts
git commit -m "feat: 5分間隔・可視性/通信連動の自動更新コントローラ"
```

---

## Task 11: HTMLシェル・スタイル・app結線

**Files:**
- Create: `chuzenji-weather/index.html`
- Create: `chuzenji-weather/src/styles.css`
- Create: `chuzenji-weather/src/app.ts`

このタスクはDOM結線とスタイルが中心。ユニットテストではなく **devサーバ＋プレビューで目視確認** する（純粋ロジックは前タスクで担保済み）。

- [ ] **Step 1: index.html を作成**

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>中禅寺湖 天気</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <main id="app">
      <header class="app-header">
        <div class="title-row">
          <h1>中禅寺湖</h1>
          <span class="elev">標高1269m</span>
        </div>
        <div class="status-row">
          <span id="auto">🔄 自動更新 5分ごと</span>
          <span id="updated">最終 --:--</span>
          <button id="refresh-btn" type="button">更新</button>
        </div>
        <div id="stale" class="stale hidden">最新の取得に失敗。表示は古い可能性があります。</div>
      </header>

      <nav class="tabs" id="tabs">
        <button data-g="1h" class="active">1時間</button>
        <button data-g="3h">3時間</button>
        <button data-g="halfday">半日</button>
        <button data-g="1d">1日</button>
        <button data-g="week">週</button>
      </nav>

      <section id="matrix-host"></section>

      <footer class="source">出典: Open-Meteo（JMAモデル・標高補正）</footer>
    </main>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: src/styles.css を作成**

```css
:root { --bg:#fff; --ink:#111; --muted:#888; --line:#e5e7eb; --accent:#2563eb; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, "Hiragino Sans", sans-serif;
  color: var(--ink); background:#f3f4f6; }
#app { max-width: 520px; margin: 0 auto; background: var(--bg); min-height:100vh; padding: 10px 8px 24px; }
.app-header { padding: 4px 4px 8px; }
.title-row { display:flex; align-items:baseline; gap:8px; }
.title-row h1 { font-size: 20px; margin:0; }
.elev { font-size: 11px; color: var(--muted); }
.status-row { display:flex; align-items:center; gap:8px; font-size: 11px; color: var(--muted); margin-top:4px; }
.status-row button { margin-left:auto; font-size:11px; padding:3px 10px; border:1px solid var(--line);
  background:#fff; border-radius:6px; }
.stale { font-size:11px; color:#b45309; background:#fffbeb; border:1px solid #fde68a;
  border-radius:6px; padding:4px 8px; margin-top:6px; }
.hidden { display:none; }
.tabs { display:flex; gap:3px; margin:10px 0 8px; }
.tabs button { flex:1; font-size:12px; padding:6px 0; border:none; border-radius:6px;
  background:#eef2f7; color:#333; }
.tabs button.active { background: var(--accent); color:#fff; }

/* Windfinder風マトリクス: 左ラベル固定 + 横スクロール */
.matrix { display:flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.label-col { flex:0 0 64px; border-right:2px solid var(--line); background:#fafafa; }
.label-cell { height:26px; display:flex; align-items:center; padding:0 6px;
  font-size:10px; color:#666; border-bottom:1px solid #f1f1f1; }
.label-cell.corner { height:22px; background:#f3f4f6; border-bottom:1px solid var(--line); }
.scroller { overflow-x:auto; -webkit-overflow-scrolling: touch; flex:1; }
.grid { display:inline-block; min-width:100%; }
.day-row { display:flex; }
.day-cell { height:22px; display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; color:#333; background:#f3f4f6;
  border-left:1px solid #e5e7eb; border-bottom:1px solid var(--line); }
.data-row { display:flex; }
.data-cell { flex:0 0 44px; height:26px; display:flex; align-items:center; justify-content:center;
  font-size:11px; border-bottom:1px solid #f1f1f1; border-left:1px solid #f6f6f6; }
.source { font-size:9px; color:#aaa; text-align:right; margin-top:8px; }
```

- [ ] **Step 3: src/app.ts を作成**

```ts
import { fetchForecast } from "./api";
import { buildColumns } from "./aggregate";
import { renderMatrix } from "./render";
import { RefreshController } from "./refresh";
import { REFRESH_INTERVAL_MS, type Granularity } from "./config";
import type { ForecastResponse } from "./types";

const host = document.getElementById("matrix-host")!;
const updatedEl = document.getElementById("updated")!;
const staleEl = document.getElementById("stale")!;
const tabsEl = document.getElementById("tabs")!;
const refreshBtn = document.getElementById("refresh-btn")!;

let current: Granularity = "1h";
let lastData: ForecastResponse | null = null;

function draw(): void {
  if (!lastData) return;
  renderMatrix(host, buildColumns(lastData, current));
}

function setUpdatedNow(): void {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  updatedEl.textContent = `最終 ${hh}:${mm}`;
}

async function load(): Promise<void> {
  try {
    lastData = await fetchForecast();
    staleEl.classList.add("hidden");
    setUpdatedNow();
    draw();
  } catch (e) {
    // 直近データは保持したまま、古い旨を表示
    staleEl.classList.remove("hidden");
    console.error(e);
  }
}

const controller = new RefreshController(load, REFRESH_INTERVAL_MS);

tabsEl.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    tabsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    current = btn.getAttribute("data-g") as Granularity;
    draw();
  });
});

refreshBtn.addEventListener("click", () => controller.refreshNow());

controller.start();
```

- [ ] **Step 4: typecheck を通す**

Run: `cd chuzenji-weather && npm run typecheck`
Expected: エラーなし

- [ ] **Step 5: devサーバで目視確認**

Run: `cd chuzenji-weather && npm run dev`
プレビューで以下を確認:
- ヘッダー（中禅寺湖・標高・自動更新・最終更新）が表示される
- タブ 1時間/3時間/半日/1日/週 を切り替えると表が変わる
- 風向の矢印が回転、突風・気温セルに色が付く
- 横スクロールで先の時間が見え、左ラベル列は固定
- 「更新」ボタンで再取得し最終更新時刻が変わる
- フッターに出典表示

- [ ] **Step 6: Commit**

```bash
cd chuzenji-weather
git add -f index.html src/styles.css src/app.ts
git commit -m "feat: HTMLシェル・Windfinder風スタイル・app結線"
```

---

## Task 12: ビルド確認・デプロイ設定・README

**Files:**
- Create: `chuzenji-weather/README.md`
- Create: `chuzenji-weather/.gitignore`

- [ ] **Step 1: chuzenji-weather/.gitignore を作成**

```gitignore
node_modules
dist
```

- [ ] **Step 2: 本番ビルドが通ることを確認**

Run: `cd chuzenji-weather && npm run build`
Expected: `dist/` が生成され、エラーなし

- [ ] **Step 3: 全テスト・typecheck を通す**

Run: `cd chuzenji-weather && npm test && npm run typecheck`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 4: README.md を作成**

```markdown
# 中禅寺湖 天気アプリ（社内用）

中禅寺湖（湖面標高1269m）のピンポイント予報を表示する社内用Webアプリ。
データは Open-Meteo（JMAモデル）を標高補正して取得。予報専用・5分自動更新・スマホ最適化。

## 開発

\`\`\`bash
npm install
npm run dev        # 開発サーバ
npm test           # ユニットテスト
npm run typecheck  # 型チェック
npm run build      # 本番ビルド → dist/
\`\`\`

## デプロイ（Cloudflare Pages）

- ビルドコマンド: \`npm run build\`
- 出力ディレクトリ: \`dist\`
- フレームワークプリセット: Vite

`npx wrangler pages deploy dist` でも可。社内でURLを共有して利用する。

## 仕様

- 地点: 中禅寺湖（lat 36.727 / lon 139.477 / elevation 1269）の1地点固定
- 粒度タブ: 1時間(48h) / 3時間(5日) / 半日(7日) / 1日(7日) / 週(16日)
- 要素: 天気・気温・風速・風向・最大風速・降水量・降水確率・雲量・UV指数・日の出/日の入り
- 風速単位: m/s ・ 出典表示: Open-Meteo（JMAモデル・標高補正）

設計書: \`../docs/superpowers/specs/2026-06-21-chuzenji-weather-app-design.md\`
```

- [ ] **Step 5: Commit**

```bash
cd chuzenji-weather
git add -f README.md .gitignore
git commit -m "docs: README とデプロイ設定を追加"
```

---

## 完了条件

- `npm test` 全PASS（api / weather-code / wind / colors / datetime / aggregate / render / refresh）
- `npm run typecheck` エラーなし
- `npm run build` で `dist/` 生成
- devサーバで全粒度タブ・自動更新・横スクロール・色分け・矢印・出典表示を目視確認
- Cloudflare Pages にデプロイし社内URLで閲覧可能

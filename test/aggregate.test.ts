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
    expect(cols[0]!.sunLabel).toBe("4:30\n19:05");
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
    expect(d[0]!.sunLabel).toBe("4:30\n19:05");
    expect(d[0]!.group).toBe("2026年6月");
    const w = buildColumns(fixture, "week");
    expect(w).toHaveLength(2);
  });
});

// 2日分・各日 00:00〜23:00 を網羅するフィクスチャ（午後・複数日・最大風速の検証用）。
// hourlyは 6/21 と 6/22 の48時間。値は時刻iが識別できるよう意図的に作り込む。
function makeHourly(day: string, base: number) {
  const time: string[] = [];
  const weather_code: number[] = [];
  const temperature_2m: number[] = [];
  const wind_speed_10m: number[] = [];
  const wind_direction_10m: number[] = [];
  const wind_gusts_10m: number[] = [];
  const precipitation: number[] = [];
  const precipitation_probability: number[] = [];
  const cloud_cover: number[] = [];
  const uv_index: number[] = [];
  for (let h = 0; h < 24; h++) {
    time.push(`${day}T${String(h).padStart(2, "0")}:00`);
    weather_code.push(h);
    temperature_2m.push(base + h);
    // 風速・風向は後でテスト側が上書きするので一旦単調値
    wind_speed_10m.push(h);
    wind_direction_10m.push(h * 5);
    wind_gusts_10m.push(h + 1);
    precipitation.push(h % 2 === 0 ? 0 : 1);
    precipitation_probability.push(h);
    cloud_cover.push(h);
    uv_index.push(h < 12 ? 0 : 1);
  }
  return { time, weather_code, temperature_2m, wind_speed_10m, wind_direction_10m,
    wind_gusts_10m, precipitation, precipitation_probability, cloud_cover, uv_index };
}

const twoDayHourly = (() => {
  const a = makeHourly("2026-06-21", 0);
  const b = makeHourly("2026-06-22", 100);
  const merge = (k: keyof typeof a) => [...(a[k] as number[] | string[]), ...(b[k] as number[] | string[])];
  return {
    time: merge("time") as string[],
    weather_code: merge("weather_code") as number[],
    temperature_2m: merge("temperature_2m") as number[],
    wind_speed_10m: merge("wind_speed_10m") as number[],
    wind_direction_10m: merge("wind_direction_10m") as number[],
    wind_gusts_10m: merge("wind_gusts_10m") as number[],
    precipitation: merge("precipitation") as number[],
    precipitation_probability: merge("precipitation_probability") as number[],
    cloud_cover: merge("cloud_cover") as number[],
    uv_index: merge("uv_index") as number[],
  };
})();

const twoDay: ForecastResponse = {
  hourly: twoDayHourly,
  daily: {
    time: ["2026-06-21", "2026-06-22"],
    weather_code: [61, 3],
    temperature_2m_max: [18, 116],
    temperature_2m_min: [9, 100],
    wind_speed_10m_max: [6, 4],
    wind_gusts_10m_max: [11, 7],
    wind_direction_10m_dominant: [90, 270],
    precipitation_sum: [4.0, 0.5],
    precipitation_probability_max: [70, 30],
    uv_index_max: [3, 2],
    sunrise: ["2026-06-21T04:30", "2026-06-22T05:00"],
    sunset: ["2026-06-21T19:05", "2026-06-22T18:40"],
  },
};

describe("buildColumns halfday 午後", () => {
  it("0-11時と12-23時を持つ日は午前/午後の2列になり、午後は午後の値のみ集計する", () => {
    const cols = buildColumns(twoDay, "halfday");
    // 2日 × 午前/午後 = 4列
    expect(cols).toHaveLength(4);
    // 1日目: 午前→午後の順
    expect(cols[0]!.timeLabel).toBe("午前");
    expect(cols[1]!.timeLabel).toBe("午後");

    const am0 = cols[0]!;
    const pm0 = cols[1]!;
    // 午前(0-11時)の最大風速は11、午後(12-23時)の最大風速は23
    expect(am0.windSpeed).toBe(11);
    expect(pm0.windSpeed).toBe(23);
    // 午後は午後の時刻のみを集計（午前の値が混ざらない）
    // weatherCode は最大: 午前=11, 午後=23
    expect(am0.weatherCode).toBe(11);
    expect(pm0.weatherCode).toBe(23);
    // precipProb は最大: 午前=11, 午後=23
    expect(pm0.precipProb).toBe(23);
    // 代表気温(temp)は各バケット先頭: 午前=0時(=0), 午後=12時(=12)
    expect(am0.temp).toBe(0);
    expect(pm0.temp).toBe(12);
    // uv_index は午前=全て0で最大0、午後=全て1で最大1
    expect(am0.uv).toBe(0);
    expect(pm0.uv).toBe(1);
  });
});

describe("hourlyBucket windDirDeg", () => {
  it("先頭時刻ではなく最大風速時刻の風向を採用する", () => {
    // 3h集計の先頭バケット(0,1,2時)で最大風速を2時に置く
    const res: ForecastResponse = structuredClone(twoDay);
    res.hourly.wind_speed_10m[0] = 2;
    res.hourly.wind_speed_10m[1] = 9; // ← 最大（先頭でも末尾でもない）
    res.hourly.wind_speed_10m[2] = 5;
    res.hourly.wind_direction_10m[0] = 10;
    res.hourly.wind_direction_10m[1] = 222; // 最大風速時刻の風向
    res.hourly.wind_direction_10m[2] = 30;

    const cols = buildColumns(res, "3h");
    const b0 = cols[0]!;
    expect(b0.windSpeed).toBe(9);
    // 先頭(10)でも末尾(30)でもなく、最大風速時刻(1時)の222
    expect(b0.windDirDeg).toBe(222);
  });
});

describe("buildColumns 1h 複数日", () => {
  it("2日にまたがる列で、各列のgroup(日ラベル)とsunLabelがその日のものになる", () => {
    const cols = buildColumns(twoDay, "1h");
    // 48時間だが上限48なのでちょうど48列
    expect(cols).toHaveLength(48);

    const day1 = cols[0]!; // 6/21 00:00
    const day2 = cols[24]!; // 6/22 00:00
    expect(day1.group).toBe("6/21（日）");
    expect(day2.group).toBe("6/22（月）");
    // sunLabel は各日の sunrise/sunset から
    expect(day1.sunLabel).toBe("4:30\n19:05");
    expect(day2.sunLabel).toBe("5:00\n18:40");
    // 2日目末尾(23時)も2日目のラベル
    expect(cols[47]!.group).toBe("6/22（月）");
    expect(cols[47]!.sunLabel).toBe("5:00\n18:40");
  });
});

describe("buildColumns LIMITS 切り詰め", () => {
  // daily を20日分に増やしたフィクスチャ
  const longDaily: ForecastResponse = (() => {
    const days = 20;
    const time: string[] = [];
    const arr = (v: number) => Array.from({ length: days }, () => v);
    for (let i = 0; i < days; i++) {
      const d = 1 + i; // 7月1日〜20日
      time.push(`2026-07-${String(d).padStart(2, "0")}`);
    }
    return {
      hourly: twoDayHourly,
      daily: {
        time,
        weather_code: arr(0),
        temperature_2m_max: arr(20),
        temperature_2m_min: arr(10),
        wind_speed_10m_max: arr(5),
        wind_gusts_10m_max: arr(8),
        wind_direction_10m_dominant: arr(180),
        precipitation_sum: arr(0),
        precipitation_probability_max: arr(0),
        uv_index_max: arr(3),
        sunrise: time.map((t) => `${t}T04:30`),
        sunset: time.map((t) => `${t}T19:00`),
      },
    };
  })();

  it("week は最大16列に切り詰める", () => {
    expect(buildColumns(longDaily, "week")).toHaveLength(16);
  });
  it("1d は最大7列に切り詰める", () => {
    expect(buildColumns(longDaily, "1d")).toHaveLength(7);
  });
  it("1h は48時間超でも最大48列に切り詰める", () => {
    // twoDayHourly は48時間ちょうど。49時間以上のフィクスチャで確認する
    const longHourly: ForecastResponse = structuredClone(longDaily);
    const extra = makeHourly("2026-06-23", 200);
    longHourly.hourly = {
      time: [...twoDayHourly.time, ...extra.time],
      weather_code: [...twoDayHourly.weather_code, ...extra.weather_code],
      temperature_2m: [...twoDayHourly.temperature_2m, ...extra.temperature_2m],
      wind_speed_10m: [...twoDayHourly.wind_speed_10m, ...extra.wind_speed_10m],
      wind_direction_10m: [...twoDayHourly.wind_direction_10m, ...extra.wind_direction_10m],
      wind_gusts_10m: [...twoDayHourly.wind_gusts_10m, ...extra.wind_gusts_10m],
      precipitation: [...twoDayHourly.precipitation, ...extra.precipitation],
      precipitation_probability: [...twoDayHourly.precipitation_probability, ...extra.precipitation_probability],
      cloud_cover: [...twoDayHourly.cloud_cover, ...extra.cloud_cover],
      uv_index: [...twoDayHourly.uv_index, ...extra.uv_index],
    };
    expect(longHourly.hourly.time.length).toBe(72);
    expect(buildColumns(longHourly, "1h")).toHaveLength(48);
  });
});

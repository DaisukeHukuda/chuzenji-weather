// src/api.ts
import { LOCATION, HOURLY_VARS, DAILY_VARS } from "./config";
import type { ForecastResponse } from "./types";

export function buildForecastUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    elevation: String(LOCATION.elevation),
    // models は指定しない（best_match を使う）。jma_seamless を強制すると
    // wind_gusts_10m / precipitation_probability / uv_index が null で返り、
    // 最大風速・降水確率・UV が常に "—" になってしまう。日本では best_match は
    // JMA ベースで、かつ elevation による標高補正も効くため、全要素を満たせる。
    timezone: "Asia/Tokyo",
    wind_speed_unit: "ms",
    forecast_days: "16",
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export async function fetchForecast(): Promise<ForecastResponse> {
  const res = await fetch(buildForecastUrl());
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status}`);
  }
  return (await res.json()) as ForecastResponse;
}

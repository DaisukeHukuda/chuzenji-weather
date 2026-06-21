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

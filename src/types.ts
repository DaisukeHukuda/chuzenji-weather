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
  startIso: string; // この列のスロット開始ローカルISO（"2026-06-21T09:00"）。現在時刻判定・並べ替えに使う
  isPast?: boolean; // 現在より前の(過ぎた)スロットか。app側で現在時刻から付与する
  timeLabel: string; // 列見出し（"09" / "午前" / "6/21(日)"）
  group: string; // 日や月の区切り見出し（"6/21（日）" / "2026年6月"）
  sunLabel: string | null; // 日の出/日の入り（"5:30 / 19:00"）
  weatherCode: number | null;
  amCode?: number | null; // daily系: 午前の代表天気コード（2週間表示の斜め分割用）
  pmCode?: number | null; // daily系: 午後の代表天気コード
  temp: number | null; // 代表気温（hourly系の気温・色の元）
  tempMax: number | null; // daily系のみ
  tempMin: number | null; // daily系のみ
  windSpeed: number | null;
  windDirDeg: number | null;
  gust: number | null;
  precip: number | null;
  precipProb: number | null;
  cloud: number | null;
  uv: number | null; // 代表UV（hourly系=その時刻/バケット最大, daily=日最大）
  uvAvg: number | null; // 平均UV（バケット平均 / 日平均）。UVセルに括弧で併記する
}

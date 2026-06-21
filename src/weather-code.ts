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

// WeatherNews風の塗りつぶしタイル天気アイコン（SVG文字列）と風向矢印。
// 実アイコンの複製ではなく、同系統の見た目を自作したもの。

export type WxCat = "sunny" | "psun" | "cloudy" | "rain" | "snow" | "thunder" | "fog";

// WMO天気コード → カテゴリ
export function wxCategory(code: number | null): WxCat | null {
  if (code == null) return null;
  if (code === 0 || code === 1) return "sunny";
  if (code === 2) return "psun";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  return "cloudy";
}

const BG: Record<WxCat, string> = {
  sunny: "#f6a821",
  psun: "#9aa3ad",
  cloudy: "#9aa3ad",
  rain: "#2f7fed",
  snow: "#56b6e6",
  thunder: "#6b54a3",
  fog: "#aab0b8",
};

// 白い雲（dyで上下移動）
const cloud = (dy = 0): string =>
  `<g fill="#fff" transform="translate(0 ${dy})">` +
  `<circle cx="8.4" cy="14" r="3.4"/><circle cx="12.3" cy="11.4" r="4.5"/>` +
  `<circle cx="15.8" cy="14" r="3.4"/><rect x="8.4" y="13.2" width="7.4" height="3.8" rx="1.6"/></g>`;

// 白い太陽（cx,cy,r 指定、rays=光線の有無）
const sun = (cx: number, cy: number, r: number, color = "#fff", rays = true): string => {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
  if (rays) {
    const R1 = r + 1.3, R2 = r + 3.1;
    s += `<g stroke="${color}" stroke-width="1.5" stroke-linecap="round">`;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const x1 = cx + Math.cos(a) * R1, y1 = cy + Math.sin(a) * R1;
      const x2 = cx + Math.cos(a) * R2, y2 = cy + Math.sin(a) * R2;
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    s += `</g>`;
  }
  return s;
};

const drops = (): string =>
  `<g stroke="#fff" stroke-width="1.7" stroke-linecap="round">` +
  `<line x1="9" y1="17.5" x2="8" y2="21"/><line x1="12.4" y1="17.5" x2="11.4" y2="21"/>` +
  `<line x1="15.8" y1="17.5" x2="14.8" y2="21"/></g>`;

const flakes = (): string =>
  `<g fill="#fff"><circle cx="9" cy="19" r="1.2"/><circle cx="12.4" cy="20.4" r="1.2"/><circle cx="15.8" cy="19" r="1.2"/></g>`;

const bolt = (): string =>
  `<path d="M13.4 16.2 l2.4-4.6 -3 0 3.2-5.2 -5.4 6.6 2.8 0 -2 3.4 z" fill="#ffe14d"/>`;

// カテゴリの白いシンボル（24x24座標）
function glyph(cat: WxCat): string {
  switch (cat) {
    case "sunny": return sun(12, 12, 4.6);
    case "psun": return cloud(-1) + sun(16.5, 8, 3, "#ffd24d", false);
    case "cloudy": return cloud(0);
    case "rain": return cloud(-2.2) + drops();
    case "snow": return cloud(-2.2) + flakes();
    case "thunder": return cloud(-2.2) + bolt();
    case "fog":
      return `<g stroke="#fff" stroke-width="1.7" stroke-linecap="round">` +
        `<line x1="6" y1="10" x2="18" y2="10"/><line x1="5.5" y1="13.5" x2="18.5" y2="13.5"/>` +
        `<line x1="7" y1="17" x2="17" y2="17"/></g>`;
  }
}

const NA = '<span class="wi-na">—</span>';

// 単一の天気タイル（1時間・半日・1日の標準）
export function weatherIconSvg(code: number | null): string {
  const cat = wxCategory(code);
  if (!cat) return NA;
  return `<svg class="wi" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="24" height="24" fill="${BG[cat]}"/>${glyph(cat)}</svg>`;
}

// 午前/午後を斜めに分割したタイル（WeatherNewsの2週間表示風）。
// 同じカテゴリ、または一方が無ければ単一タイルにフォールバック。
export function weatherIconSvgSplit(am: number | null, pm: number | null): string {
  const a = wxCategory(am), p = wxCategory(pm);
  if (!a && !p) return NA;
  if (!a || !p || a === p) return weatherIconSvg(a ? am : pm);
  return `<svg class="wi" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M0 0 H24 L0 24 Z" fill="${BG[a]}"/>` +
    `<path d="M24 0 V24 H0 Z" fill="${BG[p]}"/>` +
    `<line x1="24" y1="0" x2="0" y2="24" stroke="#fff" stroke-width="1.2"/>` +
    `<g transform="translate(0.5 -1) scale(0.5)">${glyph(a)}</g>` +
    `<g transform="translate(11.5 12) scale(0.5)">${glyph(p)}</g></svg>`;
}

// WeatherNews風の風向矢印（吹いていく向き、弱いほど淡色）
export function windArrowSvg(deg: number | null, speed: number | null): string {
  if (deg == null || Number.isNaN(deg)) return NA;
  const rot = (((deg + 180) % 360) + 360) % 360;
  const c =
    speed == null ? "#cbd5e1" :
    speed < 0.5 ? "#cbd5e1" :
    speed < 2 ? "#93c5fd" :
    speed < 4 ? "#3b82f6" :
    speed < 7 ? "#2563eb" : "#1e3a8a";
  return `<svg class="wind" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M12 2.5 L17 19 L12 15 L7 19 Z" fill="${c}"/></svg>`;
}

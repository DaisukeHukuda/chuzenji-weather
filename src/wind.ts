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

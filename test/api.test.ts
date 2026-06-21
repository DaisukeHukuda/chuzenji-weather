// test/api.test.ts
import { describe, it, expect } from "vitest";
import { buildForecastUrl } from "../src/api";
import { fetchForecast } from "../src/api";
import { vi } from "vitest";

describe("buildForecastUrl", () => {
  it("中禅寺湖の座標・標高・JMAモデル・16日・m/s を含む", () => {
    const url = new URL(buildForecastUrl());
    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(url.searchParams.get("latitude")).toBe("36.727");
    expect(url.searchParams.get("longitude")).toBe("139.477");
    expect(url.searchParams.get("elevation")).toBe("1269");
    expect(url.searchParams.get("models")).toBeNull();
    expect(url.searchParams.get("timezone")).toBe("Asia/Tokyo");
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(url.searchParams.get("forecast_days")).toBe("16");
    expect(url.searchParams.get("hourly")).toContain("wind_gusts_10m");
    expect(url.searchParams.get("daily")).toContain("sunrise");
  });
});

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

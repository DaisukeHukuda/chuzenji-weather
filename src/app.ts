import { fetchForecast } from "./api";
import { buildColumns } from "./aggregate";
import { renderMatrix } from "./render";
import { RefreshController } from "./refresh";
import { REFRESH_INTERVAL_MS, type Granularity } from "./config";
import { formatCountdown } from "./datetime";
import type { ForecastResponse } from "./types";

const host = document.getElementById("matrix-host")!;
const updatedEl = document.getElementById("updated")!;
const nextEl = document.getElementById("next")!;
const staleEl = document.getElementById("stale")!;
const tabsEl = document.getElementById("tabs")!;
const refreshBtn = document.getElementById("refresh-btn")!;

let current: Granularity = "1h";
let lastData: ForecastResponse | null = null;
let nextAt = Date.now() + REFRESH_INTERVAL_MS;

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

function updateCountdown(): void {
  nextEl.textContent = `次 ${formatCountdown(nextAt - Date.now())}`;
}

async function load(): Promise<void> {
  try {
    lastData = await fetchForecast();
    staleEl.classList.add("hidden");
    setUpdatedNow();
    nextAt = Date.now() + REFRESH_INTERVAL_MS;
    updateCountdown();
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

setInterval(updateCountdown, 1000);

controller.start();

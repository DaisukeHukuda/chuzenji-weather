import { fetchForecast } from "./api";
import { buildColumns } from "./aggregate";
import { renderMatrix } from "./render";
import { RefreshController } from "./refresh";
import { REFRESH_INTERVAL_MS, type Granularity } from "./config";
import { formatCountdown, currentSlotIndex } from "./datetime";
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

// 現在時刻をローカルのゼロ詰めISO（"YYYY-MM-DDTHH:MM"）で返す
function nowIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function draw(): void {
  if (!lastData) return;
  const cols = buildColumns(lastData, current);
  // 現在のスロットを判定し、それより前の列を「過去」として印付け（renderでグレー表示）
  const curr = currentSlotIndex(cols.map((c) => c.startIso), nowIso());
  cols.forEach((c, i) => { c.isPast = curr > 0 && i < curr; });
  renderMatrix(host, cols);
  scrollToCurrent(curr);
}

// 現在の時間の列が左端に来るよう横スクロールする
function scrollToCurrent(curr: number): void {
  const scroller = host.querySelector<HTMLElement>(".scroller");
  if (!scroller) return;
  requestAnimationFrame(() => {
    if (curr <= 0) { scroller.scrollLeft = 0; return; }
    const cells = host.querySelectorAll<HTMLElement>('[data-row="time"] [data-col]');
    const cellW = cells[0]?.getBoundingClientRect().width ?? 56;
    scroller.scrollLeft = curr * cellW;
  });
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

// 下スワイプでページ全体を更新（プル・トゥ・リフレッシュ）
function setupPullToRefresh(): void {
  const appEl = document.getElementById("app")!;
  const ptrText = document.getElementById("ptr-text")!;
  const THRESHOLD = 70; // この距離以上引いて離すと更新
  const MAX = 110; // 引ける最大距離
  let startY = 0, startX = 0, dist = 0;
  let decided = false, pulling = false, refreshing = false;

  const reset = (): void => {
    appEl.style.transition = "transform .2s";
    appEl.style.transform = "";
    ptrText.textContent = "↓ 引っ張って更新";
    decided = false; pulling = false; dist = 0;
  };

  appEl.addEventListener("touchstart", (e) => {
    if (refreshing) return;
    startY = e.touches[0]!.clientY;
    startX = e.touches[0]!.clientX;
    decided = false; pulling = false; dist = 0;
  }, { passive: true });

  appEl.addEventListener("touchmove", (e) => {
    if (refreshing) return;
    const dy = e.touches[0]!.clientY - startY;
    const dx = e.touches[0]!.clientX - startX;
    if (!decided) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      decided = true;
      // 下向きで、横移動より縦移動が大きいときだけプル開始（横スクロールを邪魔しない）
      pulling = dy > 0 && Math.abs(dy) > Math.abs(dx);
    }
    if (!pulling) return;
    e.preventDefault();
    dist = Math.min(MAX, dy * 0.5);
    appEl.style.transition = "none";
    appEl.style.transform = `translateY(${dist}px)`;
    ptrText.textContent = dist >= THRESHOLD ? "離して更新" : "↓ 引っ張って更新";
  }, { passive: false });

  appEl.addEventListener("touchend", () => {
    if (refreshing || !pulling) { reset(); return; }
    if (dist >= THRESHOLD) {
      refreshing = true;
      appEl.style.transition = "transform .2s";
      appEl.style.transform = "translateY(44px)";
      ptrText.textContent = "更新中…";
      void load().finally(() => { refreshing = false; reset(); });
    } else {
      reset();
    }
  });
}

setupPullToRefresh();
setInterval(updateCountdown, 1000);

controller.start();

// src/refresh.ts
export class RefreshController {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisible = () => {
    if (document.visibilityState === "visible") this.refreshNow();
  };
  private readonly onOnline = () => this.refreshNow();

  constructor(
    private readonly load: () => Promise<void>,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    this.refreshNow();
    this.timer = setInterval(() => this.refreshNow(), this.intervalMs);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisible);
      window.addEventListener("online", this.onOnline);
    }
  }

  refreshNow(): void {
    void this.load();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisible);
      window.removeEventListener("online", this.onOnline);
    }
  }
}

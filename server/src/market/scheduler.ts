import { indiaDate } from "./import.js";

export function scheduledSlot(now = new Date()) {
  const india = new Date(now.getTime() + 330 * 60000);
  const hour = india.getUTCHours();
  return (hour === 3 || hour === 15) ? `${indiaDate(now)}:${hour}` : null;
}
// For a continuously running server. Lambda uses EventBridge instead.
export function startMarketScheduler(importer: () => Promise<unknown>) {
  let lastSlot: string | null = null, running = false;
  const tick = async () => {
    const slot = scheduledSlot();
    if (!slot || slot === lastSlot || running) return;
    lastSlot = slot; running = true;
    try { console.log("Market scheduled import", await importer()); }
    catch { console.error("Market scheduled import failed; stored prices remain available."); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, 30000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}

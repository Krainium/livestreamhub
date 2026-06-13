export interface HistPoint { t: number; ok: boolean; }

  const KEY = (id: number) => `slh_${id}`;
  const MAX = 24;

  export function recordHistory(streams: { id: number; status: string }[]): void {
    if (typeof window === "undefined") return;
    try {
      const now = Date.now();
      for (const s of streams) {
        const prev: HistPoint[] = JSON.parse(localStorage.getItem(KEY(s.id)) || "[]");
        prev.push({ t: now, ok: s.status === "online" });
        if (prev.length > MAX) prev.splice(0, prev.length - MAX);
        localStorage.setItem(KEY(s.id), JSON.stringify(prev));
      }
    } catch {}
  }

  export function getHistory(id: number): HistPoint[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(KEY(id)) || "[]");
    } catch { return []; }
  }
  
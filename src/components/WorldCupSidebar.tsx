"use client";

import { useEffect, useMemo, useState } from "react";
import { WORLD_CUP_2026, type WCMatch } from "@/data/worldcup2026";

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "kicked off";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${min}m`;
  return `in ${min}m`;
}

function Score({ m }: { m: WCMatch }) {
  if (m.state === "in") {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          {m.detail || "LIVE"}
        </span>
        <span className="font-bold tabular-nums text-white">
          {m.homeScore ?? 0}&ndash;{m.awayScore ?? 0}
        </span>
      </span>
    );
  }
  if (m.state === "post") {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="font-bold tabular-nums text-zinc-200">
          {m.homeScore ?? 0}&ndash;{m.awayScore ?? 0}
        </span>
        <span className="text-[10px] font-semibold text-zinc-500">{m.detail || "FT"}</span>
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs text-emerald-300">
      {new Date(m.kickoff).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export default function WorldCupSidebar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [data, setData] = useState<WCMatch[]>(WORLD_CUP_2026);

  async function pull() {
    try {
      const res = await fetch("/api/worldcup", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { matches?: WCMatch[] };
      if (Array.isArray(json.matches) && json.matches.length) setData(json.matches);
    } catch {
      /* keep last good / bundled data */
    }
  }

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 15000);
    pull();
    return () => clearInterval(tick);
  }, []);

  // While the panel is open, poll every 30s so live scores update as they change.
  useEffect(() => {
    if (!open) return;
    pull();
    const id = setInterval(pull, 30000);
    return () => clearInterval(id);
  }, [open]);

  const matches = useMemo(
    () => [...data].sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff)),
    [data]
  );

  const liveIdx = matches.findIndex((m) => m.state === "in");
  const nextIdx = useMemo(
    () => matches.findIndex((m) => m.state !== "post" && +new Date(m.kickoff) > now),
    [matches, now]
  );
  const featuredIdx = liveIdx >= 0 ? liveIdx : nextIdx;
  const featured = featuredIdx >= 0 ? matches[featuredIdx] : null;

  const tz = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  const dayKey = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const grouped = useMemo(() => {
    const out: { day: string; items: { m: WCMatch; i: number }[] }[] = [];
    matches.forEach((m, i) => {
      const day = dayKey(m.kickoff);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push({ m, i });
      else out.push({ day, items: [{ m, i }] });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, mounted]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-500/30 backdrop-blur transition hover:bg-emerald-600/30"
        title="2026 World Cup schedule & live scores in your local time"
      >
        <span aria-hidden="true">🏆</span>
        World Cup &rsquo;26
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-label="World Cup 2026 schedule and scores"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">🏆 FIFA World Cup 2026</p>
                <h2 className="text-lg font-bold text-white">Schedule &amp; Live Scores</h2>
                {mounted && (
                  <p className="mt-0.5 text-xs text-zinc-500">Times in your timezone{tz ? ` · ${tz}` : ""}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close schedule"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {mounted && featured && (
              <div className="border-b border-white/10 bg-emerald-500/10 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  {featured.state === "in"
                    ? `🔴 Live now · ${featured.detail || ""}`
                    : `Next match · ${fmtCountdown(+new Date(featured.kickoff) - now)}`}
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2 font-semibold text-white">
                  <span>{featured.home} <span className="text-zinc-500">vs</span> {featured.away}</span>
                  {featured.state !== "pre" && (
                    <span className="tabular-nums">{featured.homeScore ?? 0}&ndash;{featured.awayScore ?? 0}</span>
                  )}
                </p>
                <p className="text-xs text-zinc-400">{fmt(featured.kickoff)} · {featured.stage}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!mounted ? (
                <p className="text-sm text-zinc-500">Loading schedule&hellip;</p>
              ) : (
                grouped.map((g) => (
                  <div key={g.day} className="mb-5">
                    <h3 className="mb-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{g.day}</h3>
                    <div className="flex flex-col gap-1.5">
                      {g.items.map(({ m, i }) => (
                        <div
                          key={i}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            i === liveIdx
                              ? "border-red-400/50 bg-red-500/10"
                              : i === featuredIdx
                              ? "border-emerald-400/50 bg-emerald-500/10"
                              : "border-white/10 bg-white/5"
                          } ${m.state === "post" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-zinc-100">
                              {m.home} <span className="text-zinc-500">vs</span> {m.away}
                            </span>
                            <Score m={m} />
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-zinc-500">
                            <span className="truncate">{m.venue}</span>
                            <span className="shrink-0">{m.stage}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

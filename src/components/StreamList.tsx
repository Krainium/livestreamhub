"use client";

  import { useEffect, useState } from "react";
  import type { StreamEntry } from "@/types/stream";
  import { getHistory, type HistPoint } from "@/lib/history";

  interface Props {
    streams: StreamEntry[];
    selectedId: number | null;
    onSelect: (id: number) => void;
  }

  const statusColor: Record<string, string> = {
    online: "bg-emerald-500",
    blocked: "bg-amber-500",
    offline: "bg-red-500",
    timeout: "bg-orange-500",
    error: "bg-red-500",
    unknown: "bg-zinc-500",
  };

  function Sparkline({ id }: { id: number }) {
    const [points, setPoints] = useState<HistPoint[]>([]);

    useEffect(() => {
      setPoints(getHistory(id));
    }, [id]);

    if (points.length < 2) return null;

    const show = points.slice(-16);
    const w = 40;
    const h = 12;
    const step = w / (show.length - 1);

    const linePoints = show
      .map((p, i) => `${i * step},${p.ok ? 2 : h - 2}`)
      .join(" ");

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="shrink-0 opacity-70"
        aria-hidden="true"
      >
        <polyline
          points={linePoints}
          fill="none"
          stroke="url(#sg)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {show.map((p, i) => (
          <circle
            key={i}
            cx={i * step}
            cy={p.ok ? 2 : h - 2}
            r="1.5"
            fill={p.ok ? "#34d399" : "#f87171"}
          />
        ))}
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  export default function StreamList({ streams, selectedId, onSelect }: Props) {
    const grouped = streams.reduce<Record<string, StreamEntry[]>>((acc, s) => {
      (acc[s.event] ||= []).push(s);
      return acc;
    }, {});

    return (
      <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: "70vh" }}>
        {Object.entries(grouped).map(([event, channels]) => (
          <div key={event} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">{event}</h3>
            <div className="flex flex-col gap-1">
              {channels.map((s) => (
                <button
                  key={s.id}
                  data-stream-id={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedId === s.id
                      ? "bg-emerald-600/30 text-white ring-1 ring-emerald-400/50"
                      : "text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusColor[s.status] || statusColor.unknown}`}
                    title={s.status}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.channel}</span>
                  <Sparkline id={s.id} />
                  {s.recommended && (
                    <span
                      className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                      title="Recommended for your region"
                    >
                      ★
                    </span>
                  )}
                  {s.qualities?.[0] && (
                    <span className="shrink-0 text-xs text-violet-400">{s.qualities[0].label}</span>
                  )}
                  <span className="shrink-0 text-xs uppercase text-zinc-500">{s.stream_type}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
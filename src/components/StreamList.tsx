"use client";

  import type { StreamEntry } from "@/types/stream";

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

  export default function StreamList({ streams, selectedId, onSelect }: Props) {
    const grouped = streams.reduce<Record<string, StreamEntry[]>>((acc, s) => {
      (acc[s.event] ||= []).push(s);
      return acc;
    }, {});

    return (
      <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: "70vh" }}>
        {Object.entries(grouped).map(([event, channels]) => (
          <div key={event} className="rounded-xl border border-white/10 bg-white/5 p-3">
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
                  <span className="flex-1 truncate">{s.channel}</span>
                  {s.recommended && (
                    <span
                      className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                      title="Recommended for your region"
                    >
                      ★
                    </span>
                  )}
                  {s.qualities?.[0] && (
                    <span className="text-xs text-violet-400">{s.qualities[0].label}</span>
                  )}
                  <span className="text-xs uppercase text-zinc-500">{s.stream_type}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
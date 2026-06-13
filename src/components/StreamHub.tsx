"use client";

import { useCallback, useMemo, useState } from "react";
import StreamList from "@/components/StreamList";
import VideoPlayer from "@/components/VideoPlayer";
import type { ManifestInfo, StreamEntry } from "@/types/stream";

interface Props {
  initialStreams: StreamEntry[];
  initialSelectedId: number | null;
}

function buildManifest(stream: StreamEntry): ManifestInfo {
  if (stream.stream_type === "dash") {
    const hasClearKey = Boolean(stream.drm_kid && stream.drm_key);
    return {
      type: "dash",
      url: `/api/proxy/${stream.id}`,
      streamId: stream.id,
      clearkeys: hasClearKey ? { [stream.drm_kid!]: stream.drm_key! } : undefined,
    };
  }
  if (stream.stream_type === "hls" || stream.stream_url.includes(".m3u8")) {
    return { type: "hls", url: `/api/proxy/${stream.id}`, streamId: stream.id };
  }
  return { type: "other", url: `/api/proxy/${stream.id}`, streamId: stream.id };
}

export default function StreamHub({ initialStreams, initialSelectedId }: Props) {
  const [streams, setStreams] = useState<StreamEntry[]>(initialStreams);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStreams = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch("/api/streams/refresh", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: StreamEntry[] = await res.json();
      setStreams(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh streams");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const selected = streams.find((s) => s.id === selectedId) || null;
  const manifest = useMemo(
    () => (selected ? buildManifest(selected) : null),
    [selected]
  );
  const onlineCount = streams.filter((s) => s.status === "online").length;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            ⚽ Live Football Stream Hub
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Live Streams
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadStreams}
            disabled={refreshing}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
          >
            {refreshing ? "Checking…" : "Refresh"}
          </button>
          <div className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {onlineCount}/{streams.length} online
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            All channels ({streams.length})
          </h2>
          <StreamList streams={streams} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        <section className="flex flex-col gap-4">
          {selected ? (
            <>
              <div>
                <h2 className="text-xl font-semibold">{selected.event}</h2>
                <p className="text-zinc-400">{selected.channel}</p>
              </div>
              <VideoPlayer
                title={`${selected.event} - ${selected.channel}`}
                manifest={manifest}
                qualities={selected.qualities}
                error={error}
              />
            </>
          ) : (
            <p className="text-zinc-400">Select a channel to play</p>
          )}
        </section>
      </div>
    </>
  );
}

"use client";

  import { useCallback, useEffect, useMemo, useState } from "react";
  import StreamList from "@/components/StreamList";
  import WorldCupSidebar from "@/components/WorldCupSidebar";
  import VideoPlayer from "@/components/VideoPlayer";
  import type { ManifestInfo, StreamEntry } from "@/types/stream";
  import { recordHistory } from "@/lib/history";

  interface Props {
    initialStreams: StreamEntry[];
    initialSelectedId: number | null;
    regionLabel?: string;
    country?: string;
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

  export default function StreamHub({
    initialStreams,
    initialSelectedId,
    regionLabel,
    country = "",
  }: Props) {
    const [streams, setStreams] = useState<StreamEntry[]>(initialStreams);
    const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
      recordHistory(initialStreams.map((s) => ({ id: s.id, status: s.status })));
    }, []);

    const loadStreams = useCallback(async () => {
      setError(null);
      setRefreshing(true);
      try {
        const url = country
          ? `/api/streams/refresh?country=${encodeURIComponent(country)}`
          : "/api/streams/refresh";
        const res = await fetch(url, { method: "POST", cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: StreamEntry[] = await res.json();
        setStreams(data);
        recordHistory(data.map((s) => ({ id: s.id, status: s.status })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to refresh streams");
      } finally {
        setRefreshing(false);
      }
    }, [country]);

    // Self-refresh: re-probe on mount and every 90s so statuses (and the
    // per-channel uptime sparkline) stay live without a manual refresh. The
    // page no longer relies on the dead VPS for fresh status.
    useEffect(() => {
      loadStreams();
      const id = setInterval(loadStreams, 90_000);
      return () => clearInterval(id);
    }, [loadStreams]);

    const selected = streams.find((s) => s.id === selectedId) || null;
    const manifest = useMemo(
      () => (selected ? buildManifest(selected) : null),
      [selected]
    );
    const onlineCount = streams.filter((s) => s.status === "online").length;
    const hasGeo = Boolean(regionLabel && regionLabel !== "🌍 Global");

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
            {regionLabel && (
              <p className="mt-1 text-sm text-zinc-400">
                <span className="mr-1">📍</span>
                {hasGeo ? (
                  <>Sorted for <span className="text-zinc-200">{regionLabel}</span></>
                ) : (
                  <span>{regionLabel}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <WorldCupSidebar />
            <a
              href="https://github.com/Krainium/livestreamhub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition"
              title="View source on GitHub"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Source
            </a>
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
                  <p className="text-zinc-400">
                    {selected.channel}
                    {selected.recommended && (
                      <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        ★ Recommended for your region
                      </span>
                    )}
                  </p>
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
  
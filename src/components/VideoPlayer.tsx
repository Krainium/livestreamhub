"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ManifestInfo, StreamQuality } from "@/types/stream";

interface Props {
  title: string;
  manifest: ManifestInfo | null;
  qualities?: StreamQuality[] | null;
  loading?: boolean;
  error?: string | null;
}

type PlayerKind = "dash" | "hls" | null;

interface QualityPick {
  id?: string;
  height?: number;
}

function qualityFromKey(key: string, qualities: StreamQuality[]): QualityPick | undefined {
  if (key === "auto") return undefined;
  const q = qualities.find((item) => item.id === key);
  return q ? { id: q.id, height: q.height } : undefined;
}

function hasClearKeyDrm(m: ManifestInfo): boolean {
  return Boolean(m.clearkeys && Object.keys(m.clearkeys).length > 0);
}

function destroyPlayer(
  playerRef: { current: unknown },
  kindRef: { current: PlayerKind }
) {
  const player = playerRef.current;
  if (!player) return;
  try {
    if (typeof (player as { destroy?: () => void }).destroy === "function") {
      (player as { destroy: () => void }).destroy();
    } else if (typeof (player as { reset?: () => void }).reset === "function") {
      (player as { reset: () => void }).reset();
    }
  } catch {
    // ignore cleanup errors
  }
  playerRef.current = null;
  kindRef.current = null;
}

function hexToBase64url(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildClearKeys(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [kidHex, keyHex] of Object.entries(raw)) {
    out[hexToBase64url(kidHex)] = hexToBase64url(keyHex);
  }
  return out;
}

async function safePlay(el: HTMLVideoElement): Promise<void> {
  if (!el.paused) return;
  try {
    await el.play();
  } catch (err) {
    if ((err as DOMException)?.name === "NotAllowedError") {
      const prev = el.muted;
      el.muted = true;
      try { await el.play(); } catch { el.muted = prev; }
    }
  }
}

function attachPlaybackEvents(
  el: HTMLVideoElement,
  destroyedRef: { current: boolean },
  setStatus: (s: string) => void,
  updateResolution: (el: HTMLVideoElement) => void,
  signal: AbortSignal
) {
  const opts = { signal };
  el.addEventListener("playing", () => {
    if (!destroyedRef.current) {
      if (el.muted && !el.defaultMuted) el.muted = false;
      setStatus("playing");
      updateResolution(el);
    }
  }, opts);
  el.addEventListener("waiting", () => { if (!destroyedRef.current) setStatus("buffering"); }, opts);
  el.addEventListener("stalled", () => { if (!destroyedRef.current) setStatus("buffering"); }, opts);
  el.addEventListener("canplay", () => {
    if (!destroyedRef.current && el.paused) safePlay(el).catch(() => {});
  }, opts);
}

export default function VideoPlayer({ title, manifest, qualities, loading, error }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const playerRef     = useRef<unknown>(null);
  const playerKindRef = useRef<PlayerKind>(null);
  const destroyedRef  = useRef(false);
  const manifestRef   = useRef(manifest);

  const [status,          setStatus]         = useState<string>("idle");
  const [playError,       setPlayError]      = useState<string | null>(null);
  const [resolution,      setResolution]     = useState<string>("—");
  const [bufferSecs,      setBufferSecs]     = useState<number>(0);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [activeQuality,   setActiveQuality]  = useState<string>("auto");
  const selectedQualityRef = useRef("auto");

  const sortedQualities = useMemo(
    () => [...(qualities ?? [])].sort((a, b) => b.height - a.height),
    [qualities]
  );
  const sortedQualitiesRef = useRef(sortedQualities);
  sortedQualitiesRef.current = sortedQualities;
  manifestRef.current = manifest;

  useLayoutEffect(() => {
    selectedQualityRef.current = "auto";
    setSelectedQuality("auto");
    setActiveQuality("auto");
  }, [manifest]);

  const applyQuality = useCallback((qualityKey: string) => {
    const player = playerRef.current;
    const kind   = playerKindRef.current;
    if (!player || !kind) return;

    if (kind === "dash") {
      const dash = player as {
        setRepresentationForTypeById?: (type: string, id: string, force?: boolean) => void;
        getBitrateInfoListFor: (t: string) => Array<{ height?: number; qualityIndex?: number }>;
        setQualityFor: (t: string, i: number) => void;
        setAutoSwitchQualityFor: (t: string, v: boolean) => void;
        updateSettings: (s: Record<string, unknown>) => void;
      };
      if (qualityKey === "auto") {
        dash.setAutoSwitchQualityFor("video", true);
        setActiveQuality("auto");
        return;
      }
      const target = sortedQualitiesRef.current.find((q) => q.id === qualityKey);
      if (!target) return;
      dash.setAutoSwitchQualityFor("video", false);
      if (typeof dash.setRepresentationForTypeById === "function") {
        dash.setRepresentationForTypeById("video", target.id, true);
      } else {
        const bitrates = dash.getBitrateInfoListFor("video");
        const match = bitrates.find((b) => b.height === target.height);
        if (match?.qualityIndex != null) dash.setQualityFor("video", match.qualityIndex);
      }
      setActiveQuality(qualityKey);
      setResolution(`${target.width}x${target.height} (${target.label})`);
    }

    if (kind === "hls") {
      const hls = player as { levels: Array<{ height: number; width: number }>; currentLevel: number };
      if (qualityKey === "auto") { hls.currentLevel = -1; setActiveQuality("auto"); return; }
      const target = sortedQualitiesRef.current.find((q) => q.id === qualityKey);
      if (!target) return;
      const idx = hls.levels.findIndex((l) => l.height === target.height);
      if (idx >= 0) {
        hls.currentLevel = idx;
        setActiveQuality(qualityKey);
        setResolution(`${target.width}x${target.height} (${target.label})`);
      }
    }
  }, []);

  useLayoutEffect(() => {
    const videoEl = videoRef.current;
    if (!manifest) { setStatus("no-manifest"); return; }
    if (!videoEl)  { setStatus("no-video-ref"); return; }

    destroyedRef.current = false;
    const abort = new AbortController();
    let bufferTimer: ReturnType<typeof setInterval> | null = null;

    const updateResolution = (el: HTMLVideoElement) => {
      if (el.videoWidth > 0 && el.videoHeight > 0)
        setResolution(`${el.videoWidth}x${el.videoHeight}`);
    };

    const trackBuffer = (el: HTMLVideoElement) => {
      let stallTicks = 0;
      bufferTimer = setInterval(() => {
        if (destroyedRef.current) return;
        if (el.buffered.length > 0) {
          const end = el.buffered.end(el.buffered.length - 1);
          const start = el.buffered.start(0);
          setBufferSecs(Math.max(0, Math.round(end - start)));
        }
        if (el.videoWidth > 0) setResolution(`${el.videoWidth}x${el.videoHeight}`);
        if (el.paused && !el.ended) {
          stallTicks++;
          if (stallTicks >= 2) { safePlay(el).catch(() => {}); stallTicks = 0; }
        } else { stallTicks = 0; }
      }, 500);
    };

    async function playHls(url: string, el: HTMLVideoElement) {
      const absUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      const Hls    = (await import("hls.js")).default;

      if (!Hls.isSupported()) {
        if (el.canPlayType("application/vnd.apple.mpegurl")) {
          destroyPlayer(playerRef, playerKindRef);
          playerKindRef.current = "hls";
          el.src = absUrl;
          el.addEventListener("loadedmetadata", () => {
            if (!destroyedRef.current) { setStatus("ready"); updateResolution(el); }
          });
          attachPlaybackEvents(el, destroyedRef, setStatus, updateResolution, abort.signal);
          trackBuffer(el);
          safePlay(el).catch(() => undefined);
          return;
        }
        setPlayError("HLS not supported in this browser");
        setStatus("error");
        return;
      }

      destroyPlayer(playerRef, playerKindRef);
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: false,
        backBufferLength: 30, maxBufferLength: 40, maxMaxBufferLength: 120,
        liveSyncDurationCount: 4, liveMaxLatencyDurationCount: 10,
        maxLiveSyncPlaybackRate: 1.1, startFragPrefetch: true,
        fragLoadingTimeOut: 20000, manifestLoadingTimeOut: 20000, levelLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6, levelLoadingMaxRetry: 4, manifestLoadingMaxRetry: 4, nudgeMaxRetry: 8,
      });
      playerRef.current     = hls;
      playerKindRef.current = "hls";
      hls.loadSource(absUrl);
      hls.attachMedia(el);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!destroyedRef.current) { setStatus("ready"); safePlay(el).catch(() => undefined); }
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        if (!destroyedRef.current) {
          const level = hls.levels[data.level];
          if (level) {
            setResolution(`${level.width}x${level.height}`);
            const match = sortedQualitiesRef.current.find((q) => q.height === level.height);
            if (match) setActiveQuality(match.id);
          }
        }
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (destroyedRef.current) return;
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); return; }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR)   { hls.recoverMediaError(); return; }
          setPlayError("Stream failed — try another channel");
          setStatus("error");
        }
      });

      attachPlaybackEvents(el, destroyedRef, setStatus, updateResolution, abort.signal);
      trackBuffer(el);
    }

    async function playDash(m: ManifestInfo, el: HTMLVideoElement): Promise<boolean> {
      const absUrl  = m.url.startsWith("http") ? m.url : `${window.location.origin}${m.url}`;
      const dashjs  = await import("dashjs");
      destroyPlayer(playerRef, playerKindRef);

      const player  = dashjs.MediaPlayer().create();
      playerRef.current     = player;
      playerKindRef.current = "dash";

      player.registerCustomCapabilitiesFilter(() => true);

      const selected = selectedQualityRef.current;
      const target   = selected !== "auto" ? sortedQualitiesRef.current.find((q) => q.id === selected) : null;

      if (m.clearkeys && Object.keys(m.clearkeys).length > 0) {
        player.setProtectionData({
          "org.w3.clearkey": { clearkeys: buildClearKeys(m.clearkeys) },
        });
      }

      player.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: selected === "auto" },
            initialBitrate:    { video: target?.bitrate ?? -1 },
          },
          buffer: { fastSwitchEnabled: true, bufferTimeAtTopQuality: 30, bufferTimeDefault: 30 },
          liveCatchUp: { enabled: false },
          retryAttempts: { MPD: 5, InitializationSegment: 5, MediaSegment: 5, BitstreamSwitchingSegment: 5, IndexSegment: 5 },
          retryIntervals: { MPD: 500, MediaSegment: 500 },
          text: { defaultEnabled: false },
          capabilities: {
            filterUnsupportedEssentialProperties: false,
            useMediaCapabilitiesApi: false,
          },
        },
      } as Record<string, unknown>);

      const initPromise = new Promise<boolean>((resolve) => {
        let resolved = false;
        const done = (v: boolean) => { if (!resolved) { resolved = true; resolve(v); } };

        el.addEventListener("playing", () => done(true), { once: true });

        const globalTimer = setTimeout(() => done(false), 35000);
        player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (!destroyedRef.current) {
            clearTimeout(globalTimer);
            const playTimer = setTimeout(() => done(false), 30000);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
              clearTimeout(playTimer);
              done(true);
            });
          }
        });
      });

      player.initialize(el, absUrl, true);

      player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        if (!destroyedRef.current) {
          setStatus("ready");
          if (selectedQualityRef.current !== "auto") applyQuality(selectedQualityRef.current);
          setTimeout(() => {
            if (!destroyedRef.current && el.paused && !el.ended) safePlay(el).catch(() => {});
          }, 800);
        }
      });

      player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, () => {
        if (!destroyedRef.current) updateResolution(el);
      });
      player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
        if (!destroyedRef.current) setStatus("playing");
      });
      player.on(dashjs.MediaPlayer.events.BUFFER_EMPTY, () => {
        if (!destroyedRef.current) setStatus("buffering");
      });
      player.on(dashjs.MediaPlayer.events.BUFFER_LOADED, () => {
        if (!destroyedRef.current && el.paused && !el.ended) safePlay(el).catch(() => {});
      });
      player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
        if (!destroyedRef.current) {
          setTimeout(() => {
            if (!destroyedRef.current && el.paused && !el.ended) safePlay(el).catch(() => {});
          }, 500);
        }
      });

      attachPlaybackEvents(el, destroyedRef, setStatus, updateResolution, abort.signal);
      trackBuffer(el);
      return initPromise;
    }

    async function init() {
      const m  = manifest;
      const el = videoRef.current;
      if (!m || !el) return;

      setPlayError(null);
      setResolution("—");
      setBufferSecs(0);
      setActiveQuality(selectedQualityRef.current);
      setStatus("loading");

      try {
        destroyPlayer(playerRef, playerKindRef);
        el.removeAttribute("src");
        el.load();

        if (m.type === "dash") {
          const ok = await playDash(m, el);
          if (destroyedRef.current) return;
          if (!ok) {
            const onHttp = typeof window !== "undefined" && window.location.protocol === "http:";
            const errMsg = onHttp && hasClearKeyDrm(m)
              ? "Encrypted stream: open https://" + window.location.hostname + " for playback"
              : "Stream unavailable — try another channel";
            setPlayError((prev) => prev ?? errMsg);
            setStatus("error");
          }
          return;
        }

        if (m.type === "hls") { await playHls(m.url, el); return; }
        await playHls(m.url, el);
      } catch (err) {
        setPlayError(err instanceof Error ? err.message : "Player init failed");
        setStatus("error");
      }
    }

    init();

    return () => {
      destroyedRef.current = true;
      abort.abort();
      if (bufferTimer) clearInterval(bufferTimer);
      destroyPlayer(playerRef, playerKindRef);
      const el = videoRef.current;
      if (el) { el.removeAttribute("src"); el.load(); }
    };
  }, [manifest, applyQuality]);

  const handleQualitySelect = (key: string) => {
    selectedQualityRef.current = key;
    setSelectedQuality(key);
    setActiveQuality(key);
    if (playerKindRef.current) applyQuality(key);
  };

  return (
    <div className="flex flex-col gap-3">
      {sortedQualities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Quality</span>
          <button
            type="button"
            onClick={() => handleQualitySelect("auto")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              activeQuality === "auto"
                ? "bg-emerald-600 text-white"
                : "bg-white/10 text-zinc-300 hover:bg-white/20"
            }`}
          >
            Auto
          </button>
          {sortedQualities.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleQualitySelect(q.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                activeQuality === q.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white/10 text-zinc-300 hover:bg-white/20"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10">
        <video ref={videoRef} className="h-full w-full" controls playsInline title={title} />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          <span className="rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">{resolution}</span>
          {status === "buffering" && (
            <span className="rounded bg-amber-500/80 px-2 py-1 text-xs text-white">
              Buffering… {bufferSecs}s ahead
            </span>
          )}
        </div>

        {(loading || status === "loading") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-sm text-white">
            <svg className="h-8 w-8 animate-spin text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Loading stream…</span>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-sm text-white">
            <svg className="h-8 w-8 animate-spin text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Starting playback…</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">{status}</span>
        {(error || playError) && (
          <span className="text-red-400">{error || playError}</span>
        )}
      </div>
    </div>
  );
}

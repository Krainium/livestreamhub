import type { StreamEntry } from "@/types/stream";
import streamsData from "@/data/streams.json";
import { geoSort } from "@/lib/geo";

// Live channel source: the same Firebase Remote Config the Android app uses.
// This replaces the dead VPS — the channel list now self-updates from Firebase,
// so it stays current without any backend. If Firebase is unreachable we fall
// back to the bundled streams.json snapshot, so the app never breaks. The IDs
// below are the app's PUBLIC client config (extracted from the distributed
// APK), overridable via env.
const RC_PROJECT = process.env.RC_PROJECT_NUMBER || "753357191716";
const RC_APP_ID = process.env.RC_APP_ID || "1:753357191716:android:bddad915fc79f2319fb6b1";
const RC_API_KEY = process.env.RC_API_KEY || "AIzaSyDzCGErnKWoe6e9vSv2EokZBZL0PSU6QjY";

const CACHE_TTL_MS = 60_000;
let cache: { at: number; data: StreamEntry[] } | null = null;

// A CHANNEL_URL carries the stream plus optional DRM / referer, e.g.
//   https://host/x/cenc.mpd?|drmScheme=clearkey&drmLicense=<kid>:<key>
//   https://host/x/master.mpd*<kid>:<key>
//   https://host/x/index.m3u8|Referer=https://site/
function parseChannelUrl(raw: string) {
  let referer: string | null = null;
  let kid: string | null = null;
  let key: string | null = null;
  let scheme: string | null = null;

  const refM = raw.match(/\|Referer=([^|*]+)/i);
  if (refM) referer = refM[1].trim();

  const licM = raw.match(/drmLicense=([0-9a-f]{32}):([0-9a-f]{32})/i);
  const starM = raw.match(/\*([0-9a-f]{32}):([0-9a-f]{32})/i);
  if (licM) { kid = licM[1]; key = licM[2]; scheme = "clearkey"; }
  else if (starM) { kid = starM[1]; key = starM[2]; scheme = "clearkey"; }

  const url = raw.split(/\?\||\||\*/)[0].trim();
  const low = url.toLowerCase().split("?")[0];
  const type: "hls" | "dash" | "other" =
    low.endsWith(".mpd") || raw.includes(".mpd") ? "dash"
    : low.endsWith(".m3u8") || raw.includes(".m3u8") ? "hls"
    : "other";

  return { url, type, referer, scheme, kid, key };
}

function parseLiveData(live: { data?: Array<{ web_link?: string; extra?: string }> }): StreamEntry[] {
  const out: StreamEntry[] = [];
  let id = 1;
  for (const ev of live.data ?? []) {
    let event = "Live";
    try { event = JSON.parse(ev.web_link || "{}").EVENT_NAME || "Live"; } catch {}
    let chans: Array<{ CHANNEL_NAME?: string; CHANNEL_URL?: string }> = [];
    try { chans = JSON.parse(ev.extra || "[]"); } catch {}
    for (const c of chans) {
      const raw = c.CHANNEL_URL || "";
      if (!raw) continue;
      const p = parseChannelUrl(raw);
      out.push({
        id: id++,
        event,
        channel: c.CHANNEL_NAME || "Channel",
        raw_url: raw,
        stream_url: p.url,
        stream_type: p.type,
        referer: p.referer,
        drm_scheme: p.scheme,
        drm_kid: p.kid,
        drm_key: p.key,
        source: "FIREBASE_RC",
        status: "online",
        note: p.type === "dash" ? "DASH MPD" : p.type === "hls" ? "HLS" : "Unknown",
        qualities: null,
      });
    }
  }
  return out;
}

async function fetchFirebaseLive(): Promise<StreamEntry[] | null> {
  try {
    const res = await fetch(
      `https://firebaseremoteconfig.googleapis.com/v1/projects/${RC_PROJECT}/namespaces/firebase:fetch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": RC_API_KEY },
        body: JSON.stringify({ appId: RC_APP_ID, appInstanceId: "lftv-web" }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rc = await res.json();
    const liveStr = rc?.entries?.LIVE_DATA;
    if (!liveStr) return null;
    const parsed = parseLiveData(JSON.parse(liveStr));
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Optional override: STREAM_API_URL returning the same channel JSON shape.
async function fetchOverride(): Promise<StreamEntry[] | null> {
  const src = process.env.STREAM_API_URL;
  if (!src) return null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? (data as StreamEntry[]) : null;
  } catch {
    return null;
  }
}

// Raw (unsorted) channel list — live source if available, else static snapshot.
// Cached briefly so SSR + the refresh probe share one upstream fetch.
export async function getStreamList(): Promise<StreamEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  const live = (await fetchOverride()) ?? (await fetchFirebaseLive());
  if (live) {
    cache = { at: Date.now(), data: live };
    return live;
  }
  return streamsData as StreamEntry[];
}

export async function fetchStreams(
  country = ""
): Promise<(StreamEntry & { recommended: boolean })[]> {
  return geoSort(await getStreamList(), country);
}

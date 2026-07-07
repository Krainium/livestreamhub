import type { StreamEntry } from "@/types/stream";

const RC_URL =
  "https://firebaseremoteconfig.googleapis.com/v1/projects/753357191716/namespaces/firebase:fetch";
const RC_API_KEY =
  process.env.RC_API_KEY ?? "AIzaSyDzCGErnKWoe6e9vSv2EokZBZL0PSU6QjY";
const RC_APP_ID = "1:753357191716:android:bddad915fc79f2319fb6b1";
const RC_PACKAGE = "bae.livefootballtv.hdstream.soccerscore";

interface RCChannel {
  CHANNEL_NAME: string;
  CHANNEL_URL: string;
}

interface RCItem {
  web_link: string;
  extra: string;
}

function parseUrl(raw: string): {
  url: string;
  stream_type: "hls" | "dash" | "other";
  drm_scheme: string | null;
  drm_kid: string | null;
  drm_key: string | null;
  referer: string | null;
} {
  let url = raw.trim();
  let drm_scheme: string | null = null;
  let drm_kid: string | null = null;
  let drm_key: string | null = null;
  let referer: string | null = null;

  if (url.includes("|")) {
    const pipeIdx = url.indexOf("|");
    const base = url.slice(0, pipeIdx).replace(/\?$/, "");
    const params = url.slice(pipeIdx + 1);
    url = base;
    for (const seg of params.split(/[|&]/)) {
      const eqIdx = seg.indexOf("=");
      if (eqIdx === -1) continue;
      const k = seg.slice(0, eqIdx).toLowerCase().trim();
      const v = seg.slice(eqIdx + 1);
      if (k === "referer") referer = v;
      else if (k === "drmscheme") drm_scheme = v;
      else if (k === "drmlicense") {
        const colonIdx = v.indexOf(":");
        drm_scheme = "clearkey";
        drm_kid = v.slice(0, colonIdx);
        drm_key = v.slice(colonIdx + 1);
      }
    }
  }

  const mpdCk = url.match(/^(.*\.mpd)\*([0-9a-fA-F]{16,}):([0-9a-fA-F]{16,})$/);
  if (mpdCk) {
    url = mpdCk[1];
    drm_scheme = "clearkey";
    drm_kid = mpdCk[2];
    drm_key = mpdCk[3];
  }

  let stream_type: "hls" | "dash" | "other" = "other";
  if (url.includes(".mpd")) stream_type = "dash";
  else if (url.includes(".m3u8")) stream_type = "hls";

  return { url, stream_type, drm_scheme, drm_kid, drm_key, referer };
}

export async function fetchFirebaseRCStreams(): Promise<StreamEntry[]> {
  const res = await fetch(`${RC_URL}?key=${RC_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Android-Package": RC_PACKAGE,
    },
    body: JSON.stringify({
      appInstanceId: "web_probe",
      appId: RC_APP_ID,
      countryCode: "US",
      languageCode: "en-US",
      platformVersion: "33",
      timeZone: "UTC",
      appVersion: "1.9",
      packageName: RC_PACKAGE,
      sdkVersion: "21.6.0",
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`RC fetch failed: ${res.status}`);
  const payload = await res.json();
  const liveStr = payload?.entries?.LIVE_DATA;
  if (!liveStr) throw new Error("LIVE_DATA missing from RC response");

  const live = JSON.parse(liveStr) as { data?: RCItem[] };
  const items = live.data ?? [];

  const entries: StreamEntry[] = [];
  let id = 1;

  for (const item of items) {
    let channels: RCChannel[] = [];
    try {
      channels = JSON.parse(item.extra) as RCChannel[];
    } catch {}

    for (const ch of channels) {
      if (!ch.CHANNEL_URL?.startsWith("http")) continue;
      const parsed = parseUrl(ch.CHANNEL_URL);
      entries.push({
        id: id++,
        event: "Live",
        channel: ch.CHANNEL_NAME,
        raw_url: ch.CHANNEL_URL,
        stream_url: parsed.url,
        stream_type: parsed.stream_type,
        referer: parsed.referer,
        drm_scheme: parsed.drm_scheme,
        drm_kid: parsed.drm_kid,
        drm_key: parsed.drm_key,
        source: "FIREBASE_RC",
        status: "unknown",
        note: "",
        qualities: null,
      });
    }
  }

  return entries;
}

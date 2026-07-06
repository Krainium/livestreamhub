import type { StreamEntry } from "@/types/stream";

const RC_ENDPOINT =
  "https://punjabpolicenews.com/alk_apps/web_apis_lftv_1/getfromserver.php";

interface RCChannel {
  CHANNEL_NAME: string;
  CHANNEL_URL: string;
}

interface RCItem {
  web_link: string;
  extra: string;
}

interface RCResponse {
  error: boolean | string;
  data?: RCItem[];
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
  const key = process.env.FIREBASE_RC_API_KEY ?? "4207";
  const body = `my_key=${encodeURIComponent(key)}`;

  const res = await fetch(RC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`RC fetch failed: ${res.status}`);
  const payload: RCResponse = await res.json();
  if (payload.error === true || payload.error === "true")
    throw new Error("RC API error");

  const entries: StreamEntry[] = [];
  let id = 1;

  for (const item of payload.data ?? []) {
    let eventName = "Live";
    try {
      const wl = JSON.parse(item.web_link) as { EVENT_NAME?: string };
      eventName = wl.EVENT_NAME ?? "Live";
    } catch {}

    let channels: RCChannel[] = [];
    try {
      channels = JSON.parse(item.extra) as RCChannel[];
    } catch {}

    for (const ch of channels) {
      if (!ch.CHANNEL_URL?.startsWith("http")) continue;
      const parsed = parseUrl(ch.CHANNEL_URL);
      entries.push({
        id: id++,
        event: eventName,
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

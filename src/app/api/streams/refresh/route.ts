import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import streamsData from "@/data/streams.json";

export const runtime = "nodejs";
export const maxDuration = 60;

const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

interface StreamDef {
  id: number;
  event: string;
  channel: string;
  raw_url: string;
  stream_url: string;
  stream_type: string;
  referer: string | null;
  drm_scheme: string | null;
  drm_kid: string | null;
  drm_key: string | null;
  source: string;
  status: string;
  note: string;
  qualities: unknown;
}

async function probeOne(s: StreamDef): Promise<StreamDef> {
  const out: StreamDef = { ...s, status: "unknown", note: "" };
  const headers: Record<string, string> = { "User-Agent": UA, "Accept": "*/*" };
  if (s.referer) headers["Referer"] = s.referer;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(s.stream_url, { headers, signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const text = (await res.text()).slice(0, 400).toLowerCase();
      if (text.includes("<mpd") || s.stream_type === "dash") {
        out.status = "online";
        out.note = "DASH MPD reachable";
      } else if (text.includes("#extm3u") || s.stream_type === "hls") {
        out.status = "online";
        out.note = "HLS playable";
      } else {
        out.status = "online";
        out.note = `HTTP ${res.status}`;
      }
    } else if (res.status === 403 || res.status === 401) {
      out.status = "blocked";
      out.note = `HTTP ${res.status}`;
    } else if (res.status === 404 || res.status === 410) {
      out.status = "offline";
      out.note = `HTTP ${res.status}`;
    } else {
      out.status = "error";
      out.note = `HTTP ${res.status}`;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("timeout")) {
      out.status = "timeout";
      out.note = "Connection timed out";
    } else {
      out.status = "offline";
      out.note = msg.slice(0, 80);
    }
  }

  return out;
}

export async function POST(_req: NextRequest) {
  const results = await Promise.all(
    (streamsData as StreamDef[]).map((s) =>
      probeOne(s).catch(() => ({ ...s, status: "error", note: "probe failed" }))
    )
  );
  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}

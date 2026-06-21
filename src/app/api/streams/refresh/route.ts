import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";
  import { geoSort } from "@/lib/geo";
  import { getStreamList } from "@/lib/streams";

  export const runtime = "nodejs";

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
    const hdrs: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
    if (s.referer) hdrs["Referer"] = s.referer;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(s.stream_url, { headers: hdrs, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = (await res.text()).slice(0, 400).toLowerCase();
        if (text.includes("<mpd") || s.stream_type === "dash") {
          out.status = "online"; out.note = "DASH MPD reachable";
        } else if (text.includes("#extm3u") || s.stream_type === "hls") {
          out.status = "online"; out.note = "HLS playable";
        } else {
          out.status = "online"; out.note = `HTTP ${res.status}`;
        }
      } else if (res.status === 403 || res.status === 401) {
        out.status = "blocked"; out.note = `HTTP ${res.status}`;
      } else if (res.status === 404 || res.status === 410) {
        out.status = "offline"; out.note = `HTTP ${res.status}`;
      } else {
        out.status = "error"; out.note = `HTTP ${res.status}`;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("abort") || msg.includes("timeout")) {
        out.status = "timeout"; out.note = "Connection timed out";
      } else {
        out.status = "offline"; out.note = msg.slice(0, 80);
      }
    }
    return out;
  }

  export async function POST(req: NextRequest) {
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.nextUrl.searchParams.get("country") ||
      "";

    const base = (await getStreamList()) as unknown as StreamDef[];
    const probed = await Promise.all(
      base.map((s) =>
        probeOne(s).catch(() => ({ ...s, status: "error", note: "probe failed" }))
      )
    );
    const sorted = geoSort(probed, country);
    return NextResponse.json(sorted, { headers: { "Cache-Control": "no-store" } });
  }
  
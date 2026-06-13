import type { NextRequest } from "next/server";
import streamsData from "@/data/streams.json";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

interface StreamDef {
  id: number;
  stream_url: string;
  stream_type: string;
  referer: string | null;
  drm_kid: string | null;
  drm_key: string | null;
}

function buildClearKeyPssh(kidHex: string): string {
  const SYSTEM_ID = Buffer.from("e2719d58a985b3c9781ab030af78d30e", "hex");
  const kidBytes = Buffer.from(kidHex.replace(/-/g, ""), "hex");
  const kidB64url = kidBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const psshData = Buffer.from(JSON.stringify({ kids: [kidB64url] }));
  const boxSize = 4 + 4 + 4 + 16 + 4 + psshData.length;
  const buf = Buffer.alloc(boxSize);
  buf.writeUInt32BE(boxSize, 0);
  buf.write("pssh", 4, "ascii");
  buf.writeUInt32BE(0, 8);
  SYSTEM_ID.copy(buf, 12);
  buf.writeUInt32BE(psshData.length, 28);
  psshData.copy(buf, 32);
  return buf.toString("base64");
}

function injectClearKeyProtection(text: string, kidHex: string): string {
  if (text.toLowerCase().includes("e2719d58")) return text;
  const pssh = buildClearKeyPssh(kidHex);
  const elem =
    '<ContentProtection schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e">' +
    '<cenc:pssh xmlns:cenc="urn:mpeg:cenc:2013">' +
    pssh +
    "</cenc:pssh></ContentProtection>\n      ";
  const parts = text.split(/(?=<AdaptationSet\b)/);
  return parts
    .map((block) => {
      if (!block.includes("ContentProtection")) return block;
      return block.replace(/(?=<Representation\b)/, elem);
    })
    .join("");
}

function stripSubtitleTracks(text: string): string {
  return text.replace(
    /<AdaptationSet\b[^>]*\b(?:codecs="stpp"|mimeType="text\/[^"]*")[^>]*>[\s\S]*?<\/AdaptationSet>/g,
    ""
  );
}

function rewriteMpd(
  text: string,
  streamId: number,
  baseUrl: string,
  hasReferer: boolean,
  drmKid?: string
): string {
  text = stripSubtitleTracks(text);
  if (drmKid) text = injectClearKeyProtection(text, drmKid);

  const mpdBase = baseUrl.replace(/\/[^/]+(\?.*)?$/, "/");

  text = text.replace(
    /(media|initialization)="([^"]+)"/g,
    (_: string, attr: string, val: string) => {
      let absUrl: string;
      try {
        absUrl = val.startsWith("http") ? val : new URL(val, mpdBase).toString();
      } catch {
        absUrl = val;
      }
      if (hasReferer) {
        return `${attr}="/api/proxy/${streamId}?url=${encodeURIComponent(absUrl)}"`;
      }
      return `${attr}="${absUrl}"`;
    }
  );

  text = text.replace(/<Location>([^<]+)<\/Location>/g, (_: string, loc: string) => {
    const t = loc.trim();
    if (t.startsWith("http")) {
      return `<Location>/api/proxy/${streamId}?url=${encodeURIComponent(t)}</Location>`;
    }
    return `<Location>${loc}</Location>`;
  });

  return text;
}

function rewriteM3u8(
  text: string,
  streamId: number,
  baseUrl: string,
  hasReferer: boolean
): string {
  return text
    .split("\n")
    .map((line) => {
      const s = line.trim();
      if (!s || s.startsWith("#")) return line;
      let absUrl: string;
      try {
        absUrl = s.startsWith("http") ? s : new URL(s, baseUrl).toString();
      } catch {
        return line;
      }
      const lower = absUrl.toLowerCase().split("?")[0];
      if (lower.endsWith(".m3u8") || lower.includes("/m3u8")) {
        return `/api/proxy/${streamId}?url=${encodeURIComponent(absUrl)}`;
      }
      return hasReferer
        ? `/api/proxy/${streamId}?url=${encodeURIComponent(absUrl)}`
        : absUrl;
    })
    .join("\n");
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Accept, Origin",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const streamId = parseInt(id, 10);
  const stream = (streamsData as StreamDef[]).find((s) => s.id === streamId);

  if (!stream) {
    return new Response("Stream not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");
  const target = urlParam ? decodeURIComponent(urlParam) : stream.stream_url;

  if (target.includes("$Number$") || target.includes("$Time$")) {
    return new Response("Unresolved DASH segment template", { status: 400 });
  }

  const reqHeaders: Record<string, string> = { "User-Agent": UA, "Accept": "*/*" };
  if (stream.referer) reqHeaders["Referer"] = stream.referer;
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) reqHeaders["Range"] = rangeHeader;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const upstream = await fetch(target, { headers: reqHeaders, signal: controller.signal });
    clearTimeout(timer);

    if (!upstream.ok) {
      return new Response(`Upstream error ${upstream.status}`, { status: upstream.status });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const preview = buf.slice(0, 300).toString("utf-8");

    const resHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    };

    if (preview.includes("#EXTM3U") || preview.includes("#extm3u")) {
      const rewritten = rewriteM3u8(buf.toString("utf-8"), streamId, target, !!stream.referer);
      return new Response(rewritten, {
        headers: {
          ...resHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store",
        },
      });
    }

    if (preview.match(/<[Mm][Pp][Dd]/)) {
      const rewritten = rewriteMpd(
        buf.toString("utf-8"),
        streamId,
        target,
        !!stream.referer,
        stream.drm_kid ?? undefined
      );
      return new Response(rewritten, {
        headers: {
          ...resHeaders,
          "Content-Type": "application/dash+xml",
          "Cache-Control": "no-cache, no-store",
        },
      });
    }

    for (const [k, v] of upstream.headers.entries()) {
      const kl = k.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "connection"].includes(kl)) {
        resHeaders[k] = v;
      }
    }
    resHeaders["Access-Control-Allow-Origin"] = "*";
    resHeaders["Content-Length"] = String(buf.length);

    return new Response(buf, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`Proxy error: ${msg}`, { status: 502 });
  }
}

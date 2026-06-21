import type { StreamEntry } from "@/types/stream";
import streamsData from "@/data/streams.json";
import { geoSort } from "@/lib/geo";

// Optional dynamic channel source. Set STREAM_API_URL to an endpoint that
// returns the channel list as JSON (same shape as streams.json) — e.g. a new
// aggregator/VPS. When it's unset OR unreachable, we fall back to the bundled
// streams.json snapshot, so the app never breaks if the source is down (that
// was the dead-VPS failure mode). Only an explicit STREAM_API_URL is fetched —
// we never self-fetch VERCEL_URL, which previously caused 401s on previews.
async function fetchDynamic(): Promise<StreamEntry[] | null> {
  const src = process.env.STREAM_API_URL;
  if (!src) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(src, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data as StreamEntry[];
    return null;
  } catch {
    return null; // unreachable / timeout / bad JSON → use the static fallback
  }
}

export async function fetchStreams(
  country = ""
): Promise<(StreamEntry & { recommended: boolean })[]> {
  const dynamic = await fetchDynamic();
  const list = dynamic ?? (streamsData as StreamEntry[]);
  return geoSort(list, country);
}

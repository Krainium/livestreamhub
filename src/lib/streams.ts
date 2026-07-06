import type { StreamEntry } from "@/types/stream";
import streamsData from "@/data/streams.json";
import { geoSort } from "@/lib/geo";

// Initial channel list for page load.
// Priority: CHANNELS_JSON env var (set in Vercel dashboard) → streams.json fallback.
// The Refresh button always goes to Firebase RC for live data regardless of this.
export async function getStreamList(): Promise<StreamEntry[]> {
  const raw = process.env.CHANNELS_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as StreamEntry[];
    } catch {}
  }
  return streamsData as StreamEntry[];
}

export async function fetchStreams(
  country = ""
): Promise<(StreamEntry & { recommended: boolean })[]> {
  return geoSort(await getStreamList(), country);
}

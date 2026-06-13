import type { StreamEntry } from "@/types/stream";
  import streamsData from "@/data/streams.json";
  import { geoSort } from "@/lib/geo";

  export async function fetchStreams(
    country = ""
  ): Promise<(StreamEntry & { recommended: boolean })[]> {
    return geoSort(streamsData as StreamEntry[], country);
  }
  
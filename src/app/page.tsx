import { headers } from "next/headers";
import StreamHub from "@/components/StreamHub";
import { fetchStreams } from "@/lib/streams";
import { fetchFirebaseRCStreams } from "@/lib/firebase-rc";
import { geoSort, getRegionLabel } from "@/lib/geo";
import type { StreamEntry } from "@/types/stream";

export const dynamic = "force-dynamic";

export default async function Home() {
  const h = await headers();
  const country = h.get("x-vercel-ip-country") || "";
  const regionLabel = getRegionLabel(country);

  let streams: (StreamEntry & { recommended: boolean })[] = [];
  let initialSelectedId: number | null = null;
  let error: string | null = null;
  try {
    let raw: StreamEntry[];
    try {
      raw = await fetchFirebaseRCStreams();
    } catch {
      raw = await fetchStreams(country);
    }
    streams = geoSort(raw, country);
    const first = streams[0];
    if (first) initialSelectedId = first.id;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load streams";
  }

  return (
    <main className="relative min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            <p className="font-semibold">Unable to load streams</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : (
          <StreamHub
            initialStreams={streams}
            initialSelectedId={initialSelectedId}
            regionLabel={regionLabel}
            country={country}
          />
        )}
      </div>
    </main>
  );
}
  
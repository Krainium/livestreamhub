import StreamHub from "@/components/StreamHub";
import { fetchStreams } from "@/lib/streams";
import type { StreamEntry } from "@/types/stream";

export const dynamic = "force-dynamic";

export default async function Home() {
  let streams: StreamEntry[] = [];
  let initialSelectedId: number | null = null;
  let error: string | null = null;
  try {
    streams = await fetchStreams();
    const first = streams.find((s) => s.status === "online") || streams[0];
    if (first) initialSelectedId = first.id;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load streams";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            <p className="font-semibold">Unable to load streams</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : (
          <StreamHub initialStreams={streams} initialSelectedId={initialSelectedId} />
        )}
      </div>
    </main>
  );
}

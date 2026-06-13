import type { StreamEntry } from "@/types/stream";

function getApiBase(): string {
  if (typeof window !== "undefined") return "";
  if (process.env.STREAM_API_URL) return process.env.STREAM_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:9998";
}

export async function fetchStreams(): Promise<StreamEntry[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/streams`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Stream API error: ${res.status}`);
  return res.json();
}

import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";
  import streamsData from "@/data/streams.json";
  import { geoSort } from "@/lib/geo";
  import type { StreamEntry } from "@/types/stream";

  export const runtime = "nodejs";

  export async function GET(req: NextRequest) {
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.nextUrl.searchParams.get("country") ||
      "";
    const sorted = geoSort(streamsData as StreamEntry[], country);
    return NextResponse.json(sorted, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
  
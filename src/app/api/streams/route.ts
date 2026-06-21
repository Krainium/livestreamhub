import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";
  import { fetchStreams } from "@/lib/streams";

  export const runtime = "nodejs";

  export async function GET(req: NextRequest) {
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.nextUrl.searchParams.get("country") ||
      "";
    const sorted = await fetchStreams(country);
    return NextResponse.json(sorted, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
  
import { NextResponse } from "next/server";
import streamsData from "@/data/streams.json";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(streamsData, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}

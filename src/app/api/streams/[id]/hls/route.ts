import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { status: "failed", message: "Server-side transcoding not available on edge deployment" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

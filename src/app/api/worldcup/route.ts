import { NextResponse } from "next/server";
import { WORLD_CUP_2026, type WCMatch } from "@/data/worldcup2026";

// Live 2026 World Cup schedule. Pulls fixtures from ESPN's public API (which fills in
// knockout teams as they qualify) and is refreshed at most once every 24h. If the upstream
// is unavailable or returns too little, we serve the bundled baseline so the UI never breaks.
export const runtime = "nodejs";
export const revalidate = 86400;

const DAY = 86400;
const RANGES = ["20260611-20260630", "20260701-20260719"];
const SLUG: Record<string, string> = {
  "group-stage": "Group Stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  quarterfinal: "Quarter-final",
  "quarter-final": "Quarter-final",
  semifinal: "Semi-final",
  "semi-final": "Semi-final",
  "3rd-place-match": "Third place",
  "third-place": "Third place",
  final: "Final",
};

function label(slug: string): string {
  if (SLUG[slug]) return SLUG[slug];
  if (!slug) return "Match";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EspnEvent {
  id: string;
  date: string;
  season?: { slug?: string };
  competitions?: Array<{
    venue?: { fullName?: string };
    competitors?: Array<{ homeAway?: string; team?: { displayName?: string } }>;
  }>;
}

async function fetchRange(rng: string): Promise<EspnEvent[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${rng}`,
    { next: { revalidate: DAY }, headers: { "User-Agent": "livestreamhub" } }
  );
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

export async function GET() {
  try {
    const byId = new Map<string, EspnEvent>();
    for (const rng of RANGES) {
      for (const e of await fetchRange(rng)) byId.set(e.id, e);
    }
    const matches: WCMatch[] = [];
    for (const e of byId.values()) {
      const comp = e.competitions?.[0] ?? {};
      const sides: Record<string, string> = {};
      for (const c of comp.competitors ?? []) {
        if (c.homeAway && c.team?.displayName) sides[c.homeAway] = c.team.displayName;
      }
      let kickoff = e.date;
      if (kickoff && !kickoff.endsWith("Z") && !kickoff.includes("+")) kickoff += "Z";
      matches.push({
        kickoff,
        home: sides.home ?? "TBD",
        away: sides.away ?? "TBD",
        venue: comp.venue?.fullName ?? "",
        stage: label(e.season?.slug ?? ""),
      });
    }
    matches.sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
    if (matches.length < 50) throw new Error(`only ${matches.length} events`);
    return NextResponse.json(
      { source: "espn", count: matches.length, matches },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { source: "bundled", count: WORLD_CUP_2026.length, matches: WORLD_CUP_2026 },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  }
}

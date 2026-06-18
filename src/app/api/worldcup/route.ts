import { NextResponse } from "next/server";
import { WORLD_CUP_2026, type WCMatch } from "@/data/worldcup2026";

// Live 2026 World Cup schedule + scores from ESPN's public API. Fixtures (and knockout teams,
// as they qualify) refresh daily; in-progress scores refresh on a 30s window so the UI can poll
// frequently while a match is live. Falls back to the bundled baseline if upstream is unavailable.
export const runtime = "nodejs";
export const revalidate = 30;

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

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface EspnEvent {
  id: string;
  date: string;
  season?: { slug?: string };
  competitions?: Array<{
    venue?: { fullName?: string };
    status?: { type?: { state?: string; shortDetail?: string } };
    competitors?: Array<{ homeAway?: string; score?: string; team?: { displayName?: string } }>;
  }>;
  status?: { type?: { state?: string; shortDetail?: string } };
}

async function fetchRange(rng: string): Promise<EspnEvent[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${rng}`,
    { next: { revalidate: 30 }, headers: { "User-Agent": "livestreamhub" } }
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
      const home = comp.competitors?.find((c) => c.homeAway === "home");
      const away = comp.competitors?.find((c) => c.homeAway === "away");
      const t = comp.status?.type ?? e.status?.type ?? {};
      const state = (t.state as WCMatch["state"]) ?? "pre";
      let kickoff = e.date;
      if (kickoff && !kickoff.endsWith("Z") && !kickoff.includes("+")) kickoff += "Z";
      matches.push({
        kickoff,
        home: home?.team?.displayName ?? "TBD",
        away: away?.team?.displayName ?? "TBD",
        venue: comp.venue?.fullName ?? "",
        stage: label(e.season?.slug ?? ""),
        state,
        detail: t.shortDetail ?? "",
        homeScore: state === "pre" ? null : toNum(home?.score),
        awayScore: state === "pre" ? null : toNum(away?.score),
      });
    }
    matches.sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
    if (matches.length < 50) throw new Error(`only ${matches.length} events`);
    const live = matches.filter((m) => m.state === "in").length;
    return NextResponse.json(
      { source: "espn", count: matches.length, live, matches },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json(
      { source: "bundled", count: WORLD_CUP_2026.length, live: 0, matches: WORLD_CUP_2026 },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  }
}

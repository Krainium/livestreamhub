const GEO_PRIORITY: Record<string, number[]> = {
    US: [5, 7, 6, 3, 13, 12, 4, 8, 9, 10],
    CA: [6, 5, 3, 13, 12, 4, 7, 8, 9, 10],
    MX: [7, 8, 3, 13, 12, 5, 4, 9, 10, 6],
    BR: [10, 8, 3, 13, 12, 7, 4, 9, 5, 6],
    AR: [7, 8, 3, 13, 12, 10, 5, 4, 9, 6],
    CO: [7, 8, 3, 13, 12, 10, 5, 4, 9, 6],
    CL: [7, 8, 3, 13, 12, 10, 5, 4, 9, 6],
    PE: [7, 8, 3, 13, 12, 10, 5, 4, 9, 6],
    VE: [7, 8, 3, 13, 12, 10, 5, 4, 9, 6],
    PH: [9, 3, 13, 12, 4, 7, 8, 10, 5, 6],
    IN: [4, 3, 13, 12, 9, 7, 8, 10, 5, 6],
    PK: [4, 3, 13, 12, 9, 7, 8, 10, 5, 6],
    BD: [4, 3, 13, 12, 9, 7, 8, 10, 5, 6],
    LK: [4, 3, 13, 12, 9, 7, 8, 10, 5, 6],
    GB: [3, 13, 12, 5, 6, 4, 7, 8, 9, 10],
    DE: [3, 13, 12, 5, 4, 7, 8, 9, 10, 6],
    FR: [3, 13, 12, 5, 4, 7, 8, 9, 10, 6],
    ES: [8, 7, 3, 13, 12, 10, 5, 4, 9, 6],
    IT: [3, 13, 12, 5, 4, 7, 8, 9, 10, 6],
    NL: [3, 13, 12, 5, 4, 7, 8, 9, 10, 6],
    PT: [10, 3, 13, 12, 8, 7, 4, 9, 5, 6],
    AU: [3, 13, 12, 4, 5, 6, 7, 8, 9, 10],
    NZ: [3, 13, 12, 4, 5, 6, 7, 8, 9, 10],
    TR: [3, 13, 12, 5, 4, 7, 8, 9, 10, 6],
    SA: [3, 13, 12, 4, 7, 8, 9, 10, 5, 6],
    AE: [3, 13, 12, 4, 7, 8, 9, 10, 5, 6],
    NG: [3, 13, 12, 4, 7, 8, 9, 10, 5, 6],
    ZA: [3, 13, 12, 4, 7, 8, 9, 10, 5, 6],
    KE: [3, 13, 12, 4, 7, 8, 9, 10, 5, 6],
    SG: [9, 3, 13, 12, 4, 7, 8, 10, 5, 6],
    MY: [9, 3, 13, 12, 4, 7, 8, 10, 5, 6],
    ID: [9, 3, 13, 12, 4, 7, 8, 10, 5, 6],
    TH: [9, 3, 13, 12, 4, 7, 8, 10, 5, 6],
    JP: [3, 13, 12, 9, 4, 7, 8, 10, 5, 6],
    KR: [3, 13, 12, 9, 4, 7, 8, 10, 5, 6],
  };

  const REGION_FLAGS: Record<string, string> = {
    US: "\u{1F1FA}\u{1F1F8} United States", CA: "\u{1F1E8}\u{1F1E6} Canada", MX: "\u{1F1F2}\u{1F1FD} Mexico",
    BR: "\u{1F1E7}\u{1F1F7} Brazil", AR: "\u{1F1E6}\u{1F1F7} Argentina", CO: "\u{1F1E8}\u{1F1F4} Colombia",
    CL: "\u{1F1E8}\u{1F1F1} Chile", PE: "\u{1F1F5}\u{1F1EA} Peru", VE: "\u{1F1FB}\u{1F1EA} Venezuela",
    PH: "\u{1F1F5}\u{1F1ED} Philippines", IN: "\u{1F1EE}\u{1F1F3} India", PK: "\u{1F1F5}\u{1F1F0} Pakistan",
    BD: "\u{1F1E7}\u{1F1E9} Bangladesh", LK: "\u{1F1F1}\u{1F1F0} Sri Lanka",
    GB: "\u{1F1EC}\u{1F1E7} United Kingdom", DE: "\u{1F1E9}\u{1F1EA} Germany", FR: "\u{1F1EB}\u{1F1F7} France",
    ES: "\u{1F1EA}\u{1F1F8} Spain", IT: "\u{1F1EE}\u{1F1F9} Italy", NL: "\u{1F1F3}\u{1F1F1} Netherlands",
    PT: "\u{1F1F5}\u{1F1F9} Portugal", AU: "\u{1F1E6}\u{1F1FA} Australia", NZ: "\u{1F1F3}\u{1F1FF} New Zealand",
    TR: "\u{1F1F9}\u{1F1F7} Turkey", SA: "\u{1F1F8}\u{1F1E6} Saudi Arabia", AE: "\u{1F1E6}\u{1F1EA} UAE",
    NG: "\u{1F1F3}\u{1F1EC} Nigeria", ZA: "\u{1F1FF}\u{1F1E6} South Africa", KE: "\u{1F1F0}\u{1F1EA} Kenya",
    SG: "\u{1F1F8}\u{1F1EC} Singapore", MY: "\u{1F1F2}\u{1F1FE} Malaysia", ID: "\u{1F1EE}\u{1F1E9} Indonesia",
    TH: "\u{1F1F9}\u{1F1ED} Thailand", JP: "\u{1F1EF}\u{1F1F5} Japan", KR: "\u{1F1F0}\u{1F1F7} South Korea",
  };

  export function getRegionLabel(country: string): string {
    return REGION_FLAGS[country] ?? "\u{1F30D} Global";
  }

  export function geoSort<T extends { id: number; status: string }>(
    streams: T[],
    country: string
  ): (T & { recommended: boolean })[] {
    const priority = GEO_PRIORITY[country] ?? [];

    const withScore = streams.map((s) => {
      const idx = priority.indexOf(s.id);
      return { stream: s, score: idx >= 0 ? priority.length - idx : 0 };
    });

    withScore.sort((a, b) => {
      const aOn = a.stream.status === "online" ? 1 : 0;
      const bOn = b.stream.status === "online" ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return b.score - a.score;
    });

    let recs = 0;
    return withScore.map(({ stream, score }) => {
      const recommended =
        stream.status === "online" && score > 0 && recs < 3
          ? (recs++, true)
          : false;
      return { ...stream, recommended } as T & { recommended: boolean };
    });
  }
  
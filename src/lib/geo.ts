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
    US: "🇺🇸 United States", CA: "🇨🇦 Canada", MX: "🇲🇽 Mexico",
    BR: "🇧🇷 Brazil", AR: "🇦🇷 Argentina", CO: "🇨🇴 Colombia",
    CL: "🇨🇱 Chile", PE: "🇵🇪 Peru", VE: "🇻🇪 Venezuela",
    PH: "🇵🇭 Philippines", IN: "🇮🇳 India", PK: "🇵🇰 Pakistan",
    BD: "🇧🇩 Bangladesh", LK: "🇱🇰 Sri Lanka",
    GB: "🇬🇧 United Kingdom", DE: "🇩🇪 Germany", FR: "🇫🇷 France",
    ES: "🇪🇸 Spain", IT: "🇮🇹 Italy", NL: "🇳🇱 Netherlands",
    PT: "🇵🇹 Portugal", AU: "🇦🇺 Australia", NZ: "🇳🇿 New Zealand",
    TR: "🇹🇷 Turkey", SA: "🇸🇦 Saudi Arabia", AE: "🇦🇪 UAE",
    NG: "🇳🇬 Nigeria", ZA: "🇿🇦 South Africa", KE: "🇰🇪 Kenya",
    SG: "🇸🇬 Singapore", MY: "🇲🇾 Malaysia", ID: "🇮🇩 Indonesia",
    TH: "🇹🇭 Thailand", JP: "🇯🇵 Japan", KR: "🇰🇷 South Korea",
  };

  export function getRegionLabel(country: string): string {
    return REGION_FLAGS[country] || "🌍 Global";
  }

  export function geoSort<T extends { id: number; status: string }>(
    streams: T[],
    country: string
  ): (T & { recommended: boolean })[] {
    const priority = GEO_PRIORITY[country] || [];

    const scored = streams.map((s) => {
      const idx = priority.indexOf(s.id);
      return { ...s, recommended: false, _score: idx >= 0 ? priority.length - idx : 0 };
    });

    scored.sort((a, b) => {
      const aOn = a.status === "online" ? 1 : 0;
      const bOn = b.status === "online" ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return b._score - a._score;
    });

    let recs = 0;
    return scored.map(({ _score, ...s }) => {
      if (s.status === "online" && _score > 0 && recs < 3) {
        recs++;
        return { ...s, recommended: true };
      }
      return { ...s, recommended: false };
    });
  }
  
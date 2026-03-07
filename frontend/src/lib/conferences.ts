/**
 * Official full names for display. Use these so we never show raw codes like "cne" or "centennial_conference".
 */
export const CONFERENCE_DISPLAY_NAMES: Record<string, string> = {
  amcc: "Allegheny Mountain Collegiate Conference (AMCC)",
  arc: "American Rivers Conference (ARC)",
  aec: "Atlantic East Conference (AEC)",
  asc: "American Southwest Conference (ASC)",
  centennial_conference: "Centennial Conference",
  cciw: "College Conference of Illinois and Wisconsin (CCIW)",
  c2c: "Coast-To-Coast Athletic Conference (C2C)",
  cne: "Conference of New England (CNE)",
  e8: "Empire 8 (E8)",
  gnac: "Great Northeast Athletic Conference (GNAC)",
  hcac: "Heartland Collegiate Athletic Conference (HCAC)",
  landmark_conference: "Landmark Conference",
  ll: "Liberty League (LL)",
  lec: "Little East Conference (LEC)",
  mascac: "Massachusetts State Collegiate Athletic Conference (MASCAC)",
  miaa: "Michigan Intercollegiate Athletic Association (MIAA)",
  mac: "Middle Atlantic Conferences (MAC)",
  mwc: "Midwest Conference (MWC)",
  miac: "Minnesota Intercollegiate Athletic Conference (MIAC)",
  nescac: "New England Small College Athletic Conference (NESCAC)",
  newmac: "New England Women's and Men's Athletic Conference (NEWMAC)",
  njac: "New Jersey Athletic Conference (NJAC)",
  nac: "North Atlantic Conference (NAC)",
  ncac: "North Coast Athletic Conference (NCAC)",
  north_eastern_athletic_c: "North Eastern Athletic Conference (NEAC)",
  nacc: "Northern Athletics Collegiate Conference (NACC)",
  nwc: "Northwest Conference (NWC)",
  oac: "Ohio Athletic Conference (OAC)",
  odac: "Old Dominion Athletic Conference (ODAC)",
  pac: "Presidents Athletic Conference (PAC)",
  skyline_conference: "Skyline Conference",
  saa: "Southern Athletic Association (SAA)",
  sciac: "Southern California Intercollegiate Athletic Conference (SCIAC)",
  sliac: "St. Louis Intercollegiate Athletic Conference (SLIAC)",
  sunyac: "State University of New York Athletic Conference (SUNYAC)",
  uaa: "University Athletic Association (UAA)",
  usa_south_athletic_confe: "USA South Athletic Conference",
  umac: "Upper Midwest Athletic Conference (UMAC)",
  wiac: "Wisconsin Intercollegiate Athletic Conference (WIAC)",
};

/** Normalize to a display-ready conference name: look up by code or title-case the string. */
export function formatConferenceDisplayName(
  nameOrCode: string,
  code?: string,
): string {
  const raw = (nameOrCode ?? "").trim();
  const codeKey = (code ?? raw).toLowerCase().trim().replace(/\s+/g, "_");

  const fromCode = codeKey ? CONFERENCE_DISPLAY_NAMES[codeKey] : undefined;
  if (fromCode) return fromCode;

  if (!raw) return "Conference";

  const fromName = CONFERENCE_DISPLAY_NAMES[raw.toLowerCase().replace(/\s+/g, "_")];
  if (fromName) return fromName;

  return titleCaseConference(raw);
}

/** Title-case a string for display (e.g. "centennial conference" → "Centennial Conference"). Leaves parenthetical abbreviations as-is. */
function titleCaseConference(s: string): string {
  return s
    .split(/\s+/)
    .map((word) => {
      const paren = word.match(/^(.+?)\((.+)\)$/);
      if (paren) {
        const before = paren[1].trim();
        const abbr = paren[2].toUpperCase();
        const titleBefore =
          /^[a-z]/.test(before)
            ? before.charAt(0).toUpperCase() + before.slice(1).toLowerCase()
            : before;
        return `${titleBefore} (${abbr})`;
      }
      if (/^[a-z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(" ");
}

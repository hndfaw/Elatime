import type { AgeBand, EventCategory } from "../types";

/**
 * Heuristic text classifiers shared by every parser. They turn free-form
 * event titles/descriptions into Elatime's controlled vocabulary so the
 * frontend can filter reliably regardless of which site an event came from.
 */

const CATEGORY_KEYWORDS: Array<[EventCategory, RegExp]> = [
  ["storytime", /\b(story ?time|story ?hour|read(ing)?s?\b|books?|library tales)\b/i],
  ["arts-crafts", /\b(craft|art|paint|draw|make(r)?|create|diy|slime)\b/i],
  ["music", /\b(music|sing|song|dance|concert|drum|rhythm|jam)\b/i],
  ["museum", /\b(museum|exhibit|science center|planetarium|aquarium|discovery)\b/i],
  ["sports", /\b(soccer|t-?ball|gym|swim|karate|yoga|sport|run|bike)\b/i],
  ["class", /\b(class|workshop|lesson|camp|learn|stem|coding)\b/i],
  ["seasonal", /\b(holiday|halloween|christmas|easter|santa|festival|egg hunt|pumpkin)\b/i],
  ["playground", /\b(playground|play ?ground|open play|play ?date|indoor play)\b/i],
  ["outdoor", /\b(park|nature|trail|garden|beach|outdoor|preserve|hike|eco)\b/i],
];

/** Classify an event category from its title + description. */
export function classifyCategory(title: string, description = ""): EventCategory {
  const text = `${title} ${description}`;
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return "other";
}

const AGE_RULES: Array<[AgeBand, RegExp]> = [
  ["infant", /\b(infant|baby|babies|0-1|newborn|lap ?sit)\b/i],
  ["toddler", /\b(toddler|tot|1-3|2-3|ages? 1|ages? 2|walker)\b/i],
  ["preschool", /\b(pre-?school|pre-?k|3-5|ages? 3|ages? 4)\b/i],
  ["kid", /\b(kid|child|school ?age|5-12|elementary|tween|youth|grade)\b/i],
];

/**
 * Infer age suitability bands from text. Falls back to ["all-ages"] when the
 * text gives no explicit signal — most family/community events qualify.
 */
export function classifyAgeBands(title: string, description = ""): AgeBand[] {
  const text = `${title} ${description}`;
  const bands = new Set<AgeBand>();
  for (const [band, re] of AGE_RULES) {
    if (re.test(text)) bands.add(band);
  }
  if (bands.size === 0) return ["all-ages"];
  return [...bands];
}

// Terms that signal an event is for kids/families. Used to filter broad
// municipal feeds (which are mostly board meetings, budget hearings, etc.)
// down to what belongs on Elatime.
const KID_RELEVANCE = new RegExp(
  [
    "\\bkids?\\b", "\\bchild(ren)?\\b", "\\btoddlers?\\b", "\\btots?\\b",
    "\\bbab(y|ies)\\b", "\\binfants?\\b", "pre-?school", "pre-?k\\b",
    "\\bfamil(y|ies)\\b", "story ?time", "story ?hour", "\\bcrafts?\\b",
    "\\bpuppets?\\b", "\\blego\\b", "\\bste[am]m?\\b", "\\bcamps?\\b",
    "\\byouth\\b", "\\bteens?\\b", "\\bjunior\\b", "\\blittle ones?\\b",
    "\\bnature\\b", "\\bdino(saur)?s?\\b", "playground", "play ?date",
    "petting zoo", "backpack", "back to school", "scavenger", "\\bmagic show\\b",
    "\\bpumpkin\\b", "egg hunt", "\\bsanta\\b", "\\ball ages?\\b",
  ].join("|"),
  "i"
);

/**
 * True when an event's text looks kid/family relevant. Applied only to sources
 * flagged `kidFilter` (broad municipal calendars). Curated sources and fixtures
 * bypass this.
 */
export function isKidRelevant(title: string, description = ""): boolean {
  return KID_RELEVANCE.test(`${title} ${description}`);
}

/** Detect whether an event is free from price-ish text. */
export function detectFree(text: string): boolean {
  if (/\b(free|no cost|complimentary|no charge)\b/i.test(text)) return true;
  if (/\$\s?\d/.test(text) || /\b(ticket|admission|fee|paid|\$)\b/i.test(text)) {
    return false;
  }
  // Municipal/library programs default to free.
  return true;
}

/**
 * A stable, deterministic id for an event so re-scrapes de-duplicate instead
 * of piling up. Derived from source + title + start, hashed with a small FNV-1a.
 */
export function eventId(sourceId: string, title: string, startsAt: string): string {
  const key = `${sourceId}|${title.trim().toLowerCase()}|${startsAt}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `evt_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

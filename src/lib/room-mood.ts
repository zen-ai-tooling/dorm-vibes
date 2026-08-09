import type { Room } from "./dorm-data";

/** Atmospheric identity presets. Derived from a room's data, never authored per room. */
export type MoodId = "cozy" | "chill" | "energetic" | "moody";

export type MoodPreset = {
  id: MoodId;
  label: string;
  /** subtle tint layered over the room's warm base lighting */
  tint: string;
  /** intensity of the tint fill light */
  tintIntensity: number;
  /** particle behaviour */
  particle: "motes" | "sparkles" | "pulse";
  particleColor: string;
  particleCount: number;
  /** particle drift speed multiplier */
  speed: number;
  /** beats per minute for the pulse effect (unused by other particles) */
  bpm: number;
};

export const MOODS: Record<MoodId, MoodPreset> = {
  cozy: {
    id: "cozy",
    label: "Cozy",
    tint: "#FFC48A",
    tintIntensity: 2.4,
    particle: "sparkles",
    particleColor: "#FFE0B0",
    particleCount: 26,
    speed: 0.35,
    bpm: 0,
  },
  chill: {
    id: "chill",
    label: "Chill",
    tint: "#A8D2E0",
    tintIntensity: 1.95,
    particle: "motes",
    particleColor: "#EAF4F8",
    particleCount: 30,
    speed: 0.18,
    bpm: 0,
  },
  energetic: {
    id: "energetic",
    label: "Energetic",
    tint: "#C48CF0",
    tintIntensity: 2.85,
    particle: "pulse",
    particleColor: "#E0B6FF",
    particleCount: 22,
    speed: 0.6,
    bpm: 124,
  },
  moody: {
    id: "moody",
    label: "Moody",
    tint: "#7A8CD6",
    tintIntensity: 2.1,
    particle: "motes",
    particleColor: "#C9D2F5",
    particleCount: 24,
    speed: 0.25,
    bpm: 0,
  },
};

/** keyword → mood score weights, matched against songs + bulletin text */
const SIGNALS: { mood: MoodId; weight: number; words: string[] }[] = [
  {
    mood: "energetic",
    weight: 2,
    words: [
      "daft punk",
      "marshall jefferson",
      "house",
      "dance",
      "techno",
      "disco",
      "move your body",
      "warehouse",
      "running",
      "marathon",
      "dj",
    ],
  },
  {
    mood: "chill",
    weight: 2,
    words: [
      "mitski",
      "lucy dacus",
      "phoebe bridgers",
      "joanna sternberg",
      "japanese breakfast",
      "folk",
      "singer-songwriter",
      "slow",
      "acoustic",
      "reading",
      "pottery",
      "gallery",
      "ambient",
    ],
  },
  {
    mood: "cozy",
    weight: 2,
    words: [
      "rex orange county",
      "childish gambino",
      "sunflower",
      "indie",
      "dream",
      "bedroom",
      "lo-fi",
      "soul",
      "skate",
      "hang",
      "crush",
    ],
  },
  {
    mood: "moody",
    weight: 2,
    words: ["m83", "mgmt", "beach house", "midnight", "electronic", "synth", "night", "noir"],
  },
];

/**
 * Derive a room's mood from data it already has (songs + bulletin text).
 * Top song is weighted double so the "genre" of the room leads.
 */
export function deriveMood(room: Room): MoodPreset {
  const scores: Record<MoodId, number> = { cozy: 0, chill: 0, energetic: 0, moody: 0 };

  const entries: { text: string; weight: number }[] = [
    ...room.songs.map((s, i) => ({
      text: `${s.title} ${s.artist}`.toLowerCase(),
      weight: i === 0 ? 2 : 1,
    })),
    ...room.bulletin.map((b) => ({ text: b.text.toLowerCase(), weight: 0.75 })),
  ];

  for (const entry of entries) {
    for (const signal of SIGNALS) {
      for (const word of signal.words) {
        if (entry.text.includes(word)) scores[signal.mood] += signal.weight * entry.weight;
      }
    }
  }

  // companion type nudges: plants lean cozy, pets lean chill
  scores[room.companion.type === "plant" ? "cozy" : "chill"] += 1;

  let best: MoodId = "cozy";
  for (const id of Object.keys(scores) as MoodId[]) {
    if (scores[id] > scores[best]) best = id;
  }
  return MOODS[best];
}

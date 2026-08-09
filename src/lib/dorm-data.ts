import flyerRooftop from "@/assets/flyer-rooftop.jpg";
import flyerGallery from "@/assets/flyer-gallery.jpg";
import flyerWarehouse from "@/assets/flyer-warehouse.jpg";

export type Song = { title: string; artist: string };

export type BulletinItem = {
  text: string;
  kind: "interest" | "event";
  image?: string;
};

/** Low-poly companion variants that have a model in Companion.tsx */
export type CompanionVariant = "succulent" | "fern" | "cat" | "dog";

export type Companion = {
  type: "pet" | "plant";
  name: string;
  blurb: string;
  variant: CompanionVariant;
};

/** Decal shapes that have a model in DoorDecor.tsx */
export type StickerId = "note" | "star" | "paw" | "heart" | "planet" | "leaf";

export type DoorConfig = {
  /** owner name shown on the nameplate */
  owner: string;
  /** 2-3 decals, rendered by mapping over this list */
  stickers: StickerId[];
  /** mock presence flag — placeholder for the real presence system */
  isActive: boolean;
};

/** Wallpaper patterns that have a generator in RoomDecor.tsx */
export type WallpaperId = "plain" | "stripes" | "dots" | "grid" | "arches";

/** Poster graphics that have a generator in RoomDecor.tsx */
export type PosterId = "gig" | "vinyl" | "cosmos" | "sunset" | "botanic" | "rave";

/**
 * Swappable room decor. Purely identifiers + placement hints so a future
 * customization/purchase feature can write new values into this object
 * (or into a user record shaped like it) without touching components.
 */
export type Decor = {
  wallpaper: WallpaperId;
  /** wallpaper tint; falls back to the room accent when omitted */
  wallpaperColor?: string;
  /** 1-3 posters, rendered by mapping over this list */
  posters: PosterId[];
};

export type Room = {
  id: string;
  name: string;
  accent: string;
  /** distance down the hallway, in units */
  z: number;
  side: "left" | "right";
  songs: Song[];
  bulletin: BulletinItem[];
  companion: Companion;
  door: DoorConfig;
  decor: Decor;
};

export const ROOMS: Room[] = [
  {
    id: "you",
    name: "Your Room",
    accent: "#1E7A69",
    z: 5,
    side: "left",
    songs: [
      { title: "Midnight City", artist: "M83" },
      { title: "Redbone", artist: "Childish Gambino" },
      { title: "Sunflower", artist: "Rex Orange County" },
      { title: "Instant Crush", artist: "Daft Punk" },
      { title: "Electric Feel", artist: "MGMT" },
    ],
    bulletin: [
      { text: "Into ambient techno lately", kind: "interest" },
      { text: "Learning to skate", kind: "interest" },
      { text: "Rooftop hang — Fri 8pm", kind: "event", image: flyerRooftop },
    ],
    companion: {
      type: "plant",
      name: "Spike",
      blurb: "Low-maintenance, high standards.",
      variant: "succulent",
    },
    door: { owner: "You", stickers: ["note", "star"], isActive: true },
  },
  {
    id: "sam",
    name: "Sam's Room",
    accent: "#B24A2E",
    z: 10,
    side: "right",
    songs: [
      { title: "Two Slow Dancers", artist: "Mitski" },
      { title: "Cherry", artist: "Lucy Dacus" },
      { title: "Motion Sickness", artist: "Phoebe Bridgers" },
      { title: "Emily", artist: "Joanna Sternberg" },
      { title: "Jubilee", artist: "Japanese Breakfast" },
    ],
    bulletin: [
      { text: "Reading way too much sci-fi", kind: "interest" },
      { text: "Started pottery class", kind: "interest" },
      { text: "Gallery opening — Sat 6pm", kind: "event", image: flyerGallery },
    ],
    companion: {
      type: "pet",
      name: "Nebula",
      blurb: "Sleeps on paperbacks, knocks clay mugs off the wheel.",
      variant: "cat",
    },
    door: { owner: "Sam", stickers: ["planet", "star", "leaf"], isActive: false },
  },
  {
    id: "jordan",
    name: "Jordan's Room",
    accent: "#6B3B9E",
    z: 15,
    side: "left",
    songs: [
      { title: "One More Time", artist: "Daft Punk" },
      { title: "Move Your Body", artist: "Marshall Jefferson" },
      { title: "Losing You", artist: "Solange" },
      { title: "Silver Soul", artist: "Beach House" },
      { title: "Digital Love", artist: "Daft Punk" },
    ],
    bulletin: [
      { text: "Deep in a house music phase", kind: "interest" },
      { text: "Training for a half marathon", kind: "interest" },
      { text: "Show at the warehouse — Sun 9pm", kind: "event", image: flyerWarehouse },
    ],
    companion: {
      type: "pet",
      name: "Bassline",
      blurb: "Four-on-the-floor tail wag, will out-run you at 6am.",
      variant: "dog",
    },
    door: { owner: "Jordan", stickers: ["note", "paw", "heart"], isActive: false },
  },
];


// --- Scene geometry constants (1 unit ~= 1 meter) ---
export const HALL_W = 4;
export const HALL_H = 3;
export const WALL_T = 0.3;
export const DOOR_W = 1.8;
export const DOOR_H = 2.2;
export const HALL_START = -3;
export const HALL_END = 30;
export const ROOM_SIZE = 5;

export const COLORS = {
  wall: "#E6D6BC",
  floor: "#B8875A",
  floorDark: "#A8794E",
  trim: "#4E3626",
  ceiling: "#E2D2B8",
  wallOuter: "#CBB79A",
  fog: "#E4CFA8",
};

export const sideSign = (side: Room["side"]) => (side === "left" ? -1 : 1);
/** center x of a room interior */
export const roomCenterX = (side: Room["side"]) =>
  sideSign(side) * (HALL_W / 2 + WALL_T + ROOM_SIZE / 2);

// --- Shared hallway dressing (dorm-wide, not per-person) ---
import flyerFloorMeeting from "@/assets/flyer-floor-meeting.jpg";

export type CommunityItem = { text: string; image?: string };

/** midpoint of the built hallway, on the left wall between doors */
export const COMMUNITY_BOARD = {
  z: 10,
  side: "left" as const,
  items: [
    { text: "Floor meeting — Thurs 7pm", image: flyerFloorMeeting },
    { text: "Quiet hours start 10pm" },
    { text: "Laundry room card reader is fixed" },
  ] as CommunityItem[],
};

export const VENDING = { z: 6.6, side: "right" as const };
export const LOST_AND_FOUND = { z: -1.6, side: "right" as const };

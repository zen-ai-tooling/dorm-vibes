import flyerRooftop from "@/assets/flyer-rooftop.jpg";
import flyerGallery from "@/assets/flyer-gallery.jpg";
import flyerWarehouse from "@/assets/flyer-warehouse.jpg";

export type Song = { title: string; artist: string };

export type BulletinItem = {
  text: string;
  kind: "interest" | "event";
  image?: string;
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
};

export const ROOMS: Room[] = [
  {
    id: "you",
    name: "Your Room",
    accent: "#4A9B8E",
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
  },
  {
    id: "sam",
    name: "Sam's Room",
    accent: "#E07A5F",
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
  },
  {
    id: "jordan",
    name: "Jordan's Room",
    accent: "#9B6BC7",
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
  wall: "#F2E8D5",
  floor: "#B8875A",
  floorDark: "#A8794E",
  trim: "#5C4433",
  ceiling: "#EFE2CB",
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

import { useMemo } from "react";
import * as THREE from "three";
import {
  HALL_H,
  HALL_W,
  ROOM_SIZE,
  WALL_T,
  roomCenterX,
  sideSign,
  type PosterId,
  type Room,
  type WallpaperId,
} from "@/lib/dorm-data";

/**
 * Swappable room decor: wallpaper + posters.
 *
 * Both are looked up from `room.decor` (a plain data object) — the same
 * data-driven pattern used by companions and door stickers. Adding a variant
 * = adding an entry to WALLPAPERS / POSTERS. No per-room JSX anywhere, so a
 * future customization feature only ever writes new identifiers into data.
 */

const HALF = HALL_W / 2;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function toTexture(c: HTMLCanvasElement, repeat?: [number, number]) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.anisotropy = 4;
  return tex;
}

// --- wallpapers -----------------------------------------------------------
// Each generator paints one seamless tile in the room's decor colour over a
// warm paper base; the material repeats it across the wall.

type WallpaperDef = {
  repeat: [number, number];
  draw: (ctx: CanvasRenderingContext2D, size: number, color: string) => void;
};

const BASE = "#EFE2CB";

const WALLPAPERS: Record<WallpaperId, WallpaperDef> = {
  plain: {
    repeat: [1, 1],
    draw: (ctx, s) => {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, s, s);
    },
  },
  stripes: {
    repeat: [4, 2],
    draw: (ctx, s, color) => {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, s * 0.22, s);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(s * 0.55, 0, s * 0.1, s);
      ctx.globalAlpha = 1;
    },
  },
  dots: {
    repeat: [5, 3],
    draw: (ctx, s, color) => {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.42;
      for (const [x, y, r] of [
        [0.25, 0.25, 0.09],
        [0.75, 0.75, 0.09],
        [0.75, 0.25, 0.045],
        [0.25, 0.75, 0.045],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },
  grid: {
    repeat: [6, 4],
    draw: (ctx, s, color) => {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = s * 0.05;
      ctx.strokeRect(0, 0, s, s);
      ctx.globalAlpha = 1;
    },
  },
  arches: {
    repeat: [4, 2],
    draw: (ctx, s, color) => {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.72, s * 0.3, Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.72, s * 0.14, Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },
};

// --- posters --------------------------------------------------------------
// Flat, graphic, low-poly-friendly compositions. 3:4 portrait tiles.

type PosterDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) => void;

const POSTERS: Record<PosterId, { bg: string; draw: PosterDraw }> = {
  gig: {
    bg: "#1F1B2E",
    draw: (ctx, w, h, accent) => {
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.85 - i * 0.13;
        ctx.fillRect(w * 0.12, h * (0.16 + i * 0.11), w * 0.76, h * 0.055);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#F4E9D6";
      ctx.fillRect(w * 0.12, h * 0.78, w * 0.5, h * 0.035);
      ctx.fillRect(w * 0.12, h * 0.85, w * 0.32, h * 0.025);
    },
  },
  vinyl: {
    bg: "#E9DDC6",
    draw: (ctx, w, h, accent) => {
      const cx = w / 2;
      const cy = h * 0.45;
      ctx.fillStyle = "#241F1C";
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3C3531";
      ctx.lineWidth = w * 0.012;
      for (let r = 0.14; r < 0.33; r += 0.05) {
        ctx.beginPath();
        ctx.arc(cx, cy, w * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#241F1C";
      ctx.fillRect(w * 0.18, h * 0.84, w * 0.64, h * 0.03);
    },
  },
  cosmos: {
    bg: "#161A33",
    draw: (ctx, w, h, accent) => {
      ctx.fillStyle = "#F6E7C4";
      for (let i = 0; i < 40; i++) {
        const x = ((i * 97) % 100) / 100;
        const y = ((i * 61) % 100) / 100;
        ctx.globalAlpha = 0.3 + ((i * 13) % 7) / 10;
        ctx.fillRect(x * w, y * h, w * 0.012, w * 0.012);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(w * 0.55, h * 0.42, w * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#F6E7C4";
      ctx.lineWidth = w * 0.02;
      ctx.save();
      ctx.translate(w * 0.55, h * 0.42);
      ctx.rotate(-0.4);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },
  sunset: {
    bg: "#F3D7A8",
    draw: (ctx, w, h, accent) => {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.46, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F3D7A8";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(w * 0.16, h * (0.42 + i * 0.07), w * 0.68, h * 0.022);
      }
      ctx.fillStyle = "#8C5A3A";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w * 0.35, h * 0.62);
      ctx.lineTo(w * 0.7, h);
      ctx.closePath();
      ctx.fill();
    },
  },
  botanic: {
    bg: "#EDE6D2",
    draw: (ctx, w, h, accent) => {
      ctx.strokeStyle = "#4F7A50";
      ctx.lineWidth = w * 0.03;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.9);
      ctx.lineTo(w * 0.5, h * 0.24);
      ctx.stroke();
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        const y = h * (0.32 + i * 0.11);
        const s = i % 2 === 0 ? 1 : -1;
        ctx.save();
        ctx.translate(w * 0.5, y);
        ctx.rotate(s * 0.5);
        ctx.scale(1, 0.4);
        ctx.beginPath();
        ctx.arc(s * w * 0.16, 0, w * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  },
  rave: {
    bg: "#20143A",
    draw: (ctx, w, h, accent) => {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.1);
      ctx.lineTo(w * 0.95, h * 0.95);
      ctx.lineTo(w * 0.05, h * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#20143A";
      for (let i = 1; i < 5; i++) {
        ctx.globalAlpha = 0.55;
        ctx.fillRect(0, h * (0.3 + i * 0.14), w, h * 0.035);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#F2E4C9";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.24, w * 0.09, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

const wallCache = new Map<string, THREE.Texture>();
const posterCache = new Map<string, THREE.Texture>();

function useWallpaper(id: WallpaperId, color: string) {
  return useMemo(() => {
    const key = `${id}|${color}`;
    let tex = wallCache.get(key);
    if (!tex) {
      const def = WALLPAPERS[id] ?? WALLPAPERS.plain;
      const size = 128;
      const { c, ctx } = canvas(size, size);
      def.draw(ctx, size, color);
      tex = toTexture(c, def.repeat);
      wallCache.set(key, tex);
    }
    return { tex, def: WALLPAPERS[id] ?? WALLPAPERS.plain };
  }, [id, color]);
}

function usePoster(id: PosterId, accent: string) {
  return useMemo(() => {
    const key = `${id}|${accent}`;
    let tex = posterCache.get(key);
    if (!tex) {
      const def = POSTERS[id] ?? POSTERS.vinyl;
      const w = 192;
      const h = 256;
      const { c, ctx } = canvas(w, h);
      ctx.fillStyle = def.bg;
      ctx.fillRect(0, 0, w, h);
      def.draw(ctx, w, h, accent);
      tex = toTexture(c);
      posterCache.set(key, tex);
    }
    return tex;
  }, [id, accent]);
}

function WallpaperPlane({
  id,
  color,
  position,
  rotation,
  width,
}: {
  id: WallpaperId;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
}) {
  const { tex } = useWallpaper(id, color);
  return (
    <mesh position={position} rotation={rotation} renderOrder={1} receiveShadow>
      <planeGeometry args={[width, HALL_H]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

function Poster({
  id,
  accent,
  position,
  rotation,
  tilt,
}: {
  id: PosterId;
  accent: string;
  position: [number, number, number];
  rotation: [number, number, number];
  tilt: number;
}) {
  const tex = usePoster(id, accent);
  const w = 0.85;
  const h = 1.15;
  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0, 0, tilt]}>
        {/* paper edge, then the printed face a hair in front of it */}
        <mesh>
          <planeGeometry args={[w + 0.05, h + 0.05]} />
          <meshStandardMaterial color="#F6EEDD" roughness={1} />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
        {/* two bits of tape */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * w * 0.42, h * 0.5, 0.01]} rotation={[0, 0, s * 0.5]}>
            <planeGeometry args={[0.16, 0.06]} />
            <meshStandardMaterial color="#EFE3C8" transparent opacity={0.75} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Renders a room's wallpaper on its three interior walls and maps over the
 * poster list. Placement dodges the bulletin board (far wall, +z half).
 */
export function RoomDecor({ room }: { room: Room }) {
  const sign = sideSign(room.side);
  const cx = roomCenterX(room.side);
  const outerX = sign * (HALF + WALL_T + ROOM_SIZE);
  const decor = room.decor;
  const color = decor.wallpaperColor ?? room.accent;

  // slot list: posters are placed into these in order, so a room with one
  // poster uses the first slot and a room with three fills them all
  const slots: { position: [number, number, number]; rotation: [number, number, number] }[] = [
    {
      position: [outerX - sign * 0.035, 1.85, room.z - 1.35],
      rotation: [0, (-sign * Math.PI) / 2, 0],
    },
    {
      position: [cx - sign * 1.15, 1.95, room.z - (ROOM_SIZE / 2 - 0.035)],
      rotation: [0, 0, 0],
    },
    {
      position: [cx + sign * 1.3, 1.9, room.z + (ROOM_SIZE / 2 - 0.035)],
      rotation: [0, Math.PI, 0],
    },
  ];

  return (
    <group>
      {/* wallpaper: far wall + both side walls, inset so it never z-fights */}
      <WallpaperPlane
        id={decor.wallpaper}
        color={color}
        position={[outerX - sign * 0.02, HALL_H / 2, room.z]}
        rotation={[0, (-sign * Math.PI) / 2, 0]}
        width={ROOM_SIZE}
      />
      {[-1, 1].map((dz) => (
        <WallpaperPlane
          key={dz}
          id={decor.wallpaper}
          color={color}
          position={[cx, HALL_H / 2, room.z + dz * (ROOM_SIZE / 2 - 0.02)]}
          rotation={[0, dz > 0 ? Math.PI : 0, 0]}
          width={ROOM_SIZE}
        />
      ))}

      {decor.posters.slice(0, slots.length).map((id, i) => {
        const slot = slots[i]!;
        return (
          <Poster
            key={`${id}-${i}`}
            id={id}
            accent={room.accent}
            position={slot.position}
            rotation={slot.rotation}
            tilt={(i % 2 === 0 ? 1 : -1) * 0.025}
          />
        );
      })}
    </group>
  );
}

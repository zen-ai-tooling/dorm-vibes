import { useRef, useState, useMemo, useEffect, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  ROOMS,
  COLORS,
  HALL_W,
  HALL_H,
  WALL_T,
  DOOR_W,
  DOOR_H,
  HALL_START,
  HALL_END,
  ROOM_SIZE,
  sideSign,
  roomCenterX,
  type Room,
} from "@/lib/dorm-data";
import { HallwayDressing } from "./HallwayProps";
import { DormAudio } from "@/lib/dorm-audio";
import { DaylightRig, DoorLight } from "./Daylight";
import { HallwayWindows, wallPanels } from "./Windows";
import { LockedDoor } from "./LockedDoor";
import { Companion } from "./Companion";
import { DoorStickers, NowPlayingPulse } from "./DoorDecor";
import { RoomMood } from "./RoomMood";


type Box = { cx: number; cz: number; sx: number; sz: number };

const HALF = HALL_W / 2;
const WALL_CX = HALF + WALL_T / 2;
const PLAYER_R = 0.42;
/** third-person boom: distance behind and height above the character */
// elevated "diorama" rig: high above the ceiling plane looking down at ~46deg
const CAM_DIST = 8.5;
const CAM_HEIGHT = 10;
/** intimate in-room rig: closer + lower so decor and text read clearly */
const ROOM_CAM_DIST = 4.4;
const ROOM_CAM_HEIGHT = 3.1;
/** seconds to blend between hallway and room framing */
const CAM_BLEND_SECONDS = 0.75;

/** true when the character has crossed the hallway wall plane into a room */
function roomContaining(x: number, z: number): Room | null {
  if (Math.abs(x) < HALL_W / 2 + WALL_T * 0.5) return null;
  for (const room of ROOMS) {
    if (sideSign(room.side) !== Math.sign(x)) continue;
    if (Math.abs(z - room.z) <= ROOM_SIZE / 2 + 0.3) return room;
  }
  return null;
}
const WALK_SPEED = 3.2;


/** Split a wall run along z into segments, skipping doorway gaps. */
function splitRun(from: number, to: number, gaps: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let cursor = from;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}

function buildWalls(): Box[] {
  const walls: Box[] = [];
  for (const side of ["left", "right"] as const) {
    const sign = sideSign(side);
    const gaps = ROOMS.filter((r) => r.side === side).map(
      (r) => [r.z - DOOR_W / 2, r.z + DOOR_W / 2] as [number, number],
    );
    for (const [a, b] of splitRun(HALL_START, HALL_END, gaps)) {
      walls.push({ cx: sign * WALL_CX, cz: (a + b) / 2, sx: WALL_T, sz: b - a });
    }
  }
  // hallway back wall
  walls.push({
    cx: 0,
    cz: HALL_START - WALL_T / 2,
    sx: HALL_W + WALL_T * 2,
    sz: WALL_T,
  });

  // room shells
  for (const room of ROOMS) {
    const sign = sideSign(room.side);
    const outerX = sign * (HALF + WALL_T + ROOM_SIZE + WALL_T / 2);
    walls.push({ cx: outerX, cz: room.z, sx: WALL_T, sz: ROOM_SIZE + WALL_T * 2 });
    const cx = roomCenterX(room.side);
    for (const dz of [-1, 1]) {
      // side walls run the full depth so they interpenetrate (rather than
      // butt face-to-face against) the hallway wall and the outer room wall
      walls.push({
        cx,
        cz: room.z + dz * (ROOM_SIZE / 2 + WALL_T / 2),
        sx: ROOM_SIZE + WALL_T * 2,
        sz: WALL_T,
      });
    }

  }
  return walls;
}

const WALLS = buildWalls();

type Interactive = {
  key: string;
  room: Room;
  kind: "speaker" | "board" | "companion";
  x: number;
  z: number;
};

function buildInteractives(): Interactive[] {
  return ROOMS.flatMap((room) => {
    const sign = sideSign(room.side);
    const cx = roomCenterX(room.side);
    return [
      { key: `${room.id}-speaker`, room, kind: "speaker" as const, x: cx - sign * 1.5, z: room.z - 1.6 },
      {
        key: `${room.id}-board`,
        room,
        kind: "board" as const,
        x: sign * (HALF + WALL_T + ROOM_SIZE - 0.55),
        z: room.z + 1.1,
      },
      {
        key: `${room.id}-companion`,
        room,
        kind: "companion" as const,
        x: cx + sign * 1.7,
        z: room.z - 1.7,
      },
    ];
  });
}

const INTERACTIVES = buildInteractives();

function resolveCollisions(pos: THREE.Vector2, radius = PLAYER_R) {
  for (const w of WALLS) {
    const hx = w.sx / 2 + radius;
    const hz = w.sz / 2 + radius;
    const dx = pos.x - w.cx;
    const dz = pos.y - w.cz;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const penX = hx - Math.abs(dx);
      const penZ = hz - Math.abs(dz);
      if (penX < penZ) pos.x += Math.sign(dx || 1) * penX;
      else pos.y += Math.sign(dz || 1) * penZ;
    }
  }
}

/** true when a straight walk from a→b never enters a wall AABB (padded) */
function segmentClear(a: THREE.Vector2, b: THREE.Vector2, pad = PLAYER_R * 0.95) {
  const dx = b.x - a.x;
  const dz = b.y - a.y;
  for (const w of WALLS) {
    const hx = w.sx / 2 + pad;
    const hz = w.sz / 2 + pad;
    let t0 = 0;
    let t1 = 1;
    for (const [o, d, lo, hi] of [
      [a.x, dx, w.cx - hx, w.cx + hx],
      [a.y, dz, w.cz - hz, w.cz + hz],
    ] as [number, number, number, number][]) {
      if (Math.abs(d) < 1e-6) {
        if (o < lo || o > hi) {
          t0 = 1;
          t1 = 0;
          break;
        }
        continue;
      }
      let ta = (lo - o) / d;
      let tb = (hi - o) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
    }
    if (t0 <= t1) return false;
  }
  return true;
}

/** static waypoint lattice: hallway spine + each doorway + each room centre */
const WAYPOINTS: THREE.Vector2[] = (() => {
  const pts: THREE.Vector2[] = [];
  for (let z = HALL_START + 1; z <= HALL_END - 1; z += 2) pts.push(new THREE.Vector2(0, z));
  for (const room of ROOMS) {
    const sign = sideSign(room.side);
    pts.push(new THREE.Vector2(0, room.z));
    pts.push(new THREE.Vector2(sign * (HALF + WALL_T / 2), room.z));
    pts.push(new THREE.Vector2(sign * (HALF + WALL_T + 0.8), room.z));
    pts.push(new THREE.Vector2(roomCenterX(room.side), room.z));
    for (const dz of [-1.5, 1.5])
      pts.push(new THREE.Vector2(roomCenterX(room.side), room.z + dz));
  }
  return pts;
})();

/** straight line when possible, otherwise a short waypoint route around walls */
function findPath(from: THREE.Vector2, to: THREE.Vector2): THREE.Vector2[] {
  if (segmentClear(from, to)) return [to.clone()];

  const nodes = [from, ...WAYPOINTS, to];
  const n = nodes.length;
  const goal = n - 1;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[0] = 0;

  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i]! < (u < 0 ? Infinity : dist[u]!)) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v] || v === u) continue;
      const a = nodes[u]!;
      const b = nodes[v]!;
      const d = a.distanceTo(b);
      if (d > 9) continue;
      if (!segmentClear(a, b)) continue;
      if (dist[u]! + d < dist[v]!) {
        dist[v] = dist[u]! + d;
        prev[v] = u;
      }
    }
  }

  if (prev[goal]! < 0) return [];
  const out: THREE.Vector2[] = [];
  for (let i = goal; i > 0; i = prev[i]!) out.unshift(nodes[i]!.clone());
  return out;
}

/** flat ground marker that fades out where the player tapped */
function MoveMarker({
  markerRef,
}: {
  markerRef: React.RefObject<{ x: number; z: number; born: number } | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const m = markerRef.current;
    if (!m) {
      g.visible = false;
      return;
    }
    const age = (performance.now() - m.born) / 1000;
    if (age > 1.1) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(m.x, 0.035, m.z);
    const k = 1 - age / 1.1;
    const s = 0.75 + (1 - k) * 0.5;
    g.scale.setScalar(s);
    const mat = inner.current?.material as THREE.MeshBasicMaterial | undefined;
    if (mat) mat.opacity = k * 0.45;
  });
  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <mesh ref={inner}>
        <ringGeometry args={[0.34, 0.46, 32]} />
        <meshBasicMaterial color="#FFF3DC" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}


function useKeys() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const watched = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const down = (e: KeyboardEvent) => {
      if (watched.includes(e.code)) {
        e.preventDefault();
        keys.current[e.code] = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (watched.includes(e.code)) {
        e.preventDefault();
        keys.current[e.code] = false;
      }
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

/**
 * Soft, iconic character: capsule/sphere blob shapes only — no cube edges —
 * with a larger head-to-body ratio so the silhouette reads at diorama
 * distance. Palette is jewel-toned (plum / deep teal / amber) rather than
 * flat primaries. Segment counts stay low: the camera never gets close.
 */
/** Swappable hair piece — variant + color are props so a future customization
 *  UI can change them without touching the head mesh. */
type HairStyle = "bob" | "crop" | "bun";

function Hair({ style = "bob", color = "#241428" }: { style?: HairStyle; color?: string }) {
  return (
    <group>
      {/* cap shell shared by every style */}
      <mesh position={[0, 1.6, -0.02]} scale={[1.04, 0.9, 1.02]} castShadow>
        <sphereGeometry args={[0.34, 18, 14]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {style === "bob" && (
        <mesh position={[0, 1.42, -0.16]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.3, 14, 12]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      )}
      {style === "bun" && (
        <mesh position={[0, 1.82, -0.16]} castShadow>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Soft, iconic character: capsule/sphere blob shapes only — no cube edges —
 * with a larger head-to-body ratio so the silhouette reads at diorama
 * distance. Palette is jewel-toned (deep plum / emerald / berry). Face detail
 * stays iconic: two eyes, brows, blush and a small smile.
 */
function Character({
  groupRef,
  hairStyle = "bob",
  hairColor = "#2A1420",
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  hairStyle?: HairStyle;
  hairColor?: string;
}) {
  const SKIN = "#C98C60";
  const TOP = "#4A1E42"; // deep plum
  const SLEEVE = "#612A52";
  const LEGS = "#12403F"; // deep emerald-teal
  const SHOE = "#3A1420"; // berry
  const EYE = "#1B1016";
  return (
    <group ref={groupRef}>
      {/* contact shadow — keeps the character grounded at distance */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[0.44, 20]} />
        <meshBasicMaterial color="#241009" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* legs */}
      {[-0.14, 0.14].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.42, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.34, 3, 10]} />
            <meshStandardMaterial color={LEGS} roughness={0.85} />
          </mesh>
          <mesh position={[x, 0.11, 0.03]} castShadow>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color={SHOE} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* torso — rounded barrel */}
      <mesh position={[0, 0.96, 0]} scale={[1, 1, 0.72]} castShadow>
        <capsuleGeometry args={[0.28, 0.34, 4, 14]} />
        <meshStandardMaterial color={TOP} roughness={0.8} />
      </mesh>

      {/* arms */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.34, 0.98, 0]} rotation={[0, 0, s * 0.12]} castShadow>
          <capsuleGeometry args={[0.09, 0.32, 3, 10]} />
          <meshStandardMaterial color={SLEEVE} roughness={0.85} />
        </mesh>
      ))}

      {/* head — oversized for a friendly, legible silhouette */}
      <mesh position={[0, 1.53, 0]} scale={[1, 0.96, 0.94]} castShadow>
        <sphereGeometry args={[0.33, 18, 14]} />
        <meshStandardMaterial color={SKIN} roughness={0.9} />
      </mesh>

      <Hair style={hairStyle} color={hairColor} />

      {/* face — bold and simple so it still reads from the diorama camera */}
      {[-0.115, 0.115].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.545, 0.285]} scale={[1, 1.15, 0.6]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color={EYE} roughness={0.5} />
          </mesh>
          {/* brow */}
          <mesh position={[x, 1.635, 0.278]} rotation={[0, 0, Math.sign(x) * 0.12]}>
            <boxGeometry args={[0.085, 0.017, 0.02]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          {/* blush */}
          <mesh position={[x * 1.55, 1.475, 0.245]} scale={[1.3, 0.8, 0.3]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#B85B62" roughness={1} transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
      {/* smile */}
      <mesh position={[0, 1.455, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#5B2733" roughness={0.8} />
      </mesh>
    </group>
  );
}


function Structure() {
  return (
    <group>
      {/* hallway floor + ceiling */}
      <mesh position={[0, -0.06, (HALL_START + HALL_END) / 2]} receiveShadow>
        <boxGeometry args={[HALL_W + WALL_T * 2, 0.12, HALL_END - HALL_START]} />
        <meshStandardMaterial color={COLORS.floor} />
      </mesh>
      <mesh
        position={[0, HALL_H, (HALL_START + HALL_END) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[HALL_W + WALL_T * 2, HALL_END - HALL_START]} />
        <meshStandardMaterial color={COLORS.ceiling} />
      </mesh>
      {/* floor plank seams */}
      {Array.from({ length: Math.floor((HALL_END - HALL_START) / 1.5) }).map((_, i) => (
        <mesh key={i} position={[0, 0.005, HALL_START + i * 1.5]}>
          <boxGeometry args={[HALL_W, 0.02, 0.06]} />
          <meshStandardMaterial color={COLORS.floorDark} />
        </mesh>
      ))}
      {/* walls — interior faces use the plaster tone, the outward-facing skin
          and the top of every run get a finished neutral exterior tone so the
          diorama camera never sees raw blockout geometry */}
      {WALLS.flatMap((w, i) =>
        wallPanels(w).map((p, j) => (
          <group key={`${i}-${j}`}>
            <mesh position={[p.cx, p.cy, p.cz]} castShadow receiveShadow>
              <boxGeometry args={[p.sx, p.sy, p.sz]} />
              {/* DoubleSide, not BackSide: with BackSide the near wall face was
                  culled, so it wrote no depth and room furniture bled through the
                  wall and fought with the far face */}
              <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
            </mesh>
            {/* cap: closes the open-looking top edge of full-height runs */}
            {p.cy + p.sy / 2 > HALL_H - 0.05 && (
              <mesh position={[p.cx, HALL_H + 0.04, p.cz]} receiveShadow>
                <boxGeometry args={[p.sx + 0.1, 0.09, p.sz + 0.1]} />
                <meshStandardMaterial color={COLORS.wallOuter} roughness={0.95} />
              </mesh>
            )}
          </group>
        )),
      )}

      <HallwayWindows />
      {/* baseboard trim along hallway */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} position={[s * (HALF - 0.02), 0.14, (HALL_START + HALL_END) / 2]} args={[0.06, 0.28, HALL_END - HALL_START]} radius={0.025} smoothness={2}>
<meshStandardMaterial color={COLORS.trim} />
</RoundedBox>
      ))}
    </group>
  );
}

function RoomShell({ room }: { room: Room }) {
  const sign = sideSign(room.side);
  const cx = roomCenterX(room.side);
  return (
    <group>
      {/* floor/ceiling slabs overlap the hallway slab by 4cm at the doorway.
          Butting them exactly edge-to-edge left two coincident vertical side
          faces at x = HALF + WALL_T, which fought at grazing angles near the
          floor; a small interpenetration removes the shared plane entirely. */}
      <mesh position={[cx + sign * (WALL_T / 2 - 0.02), -0.06, room.z]} receiveShadow>
        <boxGeometry args={[ROOM_SIZE + WALL_T + 0.04, 0.12, ROOM_SIZE + WALL_T * 2]} />
        <meshStandardMaterial color={COLORS.floor} />
      </mesh>
      <mesh
        position={[cx + sign * (WALL_T / 2 - 0.02), HALL_H, room.z]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[ROOM_SIZE + WALL_T + 0.04, ROOM_SIZE + WALL_T * 2]} />
        <meshStandardMaterial color={COLORS.ceiling} />
      </mesh>

      {/* interior accent trim rail — embedded 0.01 into the wall so no face is
          coplanar with the wall surface behind it */}
      {[-1, 1].map((dz) => (
        <RoundedBox key={dz} position={[cx, 1.05, room.z + dz * (ROOM_SIZE / 2 - 0.02)]} args={[ROOM_SIZE - 0.02, 0.1, 0.06]} radius={0.025} smoothness={2}>
<meshStandardMaterial color={room.accent} />
</RoundedBox>
      ))}
      <RoundedBox position={[sign * (HALF + WALL_T + ROOM_SIZE - 0.02), 1.05, room.z]} args={[0.06, 0.1, ROOM_SIZE - 0.02]} radius={0.025} smoothness={2}>
<meshStandardMaterial color={room.accent} />
</RoundedBox>

      {/* bed */}
      <RoundedBox position={[cx + sign * 1.5, 0.28, room.z + 1.4]} castShadow args={[1.1, 0.45, 2]} radius={0.14} smoothness={2}>
<meshStandardMaterial color={COLORS.trim} />
</RoundedBox>
      <RoundedBox position={[cx + sign * 1.5, 0.58, room.z + 1.4]} castShadow args={[1.05, 0.18, 1.9]} radius={0.08} smoothness={2}>
<meshStandardMaterial color={room.accent} />
</RoundedBox>
      {/* rug */}
      <mesh position={[cx, 0.02, room.z - 0.4]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[2.2, 1.8]} />
        <meshStandardMaterial color={room.accent} opacity={0.5} transparent depthWrite={false} />
      </mesh>

      {/* desk */}
      <RoundedBox position={[cx - sign * 1.8, 0.75, room.z + 1.9]} castShadow args={[1.4, 0.1, 0.7]} radius={0.04} smoothness={2}>
<meshStandardMaterial color={COLORS.trim} />
</RoundedBox>

      {/* data-derived mood atmosphere (tint fill + batched particles) */}
      <RoomMood room={room} />
    </group>
  );
}

function DoorFrame({ room }: { room: Room }) {
  const sign = sideSign(room.side);
  const x = sign * WALL_CX;
  return (
    <group>
      {/* lintel above the doorway — overlaps the neighbouring wall runs by a
          few cm so their end caps are never coplanar with it */}
      <mesh position={[x, (DOOR_H + HALL_H) / 2, room.z]}>
        <boxGeometry args={[WALL_T, HALL_H - DOOR_H, DOOR_W + 0.08]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      {/* accent frame, sunk into the wall run rather than butted against it */}
      {[-1, 1].map((dz) => (
        <RoundedBox key={dz} position={[x, DOOR_H / 2, room.z + dz * (DOOR_W / 2 + 0.02)]} args={[WALL_T + 0.04, DOOR_H, 0.12]} radius={0.05} smoothness={2}>
<meshStandardMaterial color={room.accent} />
</RoundedBox>
      ))}
      <RoundedBox position={[x, DOOR_H + 0.05, room.z]} args={[WALL_T + 0.04, 0.14, DOOR_W + 0.24]} radius={0.06} smoothness={2}>
<meshStandardMaterial color={room.accent} />
</RoundedBox>

      {/* open door panel swung into the room */}
      <RoundedBox
        position={[sign * (HALF + WALL_T + 0.35), DOOR_H / 2, room.z + DOOR_W / 2 + 0.6]}
        rotation={[0, sign * 0.9, 0]}
        castShadow
       args={[0.1, DOOR_H, DOOR_W]} radius={0.045} smoothness={2}>
<meshStandardMaterial color={COLORS.trim} />
</RoundedBox>
      {/* warm light above the door */}
      <RoundedBox position={[sign * (HALF - 0.12), 2.55, room.z]} args={[0.16, 0.22, 0.5]} radius={0.07} smoothness={2}>
<meshStandardMaterial color="#FFE6B0" emissive="#FFC773" emissiveIntensity={1.2} />
</RoundedBox>
      <DoorLight position={[sign * (HALF - 0.4), 2.4, room.z]} />

      {/* "now playing" presence pulse, driven by room.door.isActive */}
      <group position={[sign * (HALF - 0.16), 1.9, room.z + DOOR_W / 2 + 0.22]}>
        <NowPlayingPulse active={room.door.isActive} accent={room.accent} />
      </group>

      {/* sticker collage on both faces of the open door panel */}
      {[1, -1].map((face) => (
        <group
          key={face}
          position={[sign * (HALF + WALL_T + 0.35), DOOR_H / 2, room.z + DOOR_W / 2 + 0.6]}
          rotation={[0, sign * 0.9, 0]}
        >
          <group position={[face * 0.055, 0.25, 0]} rotation={[0, (face * Math.PI) / 2, 0]}>
            <DoorStickers stickers={room.door.stickers} />
          </group>
        </group>
      ))}

      {/* name plaque */}
      <Html
        position={[sign * (HALF - 0.05), 2.05, room.z]}
        center
        distanceFactor={7}
        zIndexRange={[10, 0]}
      >
        <div className="dorm-plaque" style={{ borderColor: room.accent }}>
          {room.name}
          <span className="dorm-plaque-owner">
            {room.door.isActive && (
              <i className="dorm-live-dot" style={{ background: room.accent }} />
            )}
            {room.door.owner}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Speaker({ item, nearby }: { item: Interactive; nearby: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.35 + Math.sin(clock.elapsedTime * 2) * 0.06;
  });
  return (
    <group position={[item.x, 0, item.z]}>
      <RoundedBox position={[0, 0.55, 0]} castShadow args={[0.6, 1.1, 0.55]} radius={0.1} smoothness={2}>
<meshStandardMaterial color={COLORS.trim} />
</RoundedBox>
      <mesh position={[0, 0.75, 0.29]}>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 8]} />
        <meshStandardMaterial color={item.room.accent} />
      </mesh>
      <mesh position={[0, 0.75, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 8]} />
        <meshStandardMaterial color={item.room.accent} />
      </mesh>
      <mesh position={[0, 0.3, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
        <meshStandardMaterial color="#2E241C" />
      </mesh>
      {nearby && (
        <group ref={ref}>
          <pointLight color={item.room.accent} intensity={4} distance={3} />
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={item.room.accent}
              emissive={item.room.accent}
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function BulletinBoard({ item, nearby }: { item: Interactive; nearby: boolean }) {
  const sign = sideSign(item.room.side);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 2.25 + Math.sin(clock.elapsedTime * 2 + 1) * 0.06;
  });
  return (
    <group position={[item.x, 0, item.z]} rotation={[0, sign === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <RoundedBox position={[0, 1.55, 0]} castShadow args={[1.8, 1.2, 0.1]} radius={0.045} smoothness={2}>
<meshStandardMaterial color={item.room.accent} />
</RoundedBox>
      <RoundedBox position={[0, 1.55, 0.06]} args={[1.62, 1.02, 0.04]} radius={0.018} smoothness={2}>
<meshStandardMaterial color="#C9A57A" />
</RoundedBox>
      {[
        [-0.5, 1.75],
        [0.15, 1.85],
        [0.55, 1.4],
      ].map((pt, i) => (
        <RoundedBox key={i} position={[pt[0]!, pt[1]!, 0.1]} rotation={[0, 0, i * 0.15 - 0.15]} args={[0.42, 0.32, 0.02]} radius={0.009} smoothness={2}>
<meshStandardMaterial color={i === 2 ? "#F2E8D5" : "#FBF6EA"} />
</RoundedBox>
      ))}
      {nearby && (
        <group ref={ref}>
          <pointLight color={item.room.accent} intensity={4} distance={3} />
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={item.room.accent}
              emissive={item.room.accent}
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function World({
  onNearby,
  onActive,
}: {
  onNearby: (keys: string[]) => void;
  onActive: (key: string | null) => void;
}) {
  const keys = useKeys();
  const player = useRef(new THREE.Vector2(0, 0));
  const facing = useRef(new THREE.Vector2(0, 1));
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const cam = useRef<THREE.Camera>(camera);
  cam.current = camera;
  const lookAt = useRef(new THREE.Vector3(0, 1.2, 2));
  const camYaw = useRef(0);
  const camDist = useRef(CAM_DIST);
  /** 0 = hallway diorama framing, 1 = intimate in-room framing */
  const roomBlend = useRef(0);

  // --- click/tap-to-move state (additive: WASD input cancels it instantly)
  const path = useRef<THREE.Vector2[]>([]);
  const marker = useRef<{ x: number; z: number; born: number } | null>(null);
  const goTo = (x: number, z: number) => {
    const dest = new THREE.Vector2(x, z);
    resolveCollisions(dest, PLAYER_R * 1.02);
    const route = findPath(player.current, dest);
    if (!route.length) return;
    path.current = route;
    marker.current = { x: dest.x, z: dest.y, born: performance.now() };
  };



  // --- ambience audio: footsteps, idle cue, muffled music bleeding from doors
  const audio = useRef<DormAudio | null>(null);
  if (!audio.current) {
    audio.current = new DormAudio(
      ROOMS.map((r) => ({
        id: r.id,
        x: sideSign(r.side) * (HALF + 0.1),
        z: r.z,
        seed: `${r.songs[0]?.title ?? r.id}-${r.songs[0]?.artist ?? ""}`,
      })),
    );
  }
  const idleSeconds = useRef(0);
  useEffect(() => {
    const a = audio.current;
    const kick = () => a?.start();
    window.addEventListener("keydown", kick);
    window.addEventListener("pointerdown", kick);
    return () => {
      window.removeEventListener("keydown", kick);
      window.removeEventListener("pointerdown", kick);
      a?.dispose();
    };
  }, []);


  const nearbyRef = useRef<string>("");
  const activeRef = useRef<string | null>(null);
  const [nearby, setNearby] = useState<string[]>([]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const k = keys.current;

    // ---- 1. camera rig orientation, updated BEFORE movement is resolved so
    // input is always relative to the yaw the player will actually see.
    const targetYaw = Math.atan2(facing.current.x, facing.current.y);
    let dYaw = targetYaw - camYaw.current;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    camYaw.current += dYaw * (1 - Math.pow(0.25, delta));

    // camera-relative basis on the XZ plane (y deliberately zeroed: the rig
    // looks slightly downward, and that pitch must not bleed into movement)
    const fwd = new THREE.Vector2(Math.sin(camYaw.current), Math.cos(camYaw.current));
    const right = new THREE.Vector2(-fwd.y, fwd.x);

    // ---- 2. camera-relative movement
    const ix = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    const iz = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const move = new THREE.Vector2(
      fwd.x * iz + right.x * ix,
      fwd.y * iz + right.y * ix,
    );
    const keyInput = ix !== 0 || iz !== 0;
    // WASD always wins: pressing a key cancels any in-progress auto-walk
    if (keyInput) path.current = [];
    let moving = keyInput;
    if (keyInput) {
      // normalize first so diagonals aren't faster than cardinals
      move.normalize();
      const dir = move.clone();
      move.multiplyScalar(3.2 * delta);
      // doorway funnel: gently centre the walk line when squeezing through a door
      if (Math.abs(move.x) > 0.001) {
        for (const room of ROOMS) {
          const sign = sideSign(room.side);
          const distToPlane = Math.abs(player.current.x) - HALL_W / 2;
          if (
            Math.sign(player.current.x || sign) === sign &&
            distToPlane > -1.1 &&
            distToPlane < 1.1 &&
            Math.abs(player.current.y - room.z) < 1.4
          ) {
            const dz = room.z - player.current.y;
            player.current.y += THREE.MathUtils.clamp(dz, -2.5 * delta, 2.5 * delta);
          }
        }
      }
      player.current.x += move.x;
      resolveCollisions(player.current);
      player.current.y += move.y;
      resolveCollisions(player.current);
      facing.current.lerp(dir, 1 - Math.pow(0.0005, delta)).normalize();
    } else if (path.current.length) {
      // ---- 2b. click/tap auto-walk along the resolved waypoint route
      const wp = path.current[0]!;
      const to = new THREE.Vector2(wp.x - player.current.x, wp.y - player.current.y);
      const remaining = to.length();
      if (remaining < 0.12) {
        path.current.shift();
      } else {
        const dir = to.clone().normalize();
        const step = Math.min(WALK_SPEED * delta, remaining);
        player.current.x += dir.x * step;
        resolveCollisions(player.current);
        player.current.y += dir.y * step;
        resolveCollisions(player.current);
        facing.current.lerp(dir, 1 - Math.pow(0.0005, delta)).normalize();
        moving = true;
      }
    }




    if (group.current) {
      group.current.position.set(player.current.x, 0, player.current.y);
      const targetRot = Math.atan2(facing.current.x, facing.current.y);
      const cur = group.current.rotation.y;
      let diff = targetRot - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.current.rotation.y = cur + diff * (1 - Math.pow(0.0005, delta));
      const bob = moving ? Math.abs(Math.sin(performance.now() * 0.012)) * 0.06 : 0;
      // idle animation: after a few seconds standing still the character
      // settles into a slow breathing sway
      const idle = idleSeconds.current;
      const idleAmt = THREE.MathUtils.clamp((idle - 2) / 1.5, 0, 1);
      const t = performance.now() * 0.001;
      group.current.position.y = bob + idleAmt * Math.sin(t * 1.6) * 0.02;
      group.current.rotation.z = idleAmt * Math.sin(t * 0.9) * 0.02;
    }

    // ---- 3. camera placement: diorama in the hallway, intimate inside a room
    {
      // same wall-plane/room-bounds signal the proximity system rides on
      const wantRoom = roomContaining(player.current.x, player.current.y) ? 1 : 0;
      // short, deliberate lean-in/out rather than an instant cut
      const step = delta / CAM_BLEND_SECONDS;
      roomBlend.current = THREE.MathUtils.clamp(
        roomBlend.current + (wantRoom ? step : -step),
        0,
        1,
      );
      const b = roomBlend.current;
      const s = b * b * (3 - 2 * b); // smoothstep the blend curve

      let targetDist = THREE.MathUtils.lerp(CAM_DIST, ROOM_CAM_DIST, s);
      const targetHeight = THREE.MathUtils.lerp(CAM_HEIGHT, ROOM_CAM_HEIGHT, s);

      // obstruction: at the lower in-room height the boom can hit walls, so
      // pull it in until the line back to the character is clear
      if (s > 0.05) {
        const from = new THREE.Vector2(player.current.x, player.current.y);
        for (let i = 0; i < 8; i++) {
          const to = new THREE.Vector2(
            player.current.x - fwd.x * targetDist,
            player.current.y - fwd.y * targetDist,
          );
          // only enforce clearance proportionally to how "in-room" we are
          if (segmentClear(from, to, 0.45 * s)) break;
          targetDist -= 0.35;
          if (targetDist < 1.9) {
            targetDist = 1.9;
            break;
          }
        }
      }

      camDist.current = THREE.MathUtils.damp(camDist.current, targetDist, 6, delta);

      const desired = new THREE.Vector3(
        player.current.x - fwd.x * camDist.current,
        targetHeight,
        player.current.y - fwd.y * camDist.current,
      );
      // relaxed, floaty follow — observational, not a chase cam (a touch
      // tighter inside a room so the closer framing stays readable)
      const follow = THREE.MathUtils.lerp(0.06, 0.02, s);
      cam.current.position.lerp(desired, 1 - Math.pow(follow, delta));
      // keep the character comfortably framed even during heavy lag
      const maxPlanar = camDist.current * 1.35;
      const planar = new THREE.Vector2(
        cam.current.position.x - player.current.x,
        cam.current.position.z - player.current.y,
      );
      if (planar.length() > maxPlanar) {
        planar.setLength(maxPlanar);
        cam.current.position.x = player.current.x + planar.x;
        cam.current.position.z = player.current.y + planar.y;
      }
      // look target depends only on the character's position
      lookAt.current.set(player.current.x, THREE.MathUtils.lerp(1.15, 1.35, s), player.current.y);
      cam.current.lookAt(lookAt.current);
    }





    idleSeconds.current =
      audio.current?.update(moving, player.current.x, player.current.y, delta) ?? 0;

    // proximity
    const near: string[] = [];
    let closest: { key: string; d: number } | null = null;
    for (const item of INTERACTIVES) {
      const d = Math.hypot(item.x - player.current.x, item.z - player.current.y);
      if (d < 2.2) near.push(item.key);
      if (d < 1.35 && (!closest || d < closest.d)) closest = { key: item.key, d };
    }
    const sig = near.join("|");
    if (sig !== nearbyRef.current) {
      nearbyRef.current = sig;
      setNearby(near);
      onNearby(near);
    }
    const activeKey = closest ? closest.key : null;
    if (activeKey !== activeRef.current) {
      activeRef.current = activeKey;
      onActive(activeKey);
    }
  });

  return (
    <>
      <color attach="background" args={[COLORS.fog]} />
      <fog attach="fog" args={[COLORS.fog, 14, 34]} />

      <DaylightRig />


      {/* invisible ground pick-plane: click/tap anywhere walkable to walk there */}
      <mesh
        position={[0, 0.02, (HALL_START + HALL_END) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          goTo(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[40, HALL_END - HALL_START + 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <MoveMarker markerRef={marker} />

      <Structure />
      <HallwayDressing />
      <LockedDoor playerRef={player} />
      {ROOMS.map((room) => (
        <group key={room.id}>
          <RoomShell room={room} />
          <group
            onClick={(e) => {
              e.stopPropagation();
              goTo(roomCenterX(room.side), room.z);
            }}
          >
            <DoorFrame room={room} />
          </group>
        </group>
      ))}
      {INTERACTIVES.map((item) => {
        const toCentre = new THREE.Vector2(
          roomCenterX(item.room.side) - item.x,
          item.room.z - item.z,
        );
        if (toCentre.lengthSq() < 1e-4) toCentre.set(0, 1);
        toCentre.setLength(1.0);
        return (
          <group
            key={item.key}
            onClick={(e) => {
              e.stopPropagation();
              goTo(item.x + toCentre.x, item.z + toCentre.y);
            }}
          >
            {item.kind === "speaker" ? (
              <Speaker item={item} nearby={nearby.includes(item.key)} />
            ) : item.kind === "board" ? (
              <BulletinBoard item={item} nearby={nearby.includes(item.key)} />
            ) : (
              <Companion
                room={item.room}
                x={item.x}
                z={item.z}
                nearby={nearby.includes(item.key)}
              />
            )}
          </group>
        );
      })}
      <Character groupRef={group} />

    </>
  );
}

function Panel({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div className="dorm-panel" style={{ borderColor: accent }}>
      <div className="dorm-panel-title" style={{ color: accent }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function DormHallway() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = useMemo(() => INTERACTIVES.find((i) => i.key === activeKey) ?? null, [activeKey]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 52, near: 0.5, far: 140, position: [0, 10, -8.5] }}
      >
        <World onNearby={() => {}} onActive={setActiveKey} />
      </Canvas>

      <div className="pointer-events-none absolute left-6 top-6 select-none">
        <h1 className="dorm-title">Dorm Hallway</h1>
        <p className="dorm-sub">Click anywhere to walk · WASD also works</p>
      </div>

      {active && active.kind === "speaker" && (
        <div className="dorm-overlay">
          <Panel accent={active.room.accent} title={`${active.room.name} — Top 5`}>
            <ol className="dorm-songs">
              {active.room.songs.map((s, i) => (
                <li key={s.title}>
                  <span className="dorm-rank" style={{ background: active.room.accent }}>
                    {i + 1}
                  </span>
                  <span className="dorm-song">{s.title}</span>
                  <span className="dorm-artist">{s.artist}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}

      {active && active.kind === "companion" && (
        <div className="dorm-overlay">
          <Panel
            accent={active.room.accent}
            title={`${active.room.name} — ${active.room.companion.type === "pet" ? "Pet" : "Plant"}`}
          >
            <div className="dorm-companion">
              <span className="dorm-companion-name">{active.room.companion.name}</span>
              <span className="dorm-companion-blurb">{active.room.companion.blurb}</span>
              <em className="dorm-tag" style={{ background: active.room.accent }}>
                {active.room.companion.variant}
              </em>
            </div>
          </Panel>
        </div>
      )}

      {active && active.kind === "board" && (
        <div className="dorm-overlay">
          <Panel accent={active.room.accent} title={`${active.room.name} — Bulletin`}>
            <ul className="dorm-bulletin">
              {active.room.bulletin.map((b) => (
                <li key={b.text}>
                  {b.image && (
                    <img
                      src={b.image}
                      alt={b.text}
                      loading="lazy"
                      width={512}
                      height={640}
                      className="dorm-flyer"
                    />
                  )}
                  <span>
                    {b.kind === "event" && (
                      <em className="dorm-tag" style={{ background: active.room.accent }}>
                        event
                      </em>
                    )}
                    {b.text}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

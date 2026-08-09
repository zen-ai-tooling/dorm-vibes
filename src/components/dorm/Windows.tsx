import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HALL_W, HALL_H, WALL_T, sideSign } from "@/lib/dorm-data";
import { daylightState } from "./Daylight";

const HALF = HALL_W / 2;
const WALL_CX = HALF + WALL_T / 2;

export type WindowSpec = {
  z: number;
  side: "left" | "right";
};

/** Hallway windows sit between doorways, on wall runs with no room behind. */
export const WINDOWS: WindowSpec[] = [
  { z: 2.4, side: "right" },
  { z: 15, side: "right" },
  { z: 22.5, side: "right" },
];

export const WIN_W = 1.4;
export const WIN_SILL = 1.05;
export const WIN_TOP = 2.4;

type Panel = { cx: number; cy: number; cz: number; sx: number; sy: number; sz: number };

/**
 * Split a solid wall box into panels that leave rectangular window openings.
 * Collision geometry is untouched — this only affects what is drawn.
 */
export function wallPanels(w: {
  cx: number;
  cz: number;
  sx: number;
  sz: number;
}): Panel[] {
  const isHallRun = Math.abs(Math.abs(w.cx) - WALL_CX) < 1e-6 && Math.abs(w.sx - WALL_T) < 1e-6;
  const side = w.cx < 0 ? "left" : "right";
  const z0 = w.cz - w.sz / 2;
  const z1 = w.cz + w.sz / 2;
  const cuts = isHallRun
    ? WINDOWS.filter(
        (win) => win.side === side && win.z - WIN_W / 2 > z0 + 0.15 && win.z + WIN_W / 2 < z1 - 0.15,
      )
    : [];

  if (cuts.length === 0) {
    return [{ cx: w.cx, cy: HALL_H / 2, cz: w.cz, sx: w.sx, sy: HALL_H, sz: w.sz }];
  }

  const panels: Panel[] = [];
  let cursor = z0;
  for (const win of cuts.sort((a, b) => a.z - b.z)) {
    const a = win.z - WIN_W / 2;
    const b = win.z + WIN_W / 2;
    if (a > cursor) {
      panels.push({
        cx: w.cx,
        cy: HALL_H / 2,
        cz: (cursor + a) / 2,
        sx: w.sx,
        sy: HALL_H,
        sz: a - cursor,
      });
    }
    // below the sill
    panels.push({
      cx: w.cx,
      cy: WIN_SILL / 2,
      cz: win.z,
      sx: w.sx,
      sy: WIN_SILL,
      sz: WIN_W,
    });
    // above the head
    panels.push({
      cx: w.cx,
      cy: (WIN_TOP + HALL_H) / 2,
      cz: win.z,
      sx: w.sx,
      sy: HALL_H - WIN_TOP,
      sz: WIN_W,
    });
    cursor = b;
  }
  if (cursor < z1) {
    panels.push({
      cx: w.cx,
      cy: HALL_H / 2,
      cz: (cursor + z1) / 2,
      sx: w.sx,
      sy: HALL_H,
      sz: z1 - cursor,
    });
  }
  return panels;
}

/** Frame + sky panel + floor light patch for one window. */
function HallWindow({ spec }: { spec: WindowSpec }) {
  const sky = useRef<THREE.MeshBasicMaterial>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);
  const shaft = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);


  useFrame(() => {
    if (sky.current) {
      sky.current.color
        .copy(daylightState.skyColor)
        .multiplyScalar(0.55 + daylightState.skyEmissive * 0.7);
    }
    if (shaft.current) {
      shaft.current.color.copy(daylightState.shaftColor);
      shaft.current.opacity = daylightState.shaftOpacity;
    }
    if (glow.current) {
      glow.current.color.copy(daylightState.shaftColor);
      glow.current.intensity = 1.5 + daylightState.shaftOpacity * 8;
    }
  });

  const sign = sideSign(spec.side);
  // frame sits on the hallway-side face of the wall so it does not occlude the
  // sky panel when the window is viewed at a grazing angle down the hallway
  const x = sign * (HALF + 0.07);
  const cy = (WIN_SILL + WIN_TOP) / 2;
  const h = WIN_TOP - WIN_SILL;

  return (
    <group>
      {/* sill + head + jambs, sunk slightly into the wall run so no face is
          coplanar with the wall surface */}
      <mesh position={[x, WIN_SILL + 0.03, spec.z]}>
        <boxGeometry args={[0.18, 0.12, WIN_W + 0.2]} />
        <meshStandardMaterial color={COLORS.trim} />
      </mesh>
      <mesh position={[x, WIN_TOP - 0.03, spec.z]}>
        <boxGeometry args={[0.16, 0.1, WIN_W + 0.2]} />
        <meshStandardMaterial color={COLORS.trim} />
      </mesh>
      {[-1, 1].map((dz) => (
        <mesh key={dz} position={[x, cy, spec.z + dz * (WIN_W / 2 - 0.03)]}>
          <boxGeometry args={[0.16, h, 0.1]} />
          <meshStandardMaterial color={COLORS.trim} />
        </mesh>
      ))}
      {/* mullions — one vertical + two horizontal dividers make a 2x3 grid */}
      <mesh position={[x, cy, spec.z]}>
        <boxGeometry args={[0.1, h, 0.06]} />
        <meshStandardMaterial color={COLORS.trim} />
      </mesh>
      {[-1, 1].map((dy) => (
        <mesh key={`m${dy}`} position={[x, cy + dy * (h / 6), spec.z]}>
          <boxGeometry args={[0.1, 0.05, WIN_W - 0.06]} />
          <meshStandardMaterial color={COLORS.trim} />
        </mesh>
      ))}

      {/* glass pane — cool, light and translucent so the sky reads through */}
      <mesh position={[sign * (HALF + WALL_T / 2), cy, spec.z]} rotation={[0, sign * -Math.PI / 2, 0]}>
        <planeGeometry args={[WIN_W - 0.06, h - 0.06]} />
        <meshPhysicalMaterial
          ref={glass}
          color="#D7ECF5"
          transparent
          opacity={0.2}
          roughness={0.08}
          metalness={0}
          transmission={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* soft diagonal reflection streak across the glass */}
      <mesh
        position={[sign * (HALF + WALL_T / 2 - sign * 0.01), cy, spec.z]}
        rotation={[0, sign * -Math.PI / 2, 0.62]}
      >
        <planeGeometry args={[WIN_W * 0.32, h * 1.8]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* distant low-poly rooftops + soft clouds, seen through the glass */}
      <group position={[sign * (HALF + WALL_T + 0.045), 0, spec.z]}>
        {[-0.55, -0.2, 0.15, 0.5].map((dz, i) => (
          <mesh key={`r${i}`} position={[0, WIN_SILL + 0.14 + (i % 2 ? 0.1 : 0), dz]}>
            <planeGeometry args={[0.34, 0.28 + (i % 2 ? 0.12 : 0)]} />
            <meshBasicMaterial color="#7A5A50" toneMapped={false} fog={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {[
          [-0.4, WIN_TOP - 0.22, 0.42],
          [0.35, WIN_TOP - 0.34, 0.3],
        ].map((c, i) => (
          <mesh key={`c${i}`} position={[0, c[1]!, c[0]!]} rotation={[0, sign * -Math.PI / 2, 0]}>
            <circleGeometry args={[c[2]! * 0.5, 10]} />
            <meshBasicMaterial
              color="#FFF3E2"
              transparent
              opacity={0.55}
              toneMapped={false}
              fog={false}
            />
          </mesh>
        ))}
      </group>

      {/* sky panel just outside the opening */}
      <mesh position={[sign * (HALF + WALL_T + 0.06), cy + 0.05, spec.z]} rotation={[0, sign * -Math.PI / 2, 0]}>
        <planeGeometry args={[WIN_W * 3.2, h * 3.2]} />
        <meshBasicMaterial ref={sky} color="#F5A860" toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>

      {/* cozy detail: a tiny potted plant on the sill */}
      <group position={[x - sign * 0.02, WIN_SILL + 0.09, spec.z + WIN_W / 2 - 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#C0714F" />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <icosahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial color="#5E8C5A" flatShading />
        </mesh>
      </group>



      {/* warm patch of daylight on the hallway floor */}
      <mesh
        position={[sign * (HALF - 0.85), 0.03, spec.z + 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[1.9, WIN_W + 1.1]} />
        <meshBasicMaterial ref={shaft} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight ref={glow} position={[sign * (HALF - 0.5), 1.7, spec.z]} distance={5.5} decay={2} />
    </group>
  );
}

export function HallwayWindows() {
  return (
    <group>
      {WINDOWS.map((w) => (
        <HallWindow key={`${w.side}-${w.z}`} spec={w} />
      ))}
    </group>
  );
}

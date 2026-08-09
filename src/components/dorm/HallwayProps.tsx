import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SoftBox, GroundAO, jitter } from "./soft";
import {
  COLORS,
  HALL_W,
  HALL_H,
  WALL_T,
  HALL_START,
  HALL_END,
  COMMUNITY_BOARD,
  VENDING,
  LOST_AND_FOUND,
  sideSign,
} from "@/lib/dorm-data";
import { Basic, Std } from "./materials";

const HALF = HALL_W / 2;

/** Community corkboard — dorm-wide notices, mounted flat on a wall segment. */
export function CommunityBoard() {
  const sign = sideSign(COMMUNITY_BOARD.side);
  const z = COMMUNITY_BOARD.z;
  const x = sign * (HALF - 0.06);
  return (
    <group position={[x, 0, z]} rotation={[0, sign === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      {/* frame */}
      <SoftBox position={[0, 1.7, 0]} args={[2.2, 1.4, 0.1]} radius={0.045}>
        <Std color={COLORS.trim} roughness={0.95} />
      </SoftBox>
      {/* cork face */}
      <SoftBox position={[0, 1.7, 0.07]} args={[2, 1.2, 0.04]} radius={0.018}>
        <Std color="#C08E55" roughness={1} />
      </SoftBox>
      {/* pinned paper slips */}
      {[
        [-0.62, 1.95, 0.1],
        [0.05, 2.0, -0.08],
        [0.66, 1.62, 0.06],
        [-0.3, 1.4, -0.05],
      ].map((p, i) => (
        <SoftBox
          key={i}
          position={[p[0]!, p[1]!, 0.11]}
          rotation={[0, 0, p[2]! + jitter(`slip${i}`, 0.06)]}
          args={[0.46, 0.34, 0.02]}
          radius={0.008}
         
        >
          <Std color={i % 2 ? "#FBF6EA" : "#F2E8D5"} roughness={1} />
        </SoftBox>
      ))}
      {/* small header sign */}
      <SoftBox position={[0, 2.5, 0]} args={[1.1, 0.22, 0.12]} radius={0.05}>
        <Std color="#7C9C8B" roughness={0.9} />
      </SoftBox>
      <Html position={[0, 2.5, 0.1]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <div className="dorm-plaque" style={{ borderColor: "#7C9C8B" }}>
          Floor Board
        </div>
      </Html>
      <Html position={[0, 1.7, 0.14]} center distanceFactor={3.4} zIndexRange={[9, 0]}>
        <div className="dorm-corkboard">
          {COMMUNITY_BOARD.items.map((it) => (
            <div className="dorm-corknote" key={it.text}>
              {it.image && (
                <img
                  src={it.image}
                  alt={it.text}
                  loading="lazy"
                  width={512}
                  height={640}
                  className="dorm-corkflyer"
                />
              )}
              <span>{it.text}</span>
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}

/** Chunky low-poly vending machine flush against a wall segment. */
export function VendingMachine() {
  const sign = sideSign(VENDING.side);
  const x = sign * (HALF - 0.36);
  const z = VENDING.z;
  return (
    <group position={[x, 0, z]}>
      <GroundAO size={1.9} depth={2.1} opacity={0.5} />
      <SoftBox position={[0, 0.95, 0]} args={[0.66, 1.9, 1.1]} radius={0.13} castShadow receiveShadow>
        <Std color="#3E6B63" roughness={0.85} />
      </SoftBox>
      {/* glass front */}
      <SoftBox position={[-sign * 0.3, 1.15, 0.06]} args={[0.08, 1.2, 0.8]} radius={0.035}>
        <Std color="#BFE3DC" transparent opacity={0.55} roughness={0.4} />
      </SoftBox>
      {/* snack rows */}
      {[0, 1, 2].map((r) =>
        [-1, 0, 1].map((c) => (
          <SoftBox
            key={`${r}-${c}`}
            position={[-sign * 0.26, 1.55 - r * 0.34, c * 0.24]}
            rotation={[jitter(`snack${r}${c}`, 0.08), 0, jitter(`snackz${r}${c}`, 0.1)]}
            args={[0.1, 0.2, 0.16]}
            radius={0.035}
           
          >
            <Std color={["#E07A5F", "#F2CC8F", "#9B6BC7"][(r + c + 3) % 3]!} roughness={0.9} />
          </SoftBox>
        )),
      )}
      {/* dispensing tray */}
      <SoftBox position={[-sign * 0.3, 0.36, 0]} args={[0.08, 0.28, 0.7]} radius={0.035}>
        <Std color="#22322F" roughness={0.95} />
      </SoftBox>
      {/* glow strip */}
      <SoftBox position={[-sign * 0.32, 1.82, 0]} args={[0.05, 0.12, 0.9]} radius={0.024}>
        <Std color="#FFF0C4" emissive="#FFD07A" emissiveIntensity={1.1} />
      </SoftBox>
      <pointLight position={[-sign * 0.7, 1.5, 0]} color="#BFE3DC" intensity={2.2} distance={3.2} decay={2} />
    </group>
  );
}

/** Lost-and-found bin tucked near the closed end of the hallway. */
export function LostAndFound() {
  const sign = sideSign(LOST_AND_FOUND.side);
  const x = sign * (HALF - 0.42);
  const z = LOST_AND_FOUND.z;
  return (
    <group position={[x, 0, z]}>
      <GroundAO size={1.6} depth={1.8} opacity={0.45} />
      <SoftBox position={[0, 0.3, 0]} args={[0.7, 0.6, 0.9]} radius={0.14} receiveShadow>
        <Std color="#8C6A4A" roughness={0.95} />
      </SoftBox>
      {/* rim */}
      <mesh position={[0, 0.63, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.25, 1]}>
        <torusGeometry args={[0.36, 0.045, 6, 20]} />
        <Std color={COLORS.trim} roughness={0.9} />
      </mesh>
      {/* spilling-over odds and ends */}
      <SoftBox position={[-sign * 0.12, 0.74, 0.18]} rotation={[0.06, 0.4, 0.2]} args={[0.3, 0.16, 0.34]} radius={0.06}>
        <Std color="#E07A5F" roughness={0.95} />
      </SoftBox>
      <SoftBox position={[sign * 0.1, 0.72, -0.2]} rotation={[0.2, -0.3, 0.05]} args={[0.26, 0.12, 0.26]} radius={0.05}>
        <Std color="#4A9B8E" roughness={0.95} />
      </SoftBox>
      <SoftBox position={[0, 0.78, -0.02]} rotation={[0.04, 0.8, 0.1]} args={[0.22, 0.2, 0.2]} radius={0.07}>
        <Std color="#F2CC8F" roughness={0.95} />
      </SoftBox>
      {/* handwritten tag */}
      <SoftBox position={[-sign * 0.36, 0.36, 0]} rotation={[0, sign === -1 ? Math.PI / 2 : -Math.PI / 2, 0.05]} args={[0.42, 0.24, 0.02]} radius={0.009}>
        <Std color="#FBF6EA" roughness={1} />
      </SoftBox>
      <Html
        position={[-sign * 0.4, 0.36, 0]}
        rotation={[0, sign === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
        center
        distanceFactor={6}
        zIndexRange={[8, 0]}
      >
        <div className="dorm-plaque" style={{ borderColor: "#8C6A4A" }}>
          Lost &amp; Found
        </div>
      </Html>
    </group>
  );
}

/**
 * Decorative warm fairy lights strung down the ceiling. Deliberately dim —
 * the door lights and key light still do the real work.
 */
export function StringLights() {
  const ref = useRef<THREE.Group>(null);

  // Anchor points along the ceiling; the wire sags between them like a real
  // strand drooping under its own weight (catenary-ish cosh curve).
  const SPAN = 5;
  const SAG = 0.42;
  const anchorY = HALL_H - 0.12;
  const spans = Math.max(1, Math.floor((HALL_END - HALL_START - 1.6) / SPAN));
  const z0 = HALL_START + 0.8;

  /** normalized 0..1 across a span → downward droop */
  const droop = (u: number) => {
    const k = 2.2;
    return (SAG * (Math.cosh(k * (u - 0.5)) - Math.cosh(k * 0.5))) / (1 - Math.cosh(k * 0.5));
  };

  const SEGS = 18;
  const wire: { p: THREE.Vector3; len: number; pitch: number }[] = [];
  const bulbs: { x: number; y: number; z: number; i: number }[] = [];
  let bulbIndex = 0;

  for (let s = 0; s < spans; s++) {
    const za = z0 + s * SPAN;
    const x = s % 2 === 0 ? -0.35 : 0.35;
    const xn = (s + 1) % 2 === 0 ? -0.35 : 0.35;
    const pt = (u: number) =>
      new THREE.Vector3(
        THREE.MathUtils.lerp(x, xn, u),
        anchorY - droop(u),
        za + u * SPAN,
      );
    for (let i = 0; i < SEGS; i++) {
      const a = pt(i / SEGS);
      const b = pt((i + 1) / SEGS);
      const mid = a.clone().lerp(b, 0.5);
      const len = a.distanceTo(b);
      wire.push({ p: mid, len, pitch: Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)) });
    }
    // evenly spaced bulbs hanging just under the sag
    const perSpan = 5;
    for (let i = 1; i <= perSpan; i++) {
      const u = i / (perSpan + 1);
      const p = pt(u);
      bulbs.push({ x: p.x, y: p.y - 0.09, z: p.z, i: bulbIndex++ });
    }
  }

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && "emissiveIntensity" in mat) {
        mat.emissiveIntensity = 1.0 + Math.sin(t * 1.2 + i * 0.6) * 0.22;
      }
    });
  });

  return (
    <group>
      {/* the wire: many short smooth segments tracing the sagging curve */}
      {wire.map((w, i) => {
        const yaw = Math.atan2(
          // orient along the span direction (mostly +z)
          0,
          1,
        );
        return (
          <mesh key={`w${i}`} position={[w.p.x, w.p.y, w.p.z]} rotation={[-w.pitch + Math.PI / 2, yaw, 0]}>
            <cylinderGeometry args={[0.009, 0.009, w.len + 0.01, 5]} />
            <Std color="#6B5340" />
          </mesh>
        );
      })}
      <group ref={ref}>
        {bulbs.map((b) => (
          <mesh key={b.i} position={[b.x, b.y, b.z]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial
              color="#FFF3D6"
              emissive="#FFC169"
              emissiveIntensity={1.0}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* tight halo shell — barely larger than the bulb, just enough to soften
          its edge; never large enough to occlude the hallway or character */}
      {bulbs.map((b) => (
        <mesh key={`h${b.i}`} position={[b.x, b.y, b.z]} renderOrder={-1}>
          <sphereGeometry args={[0.062, 8, 6]} />
          <Basic
            color="#FFCE95"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* a few sparse, very soft pools so the strand reads as light-emitting
          without competing with the door lamps */}
      {bulbs
        .filter((_, i) => i % 5 === 2)
        .map((b) => (
          <pointLight
            key={`l${b.i}`}
            position={[b.x, b.y - 0.15, b.z]}
            color="#FFCE95"
            intensity={1.5}
            distance={4}
            decay={2}
          />
        ))}
    </group>
  );
}


export function HallwayDressing() {
  return (
    <group>
      <CommunityBoard />
      <VendingMachine />
      <LostAndFound />
      <StringLights />
      {/* a little clutter so the far end doesn't read as empty geometry */}
      <SoftBox
        position={[-(HALF - 0.25), 0.22, HALL_END - 6]}
        rotation={[0, 0.14, 0]}
        args={[0.4, 0.44, 0.6]}
        radius={0.09}
       
      >
        <Std color="#9C8264" roughness={0.95} />
      </SoftBox>
      <mesh position={[0, HALL_H / 2, HALL_START + 0.01]} visible={false}>
        <boxGeometry args={[HALL_W, HALL_H, WALL_T]} />
        <Std color={COLORS.wall} />
      </mesh>
    </group>
  );
}

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SoftBox } from "./soft";
import { HALL_W, HALL_H, WALL_T, DOOR_W, DOOR_H } from "@/lib/dorm-data";

const HALF = HALL_W / 2;
const WALL_CX = HALF + WALL_T / 2;

/**
 * Placeholder door far down the hallway, deep in the fog band (fog is 14..34,
 * so at z = 25 it reads as a silhouette). Purely dressing: no room shell, no
 * collision change (the hallway wall run is unbroken here), no interaction.
 */
export const LOCKED_DOOR = { z: 25, side: "right" as const };
const SIGN = 1; // right wall
const NEARBY = 2.2; // same range the interactive objects use

const DEAD = "#6E6A63"; // desaturated grey-brown, deliberately not an accent
const DEAD_DARK = "#4A4741";

export function LockedDoor({
  playerRef,
}: {
  playerRef: MutableRefObject<THREE.Vector2>;
}) {
  const x = SIGN * WALL_CX;
  const z = LOCKED_DOOR.z;
  const glow = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    const p = playerRef.current;
    const d = Math.hypot(SIGN * HALF - p.x, z - p.y);
    const target = d < NEARBY ? 0.55 : 0;
    if (glowMat.current) {
      glowMat.current.opacity = THREE.MathUtils.damp(
        glowMat.current.opacity,
        target,
        4,
        delta,
      );
    }
    if (glow.current) {
      glow.current.position.y = 2.45 + Math.sin(clock.elapsedTime * 1.6) * 0.05;
      glow.current.visible = (glowMat.current?.opacity ?? 0) > 0.01;
    }
  });

  return (
    <group>
      {/* recessed doorway panel, flush against the (unbroken) wall run */}
      <SoftBox position={[SIGN * (HALF - 0.03), DOOR_H / 2, z]} args={[0.06, DOOR_H, DOOR_W]} radius={0.028}>
        <meshStandardMaterial color={DEAD_DARK} roughness={0.95} />
      </SoftBox>
      {/* dull frame — sunk into the wall so nothing is coplanar */}
      {[-1, 1].map((dz) => (
        <SoftBox
          key={dz}
          position={[x, DOOR_H / 2, z + dz * (DOOR_W / 2 + 0.02)]}
          args={[WALL_T + 0.02, DOOR_H, 0.12]}
          radius={0.05}
        >
          <meshStandardMaterial color={DEAD} roughness={0.95} />
        </SoftBox>
      ))}
      <SoftBox position={[x, DOOR_H + 0.05, z]} args={[WALL_T + 0.02, 0.14, DOOR_W + 0.24]} radius={0.06}>
        <meshStandardMaterial color={DEAD} roughness={0.95} />
      </SoftBox>
      {/* dark, unlit fixture above the door (no point light — reads unoccupied) */}
      <SoftBox position={[SIGN * (HALF - 0.12), 2.55, z]} args={[0.16, 0.22, 0.5]} radius={0.07}>
        <meshStandardMaterial color={DEAD_DARK} roughness={0.95} />
      </SoftBox>
      {/* padlock hint on the panel */}
      <SoftBox position={[SIGN * (HALF - 0.08), 1.15, z]} args={[0.05, 0.22, 0.18]} radius={0.024}>
        <meshStandardMaterial color="#8C877E" metalness={0.3} roughness={0.6} />
      </SoftBox>

      {/* nearby-only soft glow marker (space reserved for a future label) */}
      <mesh ref={glow} position={[SIGN * (HALF - 0.25), 2.45, z]} rotation={[0, -Math.PI / 2, 0]} visible={false}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial
          ref={glowMat}
          color="#CFE3E0"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

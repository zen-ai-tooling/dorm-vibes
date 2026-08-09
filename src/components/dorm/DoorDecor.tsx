import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SoftBox } from "./soft";
import type { StickerId } from "@/lib/dorm-data";

/**
 * Flat low-poly decals. Each entry draws in the local XY plane; the caller
 * positions/rotates the cluster onto a door panel.
 */
function StickerShape({ id, color }: { id: StickerId; color: string }) {
  switch (id) {
    case "note":
      return (
        <group>
          <mesh position={[0.05, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.012, 0.14, 1, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.02, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.008, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.09, 0.09, 0]} rotation={[0, 0, -0.4 + Math.PI / 2]}>
            <capsuleGeometry args={[0.014, 0.06, 1, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "star":
      return (
        <group>
          {[0, 1].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4 + Math.PI / 8 + Math.PI / 2]}>
              <capsuleGeometry args={[0.026, 0.11, 1, 6]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    case "paw":
      return (
        <group>
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.008, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {[-1, 0, 1].map((s) => (
            <mesh key={s} position={[s * 0.055, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.024, 0.008, 6]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    case "heart":
      return (
        <group rotation={[0, 0, Math.PI / 4]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.05, 0.05, 1, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[-0.05, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.008, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.05, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.008, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "planet":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.008, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh rotation={[0, 0, 0.5]}>
            <torusGeometry args={[0.1, 0.012, 4, 14]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "leaf":
    default:
      return (
        <group>
          <mesh rotation={[0, 0, 0.6]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[-0.06, -0.06, 0]} rotation={[0, 0, 0.8 + Math.PI / 2]}>
            <capsuleGeometry args={[0.008, 0.07, 1, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
  }
}

/** Loose, non-grid cluster offsets (x, y, rotation) for up to 3 decals. */
const CLUSTER: [number, number, number][] = [
  [-0.28, 0.34, -0.18],
  [0.22, 0.02, 0.24],
  [-0.1, -0.36, 0.1],
];

const DECAL_COLORS = ["#FBF6EA", "#F2CC8F", "#BFE3DC"];

export function DoorStickers({ stickers }: { stickers: StickerId[] }) {
  return (
    <group>
      {stickers.slice(0, 3).map((id, i) => {
        const c = CLUSTER[i] ?? CLUSTER[0]!;
        return (
          <group key={`${id}-${i}`} position={[c[0], c[1], 0]} rotation={[0, 0, c[2]]}>
            <StickerShape id={id} color={DECAL_COLORS[i % DECAL_COLORS.length]!} />
          </group>
        );
      })}
    </group>
  );
}

/**
 * "Now playing" indicator near the door frame. Reads a plain boolean today;
 * a real presence signal can replace that prop with no visual changes.
 */
export function NowPlayingPulse({ active, accent }: { active: boolean; accent: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const p = active ? 0.5 + Math.sin(clock.elapsedTime * 2.4) * 0.5 : 0;
    if (mat.current) mat.current.emissiveIntensity = 0.15 + p * 1.9;
    if (light.current) light.current.intensity = p * 2.4;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial
          ref={mat}
          color={active ? accent : "#5A5751"}
          emissive={accent}
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
      {active && <pointLight ref={light} color={accent} distance={2.2} decay={2} intensity={0} />}
    </group>
  );
}

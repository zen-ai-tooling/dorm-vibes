import { useRef, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CompanionVariant, Room } from "@/lib/dorm-data";
import { SoftBox, GroundAO, jitter } from "./soft";
import { Std } from "./materials";

/**
 * Low-poly companion models, keyed by the variant identifier in the room's
 * `companion` config. Adding a new variant = adding an entry here; no
 * room-specific JSX anywhere.
 *
 * Shape language: rounded/beveled volumes only — spheres, capsules, cones and
 * SoftBoxes — so nothing reads as a hard cube at diorama distance.
 */
function Succulent({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.24, 8]} />
        <Std color="#C97B52" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Std color={accent} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.2;
        const lean = 0.5 + jitter(`suc${i}`, 0.12);
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.08, 0.34, Math.sin(a) * 0.08]}
            rotation={[Math.cos(a) * lean, 0, -Math.sin(a) * lean]}
            scale={[1, 1, 1]}
           
          >
            <capsuleGeometry args={[0.05, 0.16, 2, 8]} />
            <Std color="#5F9E63" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.055, 0.14, 2, 8]} />
        <Std color="#6FB177" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Fern({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.28, 8]} />
        <Std color={accent} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.165, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Std color="#4B3323" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.35;
        const lean = 0.8 + jitter(`fern${i}`, 0.16);
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.14, 0.46, Math.sin(a) * 0.14]}
            rotation={[Math.cos(a) * lean, 0, -Math.sin(a) * lean]}
            scale={[1, 1, 0.35]}
           
          >
            <capsuleGeometry args={[0.05, 0.34, 2, 8]} />
            <Std color={i % 2 ? "#4F8B57" : "#63A46B"} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cat({ accent }: { accent: string }) {
  return (
    <group>
      {/* loaf body — capsule, not a box */}
      <mesh position={[0, 0.17, 0]} scale={[1, 0.82, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.22, 3, 12]} />
        <Std color="#6B6560" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.34, 0.2]} scale={[1, 0.95, 0.95]}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <Std color="#7A736D" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.45, 0.2]} rotation={[0, 0, s * 0.12]}>
          <coneGeometry args={[0.055, 0.12, 8]} />
          <Std color="#7A736D" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, -0.26]} rotation={[0.6, 0, 0]}>
        <capsuleGeometry args={[0.032, 0.26, 2, 8]} />
        <Std color="#6B6560" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.3, 0.3]} scale={[1.6, 0.5, 0.4]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <Std color={accent} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Dog({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.21, 0]} scale={[1, 0.86, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.17, 0.26, 3, 12]} />
        <Std color="#B0885C" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.4, 0.26]} scale={[1, 0.95, 0.95]}>
        <sphereGeometry args={[0.14, 14, 10]} />
        <Std color="#C09468" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.35, 0.39]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.075, 12, 10]} />
        <Std color="#5C4433" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.14, 0.42, 0.25]}
          rotation={[0, 0, s * 0.2]}
          scale={[0.45, 1, 0.8]}
         
        >
          <capsuleGeometry args={[0.06, 0.1, 2, 8]} />
          <Std color="#8E6A45" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.36, -0.3]} rotation={[0.8, 0, 0]}>
        <capsuleGeometry args={[0.038, 0.2, 2, 8]} />
        <Std color="#B0885C" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.33, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.135, 0.026, 6, 16]} />
        <Std color={accent} roughness={0.8} />
      </mesh>
    </group>
  );
}

const MODELS: Record<CompanionVariant, (p: { accent: string }) => ReactElement> = {
  succulent: Succulent,
  fern: Fern,
  cat: Cat,
  dog: Dog,
};

/** Small shelf/plinth the companion sits on, tucked into a room corner. */
export function Companion({
  room,
  x,
  z,
  nearby,
}: {
  room: Room;
  x: number;
  z: number;
  nearby: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const cfg = room.companion;
  const Model = MODELS[cfg.variant] ?? Succulent;
  // hand-placed feel: the plinth sits a hair off-axis, same every load
  const skew = jitter(`plinth-${room.id}`, 0.07);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (marker.current) marker.current.position.y = 1.55 + Math.sin(t * 2 + 2) * 0.06;
    if (!body.current) return;
    if (cfg.type === "plant") {
      // slow sway
      body.current.rotation.z = Math.sin(t * 0.7) * 0.05;
      body.current.position.y = 0.72 + Math.sin(t * 0.9) * 0.012;
    } else {
      // occasional twitch: mostly still, small motion in short bursts
      const cycle = (t % 6) / 6;
      const burst = cycle > 0.82 ? Math.sin((cycle - 0.82) * 40) : 0;
      body.current.rotation.y = burst * 0.12;
      body.current.position.y = 0.72 + Math.abs(Math.sin(t * 1.1)) * 0.01;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <GroundAO size={1.5} opacity={0.42} />
      {/* plinth / shelf — rotated a few degrees so it doesn't read grid-snapped */}
      <group rotation={[0, skew, 0]}>
        <SoftBox position={[0, 0.34, 0]} args={[0.7, 0.68, 0.7]} radius={0.09} receiveShadow>
          <Std color="#8C6A4A" roughness={0.95} />
        </SoftBox>
        <SoftBox position={[0, 0.7, 0]} args={[0.8, 0.07, 0.8]} radius={0.03} receiveShadow>
          <Std color={room.accent} roughness={0.85} />
        </SoftBox>
        <group ref={body} position={[0, 0.72, 0]} userData={{ dynamic: true }}>
          <Model accent={room.accent} />
        </group>
      </group>
      {nearby && (
        <group ref={marker}>
          <pointLight color={room.accent} intensity={4} distance={3} />
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <Std
              color={room.accent}
              emissive={room.accent}
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

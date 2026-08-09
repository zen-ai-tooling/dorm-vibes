import { useRef, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CompanionVariant, Room } from "@/lib/dorm-data";

/**
 * Low-poly companion models, keyed by the variant identifier in the room's
 * `companion` config. Adding a new variant = adding an entry here; no
 * room-specific JSX anywhere.
 */
function Succulent({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.24, 6]} />
        <meshStandardMaterial color="#C97B52" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 6]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.08, 0.34, Math.sin(a) * 0.08]}
            rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
            castShadow
          >
            <coneGeometry args={[0.06, 0.22, 5]} />
            <meshStandardMaterial color="#5F9E63" />
          </mesh>
        );
      })}
      <mesh position={[0, 0.4, 0]} castShadow>
        <coneGeometry args={[0.06, 0.2, 5]} />
        <meshStandardMaterial color="#6FB177" />
      </mesh>
    </group>
  );
}

function Fern({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.28, 6]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.14, 0.46, Math.sin(a) * 0.14]}
            rotation={[Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8]}
            castShadow
          >
            <boxGeometry args={[0.07, 0.42, 0.02]} />
            <meshStandardMaterial color={i % 2 ? "#4F8B57" : "#63A46B"} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cat({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.28, 0.22, 0.5]} />
        <meshStandardMaterial color="#6B6560" />
      </mesh>
      <mesh position={[0, 0.34, 0.2]} castShadow>
        <boxGeometry args={[0.24, 0.22, 0.22]} />
        <meshStandardMaterial color="#7A736D" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.47, 0.2]} castShadow>
          <coneGeometry args={[0.06, 0.12, 4]} />
          <meshStandardMaterial color="#7A736D" />
        </mesh>
      ))}
      <mesh position={[0, 0.3, -0.3]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.34]} />
        <meshStandardMaterial color="#6B6560" />
      </mesh>
      <mesh position={[0, 0.3, 0.31]}>
        <boxGeometry args={[0.1, 0.05, 0.02]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

function Dog({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.32, 0.26, 0.56]} />
        <meshStandardMaterial color="#B0885C" />
      </mesh>
      <mesh position={[0, 0.4, 0.26]} castShadow>
        <boxGeometry args={[0.26, 0.24, 0.24]} />
        <meshStandardMaterial color="#C09468" />
      </mesh>
      <mesh position={[0, 0.34, 0.4]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.12]} />
        <meshStandardMaterial color="#5C4433" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 0.44, 0.26]} castShadow>
          <boxGeometry args={[0.05, 0.2, 0.14]} />
          <meshStandardMaterial color="#8E6A45" />
        </mesh>
      ))}
      <mesh position={[0, 0.36, -0.32]} rotation={[0.7, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.26]} />
        <meshStandardMaterial color="#B0885C" />
      </mesh>
      <mesh position={[0, 0.32, 0.28]}>
        <boxGeometry args={[0.28, 0.06, 0.24]} />
        <meshStandardMaterial color={accent} />
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
      {/* plinth / shelf */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.68, 0.7]} />
        <meshStandardMaterial color="#8C6A4A" />
      </mesh>
      <mesh position={[0, 0.7, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.06, 0.8]} />
        <meshStandardMaterial color={room.accent} />
      </mesh>
      <group ref={body} position={[0, 0.72, 0]}>
        <Model accent={room.accent} />
      </group>
      {nearby && (
        <group ref={marker}>
          <pointLight color={room.accent} intensity={4} distance={3} />
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
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

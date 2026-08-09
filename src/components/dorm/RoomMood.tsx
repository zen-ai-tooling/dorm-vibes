import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM_SIZE, roomCenterX, sideSign, type Room } from "@/lib/dorm-data";
import { deriveMood } from "@/lib/room-mood";

const SPREAD = ROOM_SIZE - 1.2;
const dummy = new THREE.Object3D();

/**
 * Per-room atmosphere: a soft tint fill light plus one batched particle
 * system, both chosen by the room's derived mood. Layers on top of the
 * global time-of-day rig — it never replaces it.
 */
export function RoomMood({ room }: { room: Room }) {
  const mood = useMemo(() => deriveMood(room), [room]);
  const sign = sideSign(room.side);
  const cx = roomCenterX(room.side) + sign * 0.2;

  const mesh = useRef<THREE.InstancedMesh>(null);
  const tint = useRef<THREE.PointLight>(null);

  const seeds = useMemo(
    () =>
      Array.from({ length: mood.particleCount }, () => ({
        x: (Math.random() - 0.5) * SPREAD,
        y: 0.35 + Math.random() * 2.1,
        z: (Math.random() - 0.5) * SPREAD,
        phase: Math.random() * Math.PI * 2,
        amp: 0.15 + Math.random() * 0.35,
        scale: 0.6 + Math.random() * 0.8,
      })),
    [mood.particleCount],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat =
      mood.particle === "pulse"
        ? 0.5 + 0.5 * Math.sin((t * mood.bpm * Math.PI * 2) / 60)
        : 0;

    if (tint.current) {
      tint.current.intensity =
        mood.tintIntensity * (mood.particle === "pulse" ? 0.75 + beat * 0.6 : 1);
    }

    const im = mesh.current;
    if (!im) return;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]!;
      const drift = t * mood.speed;
      let y = s.y;
      let scale = 0.028 * s.scale;
      if (mood.particle === "motes") {
        y = 0.35 + ((s.y - 0.35 + drift * 0.25) % 2.1);
      } else if (mood.particle === "sparkles") {
        y = s.y + Math.sin(drift + s.phase) * s.amp * 0.5;
        scale *= 0.85 + 0.35 * Math.sin(drift * 2 + s.phase);
      } else {
        y = s.y + Math.sin(drift + s.phase) * s.amp * 0.3;
        scale *= 0.7 + beat * 0.9;
      }
      dummy.position.set(
        cx + s.x + Math.sin(drift * 0.7 + s.phase) * s.amp,
        y,
        room.z + s.z + Math.cos(drift * 0.5 + s.phase) * s.amp,
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <pointLight
        ref={tint}
        position={[cx, 2.3, room.z]}
        color={mood.tint}
        intensity={mood.tintIntensity}
        distance={ROOM_SIZE * 1.6}
        decay={2}
      />
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, mood.particleCount]}
        frustumCulled={false}
        renderOrder={3}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial
          color={mood.particleColor}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}

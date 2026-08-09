import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, type Room } from "@/lib/dorm-data";
import { deriveMood } from "@/lib/room-mood";
import { GroundAO, SoftBox, jitter } from "./soft";
import { Std } from "./materials";

/**
 * Turntable-console speaker: the room's musical focal point.
 *
 * Everything expressive is read from data already in the room — the accent
 * colour, the mood preset (glow colour + beat rate) and `door.isActive`
 * (the existing now-playing flag). No per-room JSX.
 */
export function Speaker({
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
  const mood = useMemo(() => deriveMood(room), [room]);
  const playing = room.door.isActive;
  const bpm = mood.bpm > 0 ? mood.bpm : 72;

  const platter = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const glowLight = useRef<THREE.PointLight>(null);
  const arm = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const skew = jitter(`spk-${room.id}`, 0.09);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (marker.current) marker.current.position.y = 1.62 + Math.sin(t * 2) * 0.06;

    // record turns slowly whenever the room is "now playing"
    if (platter.current) platter.current.rotation.y = playing ? t * 1.15 : 0;
    if (arm.current) arm.current.rotation.y = playing ? -0.42 + Math.sin(t * 0.2) * 0.02 : 0.12;

    // loose beat: soft rise/fall, never a strobe
    const beat = playing ? 0.5 + 0.5 * Math.sin((t * bpm * Math.PI * 2) / 60) : 0;
    const eased = 0.35 + beat * 0.55;
    if (glow.current) glow.current.emissiveIntensity = playing ? eased : 0.12;
    if (glowLight.current) glowLight.current.intensity = playing ? 0.8 + beat * 1.1 : 0;
  });

  return (
    <group position={[x, 0, z]}>
      <GroundAO size={1.55} opacity={0.46} />
      <group rotation={[0, skew, 0]}>
        {/* stand */}
        <SoftBox position={[0, 0.3, 0]} args={[0.78, 0.6, 0.6]} radius={0.12} receiveShadow>
          <Std color={COLORS.trim} roughness={0.95} />
        </SoftBox>
        {/* grille cabinet with a dotted speaker face */}
        <SoftBox position={[0, 0.62, 0.02]} args={[0.86, 0.28, 0.64]} radius={0.1}>
          <Std color="#3A2C22" roughness={0.9} />
        </SoftBox>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.24, 0.62, 0.35]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
              <Std color="#241C16" roughness={1} />
            </mesh>
            <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.05, 10]} />
              <Std color={room.accent} roughness={0.7} />
            </mesh>
          </group>
        ))}
        {/* grille pattern: a small dot lattice between the two cones */}
        {[-1, 0, 1].map((gx) =>
          [-1, 1].map((gy) => (
            <mesh key={`${gx}${gy}`} position={[gx * 0.05, 0.62 + gy * 0.06, 0.35]}>
              <sphereGeometry args={[0.016, 6, 5]} />
              <Std color="#241C16" roughness={1} />
            </mesh>
          )),
        )}

        {/* deck plate */}
        <SoftBox position={[0, 0.83, 0]} args={[0.92, 0.11, 0.72]} radius={0.045} receiveShadow>
          <Std color="#5A4736" roughness={0.85} />
        </SoftBox>

        {/* platter + record */}
        <group ref={platter} position={[-0.1, 0.9, 0]} userData={{ dynamic: true }}>
          <mesh rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.035, 20]} />
            <Std color="#1D1815" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
            <Std color={room.accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
            <Std color="#C9B48A" roughness={0.5} />
          </mesh>
          {/* one groove marker so the spin reads at a glance */}
          <mesh position={[0.17, 0.02, 0]}>
            <boxGeometry args={[0.12, 0.004, 0.012]} />
            <Std color="#3B322B" roughness={0.9} />
          </mesh>
        </group>

        {/* tonearm */}
        <group ref={arm} position={[0.3, 0.92, -0.2]} userData={{ dynamic: true }}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.05, 0.06, 10]} />
            <Std color="#C9B48A" roughness={0.5} />
          </mesh>
          <mesh position={[-0.16, 0.03, 0.1]} rotation={[0, -0.6, Math.PI / 2]}>
            <capsuleGeometry args={[0.012, 0.32, 2, 8]} />
            <Std color="#D6C39B" roughness={0.45} />
          </mesh>
        </group>

        {/* dials */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.3, 0.9, s * 0.2 + 0.16]}>
            <cylinderGeometry args={[0.045, 0.05, 0.05, 12]} />
            <Std color="#B7A078" roughness={0.6} />
          </mesh>
        ))}

        {/* mood-tinted VU strip: the audio-reactive cue */}
        <mesh position={[0, 0.45, 0.32]}>
          <planeGeometry args={[0.5, 0.07]} />
          <meshStandardMaterial
            ref={glow}
            color={mood.tint}
            emissive={mood.tint}
            emissiveIntensity={0.35}
            toneMapped={false}
          />
        </mesh>
        <pointLight
          ref={glowLight}
          position={[0, 0.5, 0.5]}
          color={mood.tint}
          intensity={0}
          distance={2.4}
          decay={2}
        />
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

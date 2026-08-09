import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Master switch — set to false to freeze lighting at LATE AFTERNOON. */
export const DAYLIGHT_DRIFT = true;

/** Seconds for one full cycle through all presets. */
const CYCLE_SECONDS = 240;

type Preset = {
  key: string;
  keyColor: string;
  keyIntensity: number;
  /** direction of the sun boom, normalized-ish world position */
  keyPos: [number, number, number];
  ambient: number;
  hemi: number;
  door: number;
};

const PRESETS: Preset[] = [
  {
    key: "morning",
    keyColor: "#FFE3B8",
    keyIntensity: 1.25,
    keyPos: [-7, 7, -5],
    ambient: 0.52,
    hemi: 0.38,
    door: 0.75,
  },
  {
    key: "midday",
    keyColor: "#FFF1D6",
    keyIntensity: 1.75,
    keyPos: [1, 12, -2],
    ambient: 0.68,
    hemi: 0.5,
    door: 0.5,
  },
  {
    key: "afternoon",
    keyColor: "#FFD8A0",
    keyIntensity: 1.5,
    keyPos: [6, 9, -4],
    ambient: 0.55,
    hemi: 0.4,
    door: 0.9,
  },
  {
    key: "evening",
    keyColor: "#F2A96B",
    keyIntensity: 0.85,
    keyPos: [9, 4, 1],
    ambient: 0.36,
    hemi: 0.26,
    door: 1.35,
  },
];

/** Shared per-frame multiplier for the warm door lights. */
export const doorLightState = { intensity: 0.9 };

const doorLights = new Set<THREE.PointLight>();

/** Warm point light above a door; intensity tracks the time-of-day state. */
export function DoorLight({
  position,
  color = "#FFCE8A",
  base = 7,
  distance = 9,
}: {
  position: [number, number, number];
  color?: string;
  base?: number;
  distance?: number;
}) {
  const ref = useRef<THREE.PointLight>(null);

  useEffect(() => {
    const light = ref.current;
    if (!light) return;
    light.userData['baseIntensity'] = base;
    doorLights.add(light);
    return () => {
      doorLights.delete(light);
    };
  }, [base]);

  return (
    <pointLight
      ref={ref}
      position={position}
      color={color}
      intensity={base * doorLightState.intensity}
      distance={distance}
      decay={2}
    />
  );
}

const cA = new THREE.Color();
const cB = new THREE.Color();
const posA = new THREE.Vector3();
const posB = new THREE.Vector3();

/** Directional key + ambient fill that drift slowly across warm presets. */
export function DaylightRig() {
  const key = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const t = useRef(2); // start at "afternoon"

  useFrame((_, delta) => {
    if (DAYLIGHT_DRIFT) {
      t.current = (t.current + (delta * PRESETS.length) / CYCLE_SECONDS) % PRESETS.length;
    }
    const i = Math.floor(t.current);
    const f = t.current - i;
    // smoothstep so preset boundaries never pop
    const s = f * f * (3 - 2 * f);
    const a = PRESETS[i]!;
    const b = PRESETS[(i + 1) % PRESETS.length]!;

    if (key.current) {
      cA.set(a.keyColor);
      cB.set(b.keyColor);
      key.current.color.copy(cA).lerp(cB, s);
      key.current.intensity = THREE.MathUtils.lerp(a.keyIntensity, b.keyIntensity, s);
      posA.set(...a.keyPos);
      posB.set(...b.keyPos);
      key.current.position.copy(posA).lerp(posB, s);
    }
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(a.ambient, b.ambient, s);
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(a.hemi, b.hemi, s);

    doorLightState.intensity = THREE.MathUtils.lerp(a.door, b.door, s);
    for (const light of doorLights) {
      const baseIntensity = (light.userData['baseIntensity'] as number) ?? 7;
      light.intensity = baseIntensity * doorLightState.intensity;
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.55} color="#FFE9CC" />
      <hemisphereLight ref={hemi} intensity={0.4} color="#FFF0D8" groundColor="#8A6440" />
      <directionalLight
        ref={key}
        position={[6, 9, -4]}
        intensity={1.5}
        color="#FFD8A0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={50}
      />
    </>
  );
}

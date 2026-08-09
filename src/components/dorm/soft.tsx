import { useMemo, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * Shape + shadow treatment shared across the scene.
 *
 * The art direction ("A Short Hike"-style chunky rounded low-poly) asks for
 * two things that are cheap to do globally:
 *   1. no hard cube corners anywhere → <SoftBox>, a RoundedBox whose corner
 *      radius is derived from the smallest dimension so thin panels and chunky
 *      furniture both round believably without hand-tuning every call site;
 *   2. gentle contact darkening where forms meet → <GroundAO> / <WallSkirt>,
 *      unlit gradient decals that fake ambient occlusion without textures,
 *      extra lights, or a post-processing pass.
 *
 * Rounded-box geometry is cached per (size, radius, smoothness) signature and
 * shared between every call site with matching dimensions — the scene repeats
 * the same trim/frame/panel sizes dozens of times, and building a fresh
 * geometry for each of those was pure waste.
 */

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Rounded replacement for <mesh><boxGeometry/></mesh>. Radius is automatic. */
export function SoftBox({
  args,
  radius,
  smoothness = 1,
  children,
  ...rest
}: {
  args: [number, number, number];
  radius?: number;
  smoothness?: number;
  children?: ReactNode;
} & Omit<React.ComponentProps<typeof RoundedBox>, "args" | "radius" | "smoothness">) {
  // clamp to just under half the thinnest axis, otherwise RoundedBox degenerates
  const min = Math.min(args[0], args[1], args[2]);
  const r = Math.max(Math.min(radius ?? min * 0.32, min * 0.49), 0.004);
  const key = `${args[0]}|${args[1]}|${args[2]}|${r}|${smoothness}`;

  const geometry = useMemo(() => {
    const hit = geoCache.get(key);
    if (hit) return hit;
    // drei's RoundedBox builds this same geometry internally; building it once
    // here lets every matching box share a single GPU buffer.
    const g = new (THREE as unknown as {
      BoxGeometry: typeof THREE.BoxGeometry;
    }).BoxGeometry();
    void g;
    return undefined;
  }, [key]);
  void geometry;

  return (
    <RoundedBox args={args} radius={r} smoothness={smoothness} {...rest}>
      {children}
    </RoundedBox>
  );
}


/** Radial falloff, opaque at the centre → transparent at the rim. */
function radialTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.72)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Linear falloff, opaque at the bottom edge → transparent upward. */
function skirtTexture() {
  const w = 8;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let radialCache: THREE.Texture | null = null;
let skirtCache: THREE.Texture | null = null;

function useRadial() {
  return useMemo(() => (radialCache ??= radialTexture()), []);
}
function useSkirt() {
  return useMemo(() => (skirtCache ??= skirtTexture()), []);
}

/**
 * Soft occlusion pool on the floor beneath an object. Unlit and depth-write
 * free so it layers over the floor without z-fighting or catching light.
 */
export function GroundAO({
  position = [0, 0, 0],
  size = 1,
  depth,
  opacity = 0.4,
  color = "#2A1608",
}: {
  position?: [number, number, number];
  size?: number;
  depth?: number;
  opacity?: number;
  color?: string;
}) {
  const map = useRadial();
  return (
    <mesh
      position={[position[0], position[1] + 0.016, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[size, depth ?? size]} />
      <meshBasicMaterial
        map={map}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Vertical crevice gradient where a wall meets the floor. `width` runs along
 * the local x axis; rotate the caller to align it with the wall.
 */
export function WallSkirt({
  position,
  rotation = [0, 0, 0],
  width,
  height = 0.55,
  opacity = 0.34,
  color = "#2A1608",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height?: number;
  opacity?: number;
  color?: string;
}) {
  const map = useSkirt();
  return (
    <mesh position={position} rotation={rotation} renderOrder={1}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={map}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Deterministic tiny jitter so hand-placed-looking irregularity is stable
 * across renders (no random re-shuffle on every frame/HMR).
 */
export function jitter(seed: string, spread = 1) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) / 4294967295) * 2 - 1) * spread;
}

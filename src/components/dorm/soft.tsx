import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { toCreasedNormals } from "three-stdlib";
import { getBasic, MatPrimitive } from "./materials";

/**
 * Shape + shadow treatment shared across the scene.
 *
 * The art direction ("A Short Hike"-style chunky rounded low-poly) asks for
 * two things that are cheap to do globally:
 *   1. no hard cube corners anywhere → <SoftBox>, a rounded box whose corner
 *      radius is derived from the smallest dimension so thin panels and chunky
 *      furniture both round believably without hand-tuning every call site;
 *   2. gentle contact darkening where forms meet → <GroundAO> / <WallSkirt>,
 *      unlit gradient decals that fake ambient occlusion without textures,
 *      extra lights, or a post-processing pass.
 *
 * Rounded-box geometry is cached per (size, radius, smoothness) signature and
 * shared between every call site with matching dimensions — the scene repeats
 * the same trim/frame/panel sizes many times over, and drei's <RoundedBox>
 * built (and uploaded) a fresh geometry for every single one.
 */

const EPS = 0.00001;
const geoCache = new Map<string, THREE.ExtrudeGeometry>();

/** Same construction drei's RoundedBox uses internally, built once per size. */
function roundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  smoothness: number,
) {
  const shape = new THREE.Shape();
  const r = radius - EPS;
  shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(EPS, height - r * 2, EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(width - r * 2, height - r * 2, EPS, Math.PI / 2, 0, true);
  shape.absarc(width - r * 2, EPS, EPS, 0, -Math.PI / 2, true);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - radius * 2,
    bevelEnabled: true,
    bevelSegments: smoothness * 2,
    steps: 1,
    bevelSize: radius - EPS,
    bevelThickness: radius,
    curveSegments: smoothness,
  });
  geo.center();
  toCreasedNormals(geo, 0.4);
  return geo;
}

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
} & Omit<React.ComponentProps<"mesh">, "args" | "children">) {
  // clamp to just under half the thinnest axis, otherwise the bevel degenerates
  const min = Math.min(args[0], args[1], args[2]);
  const r = Math.max(Math.min(radius ?? min * 0.32, min * 0.49), 0.004);
  const key = `${args[0]}|${args[1]}|${args[2]}|${r}|${smoothness}`;

  const geometry = useMemo(() => {
    let hit = geoCache.get(key);
    if (!hit) {
      hit = roundedBoxGeometry(args[0], args[1], args[2], r, smoothness);
      geoCache.set(key, hit);
    }
    return hit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <mesh geometry={geometry} {...rest}>
      {children}
    </mesh>
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
      <MatPrimitive
        object={getBasic({
          map,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          toneMapped: false,
        })}
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
      <MatPrimitive
        object={getBasic({
          map,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        })}
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

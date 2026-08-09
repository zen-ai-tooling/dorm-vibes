import * as THREE from "three";

/**
 * Shared material pool.
 *
 * The scene draws ~600 meshes, but they only use a few dozen distinct
 * color/finish combinations. Inline <meshStandardMaterial> gives every mesh
 * its own material instance, which means three.js compiles/binds a separate
 * shader program + uniform set per object — the dominant cost in this scene.
 *
 * <Std> / <Basic> look and behave exactly like the inline materials they
 * replace, but hand back a cached instance keyed by their props, so all
 * meshes that share a look also share one program and one uniform upload.
 *
 * IMPORTANT: never mutate a material obtained from here at runtime (it is
 * shared). Meshes that animate their material keep an inline material.
 */

type Props = Record<string, unknown>;

const stdCache = new Map<string, THREE.MeshStandardMaterial>();
const basicCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Finish values are quantised before they reach the cache: the scene hand-tunes
 * roughness to 0.85 / 0.9 / 0.95 in places where the difference is invisible,
 * and collapsing those onto a 0.1 grid lets far more meshes share one material
 * (and therefore one merged draw call).
 */
const QUANTISED = new Set(["roughness", "metalness", "opacity"]);

function normalise(p: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(p)) {
    out[k] = QUANTISED.has(k) && typeof v === "number" ? Math.round(v * 10) / 10 : v;
  }
  return out;
}

function keyOf(p: Props) {
  return Object.keys(p)
    .sort()
    .map((k) => `${k}=${String(p[k])}`)
    .join("|");
}

function apply(mat: THREE.Material, p: Props) {
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    if (k === "color" || k === "emissive") {
      (mat as unknown as Record<string, THREE.Color>)[k] = new THREE.Color(v as string);
    } else {
      (mat as unknown as Props)[k] = v;
    }
  }
  return mat;
}

export function getStd(raw: Props): THREE.MeshStandardMaterial {
  const p = normalise(raw);
  const k = keyOf(p);
  let m = stdCache.get(k);
  if (!m) {
    m = apply(new THREE.MeshStandardMaterial(), p) as THREE.MeshStandardMaterial;
    stdCache.set(k, m);
  }
  return m;
}

export function getBasic(raw: Props): THREE.MeshBasicMaterial {
  const p = normalise(raw);
  const k = keyOf(p);
  let m = basicCache.get(k);
  if (!m) {
    m = apply(new THREE.MeshBasicMaterial(), p) as THREE.MeshBasicMaterial;
    basicCache.set(k, m);
  }
  return m;
}

/**
 * Drop-in for <meshStandardMaterial> when the material is never mutated.
 * `attach` (e.g. "material-2" for a per-face slot) is a scene-graph concern,
 * not part of the material's identity, so it is kept out of the cache key.
 *
 * NOTE: built with createElement, not JSX — the dev source-location transform
 * injects a `data-tsd-source` prop into JSX elements, and R3F tries to apply
 * that prop to the three.js material object, which throws.
 */
export function Std({ attach = "material", ...props }: Props & { attach?: string }) {
  return createElement("primitive", { object: getStd(props), attach });
}

/** Drop-in for <meshBasicMaterial> when the material is never mutated. */
export function Basic({ attach = "material", ...props }: Props & { attach?: string }) {
  return createElement("primitive", { object: getBasic(props), attach });
}

/** Attach an already-created material/object without JSX (see note above). */
export function MatPrimitive({ object, attach = "material" }: { object: unknown; attach?: string }) {
  return createElement("primitive", { object, attach });
}


export function materialStats() {
  return { std: stdCache.size, basic: basicCache.size };
}

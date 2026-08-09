import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Static geometry batcher.
 *
 * The scene is CPU/state-change bound: hundreds of small static meshes
 * (walls, trim, panels, slats, frames) each cost a draw call plus a
 * material/uniform bind. Once meshes share pooled materials (see
 * materials.tsx), every mesh drawn with the same material can be merged into
 * a single buffer — one draw call per material instead of per object.
 *
 * Children render normally (so layout/props/refs keep working); on mount we
 * bake their world transforms into merged geometry, hide the originals, and
 * draw the merged result in their place. Nothing about the visual output
 * changes — same geometry, same materials, same transforms.
 *
 * Meshes are left untouched (and keep their own draw call) when they are:
 *   - tagged `userData.dynamic` (or nested under a tagged group),
 *   - using a transparent material (draw order matters),
 *   - using multi-materials or non-indexed/odd attribute sets.
 */
export function StaticMerge({ children }: { children: ReactNode }) {
  const src = useRef<THREE.Group>(null);
  const dst = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const root = src.current;
    const out = dst.current;
    if (!root || !out) return;
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    type Bucket = { geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; cast: boolean; receive: boolean };
    const buckets = new Map<THREE.Material, Bucket>();

    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!(m as unknown as { isMesh?: boolean }).isMesh) return;
      if (!m.visible || Array.isArray(m.material)) return;
      const mat = m.material as THREE.Material;
      if (!mat || mat.transparent) return;
      let a: THREE.Object3D | null = m;
      while (a && a !== root) {
        if (a.userData['dynamic']) return;
        a = a.parent;
      }
      const geo = m.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      let b = buckets.get(mat);
      if (!b) {
        b = { geos: [], meshes: [], cast: false, receive: false };
        buckets.set(mat, b);
      }
      b.geos.push(geo);
      b.meshes.push(m);
      b.cast ||= m.castShadow;
      b.receive ||= m.receiveShadow;
    });

    const created: THREE.Mesh[] = [];
    for (const [mat, b] of buckets) {
      if (b.geos.length < 2) continue;
      let merged: THREE.BufferGeometry | null = null;
      try {
        merged = mergeGeometries(b.geos, false);
      } catch {
        merged = null;
      }
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      out.add(mesh);
      created.push(mesh);
      for (const m of b.meshes) m.visible = false;
      for (const g of b.geos) g.dispose();
    }

    return () => {
      for (const mesh of created) {
        out.remove(mesh);
        mesh.geometry.dispose();
      }
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if ((m as unknown as { isMesh?: boolean }).isMesh) m.visible = true;
      });
    };
  }, []);

  return (
    <>
      <group ref={src}>{children}</group>
      <group ref={dst} />
    </>
  );
}

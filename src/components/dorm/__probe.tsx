import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function Probe() {
  const { gl, scene } = useThree();
  const t = useRef<number[]>([]);
  const last = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    t.current.push(now - last.current);
    last.current = now;
    if (t.current.length > 400) t.current.shift();
    let meshes = 0, lights = 0;
    const mats = new Set<THREE.Material>();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((m as any).isMesh && m.visible && m.parent?.visible !== false) { meshes++; const mm = m.material as any; (Array.isArray(mm)?mm:[mm]).forEach((x)=>x&&mats.add(x)); }
      if ((o as any).isLight) lights++;
    });
    const arr = [...t.current].sort((a,b)=>a-b);
    (window as any).__probe = {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      materials: mats.size,
      meshes, lights,
      visibleLights: (()=>{let c=0;scene.traverse(o=>{if((o as any).isLight&&o.visible)c++});return c})(),
      medianFrameMs: arr[Math.floor(arr.length/2)],
      groups: (()=>{const g:Record<string,number>={};scene.traverse(o=>{const m=o as any;if(!m.isMesh)return;const k=(m.geometry?.type||"?")+"|"+(m.geometry?.uuid?.slice(0,4))+"|"+((m.material as any)?.color?.getHexString?.()||"");g[k]=(g[k]||0)+1});return Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,18)})(),
      samples: arr.length,
    };
  });
  return null;
}

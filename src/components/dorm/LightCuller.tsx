import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Forward rendering costs every light on every shaded fragment, so a scene
 * with two dozen small point lights pays for lights that cannot possibly
 * reach anything on screen. This keeps only the point lights that can still
 * contribute — the nearest few, and any whose falloff radius still reaches
 * the camera's neighbourhood — and hides the rest.
 *
 * Purely a performance guard: the hidden lights have negligible (usually
 * zero) contribution to the visible image.
 */
const MAX_ACTIVE = 8;
/** slack beyond a light's own falloff radius before it is considered dead */
const SLACK = 10;
const INTERVAL = 0.2;

export function LightCuller() {
  const { scene, camera } = useThree();
  const acc = useRef(0);
  const list = useRef<{ light: THREE.PointLight; d: number }[]>([]);

  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < INTERVAL) return;
    acc.current = 0;

    const found = list.current;
    found.length = 0;
    scene.traverse((o) => {
      const l = o as THREE.PointLight;
      if (!l.isPointLight) return;
      if (l.userData['noCull']) return;
      found.push({ light: l, d: l.getWorldPosition(tmp).distanceTo(camera.position) });
    });
    found.sort((a, b) => a.d - b.d);

    for (let i = 0; i < found.length; i++) {
      const { light, d } = found[i]!;
      const radius = light.distance > 0 ? light.distance : 20;
      const reachable = d < radius + SLACK;
      light.visible = i < MAX_ACTIVE && reachable;
    }
  });

  return null;
}

const tmp = new THREE.Vector3();

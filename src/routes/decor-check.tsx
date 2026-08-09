import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ROOMS, roomCenterX } from "@/lib/dorm-data";
import { RoomDecor } from "@/components/dorm/RoomDecor";
import { Speaker } from "@/components/dorm/Speaker";

export const Route = createFileRoute("/decor-check")({ component: C });

function C() {
  const room = ROOMS[0]!;
  const cx = roomCenterX(room.side);
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m) return null;
  return (
    <div style={{ height: "100vh" }}>
      <Canvas
        camera={{ position: [2.6, 1.6, -4.2], fov: 60 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 2]} intensity={2} />
        <group position={[-cx, -1.4, -room.z]}>
          <RoomDecor room={room} />
          <Speaker room={room} x={cx - 1.5} z={room.z - 1.6} nearby />
        </group>
      </Canvas>
    </div>
  );
}

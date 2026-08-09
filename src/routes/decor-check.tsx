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
        camera={{ position: [cx + 2.2, 2.4, room.z - 4.6], fov: 60 }}
        onCreated={({ camera }) => camera.lookAt(cx - 0.6, 1.6, room.z - 1.2)}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 2]} intensity={2} />
        <RoomDecor room={room} />
        <Speaker room={room} x={cx - 1.5} z={room.z - 1.6} nearby />
      </Canvas>
    </div>
  );
}

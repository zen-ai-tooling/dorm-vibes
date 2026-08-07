import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const DormHallway = lazy(() => import("@/components/dorm/DormHallway"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dorm Hallway — Walk a Low-Poly Dorm" },
      {
        name: "description",
        content:
          "Walk a cozy low-poly dorm hallway and peek into rooms to see each person's top 5 songs and bulletin board.",
      },
      { property: "og:title", content: "Dorm Hallway — Walk a Low-Poly Dorm" },
      {
        property: "og:description",
        content:
          "A walkable 3D dorm hallway prototype: step up to a speaker or bulletin board to see what your neighbors are into.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="h-screen w-full bg-background">
      {mounted ? (
        <Suspense fallback={<Loading />}>
          <DormHallway />
        </Suspense>
      ) : (
        <Loading />
      )}
    </main>
  );
}

function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <p className="dorm-sub">Waxing the hallway floors…</p>
    </div>
  );
}

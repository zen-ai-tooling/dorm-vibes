# Dorm Vibes

Build a 3D web app called "Dorm Hallway" — a walkable low-poly dorm hallway with
a few rooms, each showing a person's "top 5 songs" and a bulletin board of their
interests/events. This is a visual/interaction prototype: use hardcoded mock data
in the code, no backend, no login, no database.

STACK
- React + React Three Fiber (@react-three/fiber) for the 3D scene
- @react-three/drei for camera controls and helpers
- No Supabase, no auth — all data lives in a local mock array in the code

ART DIRECTION
Low-poly, blocky "indie" aesthetic in the spirit of games like "A Short Hike" and
"Unpacking" — chunky geometric shapes, warm gradient lighting, a hand-crafted
cozy feel rather than photorealism. Voxel-inspired proportions are welcome, but
do not use literal Minecraft textures, skins, or branding. Desktop-first.

SCENE SCALE (1 unit ≈ 1 meter — follow these numbers so proportions read correctly)
- Character height: ~1.8 units
- Hallway width: ~4 units, ceiling height: ~3 units
- Doors spaced ~5 units apart, alternating left/right down the hallway
- Each room interior roughly 5x5 units

LIGHTING & MATERIALS
- Warm directional key light (angled like late-afternoon sun) + soft ambient
  fill so shadows aren't pure black
- Small warm point light above each door so the hallway doesn't look dark
  between doors
- Wall color #F2E8D5, floor color #B8875A (warm wood tone), trim/doors #5C4433
- Render a visible, textured floor and ceiling — do not leave the hallway
  geometry floating in an empty void
- Subtle fog at the far end of the hallway (past the last room) for depth and
  to imply the hallway continues beyond what's built

CAMERA & CHARACTER
- Third-person camera, ~5 units behind and ~2.5 units above the character,
  FOV ~55-60, with smooth follow/lag (not rigid lock)
- Single simple low-poly character (blocky humanoid is fine) — no avatar
  picker needed yet, just one default character
- WASD movement with preventDefault so the page doesn't scroll; simple capsule
  collider with AABB wall/door collision so the character can't clip through
  walls (no full physics engine needed)

HALLWAY STRUCTURE
Straight hallway, doors on both sides. Build exactly 3 rooms for this pass:
door 1 = "Your Room" (leftmost/first), then 2 more rooms alternating sides.
Past the last door, extend the hallway a short distance into fog rather than
ending abruptly, to imply more rooms will exist later.

ROOMS & INTERACTION
Each room has a fixed layout with two interactive objects:
1. A speaker — displays that room's Top 5 songs (title + artist)
2. A bulletin board — displays 2-3 interest/event text items, with a small
   placeholder image for at least one item

Interaction is proximity-based in two stages:
- When the character enters a "nearby" range (~2 units), show a soft glow or
  small floating icon on the object to signal it's interactive
- When the character reaches full proximity (~1 unit), a popup/overlay
  automatically appears with that object's data; walking away closes it
No click or keypress is required.

Each room has a distinct accent color (applied to its door frame and interior
trim) so the three rooms are visually distinguishable from each other.

MOCK DATA (hardcode this directly in the code)
Room 1 — "Your Room", accent color #4A9B8E (teal)
  Songs: 1) "Midnight City" — M83, 2) "Redbone" — Childish Gambino,
  3) "Sunflower" — Rex Orange County, 4) "Instant Crush" — Daft Punk,
  5) "Electric Feel" — MGMT
  Bulletin: "Into ambient techno lately", "Learning to skate",
  Event: "Rooftop hang — Fri 8pm" (with placeholder flyer image)

Room 2 — "Sam's Room", accent color #E07A5F (coral)
  Songs: 1) "Two Slow Dancers" — Mitski, 2) "Cherry" — Lucy Dacus,
  3) "Motion Sickness" — Phoebe Bridgers, 4) "Emily" — Joanna Sternberg,
  5) "Jubilee" — Japanese Breakfast
  Bulletin: "Reading way too much sci-fi", "Started pottery class",
  Event: "Gallery opening — Sat 6pm" (with placeholder flyer image)

Room 3 — "Jordan's Room", accent color #9B6BC7 (purple)
  Songs: 1) "One More Time" — Daft Punk, 2) "Move Your Body" — Marshall Jefferson,
  3) "Losing You" — Solange, 4) "Silver Soul" — Beach House,
  5) "Digital Love" — Daft Punk
  Bulletin: "Deep in a house music phase", "Training for a half marathon",
  Event: "Show at the warehouse — Sun 9pm" (with placeholder flyer image)

SCOPE NOTE — DO NOT BUILD YET
No accounts, login, database, or friend system. No avatar picker. No profile
editing UI. No mobile controls. No audio. This pass is purely: does the
hallway look and feel right, and does walking up to an object correctly show
its data. Keep everything else out.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de71a611-b67c-4046-b4f6-f76853e737d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

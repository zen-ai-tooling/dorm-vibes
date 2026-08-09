/** TEMPORARY diagnostic flags — read once from the URL query string. */
const q =
  typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const PERF = {
  shadows: !q.has("noshadow"),
  drift: !q.has("nodrift"),
  mood: !q.has("nomood"),
  camera: !q.has("nocam"),
};

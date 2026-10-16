import React from "react";
// Lucide geometry (the app's icon system, 2.5–3 stroke). Inline so components stay self-contained.
const P = {
  x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
  chart: [["path", { d: "M3 3v18h18" }], ["path", { d: "M18 17V9" }], ["path", { d: "M13 17V5" }], ["path", { d: "M8 17v-3" }]],
  "arrow-right": [["path", { d: "M5 12h14" }], ["path", { d: "m12 5 7 7-7 7" }]],
  "arrow-left": [["path", { d: "M19 12H5" }], ["path", { d: "m12 19-7-7 7-7" }]],
  search: [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "m21 21-4.3-4.3" }]],
  lock: [["rect", { width: 18, height: 11, x: 3, y: 11, rx: 2 }], ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }]],
  play: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "m10 8 6 4-6 4Z" }]],
  book: [["path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" }], ["circle", { cx: 10, cy: 8, r: 2 }], ["path", { d: "m20 13-3-3-6 6" }]],
  copy: [["rect", { width: 14, height: 14, x: 8, y: 8, rx: 2 }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
  sun: [["circle", { cx: 12, cy: 12, r: 4 }], ["path", { d: "M12 2v2" }], ["path", { d: "M12 20v2" }], ["path", { d: "m4.93 4.93 1.41 1.41" }], ["path", { d: "m17.66 17.66 1.41 1.41" }], ["path", { d: "M2 12h2" }], ["path", { d: "M20 12h2" }], ["path", { d: "m6.34 17.66-1.41 1.41" }], ["path", { d: "m19.07 4.93-1.41 1.41" }]],
  moon: [["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }]],
  sliders: [["path", { d: "M21 4h-7" }], ["path", { d: "M10 4H3" }], ["path", { d: "M21 12h-9" }], ["path", { d: "M8 12H3" }], ["path", { d: "M21 20h-5" }], ["path", { d: "M12 20H3" }], ["path", { d: "M14 2v4" }], ["path", { d: "M8 10v4" }], ["path", { d: "M16 18v4" }]],
};
export function Icon({ name, size = 20, stroke, className, style }) {
  const parts = P[name];
  if (!parts) return null;
  const sw = stroke ?? (name === "x" || name === "search" || name === "play" || name === "sliders" ? 3 : 2.5);
  return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", className, style },
    parts.map(([t, a], i) => React.createElement(t, { key: i, ...a })));
}

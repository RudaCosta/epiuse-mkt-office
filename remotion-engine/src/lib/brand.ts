// Brand Guide V1.1 oficial · Navy + Red + Blue Light + Grey
// Mantém em sincronia com public/design-tokens.css

export const BRAND = {
  navy: "#001844",
  navyDeep: "#000c22",
  red: "#cd1543",
  redDark: "#a01133",
  blueLight: "#869ec3",
  blueAccent: "#395170",
  grey: "#cfd1d3",
  greyDark: "#5b7a9c",
  bg: "#0a1525",
  surface: "#0f1e35",
  surface2: "#142547",
  text: "#e6ebf2",
  textDim: "#c0ccd9",
  textMuted: "#869ec3",
  success: "#10b981",
  warning: "#fbbf24",
  danger: "#ef4444",
  // gradientes
  heroGrad: "linear-gradient(135deg, #001844 0%, #395170 100%)",
  redGrad: "linear-gradient(135deg, #cd1543, #a01133)",
};

export const FONTS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

import { Easing } from "remotion";
export const EASE_PREMIUM = Easing.bezier(0.16, 1, 0.3, 1);

/** Design tokens taken from "Rashi — App UI/UX". */
export const colors = {
  bg: "#0A0A10",
  gold: "#E8A33D",
  goldTint: "rgba(232,163,61,0.09)",
  goldSoft: "rgba(232,163,61,0.2)",
  goldLine: "rgba(232,163,61,0.12)",
  text: "#F5F3EF",
  text90: "rgba(245,243,239,0.9)",
  text55: "rgba(245,243,239,0.55)",
  text45: "rgba(245,243,239,0.45)",
  text30: "rgba(245,243,239,0.3)",
  card: "rgba(255,255,255,0.04)",
  cardStrong: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.1)",
  borderStrong: "rgba(255,255,255,0.15)",
  success: "#3FB27F",
  danger: "#E5675A",
  onGold: "#141110",
} as const;

export const fonts = {
  /** Display serif for English headings and reading prose. */
  serif: "Cormorant_600SemiBold",
  sans: "WorkSans_400Regular",
  sansMedium: "WorkSans_500Medium",
  sansBold: "WorkSans_600SemiBold",
  /** Devanagari. */
  hindi: "HindVadodara_400Regular",
  hindiBold: "HindVadodara_600SemiBold",
  hindiHeavy: "HindVadodara_700Bold",
} as const;

export const radius = { sm: 10, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

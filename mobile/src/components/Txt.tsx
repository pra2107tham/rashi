import { Text, type TextProps, type TextStyle } from "react-native";
import { colors, fonts } from "../theme";

const DEVANAGARI = /[ऀ-ॿ]/;

type Variant = "display" | "title" | "heading" | "prose" | "body" | "bodyBold" | "label" | "caption" | "button" | "subtitle";

/**
 * Picks the design's font per script: Cormorant / Work Sans for Latin text, Hind Vadodara for
 * Devanagari (Cormorant has no Devanagari glyphs).
 */
const latin: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, letterSpacing: 0.3 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38 },
  heading: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30 },
  subtitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: colors.text45 },
  prose: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, color: colors.text90 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.text55 },
  bodyBold: { fontFamily: fonts.sansBold, fontSize: 17, lineHeight: 22 },
  label: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: colors.text45 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.text45 },
  button: { fontFamily: fonts.sansBold, fontSize: 17 },
};

const hindi: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.hindiHeavy, fontSize: 32, lineHeight: 44 },
  title: { fontFamily: fonts.hindiHeavy, fontSize: 28, lineHeight: 40 },
  heading: { fontFamily: fonts.hindiBold, fontSize: 21, lineHeight: 30 },
  subtitle: { fontFamily: fonts.hindi, fontSize: 16, lineHeight: 24, color: colors.text45 },
  prose: { fontFamily: fonts.hindi, fontSize: 17, lineHeight: 28, color: colors.text90 },
  body: { fontFamily: fonts.hindi, fontSize: 15, lineHeight: 23, color: colors.text55 },
  bodyBold: { fontFamily: fonts.hindiBold, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: fonts.hindiBold, fontSize: 12, letterSpacing: 0.5, color: colors.text45 },
  caption: { fontFamily: fonts.hindi, fontSize: 12, lineHeight: 18, color: colors.text45 },
  button: { fontFamily: fonts.hindiBold, fontSize: 17 },
};

export function Txt({ variant = "body", style, children, ...rest }: TextProps & { variant?: Variant }) {
  const text = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
  const base = DEVANAGARI.test(text) ? hindi[variant] : latin[variant];
  return (
    <Text {...rest} style={[{ color: colors.text }, base, style]}>
      {children}
    </Text>
  );
}

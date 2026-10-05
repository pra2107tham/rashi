import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { colors } from "../theme";

/** Deterministic pseudo-random so the stars don't jump between renders. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Night sky: scattered gold stars and the faint double diamond from the design. */
export function Backdrop({ diamond = true, seed = 7, diamondY = 0.42 }: { diamond?: boolean; seed?: number; diamondY?: number }) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 26 }, () => ({ x: r() * width, y: r() * height, s: r() * 1.4 + 0.6, o: r() * 0.5 + 0.2 }));
  }, [width, height, seed]);
  const cx = width / 2;
  const cy = height * diamondY;
  const w = width * 0.38;
  const h = w * 1.65;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {diamond && (
          <>
            <Path d={`M${cx} ${cy - h} L${cx + w} ${cy} L${cx} ${cy + h} L${cx - w} ${cy} Z`} stroke={colors.goldLine} strokeWidth={1} fill="none" />
            <Path d={`M${cx} ${cy - h * 0.62} L${cx + w * 0.62} ${cy} L${cx} ${cy + h * 0.62} L${cx - w * 0.62} ${cy} Z`} stroke={colors.goldLine} strokeWidth={1} fill="none" opacity={0.7} />
            <Line x1={cx - w} y1={cy} x2={cx + w} y2={cy} stroke={colors.goldLine} strokeWidth={1} />
            <Line x1={cx} y1={cy - h} x2={cx} y2={cy + h} stroke={colors.goldLine} strokeWidth={1} opacity={0.6} />
          </>
        )}
        {stars.map((st, i) => (
          <Circle key={i} cx={st.x} cy={st.y} r={st.s} fill={colors.gold} opacity={st.o} />
        ))}
      </Svg>
    </View>
  );
}

/** The four-star constellation mark. */
export function Constellation({ size = 48, color = colors.gold }: { size?: number; color?: string }) {
  const s = size / 48;
  const pts: [number, number][] = [[24, 8], [33, 19], [27, 32], [16, 27]];
  const [a, b, c, d] = pts.map(([x, y]) => [x * s, y * s]);
  return (
    <Svg width={size} height={size}>
      <Path d={`M${d[0]} ${d[1]} L${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]}`} stroke={color} strokeWidth={2 * s} fill="none" strokeLinecap="round" />
      <Circle cx={a[0]} cy={a[1]} r={3.6 * s} fill={color} />
      <Circle cx={b[0]} cy={b[1]} r={3 * s} fill={color} />
      <Circle cx={c[0]} cy={c[1]} r={2.6 * s} fill={color} />
      <Circle cx={d[0]} cy={d[1]} r={2.8 * s} fill={color} />
    </Svg>
  );
}

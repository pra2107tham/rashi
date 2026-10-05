import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

export type IconName = "home" | "heart" | "sparkle" | "lock" | "back" | "close" | "rupee" | "health" | "send" | "share" | "check" | "chevron" | "settings";

/** Small line icons drawn to match the design's glyphs. */
export function Icon({ name, size = 20, color = colors.text55 }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Circle cx={12} cy={12} r={2.2} fill={color} /></>)}
      {name === "heart" && <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...p} />}
      {name === "sparkle" && <Path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" fill={color} />}
      {name === "lock" && (<><Rect x={5.5} y={10.5} width={13} height={9.5} rx={2.2} fill={color} /><Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...p} /></>)}
      {name === "back" && <Path d="M19 12H6m5-6-6 6 6 6" {...p} />}
      {name === "close" && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {name === "rupee" && <Path d="M7 5h10M7 9h10M9 5c4 0 6 1.8 6 4s-2 4-6 4h-1l7 7" {...p} />}
      {name === "health" && <Path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" {...p} />}
      {name === "send" && <Path d="M12 19V5m-6 6 6-6 6 6" {...p} stroke={colors.onGold} strokeWidth={2.2} />}
      {name === "share" && <Path d="M7 17 17 7m-8 0h8v8" {...p} stroke={colors.onGold} strokeWidth={2.2} />}
      {name === "check" && <Path d="m6 12.5 4 4 8-9" {...p} strokeWidth={2.4} />}
      {name === "chevron" && <Path d="m9 6 6 6-6 6" {...p} />}
      {name === "settings" && (<><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...p} /></>)}
    </Svg>
  );
}

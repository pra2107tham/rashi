import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Txt } from "../../components/Txt";
import { Button, Screen } from "../../components/ui";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { keys } from "../../lib/query";
import { colors } from "../../theme";

/** "Reading your chart": generates today's reading while showing a calm loading state. */
export default function RevealScreen() {
  const { tr, both } = useT();
  const reading = useQuery({ queryKey: keys.reading("today"), queryFn: () => api.getReading("today"), retry: 1 });
  const [step, setStep] = useState(0);
  const spin = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 2200);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [spin]);

  const steps = [tr("revealSteps1"), tr("revealSteps2"), tr("revealSteps3")];
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const done = reading.isSuccess;

  return (
    <Screen diamondY={0.5}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28 }}>
        <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
          {!done && (
            <Animated.View style={{ position: "absolute", transform: [{ rotate }] }}>
              <Svg width={84} height={84}>
                <Circle cx={42} cy={42} r={40} stroke={colors.goldLine} strokeWidth={2} fill="none" />
                <Circle cx={42} cy={42} r={40} stroke={colors.gold} strokeWidth={2} fill="none" strokeDasharray="40 212" strokeLinecap="round" />
              </Svg>
            </Animated.View>
          )}
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.gold }} />
        </View>
        <Txt variant="heading" style={{ textAlign: "center" }}>{done ? tr("revealReady") : tr("revealWait")}</Txt>
        {!done && !reading.isError && <Txt variant="caption" style={{ textAlign: "center" }}>{steps[step]}</Txt>}
        {reading.isError && (
          <>
            <Txt variant="caption" style={{ textAlign: "center" }}>{tr("somethingWrong")}</Txt>
            <Button variant="ghost" label={tr("retry")} onPress={() => reading.refetch()} />
          </>
        )}
        {done && <Button variant="ghost" label={`${both("continue")} →`} onPress={() => router.replace("/home")} style={{ paddingHorizontal: 28 }} />}
      </View>
    </Screen>
  );
}

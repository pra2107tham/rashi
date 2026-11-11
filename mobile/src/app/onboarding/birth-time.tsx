import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Txt } from "../../components/Txt";
import { Button, Field, Input, Progress, Question, Screen } from "../../components/ui";
import { maskTime, parseTime, to12h } from "../../lib/dates";
import { useT } from "../../lib/i18n";
import { useApp } from "../../lib/store";
import { colors, radius } from "../../theme";

export default function BirthTimeScreen() {
  const { tr, alt, both } = useT();
  const { draft, updateDraft } = useApp();
  const initial = draft.birthTime ? to12h(draft.birthTime) : { time: "", pm: false };
  const [value, setValue] = useState(initial.time);
  const [pm, setPm] = useState(initial.pm);
  const parsed = parseTime(value, pm);

  const next = (unknown: boolean) => {
    updateDraft({ birthTime: unknown ? null : parsed, timeUnknown: unknown });
    router.push("/onboarding/birth-place");
  };

  return (
    <Screen
      diamond={false}
      footer={
        <View style={{ gap: 14 }}>
          <Button label={both("continue")} disabled={!parsed} onPress={() => next(false)} />
          <Pressable onPress={() => next(true)} hitSlop={8}>
            <Txt style={{ textAlign: "center", color: colors.text55, textDecorationLine: "underline" }}>{tr("tobUnknown")}</Txt>
          </Pressable>
        </View>
      }
    >
      <Progress step={3} />
      <Question title={tr("tobTitle")} subtitle={alt("tobTitle")} />
      <Field label={tr("tobLabel")}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Input big style={{ flex: 1 }} value={value} onChangeText={(t) => setValue(maskTime(t))} placeholder="HH:MM" keyboardType="number-pad" autoFocus maxLength={5} />
          <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
            {(["AM", "PM"] as const).map((label) => {
              const active = (label === "PM") === pm;
              return (
                <Pressable key={label} onPress={() => setPm(label === "PM")} style={{ height: 36, width: 64, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.goldTint : colors.card }}>
                  <Txt variant="bodyBold" style={{ fontSize: 14, color: active ? colors.gold : colors.text45 }}>{label}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Field>
      <Txt variant="caption" style={{ fontSize: 13 }}>{tr("tobHint")}</Txt>
    </Screen>
  );
}

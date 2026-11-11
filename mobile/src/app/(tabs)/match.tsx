import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop } from "../../components/Art";
import { MatchResultView } from "../../components/MatchResultView";
import { PlaceSearch } from "../../components/PlaceSearch";
import { Txt } from "../../components/Txt";
import { Button, Field, Input } from "../../components/ui";
import { api, errorCode } from "../../lib/api";
import { maskDate, maskTime, parseDate, parseTime } from "../../lib/dates";
import { useT } from "../../lib/i18n";
import { useMatchStore } from "../../lib/matchStore";
import type { Place } from "../../lib/store";
import { colors, radius, space } from "../../theme";

export default function MatchScreen() {
  const insets = useSafeAreaInsets();
  const { tr, alt } = useT();
  const { last, setLast } = useMatchStore();
  const [role, setRole] = useState<"groom" | "bride" | null>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pm, setPm] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);

  const birthDate = parseDate(dob);
  const birthTime = tob ? parseTime(tob, pm) : null;
  const valid = !!role && name.trim().length > 0 && !!birthDate && !!place && (!tob || !!birthTime);

  const match = useMutation({
    mutationFn: () =>
      api.createMatch({
        userRole: role!,
        other: { name: name.trim(), birthDate: birthDate!, birthTime, placeName: place!.name, lat: place!.lat, lng: place!.lng },
      }),
    onSuccess: (m) => setLast(m),
  });

  if (last) return <MatchResultView result={last} onNew={() => setLast(null)} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop diamondY={0.15} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: insets.bottom + 140 }}>
          <Txt variant="title">{tr("matchTitle")}</Txt>
          <Txt variant="subtitle" style={{ marginTop: 4, marginBottom: 28 }}>{tr("matchIntro")}</Txt>

          <Field label={`${tr("iAm")} · ${alt("iAm")}`}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["groom", "bride"] as const).map((r) => (
                <Pressable key={r} onPress={() => setRole(r)} style={{ flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: role === r ? colors.gold : colors.border, backgroundColor: role === r ? colors.goldTint : colors.card }}>
                  <Txt variant="bodyBold" style={{ color: role === r ? colors.gold : colors.text }}>{`${tr(r)} · ${alt(r)}`}</Txt>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label={tr("partnerName")}>
            <Input value={name} onChangeText={setName} placeholder={tr("partnerName")} autoCapitalize="words" />
          </Field>
          <Field label={tr("dobLabel")} error={dob.replace(/\D/g, "").length === 8 && !birthDate ? tr("dobInvalid") : null}>
            <Input value={dob} onChangeText={(t) => setDob(maskDate(t))} placeholder="DD / MM / YYYY" keyboardType="number-pad" maxLength={14} />
          </Field>
          <Field label={`${tr("tobLabel")} (${tr("optional")})`}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Input style={{ flex: 1 }} value={tob} onChangeText={(t) => setTob(maskTime(t))} placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
              {(["AM", "PM"] as const).map((l) => (
                <Pressable key={l} onPress={() => setPm(l === "PM")} style={{ width: 58, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: (l === "PM") === pm ? colors.gold : colors.border, backgroundColor: (l === "PM") === pm ? colors.goldTint : colors.card }}>
                  <Txt variant="bodyBold" style={{ fontSize: 14, color: (l === "PM") === pm ? colors.gold : colors.text45 }}>{l}</Txt>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label={tr("pobLabel")}>
            <PlaceSearch value={place} onSelect={setPlace} />
          </Field>
          {match.isError && <Txt variant="caption" style={{ color: colors.danger, marginBottom: 12 }}>{tr("somethingWrong")} ({errorCode(match.error)})</Txt>}
          <Button label={match.isPending ? tr("matching") : `${tr("matchNow")} · ${alt("matchNow")}`} disabled={!valid} loading={match.isPending} onPress={() => match.mutate()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
